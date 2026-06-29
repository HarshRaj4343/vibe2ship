import type { SerializedIssue, IssueCategory } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/types';
import { median } from '@/lib/impact';
import { SLA_DAYS } from '@/lib/sla';
import type { Severity } from '@/lib/types';

/**
 * Pure, dependency-free "predictive" layer — reframes the dashboard's
 * backward-looking insights as forward-looking forecasts. Three signals, all
 * derived deterministically from the issue list so the numbers are auditable
 * (no extra model call, no free-tier quota risk):
 *
 *   1. time-to-fix forecast   — when will THIS open issue likely be resolved?
 *   2. recurrence risk        — which area+category is a chronic repeat offender?
 *   3. hotspot emergence      — where is the report rate accelerating right now?
 *
 * Kept in the same shape as lib/impact.ts / lib/sla.ts so the dashboard, command
 * center and issue page can all reuse it client-side.
 */

const DAY_MS = 86_400_000;

// Geohash precision used to bucket issues into "neighborhood" cells. 6 chars is
// roughly a 1.2km × 0.6km box — small enough to be a recognisable locality,
// large enough that repeat reports actually land in the same bucket.
const AREA_PRECISION = 6;

function areaKey(i: SerializedIssue): string {
  return i.geohash ? i.geohash.slice(0, AREA_PRECISION) : 'unknown';
}

// Human label for an area bucket — rounded lat/lng reads as a coordinate pin the
// command center can drop on a map. (We don't reverse-geocode on the free tier.)
function areaLabel(i: SerializedIssue): string {
  return `${i.lat.toFixed(3)}, ${i.lng.toFixed(3)}`;
}

function isResolved(i: SerializedIssue): boolean {
  return i.status === 'resolved';
}

function resolutionDays(i: SerializedIssue): number {
  return (i.updatedAt - i.createdAt) / DAY_MS;
}

function ageDays(i: SerializedIssue, now: number): number {
  return (now - i.createdAt) / DAY_MS;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Time-to-fix forecast
// ─────────────────────────────────────────────────────────────────────────────

export type ForecastConfidence = 'low' | 'medium' | 'high';

export interface FixForecast {
  issueId: string;
  title: string;
  category: IssueCategory;
  forecastDays: number; // predicted TOTAL lifetime (create → resolve), in days
  forecastDate: number; // epoch millis of predicted resolution
  remainingDays: number; // days from `now` until the predicted date (>= 0)
  basis: string; // human-readable explanation
  confidence: ForecastConfidence;
  willBreachSla: boolean; // predicted date is past the SLA target for its severity
}

/**
 * Median historical resolution time (days) per category, with a global fallback
 * for categories that have never been resolved yet.
 */
function resolutionBaselines(resolved: SerializedIssue[]): {
  byCategory: Map<IssueCategory, number>;
  global: number;
} {
  const buckets = new Map<IssueCategory, number[]>();
  for (const i of resolved) {
    const d = resolutionDays(i);
    if (d <= 0) continue;
    if (!buckets.has(i.category)) buckets.set(i.category, []);
    buckets.get(i.category)!.push(d);
  }
  const byCategory = new Map<IssueCategory, number>();
  for (const [cat, days] of buckets) byCategory.set(cat, median(days));
  const global = median(resolved.map(resolutionDays).filter((d) => d > 0));
  return { byCategory, global };
}

/**
 * Predict a resolution date for every still-open issue. The baseline is the
 * historical median for its category; we nudge it by severity (a 5 should move
 * faster than its category average, a 1 slower) so the forecast respects the
 * SLA the city committed to. Confidence tracks how much history backs it.
 */
export function forecastFixes(
  issues: SerializedIssue[],
  now = Date.now(),
): FixForecast[] {
  const resolved = issues.filter(isResolved);
  const { byCategory, global } = resolutionBaselines(resolved);
  const sampleByCat = new Map<IssueCategory, number>();
  for (const i of resolved) {
    sampleByCat.set(i.category, (sampleByCat.get(i.category) ?? 0) + 1);
  }

  const open = issues.filter((i) => !isResolved(i));
  const forecasts: FixForecast[] = [];

  for (const i of open) {
    const sample = sampleByCat.get(i.category) ?? 0;
    // Baseline median for the category, else the global median, else the SLA.
    const base =
      byCategory.get(i.category) ??
      (global > 0 ? global : SLA_DAYS[i.severity as Severity] ?? 4);

    // Severity weighting: sev 5 → ~0.6×, sev 1 → ~1.4× the category baseline.
    const severityFactor = 1 + (3 - i.severity) * 0.2;
    const forecastDays = Math.max(0.5, Math.round(base * severityFactor * 10) / 10);

    // Anchor the prediction to when the issue was filed, but never predict a
    // date in the past for a still-open issue — if it's already overrun the
    // estimate, push the ETA a little past now.
    const fromCreate = i.createdAt + forecastDays * DAY_MS;
    const forecastDate = Math.max(fromCreate, now + 0.5 * DAY_MS);
    const remainingDays =
      Math.round(((forecastDate - now) / DAY_MS) * 10) / 10;

    const slaTarget = SLA_DAYS[i.severity as Severity] ?? 4;
    const willBreachSla = forecastDays > slaTarget;

    const confidence: ForecastConfidence =
      sample >= 5 ? 'high' : sample >= 2 ? 'medium' : 'low';

    const basis =
      sample > 0
        ? `median of ${sample} resolved ${CATEGORY_LABELS[i.category]} report${
            sample === 1 ? '' : 's'
          }, adjusted for severity ${i.severity}`
        : `no ${CATEGORY_LABELS[i.category]} history yet — using the city-wide median`;

    forecasts.push({
      issueId: i.id,
      title: i.title,
      category: i.category,
      forecastDays,
      forecastDate,
      remainingDays: Math.max(0, remainingDays),
      basis,
      confidence,
      willBreachSla,
    });
  }

  // Soonest predicted resolution first — what the city can clear quickly.
  return forecasts.sort((a, b) => a.forecastDate - b.forecastDate);
}

/** Convenience: forecast for a single issue (issue page chip). */
export function forecastFixFor(
  issue: SerializedIssue,
  allIssues: SerializedIssue[],
  now = Date.now(),
): FixForecast | null {
  if (isResolved(issue)) return null;
  return forecastFixes(allIssues, now).find((f) => f.issueId === issue.id) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Recurrence risk — chronic repeat-offender area+category pairs
// ─────────────────────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'elevated' | 'high';

export interface RecurrenceRisk {
  area: string; // human label (rounded coordinate)
  category: IssueCategory;
  total: number; // all reports of this category in this area, ever
  resolved: number;
  recurrences: number; // reports filed AFTER a prior one was already resolved
  riskScore: number; // 0–100
  level: RiskLevel;
  note: string;
}

/**
 * A problem "recurs" when the same category keeps coming back to the same
 * neighborhood — a pothole that's patched and reopens, a light that keeps
 * failing. We count, per area+category, how many reports were filed after an
 * earlier report in that bucket had already been resolved. More recurrences →
 * higher chronic-risk score.
 */
export function recurrenceRisks(
  issues: SerializedIssue[],
  now = Date.now(),
): RecurrenceRisk[] {
  const groups = new Map<string, SerializedIssue[]>();
  for (const i of issues) {
    const key = `${areaKey(i)}::${i.category}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(i);
  }

  const risks: RecurrenceRisk[] = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue; // needs at least one repeat to be "recurring"
    const sorted = [...list].sort((a, b) => a.createdAt - b.createdAt);

    let recurrences = 0;
    let lastResolvedAt = Infinity;
    for (const i of sorted) {
      if (i.createdAt > lastResolvedAt) recurrences++;
      if (isResolved(i)) lastResolvedAt = Math.min(lastResolvedAt, i.updatedAt);
    }

    const total = list.length;
    const resolved = list.filter(isResolved).length;
    // Score blends raw repeat volume with the recurrence-after-fix signal.
    const riskScore = Math.min(
      100,
      Math.round((total - 1) * 18 + recurrences * 24),
    );
    const level: RiskLevel =
      riskScore >= 60 ? 'high' : riskScore >= 30 ? 'elevated' : 'low';

    risks.push({
      area: areaLabel(sorted[sorted.length - 1]),
      category: sorted[0].category,
      total,
      resolved,
      recurrences,
      riskScore,
      level,
      note:
        recurrences > 0
          ? `${CATEGORY_LABELS[sorted[0].category]} reopened ${recurrences} time${
              recurrences === 1 ? '' : 's'
            } here after being fixed — likely a chronic fault.`
          : `${total} ${CATEGORY_LABELS[sorted[0].category]} reports clustered here — watch for a recurring cause.`,
    });
  }

  return risks.sort((a, b) => b.riskScore - a.riskScore);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Hotspot emergence — areas where the report rate is accelerating
// ─────────────────────────────────────────────────────────────────────────────

export interface EmergingHotspot {
  area: string;
  recent: number; // reports in the trailing window
  prior: number; // reports in the window before that
  growth: number; // recent / max(prior, 1) — "x more than last fortnight"
  categories: string[]; // distinct category labels involved
  note: string;
}

const WINDOW_DAYS = 14;

/**
 * Compare each area's report count in the trailing WINDOW_DAYS against the prior
 * window of equal length. Areas growing fast (and with real volume) are
 * "emerging" — the city can pre-position crews before they become full hotspots.
 */
export function emergingHotspots(
  issues: SerializedIssue[],
  now = Date.now(),
): EmergingHotspot[] {
  const recentStart = now - WINDOW_DAYS * DAY_MS;
  const priorStart = now - 2 * WINDOW_DAYS * DAY_MS;

  const groups = new Map<string, SerializedIssue[]>();
  for (const i of issues) {
    if (i.createdAt < priorStart) continue;
    const key = areaKey(i);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(i);
  }

  const hotspots: EmergingHotspot[] = [];
  for (const list of groups.values()) {
    const recent = list.filter((i) => i.createdAt >= recentStart);
    const prior = list.filter(
      (i) => i.createdAt >= priorStart && i.createdAt < recentStart,
    );
    // Only surface areas with real, growing recent activity.
    if (recent.length < 2 || recent.length <= prior.length) continue;

    const growth = Math.round((recent.length / Math.max(prior.length, 1)) * 10) / 10;
    const categories = Array.from(
      new Set(recent.map((i) => CATEGORY_LABELS[i.category])),
    );

    hotspots.push({
      area: areaLabel(recent[0]),
      recent: recent.length,
      prior: prior.length,
      growth,
      categories,
      note:
        prior.length === 0
          ? `${recent.length} new reports in the last ${WINDOW_DAYS} days — none in the fortnight before. Brand-new hotspot.`
          : `Reports ${growth}× higher than the previous ${WINDOW_DAYS} days (${prior.length} → ${recent.length}).`,
    });
  }

  // Fastest-growing, then highest-volume, first.
  return hotspots.sort((a, b) => b.growth - a.growth || b.recent - a.recent);
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-level rollup
// ─────────────────────────────────────────────────────────────────────────────

export interface Predictions {
  forecasts: FixForecast[];
  recurrence: RecurrenceRisk[];
  emerging: EmergingHotspot[];
  // Headline counts for the band UI.
  openCount: number;
  predictedSlaBreaches: number;
  highRiskAreas: number;
  generatedAt: number;
}

export function computePredictions(
  issues: SerializedIssue[],
  now = Date.now(),
): Predictions {
  const forecasts = forecastFixes(issues, now);
  const recurrence = recurrenceRisks(issues, now);
  const emerging = emergingHotspots(issues, now);
  return {
    forecasts,
    recurrence,
    emerging,
    openCount: forecasts.length,
    predictedSlaBreaches: forecasts.filter((f) => f.willBreachSla).length,
    highRiskAreas: recurrence.filter((r) => r.level === 'high').length,
    generatedAt: now,
  };
}
