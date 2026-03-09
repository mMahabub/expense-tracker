import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { queryOne } from '@/lib/db';

// DELETE /api/friends/[id] — unfriend
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await queryOne(
      `DELETE FROM friendships
       WHERE id = $1 AND (requester_id = $2 OR addressee_id = $2)
       RETURNING id`,
      [params.id, auth.userId]
    );

    if (!result) {
      return NextResponse.json({ error: 'Friendship not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Unfriended' });
  } catch (error) {
    console.error('DELETE /api/friends/[id] error:', error);
    return NextResponse.json({ error: 'Failed to unfriend' }, { status: 500 });
  }
}
