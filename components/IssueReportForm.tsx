'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { compressImageToDataUrl } from '@/lib/image';
import { useAuth } from '@/lib/auth';
import VoiceInput from './VoiceInput';
import type { IssueAnalysis, IssueCategory, Severity } from '@/lib/types';
import CategoryBadge from './CategoryBadge';
import SeverityBar from './SeverityBar';
import PointsToast from './PointsToast';

type Stage = 'capture' | 'analyzing' | 'review' | 'submitting' | 'rejected';

interface Coords {
  lat: number;
  lng: number;
}

export default function IssueReportForm() {
  const router = useRouter();
  const { identity } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [stage, setStage] = useState<Stage>('capture');
  const [analysis, setAnalysis] = useState<IssueAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ points: number; msg: string } | null>(null);

  // Auto-capture GPS on mount.
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError('Location permission denied. You can still submit.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  // Revoke object URLs to avoid leaks.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleFile(f: File) {
    if (!f.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setAnalysis(null);
    setStage('capture');
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  async function runAnalysis() {
    if (!file) return;
    setStage('analyzing');
    setError(null);
    try {
      const fd = new FormData();
      fd.append('image', file);
      if (description) fd.append('description', description);

      const res = await fetch('/api/analyze', { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Analysis failed');
      }
      const { analysis: result } = (await res.json()) as { analysis: IssueAnalysis };
      setAnalysis(result);
      setStage(result.isValid ? 'review' : 'rejected');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setStage('capture');
    }
  }

  async function submitIssue() {
    if (!file || !analysis) return;
    setStage('submitting');
    setError(null);
    try {
      const userId = identity.uid;

      // Compress the photo client-side and store it inline as a data URL.
      // (Firebase Storage now requires the paid Blaze plan, so we keep the
      // image on the Firestore document instead.)
      const imageUrl = await compressImageToDataUrl(file);

      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: analysis.suggestedTitle,
          description,
          category: analysis.category as IssueCategory,
          severity: Math.min(Math.max(Math.round(analysis.severity), 1), 5) as Severity,
          imageUrl,
          lat: coords?.lat ?? 0,
          lng: coords?.lng ?? 0,
          reportedBy: userId,
          reporterName: identity.name,
          reporterEmail: identity.email,
          assignedDept: analysis.routeTo,
          aiAnalysis: {
            isValid: analysis.isValid,
            confidence: analysis.confidence,
            severity: analysis.severity,
            safetyRisk: analysis.safetyRisk,
            reasoning: analysis.reasoning,
            routeTo: analysis.routeTo,
            rejectionReason: analysis.rejectionReason ?? undefined,
          },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not submit issue');
      }

      const data = (await res.json()) as { id: string; deduplicated: boolean };
      setToast({
        points: data.deduplicated ? 5 : 10,
        msg: data.deduplicated
          ? 'Existing nearby report verified!'
          : 'Issue reported!',
      });
      setTimeout(() => router.push(`/issue/${data.id}`), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed.');
      setStage('review');
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      {/* Image upload / preview */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white'
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Issue preview"
            className="max-h-64 w-full rounded-lg object-contain"
          />
        ) : (
          <div className="py-8 text-center">
            <p className="text-3xl">📷</p>
            <p className="mt-2 font-medium text-slate-700">
              Drag &amp; drop a photo, or tap to choose
            </p>
            <p className="text-sm text-slate-400">Show the civic issue clearly</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

      {/* Location status */}
      <div className="flex items-center gap-2 text-sm">
        <span>📍</span>
        {coords ? (
          <span className="text-slate-600">
            Location captured ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
          </span>
        ) : (
          <span className="text-amber-600">{geoError ?? 'Detecting location…'}</span>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-600">
            Description{' '}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <VoiceInput
            onTranscript={(t) =>
              setDescription((d) => (d ? `${d} ${t}` : t))
            }
          />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Type, or tap 🎙️ Speak to describe by voice…"
          rows={3}
          className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Analyze button */}
      {stage !== 'review' && stage !== 'submitting' && (
        <button
          onClick={runAnalysis}
          disabled={!file || stage === 'analyzing'}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {stage === 'analyzing' ? (
            <>
              <Spinner /> AI is analyzing your photo…
            </>
          ) : (
            '✨ Analyze with AI'
          )}
        </button>
      )}

      {/* AI rejection */}
      {stage === 'rejected' && analysis && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-semibold text-red-700">
            ⚠️ This doesn&apos;t look like a reportable civic issue
          </p>
          <p className="mt-1 text-sm text-red-600">
            {analysis.rejectionReason ?? analysis.reasoning}
          </p>
          <button
            onClick={() => {
              setStage('capture');
              setAnalysis(null);
            }}
            className="mt-3 text-sm font-medium text-red-700 underline"
          >
            Try a different photo
          </button>
        </div>
      )}

      {/* AI result + confirm */}
      {(stage === 'review' || stage === 'submitting') && analysis && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">AI Analysis</h3>
            <span className="text-xs text-slate-400">
              {Math.round(analysis.confidence * 100)}% confidence
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={analysis.category as IssueCategory} />
            {analysis.safetyRisk && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                ⚠️ Safety risk
              </span>
            )}
          </div>

          <SeverityBar severity={analysis.severity} />

          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-700">{analysis.suggestedTitle}</p>
            <p className="mt-1 text-slate-500">{analysis.reasoning}</p>
            <p className="mt-2 text-xs font-medium text-blue-600">
              → Routing to: {analysis.routeTo}
            </p>
          </div>

          <button
            onClick={submitIssue}
            disabled={stage === 'submitting'}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-semibold text-white transition hover:bg-green-700 disabled:bg-slate-300"
          >
            {stage === 'submitting' ? (
              <>
                <Spinner /> Submitting…
              </>
            ) : (
              '✅ Confirm & Submit'
            )}
          </button>
        </div>
      )}

      {toast && (
        <PointsToast
          points={toast.points}
          message={toast.msg}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
  );
}
