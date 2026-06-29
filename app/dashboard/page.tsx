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
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import StatsGrid from '@/components/StatsGrid';
import ImpactBand from '@/components/ImpactBand';
import ResolvedGallery from '@/components/ResolvedGallery';
import LeaderboardTable from '@/components/LeaderboardTable';
import IssueCard from '@/components/IssueCard';
import EmptyState from '@/components/EmptyState';
import { computeImpact } from '@/lib/impact';
import type { SerializedIssue } from '@/lib/types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/types';
import {
  ClipboardList,
  CheckCircle,
  Users,
  Clock,
  Trophy,
  AlertTriangle,
  ArrowRight,
} from '@/components/icons';

interface LeaderUser {
  id: string;
  name: string;
  points: number;
  issuesReported: number;
  badgeCount: number;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const AXIS = '#1c1b2e80';
const GRID = '#1c1b2e14';

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-lg px-3 py-2 text-xs">
      <p className="font-medium text-ink">{label}</p>
      <p className="mt-0.5 text-ink/60">
        {payload[0].value} {payload[0].value === 1 ? 'report' : 'reports'}
      </p>
    </div>
  );
}

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
      {
        label: 'Total Issues',
        value: issues.length,
        icon: <ClipboardList className="h-5 w-5" />,
        accent: '#3B82F6',
      },
      {
        label: 'Resolved / week',
        value: resolvedThisWeek,
        icon: <CheckCircle className="h-5 w-5" />,
        accent: '#22C55E',
      },
      {
        label: 'Active Citizens',
        value: leaders.length,
        icon: <Users className="h-5 w-5" />,
        accent: '#F97316',
      },
      {
        label: 'Avg Resolution',
        value: avgHours ? `${avgHours}h` : '—',
        icon: <Clock className="h-5 w-5" />,
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

  const impact = useMemo(() => computeImpact(issues), [issues]);

  const recent = issues.slice(0, 10);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <div className="skeleton h-9 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="skeleton h-72" />
          <div className="skeleton h-72" />
        </div>
        <div className="skeleton h-48" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <h1 className="font-serif text-3xl font-medium text-ink">Community Dashboard</h1>

      <ImpactBand impact={impact} />

      <StatsGrid stats={stats} />

      <Link
        href="/admin"
        className="glass-card glass-card-hover flex items-center justify-between gap-3 p-4"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-medium text-ink">Department SLA board</span>
            <span className="block text-sm text-ink/55">
              See which departments are overdue and who&apos;s keeping pace.
            </span>
          </span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0 text-ink/40" />
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-5">
          <h2 className="mb-4 font-semibold text-ink">Issues by category</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="category" fontSize={12} stroke={AXIS} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} fontSize={12} stroke={AXIS} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: GRID }} content={<ChartTooltip />} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {categoryData.map((d) => (
                  <Cell key={d.category} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h2 className="mb-4 font-semibold text-ink">Reports per day (30d)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={dailyData}>
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#5b6cff" />
                  <stop offset="100%" stopColor="#ff8a3d" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="date" fontSize={11} interval={4} stroke={AXIS} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} fontSize={12} stroke={AXIS} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ stroke: GRID }} content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="url(#lineGradient)"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ResolvedGallery issues={issues} />

      <div>
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink">
          <Trophy className="h-5 w-5 text-sarvam-orange" /> Top citizens
        </h2>
        <LeaderboardTable users={leaders} />
      </div>

      <div>
        <h2 className="mb-4 font-semibold text-ink">Recent activity</h2>
        {recent.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" />}
            title="No issues reported yet"
            hint="Be the first to report a civic issue in your area."
          />
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
