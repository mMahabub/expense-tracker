import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { queryOne } from '@/lib/db';

const VALID_WALLPAPERS = [
  'none', 'subtle-dots', 'diagonal-lines', 'honeycomb', 'waves', 'bubbles',
  'geometric', 'stars', 'gradient-warm', 'gradient-cool', 'gradient-purple',
  'paper', 'doodle-money', 'cloudy', 'aurora',
];

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { wallpaper } = await request.json();

    // Allow built-in wallpapers or custom:filename pattern
    const isCustom = typeof wallpaper === 'string' && wallpaper.startsWith('custom:');
    if (!wallpaper || (!VALID_WALLPAPERS.includes(wallpaper) && !isCustom)) {
      return NextResponse.json({ error: 'Invalid wallpaper' }, { status: 400 });
    }

    // Verify membership
    const membership = await queryOne(
      'SELECT id FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [params.id, auth.userId]
    );
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this conversation' }, { status: 403 });
    }

    await queryOne(
      'UPDATE conversation_members SET chat_wallpaper = $1 WHERE conversation_id = $2 AND user_id = $3',
      [wallpaper, params.id, auth.userId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating wallpaper:', error);
    return NextResponse.json({ error: 'Failed to update wallpaper' }, { status: 500 });
  }
}
