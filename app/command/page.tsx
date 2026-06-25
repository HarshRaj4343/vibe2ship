'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { CityBriefing } from '@/lib/types';

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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
              </span>
              AI AGENT · LIVE
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            🛰️ Municipal Command Center
          </h1>
          <p className="text-sm text-slate-500">
            An autonomous agent reasons across every open issue to tell the city
            what to fix first.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-300"
        >
          {loading ? 'Analyzing…' : '↻ Re-run agent'}
        </button>
      </div>

      {loading && (
        <div className="mt-8 space-y-4">
          <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
        </div>
      )}

      {error && !loading && (
        <div className="mt-8 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {briefing && !loading && (
        <div className="mt-6 space-y-6">
          {/* Situational summary */}
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-500">
              Situational overview
            </h2>
            <p className="mt-2 text-lg leading-relaxed text-slate-800">
              {briefing.summary}
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Generated {new Date(briefing.generatedAt).toLocaleString()}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Top priority actions */}
            <div className="lg:col-span-2">
              <h2 className="mb-3 font-semibold text-slate-900">
                🎯 Today&apos;s priority actions
              </h2>
              {briefing.topActions.length === 0 ? (
                <EmptyState text="No urgent actions." />
              ) : (
                <ol className="space-y-3">
                  {briefing.topActions.map((a) => (
                    <li
                      key={a.issueId}
                      className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                        {a.priority}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/issue/${a.issueId}`}
                          className="font-medium text-slate-900 hover:text-indigo-600"
                        >
                          {a.title}
                        </Link>
                        <p className="mt-0.5 text-sm text-slate-500">{a.reason}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Hotspots + dept load */}
            <div className="space-y-6">
              <div>
                <h2 className="mb-3 font-semibold text-slate-900">🔥 Hotspots</h2>
                {briefing.hotspots.length === 0 ? (
                  <EmptyState text="No clusters detected." />
                ) : (
                  <div className="space-y-2">
                    {briefing.hotspots.map((h, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-orange-100 bg-orange-50 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-800">{h.area}</span>
                          <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-semibold text-white">
                            {h.count}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{h.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="mb-3 font-semibold text-slate-900">
                  🏢 Department load
                </h2>
                {briefing.departmentLoad.length === 0 ? (
                  <EmptyState text="No open work." />
                ) : (
                  <div className="space-y-2">
                    {briefing.departmentLoad.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <span className="text-slate-700">{d.department}</span>
                        <span className="font-semibold text-slate-900">{d.open}</span>
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
    <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}
