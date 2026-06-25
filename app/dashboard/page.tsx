'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { db } from '@/lib/firebase';
import StatsGrid from '@/components/StatsGrid';
import LeaderboardTable from '@/components/LeaderboardTable';
import IssueCard from '@/components/IssueCard';
import type { SerializedIssue } from '@/lib/types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/types';

interface LeaderUser {
  id: string;
  name: string;
  points: number;
  issuesReported: number;
  badgeCount: number;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function DashboardPage() {
  const [issues, setIssues] = useState<SerializedIssue[]>([]);
  const [leaders, setLeaders] = useState<LeaderUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [issuesRes, usersSnap] = await Promise.all([
          fetch('/api/issues').then((r) => r.json()),
          getDocs(
            query(collection(db, 'users'), orderBy('points', 'desc'), limit(10)),
          ).catch(() => null),
        ]);

        setIssues(issuesRes.issues ?? []);

        if (usersSnap) {
          setLeaders(
            usersSnap.docs.map((d) => {
              const u = d.data();
              return {
                id: d.id,
                name: u.name ?? 'Anonymous Citizen',
                points: u.points ?? 0,
                issuesReported: u.issuesReported ?? 0,
                badgeCount: (u.badges ?? []).length,
              };
            }),
          );
        }
      } catch {
        // leave empty states
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const resolvedThisWeek = issues.filter(
      (i) => i.status === 'resolved' && now - i.updatedAt <= WEEK_MS,
    ).length;
    const resolved = issues.filter((i) => i.status === 'resolved');
    const avgHours =
      resolved.length > 0
        ? Math.round(
            resolved.reduce((acc, i) => acc + (i.updatedAt - i.createdAt), 0) /
              resolved.length /
              (60 * 60 * 1000),
          )
        : 0;
    return [
      { label: 'Total Issues', value: issues.length, icon: '📋', accent: '#3B82F6' },
      {
        label: 'Resolved / week',
        value: resolvedThisWeek,
        icon: '✅',
        accent: '#22C55E',
      },
      {
        label: 'Active Citizens',
        value: leaders.length,
        icon: '👥',
        accent: '#F97316',
      },
      {
        label: 'Avg Resolution',
        value: avgHours ? `${avgHours}h` : '—',
        icon: '⏱️',
        accent: '#A855F7',
      },
    ];
  }, [issues, leaders]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    issues.forEach((i) => {
      counts[i.category] = (counts[i.category] ?? 0) + 1;
    });
    return Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
      category: label,
      count: counts[key] ?? 0,
      fill: CATEGORY_COLORS[key as keyof typeof CATEGORY_COLORS],
    }));
  }, [issues]);

  const dailyData = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    for (let d = 29; d >= 0; d--) {
      const day = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
      const label = `${day.getMonth() + 1}/${day.getDate()}`;
      const count = issues.filter((i) => {
        const c = new Date(i.createdAt);
        return (
          c.getDate() === day.getDate() &&
          c.getMonth() === day.getMonth() &&
          c.getFullYear() === day.getFullYear()
        );
      }).length;
      days.push({ date: label, count });
    }
    return days;
  }, [issues]);

  const recent = issues.slice(0, 10);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-slate-400">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Community Dashboard</h1>

      <StatsGrid stats={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-900">Issues by category</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="category" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-900">Reports per day (30d)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" fontSize={11} interval={4} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 className="mb-4 font-semibold text-slate-900">🏆 Top citizens</h2>
        <LeaderboardTable users={leaders} />
      </div>

      <div>
        <h2 className="mb-4 font-semibold text-slate-900">Recent activity</h2>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
            No issues reported yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recent.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
