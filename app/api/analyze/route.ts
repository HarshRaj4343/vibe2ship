import { NextRequest, NextResponse } from 'next/server';
import { analyzeIssue } from '@/lib/gemini';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File | null;
    const description = formData.get('description') as string | null;

    if (!image) {
      return NextResponse.json({ error: 'Image required' }, { status: 400 });
    }

    const bytes = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    const analysis = await analyzeIssue(
      base64,
      image.type || 'image/jpeg',
      description ?? undefined,
    );

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error('Gemini analysis failed:', err);
    return NextResponse.json(
      { error: 'AI analysis failed. Please try again with a clearer photo.' },
      { status: 500 },
    );
  }
}
