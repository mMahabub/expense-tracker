import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { queryOne } from '@/lib/db';

// DELETE /api/friends/block/[userId] — unblock user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await queryOne(
      'DELETE FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2 RETURNING id',
      [auth.userId, params.userId]
    );

    if (!result) {
      return NextResponse.json({ error: 'User not blocked' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Unblocked' });
  } catch (error) {
    console.error('DELETE /api/friends/block/[userId] error:', error);
    return NextResponse.json({ error: 'Failed to unblock' }, { status: 500 });
  }
}
