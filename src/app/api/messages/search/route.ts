import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query } from '@/lib/db';

// GET /api/messages/search — full text search across user's conversations
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const conversationId = searchParams.get('conversationId');

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 });
    }

    const conditions = [
      `cm.user_id = $1`,
      `m.is_deleted = false`,
      `to_tsvector('english', m.content) @@ plainto_tsquery('english', $2)`,
    ];
    const params: unknown[] = [auth.userId, q.trim()];
    let paramIdx = 3;

    if (conversationId) {
      conditions.push(`m.conversation_id = $${paramIdx}`);
      params.push(conversationId);
      paramIdx++;
    }

    const where = conditions.join(' AND ');

    const rows = await query<Record<string, unknown>>(
      `SELECT m.id, m.content, m.created_at, m.conversation_id,
              u.name as sender_name,
              c.name as conversation_name, c.type as conversation_type
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       JOIN conversations c ON m.conversation_id = c.id
       JOIN conversation_members cm ON c.id = cm.conversation_id
       WHERE ${where}
       ORDER BY m.created_at DESC
       LIMIT 50`,
      params
    );

    const messages = rows.map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.created_at,
      conversationId: r.conversation_id,
      senderName: r.sender_name,
      conversationName: r.conversation_name || r.sender_name,
      conversationType: r.conversation_type,
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('GET /api/messages/search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
