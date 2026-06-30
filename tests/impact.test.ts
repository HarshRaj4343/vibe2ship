import { describe, it, expect } from 'vitest';
import { median, computeImpact, STAFF_MINUTES } from '@/lib/impact';
import { makeIssue, daysAgo } from './_fixtures';

const NOW = Date.now();

describe('median', () => {
  it('returns 0 for an empty list', () => {
    expect(median([])).toBe(0);
  });

  it('returns the middle value for an odd-length list', () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it('averages the two middle values for an even-length list', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe('computeImpact', () => {
  it('zeroes out cleanly for no issues', () => {
    const s = computeImpact([]);
    expect(s.total).toBe(0);
    expect(s.resolved).toBe(0);
    expect(s.staffHoursSaved).toBe(0);
  });

  it('counts resolved issues and folded-in duplicates', () => {
    const issues = [
      makeIssue({ status: 'resolved', createdAt: daysAgo(2, NOW), updatedAt: NOW, verifiedCount: 3 }),
      makeIssue({ status: 'open', verifiedCount: 0 }),
      makeIssue({ status: 'open', verifiedCount: 2 }),
    ];
    const s = computeImpact(issues);
    expect(s.total).toBe(3);
    expect(s.resolved).toBe(1);
    expect(s.duplicatesMerged).toBe(5); // 3 + 0 + 2
    expect(s.issuesWithDuplicates).toBe(2);
  });

  it('derives staff-hours saved from the published per-event assumptions', () => {
    // 2 issues triaged + 4 duplicates folded, no complaints.
    const issues = [
      makeIssue({ verifiedCount: 4 }),
      makeIssue({ verifiedCount: 0 }),
    ];
    const expectedMinutes =
      2 * STAFF_MINUTES.TRIAGE_PER_ISSUE + 4 * STAFF_MINUTES.DEDUP_PER_REPORT;
    const s = computeImpact(issues);
    expect(s.staffHoursSaved).toBe(Math.round(expectedMinutes / 60));
  });

  it('ignores non-positive resolution spans when taking the median', () => {
    // updatedAt === createdAt → 0h span, must be filtered out, not counted as fast.
    const issues = [makeIssue({ status: 'resolved', createdAt: NOW, updatedAt: NOW })];
    const s = computeImpact(issues);
    expect(s.medianResolutionHours).toBe(0);
  });
});
