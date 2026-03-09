import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, query } from './db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  email_verified: boolean;
  created_at: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generateAccessToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET);
}

export async function generateRefreshToken(): Promise<string> {
  return uuidv4() + '-' + uuidv4();
}

export async function verifyAccessToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { userId: payload.userId as string };
  } catch {
    return null;
  }
}

export async function createSession(userId: string): Promise<string> {
  const refreshToken = await generateRefreshToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await query(
    'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
    [userId, refreshToken, expiresAt.toISOString()]
  );

  return refreshToken;
}

export async function validateRefreshToken(refreshToken: string): Promise<string | null> {
  const session = await queryOne<{ user_id: string; expires_at: string }>(
    'SELECT user_id, expires_at FROM sessions WHERE refresh_token = $1',
    [refreshToken]
  );

  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) {
    await query('DELETE FROM sessions WHERE refresh_token = $1', [refreshToken]);
    return null;
  }

  return session.user_id;
}

export async function deleteSession(refreshToken: string): Promise<void> {
  await query('DELETE FROM sessions WHERE refresh_token = $1', [refreshToken]);
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
  return queryOne<AuthUser>(
    'SELECT id, name, email, avatar_url, email_verified, created_at FROM users WHERE id = $1',
    [userId]
  );
}

export function serializeCookie(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

export function clearCookie(name: string): string {
  return `${name}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}
