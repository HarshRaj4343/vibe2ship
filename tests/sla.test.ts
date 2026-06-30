import { describe, it, expect } from 'vitest';
import {
  SLA_DAYS,
  slaDays,
  ageDays,
  isOverdue,
  overdueByDays,
  departmentSLA,
} from '@/lib/sla';
import { makeIssue, daysAgo } from './_fixtures';

const NOW = Date.now();

describe('SLA targets', () => {
  it('gives the tightest target to the most severe issues', () => {
    expect(SLA_DAYS[5]).toBeLessThan(SLA_DAYS[1]);
    expect(slaDays(makeIssue({ severity: 5 }))).toBe(1);
    expect(slaDays(makeIssue({ severity: 1 }))).toBe(10);
  });

  it('measures age in days from createdAt', () => {
    expect(ageDays(makeIssue({ createdAt: daysAgo(3, NOW) }), NOW)).toBeCloseTo(3, 5);
  });
});

describe('overdue detection', () => {
  it('flags a severity-5 issue still open after its 1-day target', () => {
    const issue = makeIssue({ severity: 5, status: 'open', createdAt: daysAgo(2, NOW) });
    expect(isOverdue(issue, NOW)).toBe(true);
    expect(overdueByDays(issue, NOW)).toBeCloseTo(1, 5);
  });

  it('does not flag an issue still within its SLA window', () => {
    const issue = makeIssue({ severity: 1, status: 'open', createdAt: daysAgo(2, NOW) });
    expect(isOverdue(issue, NOW)).toBe(false);
    expect(overdueByDays(issue, NOW)).toBeLessThan(0);
  });

  it('never marks a resolved issue overdue, however old', () => {
    const issue = makeIssue({ severity: 5, status: 'resolved', createdAt: daysAgo(99, NOW) });
    expect(isOverdue(issue, NOW)).toBe(false);
  });
});

describe('departmentSLA aggregation', () => {
  it('groups by department and sorts worst offenders first', () => {
    const issues = [
      // PWD: 1 overdue sev-5 open
      makeIssue({ assignedDept: 'PWD', severity: 5, status: 'open', createdAt: daysAgo(5, NOW) }),
      // Water: all resolved on time
      makeIssue({
        assignedDept: 'Water',
        severity: 3,
        status: 'resolved',
        createdAt: daysAgo(2, NOW),
        updatedAt: daysAgo(1, NOW),
      }),
    ];
    const rows = departmentSLA(issues, NOW);
    expect(rows).toHaveLength(2);
    // Worst (PWD, has an overdue) comes first.
    expect(rows[0].department).toBe('PWD');
    expect(rows[0].overdue).toBe(1);
    // Water resolved within SLA → 100% on-time, 0 overdue.
    const water = rows.find((r) => r.department === 'Water')!;
    expect(water.onTimePct).toBe(100);
    expect(water.overdue).toBe(0);
  });

  it('buckets issues with no department under "Unassigned"', () => {
    const rows = departmentSLA([makeIssue({ assignedDept: '' })], NOW);
    expect(rows[0].department).toBe('Unassigned');
  });
});
