import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';

interface GiphyImage {
  url: string;
  width: string;
  height: string;
}

interface GiphyGif {
  id: string;
  title: string;
  images: {
    original: GiphyImage;
    fixed_width_small: GiphyImage;
  };
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(25, parseInt(searchParams.get('limit') || '20'));
  const offset = parseInt(searchParams.get('offset') || '0');

  const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Giphy API key not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=${limit}&offset=${offset}&rating=pg-13`
    );
    const data = await res.json();

    const gifs = ((data.data || []) as GiphyGif[]).map((g) => ({
      id: g.id,
      url: g.images.original.url,
      preview_url: g.images.fixed_width_small.url,
      width: parseInt(g.images.original.width),
      height: parseInt(g.images.original.height),
      title: g.title,
    }));

    return NextResponse.json({ gifs });
  } catch (error) {
    console.error('GIF trending error:', error);
    return NextResponse.json({ error: 'Failed to fetch trending GIFs' }, { status: 500 });
  }
}
