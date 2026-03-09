import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query, queryOne } from '@/lib/db';

// GET /api/notifications — list notifications with pagination
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    const rows = await query<Record<string, unknown>>(
      `SELECT id, type, title, message, data, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [auth.userId, limit, offset]
    );

    const countRow = await queryOne<{ count: string; unread: string }>(
      `SELECT
         COUNT(*) as count,
         COUNT(*) FILTER (WHERE is_read = false) as unread
       FROM notifications WHERE user_id = $1`,
      [auth.userId]
    );

    return NextResponse.json({
      notifications: rows,
      total: parseInt(countRow?.count || '0'),
      unreadCount: parseInt(countRow?.unread || '0'),
    });
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}
