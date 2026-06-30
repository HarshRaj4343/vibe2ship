import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * POST /api/translate — Google Cloud Translation API (v2 REST) proxy.
 *
 * Body: { texts: string[], target: 'hi' | 'en', source?: string }
 * Returns: { translations: string[] } — same order as `texts`.
 *
 * Powers the Hindi/English bilingual UI: the client sends English source
 * strings and gets back Devanagari Hindi (or vice-versa). Translations are
 * cached client-side so this is called at most once per string per language.
 *
 * Uses a server-only `GOOGLE_TRANSLATE_API_KEY` (an API key with the Cloud
 * Translation API enabled). If it's unset, we gracefully echo the source text
 * back so the app never breaks during local dev / the build.
 */
export async function POST(req: NextRequest) {
  try {
    const { texts, target, source } = (await req.json()) as {
      texts: string[];
      target: string;
      source?: string;
    };

    if (!Array.isArray(texts) || texts.length === 0 || !target) {
      return NextResponse.json(
        { error: 'Provide { texts: string[], target: string }' },
        { status: 400 },
      );
    }

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
      // No key configured — passthrough so the UI degrades gracefully.
      return NextResponse.json({ translations: texts, passthrough: true });
    }

    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: texts,
          target,
          ...(source ? { source } : {}),
          format: 'text',
        }),
      },
    );

    if (!res.ok) {
      const detail = await res.text();
      console.error('Cloud Translation API error:', detail.slice(0, 300));
      // Fail soft: return the originals rather than blanking the UI.
      return NextResponse.json({ translations: texts, passthrough: true });
    }

    const data = (await res.json()) as {
      data?: { translations?: Array<{ translatedText: string }> };
    };
    const translations =
      data.data?.translations?.map((t) => t.translatedText) ?? texts;

    return NextResponse.json({ translations });
  } catch (err) {
    console.error('Translation request failed:', err);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
