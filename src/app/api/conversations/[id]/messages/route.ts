import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query, queryOne } from '@/lib/db';

// GET /api/conversations/[id]/messages — get messages with pagination
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    // Verify membership
    const membership = await queryOne(
      'SELECT id FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [params.id, auth.userId]
    );
    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const before = searchParams.get('before'); // timestamp for infinite scroll

    const conditions = ['m.conversation_id = $1'];
    const queryParams: unknown[] = [params.id];
    let paramIdx = 2;

    if (before) {
      conditions.push(`m.created_at < $${paramIdx}`);
      queryParams.push(before);
      paramIdx++;
    }

    conditions.push(`1=1`); // placeholder
    const where = conditions.join(' AND ');

    const rows = await query<Record<string, unknown>>(
      `SELECT m.id, m.content, m.message_type, m.is_edited, m.is_deleted,
              m.reply_to_id, m.created_at, m.updated_at, m.sender_id,
              m.media_url, m.media_type, m.media_metadata,
              u.name as sender_name, u.avatar_url as sender_avatar,
              rm.content as reply_content, rm.sender_id as reply_sender_id,
              ru.name as reply_sender_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       LEFT JOIN messages rm ON m.reply_to_id = rm.id
       LEFT JOIN users ru ON rm.sender_id = ru.id
       WHERE ${where}
       ORDER BY m.created_at DESC
       LIMIT $${paramIdx}`,
      [...queryParams, limit + 1]
    );

    const hasMore = rows.length > limit;
    const messages = (hasMore ? rows.slice(0, limit) : rows).reverse();

    // Get reactions for these messages
    const messageIds = messages.map((m) => m.id);
    const reactionsMap: Record<string, Record<string, string[]>> = {};
    if (messageIds.length > 0) {
      const placeholders = messageIds.map((_, i) => `$${i + 1}`).join(',');
      const reactionRows = await query<Record<string, unknown>>(
        `SELECT mr.message_id, mr.emoji, u.name
         FROM message_reactions mr
         JOIN users u ON mr.user_id = u.id
         WHERE mr.message_id IN (${placeholders})`,
        messageIds
      );
      reactionRows.forEach((r) => {
        const msgId = r.message_id as string;
        const emoji = r.emoji as string;
        if (!reactionsMap[msgId]) reactionsMap[msgId] = {};
        if (!reactionsMap[msgId][emoji]) reactionsMap[msgId][emoji] = [];
        reactionsMap[msgId][emoji].push(r.name as string);
      });
    }

    // Mark messages as read (update last_read_at)
    await query(
      `UPDATE conversation_members SET last_read_at = NOW()
       WHERE conversation_id = $1 AND user_id = $2`,
      [params.id, auth.userId]
    );

    const formatted = messages.map((m) => ({
      id: m.id,
      content: m.is_deleted ? 'This message was deleted' : m.content,
      messageType: m.message_type,
      isEdited: m.is_edited,
      isDeleted: m.is_deleted,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      sender: {
        id: m.sender_id,
        name: m.sender_name,
        avatar_url: m.sender_avatar,
      },
      replyTo: m.reply_to_id
        ? {
            id: m.reply_to_id,
            content: m.reply_content,
            senderName: m.reply_sender_name,
          }
        : null,
      reactions: reactionsMap[m.id as string] || {},
      mediaUrl: m.media_url || null,
      mediaType: m.media_type || null,
      mediaMetadata: m.media_metadata || null,
    }));

    return NextResponse.json({ messages: formatted, hasMore });
  } catch (error) {
    console.error('GET /api/conversations/[id]/messages error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST /api/conversations/[id]/messages — send message
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    // Verify membership
    const membership = await queryOne(
      'SELECT id FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [params.id, auth.userId]
    );
    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // For direct conversations, check if blocked
    const conv = await queryOne<{ type: string }>(
      'SELECT type FROM conversations WHERE id = $1',
      [params.id]
    );
    if (conv?.type === 'direct') {
      const otherMember = await queryOne<{ user_id: string }>(
        'SELECT user_id FROM conversation_members WHERE conversation_id = $1 AND user_id != $2',
        [params.id, auth.userId]
      );
      if (otherMember) {
        const blocked = await queryOne(
          `SELECT id FROM blocked_users
           WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`,
          [auth.userId, otherMember.user_id]
        );
        if (blocked) {
          return NextResponse.json({ error: 'Cannot send message to this user' }, { status: 403 });
        }
      }
    }

    const body = await request.json();
    const { content, messageType, replyToId } = body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const msgType = messageType || 'text';

    // Validate replyToId if provided
    if (replyToId) {
      const replyMsg = await queryOne(
        'SELECT id FROM messages WHERE id = $1 AND conversation_id = $2',
        [replyToId, params.id]
      );
      if (!replyMsg) {
        return NextResponse.json({ error: 'Reply message not found' }, { status: 400 });
      }
    }

    const message = await queryOne<Record<string, unknown>>(
      `INSERT INTO messages (conversation_id, sender_id, content, message_type, reply_to_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, conversation_id, sender_id, content, message_type, reply_to_id,
                 is_edited, is_deleted, created_at`,
      [params.id, auth.userId, content.trim(), msgType, replyToId || null]
    );

    // Update conversation timestamp
    await query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [params.id]);

    // Update sender's last_read_at
    await query(
      `UPDATE conversation_members SET last_read_at = NOW()
       WHERE conversation_id = $1 AND user_id = $2`,
      [params.id, auth.userId]
    );

    // Get sender info
    const sender = await queryOne<{ name: string; avatar_url: string | null }>(
      'SELECT name, avatar_url FROM users WHERE id = $1',
      [auth.userId]
    );

    // Create notifications for other members (non-muted)
    const otherMembers = await query<{ user_id: string }>(
      `SELECT user_id FROM conversation_members
       WHERE conversation_id = $1 AND user_id != $2 AND is_muted = false`,
      [params.id, auth.userId]
    );

    for (const member of otherMembers) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, 'new_message', $2, $3, $4)`,
        [
          member.user_id,
          `New message from ${sender?.name}`,
          content.trim().substring(0, 100),
          JSON.stringify({ conversationId: params.id, messageId: message?.id }),
        ]
      );
    }

    return NextResponse.json({
      message: {
        ...message,
        sender: { id: auth.userId, name: sender?.name, avatar_url: sender?.avatar_url },
        replyTo: null,
        reactions: {},
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/conversations/[id]/messages error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
