import type { SerializedIssue, Severity } from '@/lib/types';

/**
 * Service-level-agreement logic for the department accountability board
 * (/admin). Each issue gets a resolution target based on its severity; anything
 * still unresolved past that target is "overdue". Pure + dependency-free so the
 * admin page can compute the whole board client-side.
 */

const DAY_MS = 86_400_000;

// Resolution targets in days, tightest for the most severe issues.
export const SLA_DAYS: Record<Severity, number> = {
  5: 1,
  4: 2,
  3: 4,
  2: 7,
  1: 10,
};

export function ageDays(issue: SerializedIssue, now = Date.now()): number {
  return (now - issue.createdAt) / DAY_MS;
}

export function slaDays(issue: SerializedIssue): number {
  return SLA_DAYS[issue.severity as Severity] ?? 4;
}

export function isOverdue(issue: SerializedIssue, now = Date.now()): boolean {
  if (issue.status === 'resolved') return false;
  return ageDays(issue, now) > slaDays(issue);
}

/** Days past the SLA target (negative = still within SLA). */
export function overdueByDays(issue: SerializedIssue, now = Date.now()): number {
  return ageDays(issue, now) - slaDays(issue);
}

export interface DeptSLA {
  department: string;
  total: number;
  open: number; // unresolved (open + in_progress)
  resolved: number;
  overdue: number;
  onTimePct: number; // share of resolved issues closed within SLA
  oldestOpenDays: number;
}

export function departmentSLA(
  issues: SerializedIssue[],
  now = Date.now(),
): DeptSLA[] {
  const byDept = new Map<string, SerializedIssue[]>();
  for (const i of issues) {
    const dept = i.assignedDept || 'Unassigned';
    if (!byDept.has(dept)) byDept.set(dept, []);
    byDept.get(dept)!.push(i);
  }

  const rows: DeptSLA[] = [];
  for (const [department, list] of byDept) {
    const unresolved = list.filter((i) => i.status !== 'resolved');
    const resolved = list.filter((i) => i.status === 'resolved');
    const resolvedOnTime = resolved.filter(
      (i) => (i.updatedAt - i.createdAt) / DAY_MS <= slaDays(i),
    ).length;
    const oldestOpenDays = unresolved.reduce(
      (max, i) => Math.max(max, ageDays(i, now)),
      0,
    );
    rows.push({
      department,
      total: list.length,
      open: unresolved.length,
      resolved: resolved.length,
      overdue: unresolved.filter((i) => isOverdue(i, now)).length,
      onTimePct: resolved.length
        ? Math.round((resolvedOnTime / resolved.length) * 100)
        : 100,
      oldestOpenDays: Math.round(oldestOpenDays),
    });
  }

  // Worst offenders first: most overdue, then most open.
  return rows.sort((a, b) => b.overdue - a.overdue || b.open - a.open);
}
