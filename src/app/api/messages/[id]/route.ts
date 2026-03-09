import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query, queryOne } from '@/lib/db';

// PUT /api/messages/[id] — edit message (within 15 min)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    // Verify sender
    const msg = await queryOne<{ sender_id: string; created_at: string; is_deleted: boolean }>(
      'SELECT sender_id, created_at, is_deleted FROM messages WHERE id = $1',
      [params.id]
    );
    if (!msg) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    if (msg.sender_id !== auth.userId) {
      return NextResponse.json({ error: 'Can only edit your own messages' }, { status: 403 });
    }
    if (msg.is_deleted) {
      return NextResponse.json({ error: 'Cannot edit deleted message' }, { status: 400 });
    }

    // Check 15 minute window
    const createdAt = new Date(msg.created_at).getTime();
    const now = Date.now();
    if (now - createdAt > 15 * 60 * 1000) {
      return NextResponse.json({ error: 'Can only edit within 15 minutes of sending' }, { status: 400 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const updated = await queryOne<Record<string, unknown>>(
      `UPDATE messages SET content = $1, is_edited = true, updated_at = NOW()
       WHERE id = $2
       RETURNING id, content, message_type, is_edited, is_deleted, created_at, updated_at`,
      [content.trim(), params.id]
    );

    return NextResponse.json({ message: updated });
  } catch (error) {
    console.error('PUT /api/messages/[id] error:', error);
    return NextResponse.json({ error: 'Failed to edit message' }, { status: 500 });
  }
}

// DELETE /api/messages/[id] — soft delete message
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const msg = await queryOne<{ sender_id: string }>(
      'SELECT sender_id FROM messages WHERE id = $1',
      [params.id]
    );
    if (!msg) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    if (msg.sender_id !== auth.userId) {
      return NextResponse.json({ error: 'Can only delete your own messages' }, { status: 403 });
    }

    const updated = await queryOne<Record<string, unknown>>(
      `UPDATE messages SET is_deleted = true, content = 'This message was deleted', updated_at = NOW()
       WHERE id = $1
       RETURNING id, content, is_deleted, updated_at`,
      [params.id]
    );

    // Remove reactions on deleted message
    await query('DELETE FROM message_reactions WHERE message_id = $1', [params.id]);

    return NextResponse.json({ message: updated });
  } catch (error) {
    console.error('DELETE /api/messages/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
