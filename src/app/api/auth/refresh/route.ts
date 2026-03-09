import { NextRequest, NextResponse } from 'next/server';
import {
  validateRefreshToken,
  generateAccessToken,
  createSession,
  deleteSession,
  serializeCookie,
  getUserById,
} from '@/lib/auth';
import { parse } from 'cookie';

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = parse(cookieHeader);
    const refreshToken = cookies.refresh_token;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token' },
        { status: 401 }
      );
    }

    // Validate current refresh token
    const userId = await validateRefreshToken(refreshToken);
    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Get user data
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    // Rotate: delete old refresh token, create new one
    await deleteSession(refreshToken);
    const newRefreshToken = await createSession(userId);
    const accessToken = await generateAccessToken(userId);

    const response = NextResponse.json({ user, accessToken });
    response.headers.set(
      'Set-Cookie',
      serializeCookie('refresh_token', newRefreshToken, 7 * 24 * 60 * 60)
    );

    return response;
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
