'use client';

import { useRef, useState } from 'react';
import { compressImageToDataUrl } from '@/lib/image';
import type { ResolutionVerification } from '@/lib/types';
import { Search, Camera, Check, AlertTriangle } from './icons';

type Stage = 'idle' | 'verifying' | 'done';

export default function ResolutionVerifier({
  issueId,
  existing,
  onVerified,
}: {
  issueId: string;
  existing?: ResolutionVerification;
  onVerified: (r: ResolutionVerification) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>(existing ? 'done' : 'idle');
  const [result, setResult] = useState<ResolutionVerification | null>(
    existing ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setStage('verifying');
    setError(null);
    try {
      const afterImageUrl = await compressImageToDataUrl(file);
      const res = await fetch('/api/verify-resolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId, afterImageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Verification failed');
      setResult(data.resolution);
      setStage('done');
      onVerified(data.resolution);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
      setStage('idle');
    }
  }

  return (
    <div className="rounded-3xl border border-emerald-200/70 bg-emerald-50/40 p-4 backdrop-blur">
      <h3 className="flex items-center gap-2 font-semibold text-ink">
        <Search className="h-5 w-5 text-emerald-600" /> AI Resolution Verification
      </h3>
      <p className="mt-1 text-sm text-ink/55">
        Upload an &ldquo;after&rdquo; photo and the agent will compare it to the
        original to confirm the fix.
      </p>

      {stage !== 'done' && (
        <>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={stage === 'verifying'}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40"
          >
            {stage === 'verifying' ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Agent comparing photos…
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" /> Upload “after” photo
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            {result.afterImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result.afterImageUrl}
                alt="After"
                className="h-20 w-20 rounded-lg object-cover"
              />
            )}
            <div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  result.isResolved
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {result.isResolved ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" />
                )}{' '}
                {result.verdict}
              </span>
              <p className="mt-1 text-xs text-ink/40">
                {Math.round(result.confidence * 100)}% confidence
              </p>
            </div>
          </div>
          <p className="text-sm text-ink/65">{result.reasoning}</p>
          {result.remainingIssues &&
            result.remainingIssues.toLowerCase() !== 'none' && (
              <p className="text-sm text-amber-700">
                Still outstanding: {result.remainingIssues}
              </p>
            )}
        </div>
      )}
    </div>
  );
}
