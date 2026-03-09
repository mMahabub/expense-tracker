import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/api/auth', '/api/health'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths, static files, and Next.js internals
  if (
    isPublicPath(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for access token in cookie or Authorization header
  const accessToken =
    request.cookies.get('access_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (!accessToken) {
    // Try refresh - redirect to login if no tokens at all
    const refreshToken = request.cookies.get('refresh_token')?.value;
    if (!refreshToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Has refresh token but no access token — let the client handle refresh
    return NextResponse.next();
  }

  // Verify access token
  try {
    await jwtVerify(accessToken, JWT_SECRET);
    return NextResponse.next();
  } catch {
    // Token expired or invalid — let the client try to refresh
    const refreshToken = request.cookies.get('refresh_token')?.value;
    if (refreshToken) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
