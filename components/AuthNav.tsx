'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { UserCircle } from '@/components/icons';

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
          className="flex items-center gap-2 whitespace-nowrap rounded-full border border-ink/15 bg-white/80 px-4 py-1.5 text-sm font-medium text-ink transition hover:bg-white disabled:opacity-60"
        >
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
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sarvam-sky/40 text-sarvam-blue">
          <UserCircle className="h-5 w-5" />
        </div>
      )}
      <button
        onClick={() => logout()}
        className="rounded-full px-3 py-1 text-xs font-medium text-ink/60 transition hover:bg-white/60 hover:text-ink"
        title={identity.name}
      >
        Sign out
      </button>
    </div>
  );
}
