import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import {
  hashPassword,
  generateAccessToken,
  createSession,
  serializeCookie,
  AuthUser,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      );
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [
      email.toLowerCase(),
    ]);
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await queryOne<AuthUser>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, avatar_url, email_verified, created_at`,
      [name.trim(), email.toLowerCase(), passwordHash]
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Generate tokens
    const accessToken = await generateAccessToken(user.id);
    const refreshToken = await createSession(user.id);

    // Set refresh token as httpOnly cookie
    const response = NextResponse.json(
      {
        user,
        accessToken,
        message: 'Account created successfully',
      },
      { status: 201 }
    );

    response.headers.set(
      'Set-Cookie',
      serializeCookie('refresh_token', refreshToken, 7 * 24 * 60 * 60)
    );

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
