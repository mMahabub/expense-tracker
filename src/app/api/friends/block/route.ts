import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query, queryOne } from '@/lib/db';

// POST /api/friends/block — block a user
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId || userId === auth.userId) {
      return NextResponse.json({ error: 'Invalid user' }, { status: 400 });
    }

    // Check user exists
    const target = await queryOne('SELECT id FROM users WHERE id = $1', [userId]);
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check already blocked
    const existing = await queryOne(
      'SELECT id FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2',
      [auth.userId, userId]
    );
    if (existing) {
      return NextResponse.json({ error: 'Already blocked' }, { status: 400 });
    }

    // Block user
    await query(
      'INSERT INTO blocked_users (blocker_id, blocked_id) VALUES ($1, $2)',
      [auth.userId, userId]
    );

    // Remove any friendship
    await query(
      `DELETE FROM friendships
       WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)`,
      [auth.userId, userId]
    );

    return NextResponse.json({ message: 'Blocked' });
  } catch (error) {
    console.error('POST /api/friends/block error:', error);
    return NextResponse.json({ error: 'Failed to block user' }, { status: 500 });
  }
}

// GET /api/friends/block — list blocked users
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const rows = await query<Record<string, unknown>>(
      `SELECT u.id, u.name, u.email, b.created_at
       FROM blocked_users b
       JOIN users u ON b.blocked_id = u.id
       WHERE b.blocker_id = $1
       ORDER BY b.created_at DESC`,
      [auth.userId]
    );

    return NextResponse.json({ blocked: rows });
  } catch (error) {
    console.error('GET /api/friends/block error:', error);
    return NextResponse.json({ error: 'Failed to fetch blocked users' }, { status: 500 });
  }
}
