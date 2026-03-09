import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Rate limit: max 3 reset requests per hour per user
    const rateCheck = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM password_resets WHERE user_id = (SELECT id FROM users WHERE email = $1) AND created_at > NOW() - INTERVAL '1 hour'`,
      [email.toLowerCase()]
    );

    if (rateCheck && rateCheck.count >= 3) {
      return NextResponse.json(
        { error: 'Too many reset requests. Please try again later.' },
        { status: 429 }
      );
    }

    const user = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');

      await query(
        'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'1 hour\')',
        [user.id, token]
      );

      return NextResponse.json({
        message: 'If an account exists with this email, a reset link has been generated',
        resetLink: `/reset-password?token=${token}`,
      });
    }

    return NextResponse.json({
      message: 'If an account exists with this email, a reset link has been generated',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
