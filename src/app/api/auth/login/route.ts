import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';
import {
  comparePassword,
  generateAccessToken,
  createSession,
  serializeCookie,
  AuthUser,
} from '@/lib/auth';

interface UserWithPassword extends AuthUser {
  password_hash: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const userRow = await queryOne<UserWithPassword>(
      `SELECT id, name, email, password_hash, avatar_url, email_verified, created_at
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (!userRow) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Compare password
    const isValid = await comparePassword(password, userRow.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last_login
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [userRow.id]);

    // Generate tokens
    const accessToken = await generateAccessToken(userRow.id);
    const refreshToken = await createSession(userRow.id);

    const user: AuthUser = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      avatar_url: userRow.avatar_url,
      email_verified: userRow.email_verified,
      created_at: userRow.created_at,
    };

    const response = NextResponse.json({
      user,
      accessToken,
      message: 'Login successful',
    });

    response.headers.set(
      'Set-Cookie',
      serializeCookie('refresh_token', refreshToken, 7 * 24 * 60 * 60)
    );

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
