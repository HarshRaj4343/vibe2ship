'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import IssueMap from '@/components/IssueMap';
import CategoryBadge from '@/components/CategoryBadge';
import StatusBadge from '@/components/StatusBadge';
import SeverityBar from '@/components/SeverityBar';
import PointsToast from '@/components/PointsToast';
import { useAuth } from '@/lib/auth';
import type { IssueCategory, SerializedIssue } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/types';

const FILTERS: Array<{ value: IssueCategory | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pothole', label: CATEGORY_LABELS.pothole },
  { value: 'water_leak', label: CATEGORY_LABELS.water_leak },
  { value: 'streetlight', label: CATEGORY_LABELS.streetlight },
  { value: 'waste', label: CATEGORY_LABELS.waste },
  { value: 'other', label: CATEGORY_LABELS.other },
];

export default function MapPage() {
  const { identity } = useAuth();
  const [issues, setIssues] = useState<SerializedIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<IssueCategory | 'all'>('all');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selected, setSelected] = useState<SerializedIssue | null>(null);
  const [voting, setVoting] = useState(false);
  const [toast, setToast] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/issues');
        const data = await res.json();
        setIssues(data.issues ?? []);
      } catch {
        setIssues([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visibleIssues = useMemo(
    () => (filter === 'all' ? issues : issues.filter((i) => i.category === filter)),
    [issues, filter],
  );

  async function upvote(issue: SerializedIssue) {
    setVoting(true);
    try {
      const res = await fetch('/api/upvote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueId: issue.id,
          userId: identity.uid,
          userName: identity.name,
          userEmail: identity.email,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast(data.pointsAwarded ?? 5);
        setIssues((prev) =>
          prev.map((i) =>
            i.id === issue.id ? { ...i, upvoteCount: data.upvoteCount } : i,
          ),
        );
        setSelected((s) =>
          s && s.id === issue.id ? { ...s, upvoteCount: data.upvoteCount } : s,
        );
      }
    } finally {
      setVoting(false);
    }
  }

  return (
    <div className="relative h-[calc(100vh-57px)] w-full">
      {/* Filter bar */}
      <div className="absolute left-1/2 top-4 z-20 flex max-w-[92vw] -translate-x-1/2 gap-1 overflow-x-auto rounded-full bg-white/90 p-1 shadow-md backdrop-blur">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
              filter === f.value
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Heatmap toggle */}
      <button
        onClick={() => setShowHeatmap((v) => !v)}
        className={`absolute right-4 top-4 z-20 rounded-full px-4 py-2 text-sm font-medium shadow-md transition ${
          showHeatmap ? 'bg-orange-500 text-white' : 'bg-white text-slate-700'
        }`}
      >
        🔥 Heatmap {showHeatmap ? 'On' : 'Off'}
      </button>

      {loading ? (
        <div className="flex h-full items-center justify-center text-slate-400">
          Loading map…
        </div>
      ) : (
        <IssueMap
          issues={visibleIssues}
          selectedId={selected?.id}
          onSelect={setSelected}
          showHeatmap={showHeatmap}
        />
      )}

      {/* Side panel */}
      {selected && (
        <aside className="absolute right-0 top-0 z-30 h-full w-full max-w-sm overflow-y-auto border-l border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="font-semibold text-slate-900">Issue details</h2>
            <button
              onClick={() => setSelected(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
            >
              ✕
            </button>
          </div>
          {selected.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selected.imageUrl}
              alt={selected.title}
              className="h-48 w-full object-cover"
            />
          )}
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <CategoryBadge category={selected.category} />
              <StatusBadge status={selected.status} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">{selected.title}</h3>
            <SeverityBar severity={selected.severity} />
            <p className="text-sm text-slate-600">
              {selected.description || selected.aiAnalysis?.reasoning}
            </p>
            <p className="text-xs font-medium text-blue-600">
              → {selected.assignedDept}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => upvote(selected)}
                disabled={voting}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
              >
                ▲ Upvote ({selected.upvoteCount})
              </button>
              <Link
                href={`/issue/${selected.id}`}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Open
              </Link>
            </div>
          </div>
        </aside>
      )}

      {toast !== null && (
        <PointsToast
          points={toast}
          message="Thanks for verifying!"
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}
