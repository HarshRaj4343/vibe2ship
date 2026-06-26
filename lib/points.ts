export const POINTS = {
  REPORT_ISSUE: 10,
  VERIFY_ISSUE: 5,
  ISSUE_RESOLVED: 25, // bonus when your report gets resolved
  FIRST_REPORT: 50, // one-time badge bonus
  STREAK_BONUS: 15, // 3+ reports in a week
} as const;

export interface BadgeDefinition {
  id: string;
  name: string;
  threshold: number;
  field: 'issuesReported' | 'issuesVerified';
  icon: string; // path under /public
}

export const BADGES: BadgeDefinition[] = [
  { id: 'first_report', name: 'First Report', threshold: 1, field: 'issuesReported', icon: '/badges/first_report.png' },
  { id: 'civic_hero', name: 'Civic Hero', threshold: 10, field: 'issuesReported', icon: '/badges/civic_hero.png' },
  { id: 'watchdog', name: 'Community Watchdog', threshold: 25, field: 'issuesReported', icon: '/badges/watchdog.png' },
  { id: 'verifier', name: 'Verified Verifier', threshold: 10, field: 'issuesVerified', icon: '/badges/verifier.png' },
];

/**
 * Given a user's updated counters, return the badge definitions they have just
 * become eligible for. The caller is responsible for filtering out badges the
 * user already holds before awarding.
 */
export function eligibleBadges(stats: {
  issuesReported: number;
  issuesVerified: number;
}): BadgeDefinition[] {
  return BADGES.filter((badge) => stats[badge.field] >= badge.threshold);
}
