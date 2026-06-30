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
import { Camera, MapPin, Sparkles, AlertTriangle, ArrowRight, Check } from './icons';

type Stage = 'capture' | 'analyzing' | 'review' | 'submitting' | 'rejected';

const STEPS = ['Photo', 'AI triage', 'Confirm'] as const;
const AGENT_STEPS = ['Validate', 'Categorize', 'Severity', 'Route'] as const;

interface Coords {
  lat: number;
  lng: number;
}

export default function IssueReportForm() {
  const router = useRouter();
  const { identity } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null); // camera (capture)
  const galleryInputRef = useRef<HTMLInputElement>(null); // gallery upload

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [heard, setHeard] = useState<{
    transcript: string;
    language: string;
  } | null>(null);
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

  const activeStep =
    stage === 'analyzing'
      ? 1
      : stage === 'review' || stage === 'submitting'
        ? 2
        : 0;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <StepIndicator active={activeStep} />

      {/* Image upload / preview */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => preview && fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-6 backdrop-blur transition ${
          dragActive
            ? 'border-sarvam-blue bg-sarvam-sky/15'
            : 'border-ink/20 bg-white/50'
        } ${preview ? 'cursor-pointer' : ''}`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Issue preview"
            className="max-h-64 w-full rounded-lg object-contain"
          />
        ) : (
          <div className="py-6 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sarvam-sky/25 text-sarvam-blue">
              <Camera className="h-7 w-7" />
            </span>
            <p className="mt-3 font-medium text-ink/80">Take a photo of the issue</p>
            <p className="mt-0.5 text-sm text-ink/45">
              Point your camera at the pothole, leak, light or waste
            </p>
            {/* Camera-first: the big button opens the camera; gallery is secondary. */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary inline-flex min-h-[44px] items-center gap-2 px-5 py-3 text-sm"
              >
                <Camera className="h-4 w-4" /> Take a photo
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="btn-ghost inline-flex min-h-[44px] items-center px-5 py-3 text-sm"
              >
                Upload
              </button>
            </div>
          </div>
        )}
        {/* Camera input (rear camera on mobile) */}
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
        {/* Gallery input (no capture → file picker) */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

      {/* Location status */}
      <div className="flex items-center gap-2 text-sm">
        <MapPin className="h-4 w-4 text-sarvam-blue" />
        {coords ? (
          <span className="text-ink/65">
            Location captured ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
          </span>
        ) : (
          <span className="text-sarvam-orange">{geoError ?? 'Detecting location…'}</span>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-ink/65">
            Description{' '}
            <span className="font-normal text-ink/40">(optional)</span>
          </label>
          <VoiceInput
            onTranscript={(t) =>
              setDescription((d) => (d ? `${d} ${t}` : t))
            }
            onDetected={(info) => setHeard(info)}
          />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Type, or tap Speak to describe by voice…"
          rows={3}
          className="w-full rounded-2xl border border-ink/15 bg-white/60 p-3 text-sm backdrop-blur focus:border-sarvam-blue focus:outline-none focus:ring-1 focus:ring-sarvam-blue"
        />
        {heard && heard.language.toLowerCase() !== 'english' && heard.transcript && (
          <p className="rounded-xl bg-sarvam-sky/20 px-3 py-2 text-xs text-ink/60">
            🎙️ Heard ({heard.language}): &ldquo;{heard.transcript}&rdquo; —
            transcribed to English above.
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Analyze button */}
      {stage !== 'review' && stage !== 'submitting' && (
        <button
          onClick={runAnalysis}
          disabled={!file || stage === 'analyzing'}
          className="btn-primary flex w-full items-center justify-center gap-2 py-3.5"
        >
          {stage === 'analyzing' ? (
            <>
              <Spinner /> AI is analyzing your photo…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Analyze with AI
            </>
          )}
        </button>
      )}

      {/* Live view of the 4-step agent while it works */}
      {stage === 'analyzing' && (
        <div className="glass-card space-y-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sarvam-blue">
            Gemini Vision agent · running
          </p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {AGENT_STEPS.map((label, i) => (
              <li
                key={label}
                className="flex items-center gap-2 rounded-2xl bg-white/50 px-3 py-2 text-xs text-ink/70"
                style={{ animation: `toast-in 0.4s ease-out ${i * 0.12}s both` }}
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sarvam-orange" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI rejection */}
      {stage === 'rejected' && analysis && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-red-700">
            <AlertTriangle className="h-4 w-4" /> This doesn&apos;t look like a reportable civic issue
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
        <div className="glass-card-lg space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ink">AI Analysis</h3>
            <span className="text-xs text-ink/40">
              {Math.round(analysis.confidence * 100)}% confidence
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={analysis.category as IssueCategory} />
            {analysis.safetyRisk && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                <AlertTriangle className="h-3.5 w-3.5" /> Safety risk
              </span>
            )}
          </div>

          <SeverityBar severity={analysis.severity} />

          <div className="rounded-2xl bg-white/50 p-3 text-sm">
            <p className="font-medium text-ink">{analysis.suggestedTitle}</p>
            <p className="mt-1 text-ink/60">{analysis.reasoning}</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-sarvam-blue">
              <ArrowRight className="h-3.5 w-3.5" /> Routing to: {analysis.routeTo}
            </p>
          </div>

          <button
            onClick={submitIssue}
            disabled={stage === 'submitting'}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-green-600 py-3.5 font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {stage === 'submitting' ? (
              <>
                <Spinner /> Submitting…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> Confirm &amp; Submit
              </>
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

function StepIndicator({ active }: { active: number }) {
  return (
    <div className="flex items-center">
      {STEPS.map((label, i) => (
        <div key={label} className="flex flex-1 items-center last:flex-none">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition ${
                i <= active
                  ? 'bg-gradient-to-br from-sarvam-blue to-sarvam-orange text-white'
                  : 'bg-ink/10 text-ink/40'
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`text-sm font-medium ${
                i <= active ? 'text-ink' : 'text-ink/40'
              }`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`mx-3 h-0.5 flex-1 rounded-full transition ${
                i < active ? 'bg-sarvam-blue' : 'bg-ink/10'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
