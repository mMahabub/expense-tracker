import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query, queryOne } from '@/lib/db';

// GET /api/conversations — list user's conversations
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    // Get all conversations the user is a member of
    const convRows = await query<Record<string, unknown>>(
      `SELECT c.id, c.type, c.name, c.avatar_url, c.created_at, c.updated_at
       FROM conversations c
       JOIN conversation_members cm ON c.id = cm.conversation_id
       WHERE cm.user_id = $1
       ORDER BY c.updated_at DESC`,
      [auth.userId]
    );

    // Get current user's chat_theme and chat_wallpaper for each conversation
    const userPrefs = await query<{ conversation_id: string; chat_theme: string; chat_wallpaper: string }>(
      `SELECT conversation_id, chat_theme, chat_wallpaper FROM conversation_members WHERE user_id = $1`,
      [auth.userId]
    );
    const themeMap = new Map(userPrefs.map(t => [t.conversation_id, t.chat_theme]));
    const wallpaperMap = new Map(userPrefs.map(t => [t.conversation_id, t.chat_wallpaper]));

    const conversations = [];
    for (const conv of convRows) {
      // Get last message
      const lastMsg = await queryOne<Record<string, unknown>>(
        `SELECT m.id, m.content, m.message_type, m.is_deleted, m.created_at,
                u.name as sender_name
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.conversation_id = $1
         ORDER BY m.created_at DESC LIMIT 1`,
        [conv.id]
      );

      // Get unread count
      const unreadRow = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM messages m
         WHERE m.conversation_id = $1
           AND m.sender_id != $2
           AND m.created_at > (
             SELECT COALESCE(cm.last_read_at, '1970-01-01')
             FROM conversation_members cm
             WHERE cm.conversation_id = $1 AND cm.user_id = $2
           )`,
        [conv.id, auth.userId]
      );

      // Get members
      const members = await query<Record<string, unknown>>(
        `SELECT u.id, u.name, u.avatar_url, u.is_online, cm.role
         FROM conversation_members cm
         JOIN users u ON cm.user_id = u.id
         WHERE cm.conversation_id = $1`,
        [conv.id]
      );

      let displayName = conv.name;
      let displayAvatar = conv.avatar_url;
      let isOnline = false;

      // For direct chats, show the other person's info
      if (conv.type === 'direct') {
        const other = members.find((m) => m.id !== auth.userId);
        if (other) {
          displayName = other.name as string;
          displayAvatar = other.avatar_url as string | null;
          isOnline = other.is_online as boolean;
        }
      }

      conversations.push({
        id: conv.id,
        type: conv.type,
        name: displayName,
        avatar: displayAvatar,
        isOnline,
        lastMessage: lastMsg
          ? {
              content: lastMsg.is_deleted ? 'This message was deleted' : lastMsg.content,
              senderName: lastMsg.sender_name,
              messageType: lastMsg.message_type,
              createdAt: lastMsg.created_at,
            }
          : null,
        unreadCount: parseInt(unreadRow?.count || '0'),
        memberCount: members.length,
        chatTheme: themeMap.get(conv.id as string) || 'default',
        chatWallpaper: wallpaperMap.get(conv.id as string) || 'none',
        members: members.map((m) => ({
          id: m.id,
          name: m.name,
          avatar_url: m.avatar_url,
          isOnline: m.is_online,
          role: m.role,
        })),
      });
    }

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('GET /api/conversations error:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

// POST /api/conversations — create group conversation
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { name, memberIds } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json({ error: 'At least one member is required' }, { status: 400 });
    }

    // Verify all members are friends with creator
    for (const memberId of memberIds) {
      const isFriend = await queryOne(
        `SELECT id FROM friendships
         WHERE ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))
           AND status = 'accepted'`,
        [auth.userId, memberId]
      );
      if (!isFriend) {
        return NextResponse.json(
          { error: `User ${memberId} is not your friend` },
          { status: 400 }
        );
      }
    }

    // Create conversation
    const conv = await queryOne<Record<string, unknown>>(
      `INSERT INTO conversations (type, name, created_by)
       VALUES ('group', $1, $2)
       RETURNING id, type, name, created_at`,
      [name.trim(), auth.userId]
    );

    // Add creator as admin
    await query(
      `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [conv?.id, auth.userId]
    );

    // Add members
    for (const memberId of memberIds) {
      await query(
        `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'member')`,
        [conv?.id, memberId]
      );
    }

    // Create system message
    const creator = await queryOne<{ name: string }>('SELECT name FROM users WHERE id = $1', [auth.userId]);
    await query(
      `INSERT INTO messages (conversation_id, sender_id, content, message_type)
       VALUES ($1, $2, $3, 'system')`,
      [conv?.id, auth.userId, `${creator?.name} created the group "${name.trim()}"`]
    );

    // Update conversation timestamp
    await query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conv?.id]);

    return NextResponse.json({ conversation: conv }, { status: 201 });
  } catch (error) {
    console.error('POST /api/conversations error:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
