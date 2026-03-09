import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query } from '@/lib/db';

// POST /api/friends/search — search users by name or email
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { query: searchQuery } = body;

    if (!searchQuery || typeof searchQuery !== 'string' || searchQuery.trim().length < 2) {
      return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 });
    }

    const searchTerm = `%${searchQuery.trim()}%`;

    const rows = await query<Record<string, unknown>>(
      `SELECT u.id, u.name, u.email, u.avatar_url, u.is_online, u.last_seen,
              f.status as friendship_status,
              f.requester_id
       FROM users u
       LEFT JOIN friendships f ON (
         (f.requester_id = $1 AND f.addressee_id = u.id) OR
         (f.addressee_id = $1 AND f.requester_id = u.id)
       )
       LEFT JOIN blocked_users b ON (
         (b.blocker_id = $1 AND b.blocked_id = u.id) OR
         (b.blocker_id = u.id AND b.blocked_id = $1)
       )
       WHERE u.id != $1
         AND b.id IS NULL
         AND (u.name ILIKE $2 OR u.email ILIKE $2)
       ORDER BY u.name ASC
       LIMIT 20`,
      [auth.userId, searchTerm]
    );

    const users = rows.map((r) => {
      let status = 'none';
      if (r.friendship_status === 'accepted') status = 'accepted';
      else if (r.friendship_status === 'pending') {
        status = r.requester_id === auth.userId ? 'pending_sent' : 'pending_received';
      }
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        avatar_url: r.avatar_url,
        status,
        isOnline: r.is_online,
        lastSeen: r.last_seen,
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('POST /api/friends/search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
