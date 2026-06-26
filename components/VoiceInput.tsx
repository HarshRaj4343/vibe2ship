'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic } from './icons';

/**
 * Minimal Web Speech API typings (not in the standard DOM lib).
 * On Chrome this is backed by Google's speech engine.
 */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

export default function VoiceInput({
  onTranscript,
}: {
  onTranscript: (text: string) => void;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition;
    if (Ctor) {
      setSupported(true);
      const rec = new Ctor();
      rec.lang = 'en-IN';
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (e) => {
        const text = Array.from({ length: e.results.length })
          .map((_, i) => e.results[i][0].transcript)
          .join(' ');
        onTranscript(text);
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recRef.current = rec;
    }
    return () => recRef.current?.stop();
  }, [onTranscript]);

  if (!supported) return null;

  function toggle() {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      rec.start();
      setListening(true);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
        listening
          ? 'bg-red-600 text-white'
          : 'border border-ink/15 bg-white/70 text-ink/70 hover:bg-white'
      }`}
      title="Describe the issue by voice"
    >
      {listening ? (
        <>
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> Listening…
        </>
      ) : (
        <>
          <Mic className="h-3.5 w-3.5" /> Speak
        </>
      )}
    </button>
  );
}
