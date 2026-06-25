'use client';

import { useEffect, useState } from 'react';
import type { SerializedIssue } from '@/lib/types';

export default function LandingStats() {
  const [stats, setStats] = useState<{
    total: number;
    resolved: number;
    depts: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/issues');
        const data = await res.json();
        const issues: SerializedIssue[] = data.issues ?? [];
        setStats({
          total: issues.length,
          resolved: issues.filter((i) => i.status === 'resolved').length,
          depts: new Set(issues.map((i) => i.assignedDept)).size,
        });
      } catch {
        setStats({ total: 0, resolved: 0, depts: 0 });
      }
    })();
  }, []);

  const items = [
    { label: 'Issues reported', value: stats?.total },
    { label: 'AI-verified resolved', value: stats?.resolved },
    { label: 'Departments routed', value: stats?.depts },
  ];

  return (
    <div className="mx-auto grid max-w-2xl grid-cols-3 gap-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-center backdrop-blur"
        >
          <p className="text-3xl font-extrabold text-blue-600">
            {it.value === undefined ? (
              <span className="inline-block h-8 w-10 animate-pulse rounded bg-slate-200" />
            ) : (
              it.value
            )}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">{it.label}</p>
        </div>
      ))}
    </div>
  );
}
