import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query, queryOne } from '@/lib/db';

// DELETE /api/conversations/[id]/members/[userId] — remove member or leave
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const isSelf = params.userId === auth.userId;

    // Verify caller is member
    const callerMembership = await queryOne<{ role: string }>(
      'SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [params.id, auth.userId]
    );
    if (!callerMembership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // If removing someone else, must be admin
    if (!isSelf && callerMembership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 });
    }

    // Verify target is member
    const targetMembership = await queryOne(
      'SELECT id FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [params.id, params.userId]
    );
    if (!targetMembership) {
      return NextResponse.json({ error: 'User is not a member' }, { status: 404 });
    }

    // Remove member
    await query(
      'DELETE FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [params.id, params.userId]
    );

    // If admin is leaving, assign new admin
    if (isSelf && callerMembership.role === 'admin') {
      const nextAdmin = await queryOne<{ user_id: string }>(
        `SELECT user_id FROM conversation_members
         WHERE conversation_id = $1
         ORDER BY joined_at ASC LIMIT 1`,
        [params.id]
      );
      if (nextAdmin) {
        await query(
          `UPDATE conversation_members SET role = 'admin'
           WHERE conversation_id = $1 AND user_id = $2`,
          [params.id, nextAdmin.user_id]
        );
      }
    }

    // System message
    const callerName = await queryOne<{ name: string }>('SELECT name FROM users WHERE id = $1', [auth.userId]);
    const targetName = isSelf
      ? callerName
      : await queryOne<{ name: string }>('SELECT name FROM users WHERE id = $1', [params.userId]);

    const msgContent = isSelf
      ? `${callerName?.name} left the group`
      : `${callerName?.name} removed ${targetName?.name}`;

    await query(
      `INSERT INTO messages (conversation_id, sender_id, content, message_type)
       VALUES ($1, $2, $3, 'system')`,
      [params.id, auth.userId, msgContent]
    );

    await query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [params.id]);

    return NextResponse.json({ message: isSelf ? 'Left group' : 'Member removed' });
  } catch (error) {
    console.error('DELETE /api/conversations/[id]/members/[userId] error:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
