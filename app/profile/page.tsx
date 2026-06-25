'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { BADGES } from '@/lib/points';

interface Profile {
  name: string;
  points: number;
  issuesReported: number;
  issuesVerified: number;
  badges: { id: string; name: string }[];
}

export default function ProfilePage() {
  const { identity, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const userId = identity.uid;

  useEffect(() => {
    if (authLoading) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', identity.uid));
        if (snap.exists()) {
          const u = snap.data();
          setProfile({
            name: u.name ?? identity.name,
            points: u.points ?? 0,
            issuesReported: u.issuesReported ?? 0,
            issuesVerified: u.issuesVerified ?? 0,
            badges: u.badges ?? [],
          });
        }
      } catch {
        // empty state
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, identity.uid, identity.name]);

  if (loading || authLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-400">
        Loading profile…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-4xl">🦸</p>
        <p className="mt-3 font-medium text-slate-700">
          You haven&apos;t reported anything yet
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Report your first issue to start earning points and badges.
        </p>
      </div>
    );
  }

  const earnedIds = new Set(profile.badges.map((b) => b.id));

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-3xl">
          🦸
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">{profile.name}</h1>
          <p className="text-xs text-slate-400">ID: {userId}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-blue-600">{profile.points}</p>
          <p className="text-xs text-slate-500">points</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Issues reported</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {profile.issuesReported}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Issues verified</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {profile.issuesVerified}
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-slate-900">Badges</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BADGES.map((b) => {
            const earned = earnedIds.has(b.id);
            return (
              <div
                key={b.id}
                className={`flex flex-col items-center rounded-xl border p-4 text-center ${
                  earned
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-slate-200 bg-slate-50 opacity-50'
                }`}
              >
                <span className="text-3xl">{earned ? '🏅' : '🔒'}</span>
                <p className="mt-2 text-xs font-medium text-slate-700">{b.name}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
