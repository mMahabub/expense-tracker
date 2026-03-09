import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query, queryOne } from '@/lib/db';

// POST /api/messages/[id]/read — mark message as read
export async function POST(
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

    // Upsert read receipt
    await query(
      `INSERT INTO message_reads (message_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (message_id, user_id) DO UPDATE SET read_at = NOW()`,
      [params.id, auth.userId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/messages/[id]/read error:', error);
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }
}
