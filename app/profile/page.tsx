'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { BADGES, POINTS } from '@/lib/points';
import { UserCircle, ArrowRight } from '@/components/icons';

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
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <div className="skeleton h-28" />
        <div className="grid grid-cols-2 gap-4">
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
        </div>
        <div className="skeleton h-40" />
      </div>
    );
  }

  if (!profile) {
    const POINT_RULES: Array<{ label: string; pts: number }> = [
      { label: 'Report a civic issue', pts: POINTS.REPORT_ISSUE },
      { label: 'Verify a nearby report', pts: POINTS.VERIFY_ISSUE },
      { label: 'Your report gets resolved', pts: POINTS.ISSUE_RESOLVED },
      { label: 'First-ever report bonus', pts: POINTS.FIRST_REPORT },
      { label: '3+ reports in a week (streak)', pts: POINTS.STREAK_BONUS },
    ];
    return (
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/60 bg-gradient-to-r from-sarvam-sky/25 via-white/60 to-sarvam-peach/25 p-8 text-center shadow-[0_10px_40px_-20px_rgba(28,27,46,0.35)] backdrop-blur">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sarvam-sky/30 text-sarvam-blue">
            <UserCircle className="h-9 w-9" />
          </div>
          <h1 className="font-serif text-2xl font-medium text-ink">Start earning civic points</h1>
          <p className="max-w-md text-ink/60">
            Report your first issue and you&apos;ll unlock points and badges as the
            community resolves it. No sign-up required — your progress is saved to this device.
          </p>
          <Link
            href="/report"
            className="btn-primary mt-2 inline-flex items-center gap-2 px-7 py-3 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            Report your first issue <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="glass-card p-6">
          <h2 className="mb-4 font-semibold text-ink">How points work</h2>
          <ul className="divide-y divide-white/60">
            {POINT_RULES.map((r) => (
              <li key={r.label} className="flex items-center justify-between py-3">
                <span className="text-sm text-ink/70">{r.label}</span>
                <span className="rounded-full bg-sarvam-blue/10 px-3 py-1 text-sm font-semibold text-sarvam-blue">
                  +{r.pts}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 font-semibold text-ink">Badges to unlock</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BADGES.map((b) => (
              <div
                key={b.id}
                className="flex flex-col items-center rounded-2xl border border-white/50 bg-white/40 p-4 text-center opacity-60 backdrop-blur transition hover:opacity-80"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.icon} alt={b.name} className="h-14 w-14 object-contain grayscale" />
                <p className="mt-2 text-xs font-medium text-ink/70">{b.name}</p>
                <span className="mt-1 text-[10px] text-ink/40">Locked</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const earnedIds = new Set(profile.badges.map((b) => b.id));

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div className="flex items-center gap-4 rounded-3xl border border-white/60 bg-gradient-to-r from-sarvam-sky/25 via-white/60 to-sarvam-peach/25 p-6 shadow-[0_10px_40px_-20px_rgba(28,27,46,0.35)] backdrop-blur">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sarvam-sky/30 text-sarvam-blue">
          <UserCircle className="h-9 w-9" />
        </div>
        <div className="flex-1">
          <h1 className="font-serif text-2xl font-medium text-ink">{profile.name}</h1>
          <p className="text-xs text-ink/40">ID: {userId}</p>
        </div>
        <div className="text-right">
          <p className="bg-gradient-to-r from-sarvam-blue to-sarvam-orange bg-clip-text font-serif text-3xl font-medium text-transparent">
            {profile.points}
          </p>
          <p className="text-xs text-ink/55">points</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <p className="text-sm text-ink/55">Issues reported</p>
          <p className="mt-1 font-serif text-2xl font-medium text-ink">
            {profile.issuesReported}
          </p>
        </div>
        <div className="glass-card p-5">
          <p className="text-sm text-ink/55">Issues verified</p>
          <p className="mt-1 font-serif text-2xl font-medium text-ink">
            {profile.issuesVerified}
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-ink">Badges</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BADGES.map((b, i) => {
            const earned = earnedIds.has(b.id);
            return (
              <div
                key={b.id}
                style={{ animationDelay: `${i * 110}ms` }}
                className={`group flex flex-col items-center rounded-2xl border p-4 text-center backdrop-blur transition duration-300 ${
                  earned
                    ? 'animate-badge-pop border-sarvam-peach/60 bg-sarvam-peach/25 hover:-translate-y-1 hover:shadow-[0_16px_40px_-20px_rgba(255,138,61,0.6)]'
                    : 'animate-fade-up border-white/50 bg-white/40 opacity-50 hover:opacity-70'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.icon}
                  alt={b.name}
                  className={`h-14 w-14 object-contain transition-transform duration-300 ${
                    earned ? 'group-hover:scale-110 group-hover:-rotate-6' : 'grayscale'
                  }`}
                />
                <p className="mt-2 text-xs font-medium text-ink/70">{b.name}</p>
                {!earned && (
                  <span className="mt-1 text-[10px] text-ink/40">Locked</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
