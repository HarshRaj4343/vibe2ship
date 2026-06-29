'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { compressImageToDataUrl } from '@/lib/image';
import { useAuth } from '@/lib/auth';
import VoiceInput from './VoiceInput';
import AgentTrace from './AgentTrace';
import type { AgentStep, DispatchState } from '@/lib/types';
import { Camera, MapPin, Bot, AlertTriangle, Check, Send, Mail, X } from './icons';

interface AgentResult {
  issueId?: string;
  deduplicated: boolean;
  rejected: boolean;
  summary: string;
  dispatch?: DispatchState;
  complaint?: { referenceId: string; subject: string; body: string };
}

type Stage = 'capture' | 'running' | 'done' | 'error';

interface Coords {
  lat: number;
  lng: number;
}

export default function AgentIntake() {
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
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchDone, setDispatchDone] = useState<'approved' | 'rejected' | null>(null);

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
    setSteps([]);
    setResult(null);
    setStage('capture');
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  async function runAgent() {
    if (!file) return;
    setStage('running');
    setError(null);
    setSteps([]);
    setResult(null);

    try {
      const imageUrl = await compressImageToDataUrl(file);
      const res = await fetch('/api/agent/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          description,
          lat: coords?.lat ?? 0,
          lng: coords?.lng ?? 0,
          reportedBy: identity.uid,
          reporterName: identity.name,
          reporterEmail: identity.email,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error('Could not start the agent.');
      }

      // Parse the SSE stream frame by frame.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          const line = frame.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          const payload = JSON.parse(line.slice(6));
          handleEvent(payload);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The agent run failed.');
      setStage('error');
    }
  }

  function handleEvent(payload: {
    type: string;
    step?: AgentStep;
    result?: AgentResult;
    error?: string;
  }) {
    if (payload.type === 'step' && payload.step) {
      setSteps((prev) => [...prev, payload.step!]);
    } else if (payload.type === 'result' && payload.result) {
      setResult(payload.result);
      setStage('done');
    } else if (payload.type === 'error') {
      setError(payload.error ?? 'The agent run failed.');
      setStage('error');
    }
  }

  async function decide(action: 'approve' | 'reject') {
    if (!result?.issueId) return;
    setDispatching(true);
    try {
      const res = await fetch('/api/agent/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueId: result.issueId,
          action,
          decidedBy: identity.uid,
        }),
      });
      if (res.ok) {
        setDispatchDone(action === 'approve' ? 'approved' : 'rejected');
        setTimeout(() => router.push(`/issue/${result.issueId}`), 900);
      }
    } finally {
      setDispatching(false);
    }
  }

  const running = stage === 'running';

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
        onClick={() => !running && fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-6 backdrop-blur transition ${
          dragActive
            ? 'border-sarvam-blue bg-sarvam-sky/15'
            : 'border-ink/20 bg-white/50'
        } ${running ? 'pointer-events-none opacity-80' : ''}`}
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
            <Camera className="mx-auto h-8 w-8 text-ink/40" />
            <p className="mt-2 font-medium text-ink/70">
              Drag &amp; drop a photo, or tap to choose
            </p>
            <p className="text-sm text-ink/40">The agent will take it from here</p>
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
            Description <span className="font-normal text-ink/40">(optional)</span>
          </label>
          <VoiceInput onTranscript={(t) => setDescription((d) => (d ? `${d} ${t}` : t))} />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={running}
          placeholder="Type, or tap Speak to describe by voice…"
          rows={3}
          className="w-full rounded-2xl border border-ink/15 bg-white/60 p-3 text-sm backdrop-blur focus:border-sarvam-blue focus:outline-none focus:ring-1 focus:ring-sarvam-blue disabled:opacity-60"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Run button */}
      {(stage === 'capture' || stage === 'error') && (
        <button
          onClick={runAgent}
          disabled={!file}
          className="btn-primary flex w-full items-center justify-center gap-2 py-3.5"
        >
          <Bot className="h-4 w-4" /> Run the autonomous agent
        </button>
      )}

      {/* Live agent trace */}
      {(running || stage === 'done') && steps.length > 0 && (
        <div className="glass-card-lg space-y-4 p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sarvam-blue">
              <Bot className="h-4 w-4" /> Agent trace {running ? '· live' : ''}
            </p>
            {running && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sarvam-blue opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sarvam-blue" />
              </span>
            )}
          </div>
          <AgentTrace steps={steps} running={running} />
        </div>
      )}

      {/* Outcome */}
      {stage === 'done' && result && (
        <Outcome
          result={result}
          dispatching={dispatching}
          dispatchDone={dispatchDone}
          onDecide={decide}
          onView={() =>
            result.issueId
              ? router.push(`/issue/${result.issueId}`)
              : router.push('/map')
          }
        />
      )}
    </div>
  );
}

function Outcome({
  result,
  dispatching,
  dispatchDone,
  onDecide,
  onView,
}: {
  result: AgentResult;
  dispatching: boolean;
  dispatchDone: 'approved' | 'rejected' | null;
  onDecide: (action: 'approve' | 'reject') => void;
  onView: () => void;
}) {
  // Rejected as not a civic issue.
  if (result.rejected) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <p className="flex items-center gap-2 font-semibold text-red-700">
          <AlertTriangle className="h-4 w-4" /> Not filed
        </p>
        <p className="mt-1 text-sm text-red-600">{result.summary}</p>
      </div>
    );
  }

  // Folded into an existing nearby report.
  if (result.deduplicated) {
    return (
      <div className="glass-card-lg space-y-3 p-5">
        <p className="flex items-center gap-2 font-semibold text-ink">
          <Check className="h-5 w-5 text-emerald-600" /> Verified an existing report
        </p>
        <p className="text-sm text-ink/65">{result.summary}</p>
        <button onClick={onView} className="btn-primary w-full py-3">
          View the report
        </button>
      </div>
    );
  }

  // New issue created, complaint queued — human approval checkpoint.
  return (
    <div className="glass-card-lg space-y-4 p-5">
      <p className="flex items-center gap-2 font-semibold text-ink">
        <Mail className="h-5 w-5 text-sarvam-blue" /> Complaint queued for dispatch
      </p>
      <p className="text-sm text-ink/65">{result.summary}</p>

      {result.complaint && (
        <div className="rounded-2xl bg-white/55 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
            Ref {result.complaint.referenceId}
          </p>
          <p className="mt-1 font-medium text-ink">{result.complaint.subject}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink/65">
            {result.complaint.body}
          </p>
        </div>
      )}

      {dispatchDone ? (
        <p
          className={`flex items-center gap-2 rounded-2xl p-3 text-sm font-medium ${
            dispatchDone === 'approved'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-ink/5 text-ink/60'
          }`}
        >
          {dispatchDone === 'approved' ? (
            <>
              <Send className="h-4 w-4" /> Dispatched to the department. Opening the issue…
            </>
          ) : (
            <>
              <X className="h-4 w-4" /> Dispatch rejected. Opening the issue…
            </>
          )}
        </p>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-sarvam-peach/50 bg-sarvam-peach/15 p-3">
          <p className="text-sm font-medium text-ink/70">
            Human checkpoint — approve before it&apos;s sent.
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => onDecide('reject')}
              disabled={dispatching}
              className="btn-ghost flex items-center gap-1.5 px-4 py-2 text-sm disabled:opacity-50"
            >
              <X className="h-4 w-4" /> Reject
            </button>
            <button
              onClick={() => onDecide('approve')}
              disabled={dispatching}
              className="flex items-center gap-1.5 rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> Approve &amp; dispatch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
