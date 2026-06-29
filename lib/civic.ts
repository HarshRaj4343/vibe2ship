import type { SerializedIssue } from '@/lib/types';
import { isOverdue, slaDays } from '@/lib/sla';

/**
 * Neighborhood civic score — a single 0–100 "how well is this locality being
 * looked after" grade, computed per geohash cell from the issue history. Pure +
 * dependency-free (mirrors lib/impact.ts / lib/sla.ts) so the public scoreboard
 * can render it client-side with no extra round-trip.
 *
 * The score rewards a neighborhood whose issues actually get closed, closed on
 * time, and don't pile up — and penalises chronic open backlog. It's an
 * accountability lens citizens can point at their own street.
 */

const DAY_MS = 86_400_000;
const AREA_PRECISION = 6; // ~1.2km cell — matches lib/predict.ts

function areaKey(i: SerializedIssue): string {
  return i.geohash ? i.geohash.slice(0, AREA_PRECISION) : 'unknown';
}

function areaLabel(i: SerializedIssue): string {
  return `${i.lat.toFixed(3)}, ${i.lng.toFixed(3)}`;
}

export type CivicGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface NeighborhoodScore {
  area: string; // human label (rounded coordinate)
  total: number;
  resolved: number;
  open: number;
  overdue: number;
  resolvedPct: number; // share of all reports closed
  onTimePct: number; // share of resolved closed within SLA
  score: number; // 0–100
  grade: CivicGrade;
}

function grade(score: number): CivicGrade {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function scoreFor(list: SerializedIssue[], now: number): number {
  const total = list.length;
  const resolved = list.filter((i) => i.status === 'resolved');
  const onTime = resolved.filter(
    (i) => (i.updatedAt - i.createdAt) / DAY_MS <= slaDays(i),
  ).length;
  const overdue = list.filter((i) => isOverdue(i, now)).length;
  const open = total - resolved.length;

  // Four weighted components, each in [0, 1].
  const resolvedRate = total ? resolved.length / total : 1;
  const onTimeRate = resolved.length ? onTime / resolved.length : 1;
  const overdueShare = open ? overdue / open : 0;
  const backlogShare = total ? open / total : 0;

  const raw =
    0.4 * resolvedRate +
    0.3 * onTimeRate +
    0.2 * (1 - overdueShare) +
    0.1 * (1 - backlogShare);

  return Math.round(raw * 100);
}

/**
 * Per-neighborhood civic scores, worst first (so the board leads with the areas
 * that need attention). Areas with a single report are still included — even one
 * unresolved issue is signal a citizen cares about.
 */
export function neighborhoodScores(
  issues: SerializedIssue[],
  now = Date.now(),
): NeighborhoodScore[] {
  const groups = new Map<string, SerializedIssue[]>();
  for (const i of issues) {
    const key = areaKey(i);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(i);
  }

  const rows: NeighborhoodScore[] = [];
  for (const list of groups.values()) {
    const resolved = list.filter((i) => i.status === 'resolved');
    const onTime = resolved.filter(
      (i) => (i.updatedAt - i.createdAt) / DAY_MS <= slaDays(i),
    ).length;
    const score = scoreFor(list, now);
    rows.push({
      area: areaLabel(list[0]),
      total: list.length,
      resolved: resolved.length,
      open: list.length - resolved.length,
      overdue: list.filter((i) => isOverdue(i, now)).length,
      resolvedPct: Math.round((resolved.length / list.length) * 100),
      onTimePct: resolved.length
        ? Math.round((onTime / resolved.length) * 100)
        : 100,
      score,
      grade: grade(score),
    });
  }

  // Lowest score first — the neighborhoods that need help lead the board.
  return rows.sort((a, b) => a.score - b.score || b.total - a.total);
}

/** City-wide civic score: the volume-weighted average across neighborhoods. */
export function cityCivicScore(issues: SerializedIssue[], now = Date.now()): {
  score: number;
  grade: CivicGrade;
} {
  if (issues.length === 0) return { score: 100, grade: 'A' };
  const score = scoreFor(issues, now);
  return { score, grade: grade(score) };
}
