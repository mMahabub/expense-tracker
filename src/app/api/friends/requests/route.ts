import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query } from '@/lib/db';

// GET /api/friends/requests — received pending requests
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const rows = await query<Record<string, unknown>>(
      `SELECT f.id, f.created_at,
              u.id as requester_id, u.name as requester_name,
              u.email as requester_email, u.avatar_url as requester_avatar
       FROM friendships f
       JOIN users u ON f.requester_id = u.id
       WHERE f.addressee_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [auth.userId]
    );

    const requests = rows.map((r) => ({
      id: r.id,
      requester: {
        id: r.requester_id,
        name: r.requester_name,
        email: r.requester_email,
        avatar_url: r.requester_avatar,
      },
      createdAt: r.created_at,
    }));

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('GET /api/friends/requests error:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}
