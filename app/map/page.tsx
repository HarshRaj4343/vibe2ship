'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import IssueMap from '@/components/IssueMap';
import MapLegend from '@/components/MapLegend';
import CategoryBadge from '@/components/CategoryBadge';
import StatusBadge from '@/components/StatusBadge';
import SeverityBar from '@/components/SeverityBar';
import PointsToast from '@/components/PointsToast';
import { useAuth } from '@/lib/auth';
import type { IssueCategory, SerializedIssue } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/types';
import { Flame, X, ArrowRight, ArrowUp } from '@/components/icons';

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

  // Live map: subscribe to the issues collection so new reports, upvotes and
  // status changes appear in real time without a refresh.
  useEffect(() => {
    const q = query(collection(db, 'issues'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setIssues(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
              createdAt:
                (data.createdAt as Timestamp | undefined)?.toMillis() ?? Date.now(),
              updatedAt:
                (data.updatedAt as Timestamp | undefined)?.toMillis() ?? Date.now(),
            } as SerializedIssue;
          }),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
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
    <div className="relative h-[calc(100vh-80px)] w-full">
      {/* Filter bar */}
      <div className="absolute left-1/2 top-4 z-20 flex max-w-[92vw] -translate-x-1/2 gap-1 overflow-x-auto rounded-full border border-white/60 bg-white/80 p-1 shadow-[0_8px_30px_-12px_rgba(28,27,46,0.3)] backdrop-blur-xl">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              filter === f.value
                ? 'bg-ink text-white'
                : 'text-ink/65 hover:bg-white/60'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Heatmap toggle */}
      <button
        onClick={() => setShowHeatmap((v) => !v)}
        className={`absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-[0_8px_30px_-12px_rgba(28,27,46,0.3)] backdrop-blur-xl transition ${
          showHeatmap
            ? 'border-transparent bg-sarvam-orange text-white'
            : 'border-white/60 bg-white/80 text-ink'
        }`}
      >
        <Flame className="h-4 w-4" /> Heatmap {showHeatmap ? 'On' : 'Off'}
      </button>

      {loading ? (
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-ink/45">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-sarvam-blue/40 border-t-sarvam-blue" />
            <span className="text-sm">Loading live map…</span>
          </div>
        </div>
      ) : (
        <IssueMap
          issues={visibleIssues}
          selectedId={selected?.id}
          onSelect={setSelected}
          showHeatmap={showHeatmap}
        />
      )}

      {!loading && !showHeatmap && <MapLegend />}

      {/* Side panel */}
      {selected && (
        <aside className="absolute right-0 top-0 z-30 h-full w-full max-w-sm overflow-y-auto border-l border-white/60 bg-white/80 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/60 p-4">
            <h2 className="font-semibold text-ink">Issue details</h2>
            <button
              onClick={() => setSelected(null)}
              className="rounded-full p-1.5 text-ink/40 transition hover:bg-white/60"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
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
            <h3 className="text-lg font-semibold text-ink">{selected.title}</h3>
            <SeverityBar severity={selected.severity} />
            <p className="text-sm text-ink/65">
              {selected.description || selected.aiAnalysis?.reasoning}
            </p>
            <p className="flex items-center gap-1.5 text-xs font-medium text-sarvam-blue">
              <ArrowRight className="h-3.5 w-3.5" /> {selected.assignedDept}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => upvote(selected)}
                disabled={voting}
                className="btn-primary flex flex-1 items-center justify-center gap-1.5 py-2 text-sm"
              >
                <ArrowUp className="h-4 w-4" /> Upvote ({selected.upvoteCount})
              </button>
              <Link
                href={`/issue/${selected.id}`}
                className="btn-ghost px-4 py-2 text-sm"
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
