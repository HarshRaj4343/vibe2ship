'use client';

/**
 * Lightweight anonymous identity. The hackathon build has no auth provider, so
 * each browser gets a stable random citizen id persisted in localStorage. This
 * is what we pass as `reportedBy` / `userId` to the API.
 */
const KEY = 'urbanpulse-user-id';

/**
 * Stable per-browser anonymous id, used as a fallback identity when the citizen
 * has not signed in with Google. Prefer the `identity` from `useAuth()` in
 * components — this is the underlying anonymous source it falls back to.
 */
export function getAnonId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id =
      'citizen_' +
      (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 12));
    window.localStorage.setItem(KEY, id);
  }
  return id;
}

/** @deprecated use the `identity.uid` from `useAuth()` instead. */
export const getUserId = getAnonId;
