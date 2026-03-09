import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    if (
      !newPassword ||
      typeof newPassword !== 'string' ||
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters with an uppercase letter and a number' },
        { status: 400 }
      );
    }

    const resetRecord = await queryOne<{ id: string; user_id: string }>(
      'SELECT pr.id, pr.user_id FROM password_resets pr WHERE pr.token = $1 AND pr.expires_at > NOW() AND pr.used = false',
      [token]
    );

    if (!resetRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(newPassword);

    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      hashedPassword,
      resetRecord.user_id,
    ]);

    await query('UPDATE password_resets SET used = true WHERE id = $1', [
      resetRecord.id,
    ]);

    await query('DELETE FROM sessions WHERE user_id = $1', [
      resetRecord.user_id,
    ]);

    return NextResponse.json({
      message: 'Password reset successful',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
