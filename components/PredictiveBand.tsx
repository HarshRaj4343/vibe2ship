import type {
  Predictions,
  FixForecast,
  ForecastConfidence,
} from '@/lib/predict';
import { CATEGORY_LABELS } from '@/lib/types';
import {
  Radar,
  Clock,
  Flame,
  RotateCw,
  AlertTriangle,
  ArrowUp,
} from '@/components/icons';

function whenLabel(f: FixForecast): string {
  if (f.remainingDays < 1) return 'within a day';
  if (f.remainingDays < 2) return 'in ~1 day';
  return `in ~${Math.round(f.remainingDays)} days`;
}

const CONF_STYLE: Record<ForecastConfidence, string> = {
  high: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-ink/10 text-ink/55',
};

/**
 * The forward-looking counterpart to <ImpactBand/>. Turns the issue history into
 * three predictions — when open issues will clear, which areas are chronic
 * repeat offenders, and where reports are accelerating. All numbers are computed
 * deterministically in lib/predict.ts (no model call) so they're auditable.
 */
export default function PredictiveBand({
  predictions,
}: {
  predictions: Predictions;
}) {
  const { forecasts, recurrence, emerging } = predictions;
  const topForecasts = forecasts.slice(0, 4);
  const topRecurrence = recurrence.slice(0, 3);
  const topEmerging = emerging.slice(0, 3);

  const headline = [
    {
      label: 'Open issues forecast',
      value: predictions.openCount,
      sub: 'with a predicted fix date',
      icon: <Clock className="h-5 w-5" />,
      accent: '#3B82F6',
    },
    {
      label: 'Predicted SLA breaches',
      value: predictions.predictedSlaBreaches,
      sub: 'forecast to miss target',
      icon: <AlertTriangle className="h-5 w-5" />,
      accent: '#EF4444',
    },
    {
      label: 'Chronic-risk areas',
      value: predictions.highRiskAreas,
      sub: 'likely to recur',
      icon: <RotateCw className="h-5 w-5" />,
      accent: '#A855F7',
    },
  ];

  return (
    <section className="rounded-3xl border border-white/60 bg-gradient-to-br from-sarvam-sky/20 via-white/55 to-sarvam-peach/20 p-5 shadow-[0_10px_40px_-20px_rgba(28,27,46,0.35)] backdrop-blur sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sarvam-blue/10 text-sarvam-blue">
          <Radar className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-serif text-xl font-medium text-ink">
            Predictive outlook
          </h2>
          <p className="text-sm text-ink/55">
            Not just what happened — what&apos;s about to.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {headline.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-white/60 bg-white/55 p-3 sm:p-4"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${c.accent}1A`, color: c.accent }}
            >
              {c.icon}
            </span>
            <p className="mt-2.5 font-serif text-2xl font-medium text-ink sm:text-3xl">
              {c.value}
            </p>
            <p className="text-xs font-medium text-ink/55">{c.label}</p>
            <p className="mt-0.5 text-[11px] text-ink/40">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* Time-to-fix forecast */}
        <div>
          <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-sarvam-blue">
            <Clock className="h-4 w-4" /> Forecast resolution
          </h3>
          {topForecasts.length === 0 ? (
            <Empty text="No open issues to forecast." />
          ) : (
            <ul className="space-y-2">
              {topForecasts.map((f) => (
                <li
                  key={f.issueId}
                  className="rounded-2xl border border-white/60 bg-white/55 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-medium text-ink">
                      {f.title}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${CONF_STYLE[f.confidence]}`}
                      title={f.basis}
                    >
                      {f.confidence}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="font-semibold text-ink/80">
                      {whenLabel(f)}
                    </span>
                    {f.willBreachSla && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 font-medium text-red-600">
                        <AlertTriangle className="h-3 w-3" /> SLA risk
                      </span>
                    )}
                    <span className="text-ink/40">
                      {CATEGORY_LABELS[f.category]}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Emerging hotspots + recurrence risk */}
        <div className="space-y-5">
          <div>
            <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-sarvam-orange">
              <Flame className="h-4 w-4" /> Emerging hotspots
            </h3>
            {topEmerging.length === 0 ? (
              <Empty text="No areas accelerating right now." />
            ) : (
              <ul className="space-y-2">
                {topEmerging.map((h, i) => (
                  <li
                    key={i}
                    className="rounded-2xl border border-sarvam-peach/50 bg-sarvam-peach/15 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-ink">
                        {h.area}
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-sarvam-orange px-2 py-0.5 text-[10px] font-semibold text-white">
                        <ArrowUp className="h-3 w-3" />
                        {h.growth}×
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink/55">{h.note}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#A855F7]">
              <RotateCw className="h-4 w-4" /> Recurrence risk
            </h3>
            {topRecurrence.length === 0 ? (
              <Empty text="No chronic repeat areas detected." />
            ) : (
              <ul className="space-y-2">
                {topRecurrence.map((r, i) => (
                  <li
                    key={i}
                    className="rounded-2xl border border-white/60 bg-white/55 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-ink">
                        {CATEGORY_LABELS[r.category]} · {r.area}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          r.level === 'high'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {r.riskScore}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink/55">{r.note}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-ink/45">
        Forecasts use the median resolution time per category (adjusted for
        severity); recurrence and emergence are computed from report clustering
        over rolling 14-day windows. Deterministic — no model call.
      </p>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/15 px-3 py-4 text-center text-xs text-ink/40">
      {text}
    </div>
  );
}
