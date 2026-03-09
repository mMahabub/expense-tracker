import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { queryOne } from '@/lib/db';

// PUT /api/user/profile — update name
export async function PUT(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (name.trim().length > 100) {
      return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 });
    }

    const row = await queryOne<{ id: string; name: string; email: string; avatar_url: string | null; email_verified: boolean; created_at: string }>(
      `UPDATE users SET name = $1 WHERE id = $2
       RETURNING id, name, email, avatar_url, email_verified, created_at`,
      [name.trim(), auth.userId]
    );

    if (!row) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: row });
  } catch (error) {
    console.error('PUT /api/user/profile error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
