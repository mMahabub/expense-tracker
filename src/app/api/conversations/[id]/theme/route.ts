import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { queryOne } from '@/lib/db';

const VALID_THEMES = [
  'default',
  'ocean',
  'sunset',
  'forest',
  'purple',
  'rose',
  'golden',
  'midnight',
  'cherry',
  'mint',
  'lavender',
  'coral',
  'sky',
  'neon',
  'monochrome',
];

// PUT /api/conversations/[id]/theme — update chat theme for a conversation
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { theme } = await request.json();

    if (!theme || !VALID_THEMES.includes(theme)) {
      return NextResponse.json(
        { error: `Invalid theme. Must be one of: ${VALID_THEMES.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify user is a member of the conversation
    const membership = await queryOne(
      'SELECT id FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [params.id, auth.userId]
    );
    if (!membership) {
      return NextResponse.json(
        { error: 'Not a member of this conversation' },
        { status: 403 }
      );
    }

    // Update the user's chat theme for this conversation
    await queryOne(
      'UPDATE conversation_members SET chat_theme = $1 WHERE conversation_id = $2 AND user_id = $3',
      [theme, params.id, auth.userId]
    );

    return NextResponse.json({ success: true, theme });
  } catch (error) {
    console.error('Error updating chat theme:', error);
    return NextResponse.json(
      { error: 'Failed to update chat theme' },
      { status: 500 }
    );
  }
}
