import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query, queryOne } from '@/lib/db';

// POST /api/messages/[id]/reactions — toggle reaction
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    // Verify message exists and user is a member of the conversation
    const msg = await queryOne<{ conversation_id: string }>(
      'SELECT conversation_id FROM messages WHERE id = $1',
      [params.id]
    );
    if (!msg) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const membership = await queryOne(
      'SELECT id FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [msg.conversation_id, auth.userId]
    );
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this conversation' }, { status: 403 });
    }

    const body = await request.json();
    const { emoji } = body;

    if (!emoji || typeof emoji !== 'string') {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 });
    }

    // Toggle: remove if exists, add if not
    const existing = await queryOne(
      'SELECT id FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
      [params.id, auth.userId, emoji]
    );

    if (existing) {
      await query(
        'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
        [params.id, auth.userId, emoji]
      );
      return NextResponse.json({ action: 'removed', emoji });
    } else {
      const reaction = await queryOne<Record<string, unknown>>(
        `INSERT INTO message_reactions (message_id, user_id, emoji)
         VALUES ($1, $2, $3)
         RETURNING id, emoji, created_at`,
        [params.id, auth.userId, emoji]
      );
      return NextResponse.json({ action: 'added', reaction });
    }
  } catch (error) {
    console.error('POST /api/messages/[id]/reactions error:', error);
    return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 500 });
  }
}

// GET /api/messages/[id]/reactions — get reactions grouped by emoji
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const msg = await queryOne<{ conversation_id: string }>(
      'SELECT conversation_id FROM messages WHERE id = $1',
      [params.id]
    );
    if (!msg) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const membership = await queryOne(
      'SELECT id FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [msg.conversation_id, auth.userId]
    );
    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    const rows = await query<Record<string, unknown>>(
      `SELECT mr.emoji, u.id as user_id, u.name
       FROM message_reactions mr
       JOIN users u ON mr.user_id = u.id
       WHERE mr.message_id = $1
       ORDER BY mr.created_at ASC`,
      [params.id]
    );

    const reactions: Record<string, { userId: string; name: string }[]> = {};
    rows.forEach((r) => {
      const emoji = r.emoji as string;
      if (!reactions[emoji]) reactions[emoji] = [];
      reactions[emoji].push({ userId: r.user_id as string, name: r.name as string });
    });

    return NextResponse.json({ reactions });
  } catch (error) {
    console.error('GET /api/messages/[id]/reactions error:', error);
    return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 });
  }
}
