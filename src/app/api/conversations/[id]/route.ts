import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query, queryOne } from '@/lib/db';

// GET /api/conversations/[id] — get conversation details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    // Verify membership
    const membership = await queryOne<{ id: string; chat_theme: string; chat_wallpaper: string }>(
      'SELECT id, chat_theme, chat_wallpaper FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [params.id, auth.userId]
    );
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this conversation' }, { status: 403 });
    }

    const conv = await queryOne<Record<string, unknown>>(
      'SELECT id, type, name, avatar_url, created_by, created_at FROM conversations WHERE id = $1',
      [params.id]
    );
    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const members = await query<Record<string, unknown>>(
      `SELECT u.id, u.name, u.email, u.avatar_url, u.is_online, u.last_seen, cm.role, cm.joined_at
       FROM conversation_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.conversation_id = $1
       ORDER BY cm.role DESC, cm.joined_at ASC`,
      [params.id]
    );

    return NextResponse.json({
      conversation: conv,
      chatTheme: membership.chat_theme || 'default',
      chatWallpaper: membership.chat_wallpaper || 'none',
      members: members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        avatar_url: m.avatar_url,
        isOnline: m.is_online,
        lastSeen: m.last_seen,
        role: m.role,
        joinedAt: m.joined_at,
      })),
    });
  } catch (error) {
    console.error('GET /api/conversations/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}

// PUT /api/conversations/[id] — update group conversation
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    // Verify admin
    const membership = await queryOne<{ role: string }>(
      'SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [params.id, auth.userId]
    );
    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    const conv = await queryOne<{ type: string }>(
      'SELECT type FROM conversations WHERE id = $1',
      [params.id]
    );
    if (conv?.type === 'group' && membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can update group settings' }, { status: 403 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const updated = await queryOne<Record<string, unknown>>(
      `UPDATE conversations SET name = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, type, name, avatar_url, created_at, updated_at`,
      [name.trim(), params.id]
    );

    // System message
    const user = await queryOne<{ name: string }>('SELECT name FROM users WHERE id = $1', [auth.userId]);
    await query(
      `INSERT INTO messages (conversation_id, sender_id, content, message_type)
       VALUES ($1, $2, $3, 'system')`,
      [params.id, auth.userId, `${user?.name} changed the group name to "${name.trim()}"`]
    );

    return NextResponse.json({ conversation: updated });
  } catch (error) {
    console.error('PUT /api/conversations/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
  }
}
