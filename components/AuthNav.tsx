'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function AuthNav() {
  const { identity, loading, signIn, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (loading) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />;
  }

  if (!identity.isSignedIn) {
    return (
      <div className="relative">
        <button
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              await signIn();
            } catch (e) {
              const code = (e as { code?: string })?.code ?? '';
              // Ignore the user simply closing/cancelling the popup.
              if (
                code !== 'auth/popup-closed-by-user' &&
                code !== 'auth/cancelled-popup-request'
              ) {
                setErr(code || 'Sign-in failed');
              }
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <span className="text-base">🔓</span>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {err && (
          <span className="absolute right-0 top-full mt-1 whitespace-nowrap rounded bg-red-600 px-2 py-1 text-xs text-white shadow">
            {err}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {identity.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={identity.avatarUrl}
          alt={identity.name}
          className="h-8 w-8 rounded-full"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm">
          🦸
        </div>
      )}
      <button
        onClick={() => logout()}
        className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
        title={identity.name}
      >
        Sign out
      </button>
    </div>
  );
}
