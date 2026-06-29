import type { ImpactStats } from '@/lib/impact';
import { STAFF_MINUTES } from '@/lib/impact';
import { CheckCircle, Clock, RotateCw, Sparkles } from '@/components/icons';

function formatMedian(impact: ImpactStats): string {
  if (impact.resolved === 0) return '—';
  if (impact.medianResolutionHours < 48) return `${impact.medianResolutionHours}h`;
  return `${impact.medianResolutionDays}d`;
}

/**
 * The "hard impact numbers" band at the top of /dashboard: what the AI pipeline
 * has actually delivered — issues resolved, median time-to-resolution, the dedup
 * win, and estimated municipal staff-hours saved.
 */
export default function ImpactBand({ impact }: { impact: ImpactStats }) {
  const cards = [
    {
      label: 'Issues resolved',
      value: impact.resolved,
      sub: `of ${impact.total} reported`,
      icon: <CheckCircle className="h-5 w-5" />,
      accent: '#22C55E',
    },
    {
      label: 'Median time to resolve',
      value: formatMedian(impact),
      sub: 'across resolved issues',
      icon: <Clock className="h-5 w-5" />,
      accent: '#3B82F6',
    },
    {
      label: 'Duplicates auto-merged',
      value: impact.duplicatesMerged,
      sub: `folded into ${impact.issuesWithDuplicates} issue${
        impact.issuesWithDuplicates === 1 ? '' : 's'
      }`,
      icon: <RotateCw className="h-5 w-5" />,
      accent: '#A855F7',
    },
    {
      label: 'Staff-hours saved',
      value: `~${impact.staffHoursSaved}h`,
      sub: 'triage · dedup · drafting',
      icon: <Sparkles className="h-5 w-5" />,
      accent: '#F97316',
    },
  ];

  return (
    <section className="glass-card-lg p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="font-serif text-xl font-medium text-ink">Real-world impact</h2>
        <p className="text-sm text-ink/55">
          What the AI pipeline has delivered for the city so far.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c, i) => (
          <div
            key={c.label}
            className="animate-fade-up rounded-2xl border border-white/60 bg-white/50 p-4"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink/55">{c.label}</span>
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${c.accent}1A`, color: c.accent }}
              >
                {c.icon}
              </span>
            </div>
            <p className="mt-3 font-serif text-3xl font-medium text-ink">{c.value}</p>
            <p className="mt-1 text-xs text-ink/45">{c.sub}</p>
          </div>
        ))}
      </div>

      {impact.duplicatesMerged > 0 && (
        <p className="mt-4 rounded-xl bg-sarvam-peach/30 px-4 py-2.5 text-sm font-medium text-ink/80">
          🔁 {impact.duplicatesMerged} duplicate report
          {impact.duplicatesMerged === 1 ? '' : 's'} folded into{' '}
          {impact.issuesWithDuplicates} issue
          {impact.issuesWithDuplicates === 1 ? '' : 's'} — no human triaged the
          same problem twice.
        </p>
      )}

      <p className="mt-3 text-xs leading-relaxed text-ink/45">
        Staff-hours saved assumes {STAFF_MINUTES.TRIAGE_PER_ISSUE}m saved per
        AI-triaged report, {STAFF_MINUTES.DEDUP_PER_REPORT}m per auto-merged
        duplicate, and {STAFF_MINUTES.COMPLAINT_DRAFT}m per auto-drafted complaint.
      </p>
    </section>
  );
}
