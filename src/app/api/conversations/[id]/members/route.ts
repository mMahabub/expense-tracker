import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query, queryOne } from '@/lib/db';

// POST /api/conversations/[id]/members — add members to group
export async function POST(
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
    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can add members' }, { status: 403 });
    }

    // Verify it's a group
    const conv = await queryOne<{ type: string }>('SELECT type FROM conversations WHERE id = $1', [params.id]);
    if (conv?.type !== 'group') {
      return NextResponse.json({ error: 'Can only add members to group conversations' }, { status: 400 });
    }

    const body = await request.json();
    const { userIds } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'userIds array is required' }, { status: 400 });
    }

    const adder = await queryOne<{ name: string }>('SELECT name FROM users WHERE id = $1', [auth.userId]);
    const addedMembers = [];

    for (const userId of userIds) {
      // Check friendship
      const isFriend = await queryOne(
        `SELECT id FROM friendships
         WHERE ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))
           AND status = 'accepted'`,
        [auth.userId, userId]
      );
      if (!isFriend) continue;

      // Check not already member
      const alreadyMember = await queryOne(
        'SELECT id FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
        [params.id, userId]
      );
      if (alreadyMember) continue;

      // Add member
      await query(
        'INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, $3)',
        [params.id, userId, 'member']
      );

      const added = await queryOne<{ name: string }>('SELECT name FROM users WHERE id = $1', [userId]);
      addedMembers.push({ id: userId, name: added?.name });

      // System message
      await query(
        `INSERT INTO messages (conversation_id, sender_id, content, message_type)
         VALUES ($1, $2, $3, 'system')`,
        [params.id, auth.userId, `${adder?.name} added ${added?.name}`]
      );
    }

    await query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [params.id]);

    return NextResponse.json({ members: addedMembers });
  } catch (error) {
    console.error('POST /api/conversations/[id]/members error:', error);
    return NextResponse.json({ error: 'Failed to add members' }, { status: 500 });
  }
}
