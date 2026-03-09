import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await request.formData();
    const file = formData.get('audio') as File | null;
    const duration = parseFloat(formData.get('duration') as string || '0');

    if (!file) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const uuid = randomUUID();
    const ext = file.type.includes('webm') ? 'webm' : file.type.includes('mp4') ? 'mp4' : 'ogg';
    const filename = `${uuid}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'voice');

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);

    return NextResponse.json({
      url: `/uploads/voice/${filename}`,
      duration: Math.round(duration),
    });
  } catch (error) {
    console.error('Voice upload error:', error);
    return NextResponse.json({ error: 'Failed to upload voice message' }, { status: 500 });
  }
}
