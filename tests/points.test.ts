import { describe, it, expect } from 'vitest';
import { POINTS, BADGES, eligibleBadges } from '@/lib/points';

describe('points & badges', () => {
  it('keeps the published point values stable', () => {
    // These are surfaced in the UI and README; a silent change would mislead users.
    expect(POINTS.REPORT_ISSUE).toBe(10);
    expect(POINTS.VERIFY_ISSUE).toBe(5);
    expect(POINTS.ISSUE_RESOLVED).toBe(25);
    expect(POINTS.FIRST_REPORT).toBe(50);
    expect(POINTS.STREAK_BONUS).toBe(15);
  });

  it('awards no badges to a brand-new user', () => {
    expect(eligibleBadges({ issuesReported: 0, issuesVerified: 0 })).toEqual([]);
  });

  it('awards First Report on the very first report', () => {
    const earned = eligibleBadges({ issuesReported: 1, issuesVerified: 0 });
    expect(earned.map((b) => b.id)).toContain('first_report');
    expect(earned.map((b) => b.id)).not.toContain('civic_hero');
  });

  it('awards Civic Hero at the 10-report threshold but not before', () => {
    expect(
      eligibleBadges({ issuesReported: 9, issuesVerified: 0 }).map((b) => b.id),
    ).not.toContain('civic_hero');
    expect(
      eligibleBadges({ issuesReported: 10, issuesVerified: 0 }).map((b) => b.id),
    ).toContain('civic_hero');
  });

  it('tracks reported and verified thresholds independently', () => {
    const earned = eligibleBadges({ issuesReported: 0, issuesVerified: 10 });
    expect(earned.map((b) => b.id)).toEqual(['verifier']);
  });

  it('returns every badge once all thresholds are cleared', () => {
    const earned = eligibleBadges({ issuesReported: 25, issuesVerified: 10 });
    expect(earned.map((b) => b.id).sort()).toEqual(
      BADGES.map((b) => b.id).sort(),
    );
  });
});
