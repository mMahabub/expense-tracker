import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { queryOne } from '@/lib/db';

// PUT /api/friends/reject/[id] — reject friend request
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await queryOne(
      `DELETE FROM friendships
       WHERE id = $1 AND addressee_id = $2 AND status = 'pending'
       RETURNING id`,
      [params.id, auth.userId]
    );

    if (!result) {
      return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Rejected' });
  } catch (error) {
    console.error('PUT /api/friends/reject/[id] error:', error);
    return NextResponse.json({ error: 'Failed to reject request' }, { status: 500 });
  }
}
