import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query } from '@/lib/db';

// GET /api/friends/sent — sent pending requests
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const rows = await query<Record<string, unknown>>(
      `SELECT f.id, f.created_at,
              u.id as addressee_id, u.name as addressee_name,
              u.email as addressee_email, u.avatar_url as addressee_avatar
       FROM friendships f
       JOIN users u ON f.addressee_id = u.id
       WHERE f.requester_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [auth.userId]
    );

    const sent = rows.map((r) => ({
      id: r.id,
      addressee: {
        id: r.addressee_id,
        name: r.addressee_name,
        email: r.addressee_email,
        avatar_url: r.addressee_avatar,
      },
      createdAt: r.created_at,
    }));

    return NextResponse.json({ sent });
  } catch (error) {
    console.error('GET /api/friends/sent error:', error);
    return NextResponse.json({ error: 'Failed to fetch sent requests' }, { status: 500 });
  }
}
