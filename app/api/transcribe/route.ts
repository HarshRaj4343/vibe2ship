import { NextRequest, NextResponse } from 'next/server';
import { transcribeVoiceReport } from '@/lib/gemini';

export const runtime = 'nodejs';

/**
 * Voice intake: accepts a recorded audio clip (multipart form, field "audio")
 * of a citizen speaking a civic issue — in Hindi or English — and returns a
 * Gemini-transcribed { transcript, english, language }. The client drops the
 * English text into the report description, then the normal photo-analysis
 * pipeline takes over.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get('audio') as File | null;

    if (!audio) {
      return NextResponse.json({ error: 'Audio required' }, { status: 400 });
    }
    // Guard against oversized uploads (free-tier inline payload limits).
    if (audio.size > 8_000_000) {
      return NextResponse.json(
        { error: 'Recording too long. Please keep it under ~1 minute.' },
        { status: 413 },
      );
    }

    const bytes = await audio.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    const result = await transcribeVoiceReport(
      base64,
      audio.type || 'audio/webm',
    );

    if (!result.english) {
      return NextResponse.json(
        { error: "Couldn't make out the recording. Try again in a quiet spot." },
        { status: 422 },
      );
    }

    return NextResponse.json({ transcription: result });
  } catch (err) {
    console.error('Voice transcription failed:', err);
    return NextResponse.json(
      { error: 'Transcription failed. Please try again.' },
      { status: 500 },
    );
  }
}
