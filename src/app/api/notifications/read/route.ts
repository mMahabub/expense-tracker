import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query } from '@/lib/db';

// PUT /api/notifications/read — mark notifications as read
export async function PUT(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { ids, all } = body;

    if (all) {
      await query(
        'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
        [auth.userId]
      );
    } else if (Array.isArray(ids) && ids.length > 0) {
      const placeholders = ids.map((_: string, i: number) => `$${i + 2}`).join(',');
      await query(
        `UPDATE notifications SET is_read = true
         WHERE user_id = $1 AND id IN (${placeholders})`,
        [auth.userId, ...ids]
      );
    } else {
      return NextResponse.json({ error: 'Provide ids array or all: true' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('PUT /api/notifications/read error:', error);
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }
}
