'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic } from './icons';

/**
 * Voice intake powered by Gemini multimodal. The citizen taps once to record,
 * speaks the issue in Hindi or English, taps again to stop; the clip is sent to
 * /api/transcribe where Gemini transcribes it and returns clean English, which
 * we hand back via onTranscript. onDetected (optional) surfaces the raw
 * transcript + detected language so the caller can show "Heard (Hindi): …".
 *
 * Falls back silently (renders nothing) on browsers without MediaRecorder.
 */

type Phase = 'idle' | 'recording' | 'transcribing';

// Pick an audio container the browser can actually produce.
function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

export default function VoiceInput({
  onTranscript,
  onDetected,
}: {
  onTranscript: (text: string) => void;
  onDetected?: (info: { transcript: string; language: string }) => void;
}) {
  const [supported, setSupported] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
        typeof MediaRecorder !== 'undefined' &&
        !!navigator.mediaDevices?.getUserMedia,
    );
    return () => stopStream();
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => transcribe(recorder.mimeType);
      recorder.start();
      recorderRef.current = recorder;
      setPhase('recording');
    } catch {
      setError('Mic access denied. Check browser permissions.');
      setPhase('idle');
    }
  }

  function stop() {
    recorderRef.current?.stop();
    stopStream();
    setPhase('transcribing');
  }

  async function transcribe(mimeType: string) {
    const blob = new Blob(chunksRef.current, {
      type: mimeType || 'audio/webm',
    });
    if (blob.size === 0) {
      setError('Nothing recorded. Try again.');
      setPhase('idle');
      return;
    }
    try {
      const fd = new FormData();
      fd.append('audio', blob, 'report.webm');
      const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transcription failed');

      const { transcript, english, language } = data.transcription;
      onTranscript(english);
      onDetected?.({ transcript, language });
      setPhase('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transcription failed');
      setPhase('idle');
    }
  }

  if (!supported) return null;

  const label =
    phase === 'recording'
      ? 'Stop & transcribe'
      : phase === 'transcribing'
        ? 'Transcribing…'
        : 'Speak (हिंदी / English)';

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={phase === 'recording' ? stop : phase === 'idle' ? start : undefined}
        disabled={phase === 'transcribing'}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-70 ${
          phase === 'recording'
            ? 'bg-red-600 text-white'
            : 'border border-ink/15 bg-white/70 text-ink/70 hover:bg-white'
        }`}
        title="Describe the issue by voice — Hindi or English"
      >
        {phase === 'recording' ? (
          <>
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> {label}
          </>
        ) : phase === 'transcribing' ? (
          <>
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink/30 border-t-ink/70" />{' '}
            {label}
          </>
        ) : (
          <>
            <Mic className="h-3.5 w-3.5" /> {label}
          </>
        )}
      </button>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
}
