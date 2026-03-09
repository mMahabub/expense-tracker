import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query } from '@/lib/db';

// GET /api/friends — list accepted friends
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const rows = await query<Record<string, unknown>>(
      `SELECT u.id, u.name, u.email, u.avatar_url, u.is_online, u.last_seen,
              f.id as "friendshipId"
       FROM friendships f
       JOIN users u ON (
         CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END = u.id
       )
       WHERE (f.requester_id = $1 OR f.addressee_id = $1)
         AND f.status = 'accepted'
       ORDER BY u.name ASC`,
      [auth.userId]
    );

    const friends = rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      avatar_url: r.avatar_url,
      isOnline: r.is_online,
      lastSeen: r.last_seen,
      friendshipId: r.friendshipId,
    }));

    return NextResponse.json({ friends });
  } catch (error) {
    console.error('GET /api/friends error:', error);
    return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 });
  }
}
