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
          className="glass-card p-4 text-center"
        >
          <p className="bg-gradient-to-r from-sarvam-blue to-sarvam-orange bg-clip-text font-serif text-3xl font-medium text-transparent">
            {it.value === undefined ? (
              <span className="inline-block h-8 w-10 animate-pulse rounded bg-white/50" />
            ) : (
              it.value
            )}
          </p>
          <p className="mt-1 text-xs font-medium text-ink/55">{it.label}</p>
        </div>
      ))}
    </div>
  );
}
