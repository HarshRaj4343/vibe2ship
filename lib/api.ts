import { NextResponse } from 'next/server';
import { GeminiQuotaError } from '@/lib/gemini';

/**
 * Turn a thrown error from a Gemini-backed route into a graceful HTTP response:
 *  - quota / rate-limit  → 429 + Retry-After  ("AI is busy, try again")
 *  - everything else      → the given fallback status (default 502)
 *
 * Centralizing this keeps every AI route degrading the same way, so a bad model
 * response or a hammered free-tier quota shows a friendly message instead of a
 * raw 500 that breaks the UI.
 */
export function geminiErrorResponse(
  err: unknown,
  fallbackMessage: string,
  fallbackStatus = 502,
): NextResponse {
  if (err instanceof GeminiQuotaError) {
    const retrySec = err.retryAfterMs
      ? Math.ceil(err.retryAfterMs / 1000)
      : 8;
    return NextResponse.json(
      { error: err.message, retryAfterSec: retrySec, quota: true },
      { status: 429, headers: { 'Retry-After': String(retrySec) } },
    );
  }
  return NextResponse.json({ error: fallbackMessage }, { status: fallbackStatus });
}
