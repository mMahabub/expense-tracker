import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query, queryOne } from '@/lib/db';

// POST /api/friends/request — send friend request
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { addresseeId } = body;

    if (!addresseeId) {
      return NextResponse.json({ error: 'addresseeId is required' }, { status: 400 });
    }

    if (addresseeId === auth.userId) {
      return NextResponse.json({ error: 'Cannot send friend request to yourself' }, { status: 400 });
    }

    // Check user exists
    const targetUser = await queryOne<{ id: string; name: string }>(
      'SELECT id, name FROM users WHERE id = $1',
      [addresseeId]
    );
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check not blocked
    const blocked = await queryOne(
      `SELECT id FROM blocked_users
       WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`,
      [auth.userId, addresseeId]
    );
    if (blocked) {
      return NextResponse.json({ error: 'Cannot send request to this user' }, { status: 400 });
    }

    // Check existing friendship (either direction)
    const existing = await queryOne<{ status: string }>(
      `SELECT status FROM friendships
       WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)`,
      [auth.userId, addresseeId]
    );
    if (existing) {
      if (existing.status === 'accepted') {
        return NextResponse.json({ error: 'Already friends' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Friend request already pending' }, { status: 400 });
    }

    // Create friendship
    const friendship = await queryOne<Record<string, unknown>>(
      `INSERT INTO friendships (requester_id, addressee_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING id, requester_id, addressee_id, status, created_at`,
      [auth.userId, addresseeId]
    );

    // Get requester name for notification
    const requester = await queryOne<{ name: string }>(
      'SELECT name FROM users WHERE id = $1',
      [auth.userId]
    );

    // Create notification
    await query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'friend_request', $2, $3, $4)`,
      [
        addresseeId,
        `${requester?.name} sent you a friend request`,
        `${requester?.name} wants to be your friend`,
        JSON.stringify({ friendshipId: friendship?.id, fromUserId: auth.userId }),
      ]
    );

    return NextResponse.json({ friendship }, { status: 201 });
  } catch (error) {
    console.error('POST /api/friends/request error:', error);
    return NextResponse.json({ error: 'Failed to send friend request' }, { status: 500 });
  }
}
