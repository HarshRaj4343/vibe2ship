'use client';

import { useEffect } from 'react';

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
      <div className="animate-toast-in flex items-center gap-3 rounded-xl bg-slate-900 px-5 py-3 text-white shadow-2xl">
        <span className="text-2xl">🎉</span>
        <div>
          <p className="text-sm font-semibold">+{points} points!</p>
          {message && <p className="text-xs text-slate-300">{message}</p>}
        </div>
      </div>
    </div>
  );
}
