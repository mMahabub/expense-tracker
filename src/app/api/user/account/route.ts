import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { queryOne, query } from '@/lib/db';
import { comparePassword, clearCookie } from '@/lib/auth';

// DELETE /api/user/account — delete account and all data
export async function DELETE(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { password, confirmation } = body;

    if (confirmation !== 'DELETE') {
      return NextResponse.json({ error: 'Please type DELETE to confirm' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // Verify password
    const user = await queryOne<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [auth.userId]
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Password is incorrect' }, { status: 400 });
    }

    // Delete all user data (cascades handle expenses, budgets, sessions)
    await query('DELETE FROM sessions WHERE user_id = $1', [auth.userId]);
    await query('DELETE FROM budgets WHERE user_id = $1', [auth.userId]);
    await query('DELETE FROM expenses WHERE user_id = $1', [auth.userId]);
    await query('DELETE FROM users WHERE id = $1', [auth.userId]);

    // Clear refresh token cookie
    const response = NextResponse.json({ message: 'Account deleted successfully' });
    response.headers.set('Set-Cookie', clearCookie('refresh_token'));

    return response;
  } catch (error) {
    console.error('DELETE /api/user/account error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
