'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { CityBriefing } from '@/lib/types';
import { Radar, RotateCw, Target, Flame, Building } from '@/components/icons';

export default function CommandCenterPage() {
  const [briefing, setBriefing] = useState<CityBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/briefing', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setBriefing(data.briefing);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load briefing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-sarvam-blue ring-1 ring-white/60 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sarvam-blue opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sarvam-blue" />
              </span>
              AI AGENT · LIVE
            </span>
          </div>
          <h1 className="mt-2 flex items-center gap-2.5 font-serif text-3xl font-medium text-ink">
            <Radar className="h-7 w-7 text-sarvam-blue" /> Municipal Command Center
          </h1>
          <p className="text-sm text-ink/60">
            An autonomous agent reasons across every open issue to tell the city
            what to fix first.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="btn-primary flex items-center gap-2 px-5 py-2 text-sm"
        >
          {loading ? (
            'Analyzing…'
          ) : (
            <>
              <RotateCw className="h-4 w-4" /> Re-run agent
            </>
          )}
        </button>
      </div>

      {loading && (
        <div className="mt-8 space-y-4">
          <div className="skeleton h-24" />
          <div className="skeleton h-64" />
        </div>
      )}

      {error && !loading && (
        <div className="mt-8 rounded-3xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {briefing && !loading && (
        <div className="mt-6 space-y-6">
          {/* Situational summary */}
          <div className="rounded-3xl border border-white/60 bg-gradient-to-br from-sarvam-sky/25 via-white/60 to-sarvam-peach/25 p-6 shadow-[0_10px_40px_-20px_rgba(28,27,46,0.35)] backdrop-blur">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-sarvam-blue">
              Situational overview
            </h2>
            <p className="mt-2 font-serif text-xl leading-relaxed text-ink">
              {briefing.summary}
            </p>
            <p className="mt-3 text-xs text-ink/40">
              Generated {new Date(briefing.generatedAt).toLocaleString()}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Top priority actions */}
            <div className="lg:col-span-2">
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink">
                <Target className="h-5 w-5 text-sarvam-blue" /> Today&apos;s priority actions
              </h2>
              {briefing.topActions.length === 0 ? (
                <EmptyState text="No urgent actions." />
              ) : (
                <ol className="space-y-3">
                  {briefing.topActions.map((a) => (
                    <li
                      key={a.issueId}
                      className="glass-card flex gap-3 p-4"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sarvam-blue to-sarvam-orange text-sm font-bold text-white">
                        {a.priority}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/issue/${a.issueId}`}
                          className="font-medium text-ink hover:text-sarvam-blue"
                        >
                          {a.title}
                        </Link>
                        <p className="mt-0.5 text-sm text-ink/60">{a.reason}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Hotspots + dept load */}
            <div className="space-y-6">
              <div>
                <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink">
                  <Flame className="h-5 w-5 text-sarvam-orange" /> Hotspots
                </h2>
                {briefing.hotspots.length === 0 ? (
                  <EmptyState text="No clusters detected." />
                ) : (
                  <div className="space-y-2">
                    {briefing.hotspots.map((h, i) => (
                      <div
                        key={i}
                        className="rounded-2xl border border-sarvam-peach/50 bg-sarvam-peach/20 p-3 backdrop-blur"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-ink">{h.area}</span>
                          <span className="rounded-full bg-sarvam-orange px-2 py-0.5 text-xs font-semibold text-white">
                            {h.count}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-ink/55">{h.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink">
                  <Building className="h-5 w-5 text-ink/60" /> Department load
                </h2>
                {briefing.departmentLoad.length === 0 ? (
                  <EmptyState text="No open work." />
                ) : (
                  <div className="space-y-2">
                    {briefing.departmentLoad.map((d, i) => (
                      <div
                        key={i}
                        className="glass-card flex items-center justify-between rounded-2xl px-3 py-2 text-sm"
                      >
                        <span className="text-ink/70">{d.department}</span>
                        <span className="font-semibold text-ink">{d.open}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/20 p-6 text-center text-sm text-ink/40">
      {text}
    </div>
  );
}
