import type { SerializedIssue } from '@/lib/types';

/**
 * Pure helpers that turn the raw issue list into the hard "impact" numbers shown
 * on /dashboard — resolved count, median time-to-resolution, the dedup win, and
 * an estimate of municipal staff-hours saved by the AI pipeline. Kept dependency
 * -free so both the dashboard and the admin board can reuse it.
 */

const HOUR_MS = 3_600_000;

// How much manual staff time the automation saves per event. These are explicit,
// surfaced-in-the-UI demo assumptions — not magic constants — so the headline
// number is auditable rather than hand-wavy.
export const STAFF_MINUTES = {
  // AI triage + categorize + route, vs a clerk reading and filing each report.
  TRIAGE_PER_ISSUE: 15,
  // Each duplicate auto-folded is a report a human never had to re-triage.
  DEDUP_PER_REPORT: 12,
  // Auto-drafted complaint letter vs writing one by hand.
  COMPLAINT_DRAFT: 20,
};

export function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export interface ImpactStats {
  total: number;
  resolved: number;
  medianResolutionHours: number;
  medianResolutionDays: number;
  duplicatesMerged: number; // N folded-in duplicate reports
  issuesWithDuplicates: number; // M issues that absorbed them
  complaintsDrafted: number;
  staffHoursSaved: number;
}

export function computeImpact(issues: SerializedIssue[]): ImpactStats {
  const resolved = issues.filter((i) => i.status === 'resolved');
  const spansHours = resolved
    .map((i) => (i.updatedAt - i.createdAt) / HOUR_MS)
    .filter((h) => h > 0);
  const medianHours = Math.round(median(spansHours));

  const duplicatesMerged = issues.reduce(
    (sum, i) => sum + (i.verifiedCount || 0),
    0,
  );
  const issuesWithDuplicates = issues.filter(
    (i) => (i.verifiedCount || 0) > 0,
  ).length;
  const complaintsDrafted = issues.filter((i) => i.complaint).length;

  const minutesSaved =
    issues.length * STAFF_MINUTES.TRIAGE_PER_ISSUE +
    duplicatesMerged * STAFF_MINUTES.DEDUP_PER_REPORT +
    complaintsDrafted * STAFF_MINUTES.COMPLAINT_DRAFT;

  return {
    total: issues.length,
    resolved: resolved.length,
    medianResolutionHours: medianHours,
    medianResolutionDays: Math.round((medianHours / 24) * 10) / 10,
    duplicatesMerged,
    issuesWithDuplicates,
    complaintsDrafted,
    staffHoursSaved: Math.round(minutesSaved / 60),
  };
}
