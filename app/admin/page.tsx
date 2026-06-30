'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import type { SerializedIssue } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/types';
import {
  SLA_DAYS,
  ageDays,
  slaDays,
  isOverdue,
  overdueByDays,
  departmentSLA,
} from '@/lib/sla';
import { neighborhoodScores, cityCivicScore } from '@/lib/civic';
import type { CivicGrade } from '@/lib/civic';
import EmptyState from '@/components/EmptyState';
import {
  Building,
  AlertTriangle,
  Clock,
  CheckCircle,
  Target,
  MapPin,
} from '@/components/icons';

const GRADE_STYLE: Record<CivicGrade, string> = {
  A: 'bg-emerald-100 text-emerald-700',
  B: 'bg-lime-100 text-lime-700',
  C: 'bg-amber-100 text-amber-700',
  D: 'bg-orange-100 text-orange-700',
  F: 'bg-red-100 text-red-700',
};

function fmtDays(d: number): string {
  const v = Math.round(d * 10) / 10;
  return `${v}d`;
}

export default function AdminPage() {
  const [issues, setIssues] = useState<SerializedIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/issues').then((r) => r.json());
        setIssues(res.issues ?? []);
      } catch {
        // leave empty state
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const deptRows = useMemo(() => departmentSLA(issues), [issues]);
  const hoods = useMemo(() => neighborhoodScores(issues), [issues]);
  const cityScore = useMemo(() => cityCivicScore(issues), [issues]);

  const overdue = useMemo(
    () =>
      issues
        .filter((i) => isOverdue(i))
        .sort((a, b) => overdueByDays(b) - overdueByDays(a)),
    [issues],
  );

  const summary = useMemo(() => {
    const unresolved = issues.filter((i) => i.status !== 'resolved');
    const resolved = issues.filter((i) => i.status === 'resolved');
    const onTime = resolved.filter(
      (i) => (i.updatedAt - i.createdAt) / 86_400_000 <= slaDays(i),
    ).length;
    return {
      open: unresolved.length,
      overdue: overdue.length,
      onTimePct: resolved.length
        ? Math.round((onTime / resolved.length) * 100)
        : 100,
      depts: deptRows.length,
    };
  }, [issues, overdue, deptRows]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <div className="skeleton h-9 w-72" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
        <div className="skeleton h-64" />
      </div>
    );
  }

  const cards = [
    {
      label: 'Open issues',
      value: summary.open,
      icon: <Clock className="h-5 w-5" />,
      accent: '#3B82F6',
    },
    {
      label: 'Overdue (SLA breached)',
      value: summary.overdue,
      icon: <AlertTriangle className="h-5 w-5" />,
      accent: '#EF4444',
    },
    {
      label: 'Resolved on time',
      value: `${summary.onTimePct}%`,
      icon: <CheckCircle className="h-5 w-5" />,
      accent: '#22C55E',
    },
    {
      label: 'Departments tracked',
      value: summary.depts,
      icon: <Building className="h-5 w-5" />,
      accent: '#A855F7',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-sarvam-orange">Accountability</p>
          <h1 className="font-serif text-3xl font-medium text-ink">
            Department SLA Board
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink/55">
            Every issue carries a resolution target based on its severity. This
            board tracks which departments are keeping pace — and flags anything
            past its SLA as overdue.
          </p>
        </div>
        {/* City-wide civic score — the public accountability headline. */}
        <div className="glass-card flex items-center gap-3 px-4 py-3">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-2xl font-serif text-2xl font-medium ${GRADE_STYLE[cityScore.grade]}`}
          >
            {cityScore.grade}
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink/45">
              City civic score
            </p>
            <p className="font-serif text-2xl font-medium text-ink">
              {cityScore.score}
              <span className="text-base text-ink/40">/100</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c, i) => (
          <div
            key={c.label}
            className="glass-card animate-fade-up p-5"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink/55">{c.label}</span>
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${c.accent}1A`, color: c.accent }}
              >
                {c.icon}
              </span>
            </div>
            <p className="mt-3 font-serif text-3xl font-medium text-ink">
              {c.value}
            </p>
          </div>
        ))}
      </div>

      {/* SLA legend */}
      <div className="glass-card flex flex-wrap items-center gap-x-5 gap-y-2 p-4">
        <span className="flex items-center gap-1.5 text-sm font-medium text-ink/70">
          <Target className="h-4 w-4 text-sarvam-orange" /> SLA targets
        </span>
        {([5, 4, 3, 2, 1] as const).map((sev) => (
          <span key={sev} className="text-sm text-ink/55">
            Sev {sev}:{' '}
            <span className="font-medium text-ink">{SLA_DAYS[sev]}d</span>
          </span>
        ))}
      </div>

      {/* Per-department table */}
      <section>
        <h2 className="mb-4 font-semibold text-ink">By department</h2>
        {deptRows.length === 0 ? (
          <EmptyState
            icon={<Building className="h-6 w-6" />}
            title="No issues to track yet"
            hint="Once reports come in, departmental SLA performance shows up here."
          />
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wide text-ink/45">
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 text-center font-medium">Open</th>
                    <th className="px-4 py-3 text-center font-medium">Overdue</th>
                    <th className="px-4 py-3 text-center font-medium">Resolved</th>
                    <th className="px-4 py-3 text-center font-medium">On-time</th>
                    <th className="px-4 py-3 text-center font-medium">Oldest open</th>
                  </tr>
                </thead>
                <tbody>
                  {deptRows.map((r) => (
                    <tr
                      key={r.department}
                      className="border-b border-ink/5 last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-ink">
                        {r.department}
                      </td>
                      <td className="px-4 py-3 text-center text-ink/70">{r.open}</td>
                      <td className="px-4 py-3 text-center">
                        {r.overdue > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">
                            <AlertTriangle className="h-3 w-3" /> {r.overdue}
                          </span>
                        ) : (
                          <span className="text-ink/40">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-ink/70">
                        {r.resolved}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={
                            r.onTimePct >= 80
                              ? 'font-medium text-emerald-600'
                              : r.onTimePct >= 50
                                ? 'font-medium text-amber-600'
                                : 'font-medium text-red-600'
                          }
                        >
                          {r.onTimePct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-ink/70">
                        {r.open > 0 ? fmtDays(r.oldestOpenDays) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Neighborhood civic scores */}
      <section>
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink">
          <MapPin className="h-5 w-5 text-sarvam-blue" /> Neighborhood civic scores
        </h2>
        <p className="mb-4 max-w-2xl text-sm text-ink/55">
          A 0–100 grade per locality — rewarding neighborhoods whose issues get
          closed, closed on time, and don&apos;t pile up. Lowest scores lead, so
          the areas that need attention surface first.
        </p>
        {hoods.length === 0 ? (
          <EmptyState
            icon={<MapPin className="h-6 w-6" />}
            title="No neighborhoods to score yet"
            hint="Once geolocated reports come in, each locality gets a civic score."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hoods.slice(0, 6).map((h) => (
              <div key={h.area} className="glass-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 text-sm font-medium text-ink">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-ink/40" />
                      {h.area}
                    </p>
                    <p className="mt-0.5 text-xs text-ink/45">
                      {h.total} report{h.total === 1 ? '' : 's'} · {h.resolvedPct}%
                      resolved
                    </p>
                  </div>
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-serif text-xl font-medium ${GRADE_STYLE[h.grade]}`}
                  >
                    {h.grade}
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sarvam-blue to-sarvam-orange"
                    style={{ width: `${h.score}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-ink/55">
                  <span>Score {h.score}/100</span>
                  {h.overdue > 0 ? (
                    <span className="font-medium text-red-600">
                      {h.overdue} overdue
                    </span>
                  ) : (
                    <span className="text-emerald-600">on track</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Overdue issues list */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink">
          <AlertTriangle className="h-5 w-5 text-red-500" /> Overdue issues
          {overdue.length > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              {overdue.length}
            </span>
          )}
        </h2>
        {overdue.length === 0 ? (
          <EmptyState
            icon={<CheckCircle className="h-6 w-6" />}
            title="Nothing overdue"
            hint="Every open issue is still within its SLA window."
          />
        ) : (
          <div className="space-y-2">
            {overdue.map((i) => {
              const over = overdueByDays(i);
              return (
                <Link
                  key={i.id}
                  href={`/issue/${i.id}`}
                  className="glass-card glass-card-hover flex items-center gap-4 p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-medium text-ink">{i.title}</p>
                    <p className="mt-0.5 text-xs text-ink/55">
                      {CATEGORY_LABELS[i.category]} · Sev {i.severity} ·{' '}
                      {i.assignedDept}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-red-600">
                      {fmtDays(over)} over
                    </p>
                    <p className="text-xs text-ink/45">
                      open {fmtDays(ageDays(i))} / {slaDays(i)}d SLA
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="pt-2">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-ink/60 transition hover:text-ink"
        >
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
