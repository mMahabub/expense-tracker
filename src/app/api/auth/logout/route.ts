import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, clearCookie } from '@/lib/auth';
import { parse } from 'cookie';

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = parse(cookieHeader);
    const refreshToken = cookies.refresh_token;

    if (refreshToken) {
      await deleteSession(refreshToken);
    }

    const response = NextResponse.json({ message: 'Logged out successfully' });
    response.headers.set('Set-Cookie', clearCookie('refresh_token'));

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    const response = NextResponse.json({ message: 'Logged out' });
    response.headers.set('Set-Cookie', clearCookie('refresh_token'));
    return response;
  }
}
