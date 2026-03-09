import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query, queryOne } from '@/lib/db';

// PUT /api/friends/accept/[id] — accept friend request
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    // Only the addressee can accept
    const friendship = await queryOne<Record<string, unknown>>(
      `SELECT id, requester_id, addressee_id, status
       FROM friendships WHERE id = $1 AND addressee_id = $2 AND status = 'pending'`,
      [params.id, auth.userId]
    );

    if (!friendship) {
      return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
    }

    // Update to accepted
    const updated = await queryOne<Record<string, unknown>>(
      `UPDATE friendships SET status = 'accepted', updated_at = NOW()
       WHERE id = $1
       RETURNING id, requester_id, addressee_id, status, created_at, updated_at`,
      [params.id]
    );

    // Check if a direct conversation already exists between these users
    const existingConv = await queryOne<{ id: string }>(
      `SELECT c.id FROM conversations c
       JOIN conversation_members cm1 ON c.id = cm1.conversation_id AND cm1.user_id = $1
       JOIN conversation_members cm2 ON c.id = cm2.conversation_id AND cm2.user_id = $2
       WHERE c.type = 'direct'`,
      [auth.userId, friendship.requester_id]
    );

    let conversation;
    if (!existingConv) {
      // Create direct conversation
      conversation = await queryOne<Record<string, unknown>>(
        `INSERT INTO conversations (type, created_by)
         VALUES ('direct', $1)
         RETURNING id, type, created_at`,
        [auth.userId]
      );

      // Add both as members
      await query(
        `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
        [conversation?.id, auth.userId, friendship.requester_id]
      );
    } else {
      conversation = existingConv;
    }

    // Create notification for the requester
    const accepter = await queryOne<{ name: string }>(
      'SELECT name FROM users WHERE id = $1',
      [auth.userId]
    );
    await query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'friend_accepted', $2, $3, $4)`,
      [
        friendship.requester_id,
        `${accepter?.name} accepted your friend request`,
        `You are now friends with ${accepter?.name}`,
        JSON.stringify({ friendshipId: params.id, userId: auth.userId }),
      ]
    );

    return NextResponse.json({ friendship: updated, conversation });
  } catch (error) {
    console.error('PUT /api/friends/accept/[id] error:', error);
    return NextResponse.json({ error: 'Failed to accept request' }, { status: 500 });
  }
}
