'use client';

import { useEffect } from 'react';
import { Sparkles } from './icons';

export default function PointsToast({
  points,
  message,
  onDone,
}: {
  points: number;
  message?: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="animate-toast-in flex items-center gap-3 rounded-full bg-ink px-5 py-3 text-white shadow-2xl">
        <Sparkles className="h-6 w-6 text-sarvam-peach" />
        <div>
          <p className="text-sm font-semibold">+{points} points!</p>
          {message && <p className="text-xs text-white/70">{message}</p>}
        </div>
      </div>
    </div>
  );
}
