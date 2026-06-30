import { describe, it, expect } from 'vitest';
import { forecastFixes, computePredictions } from '@/lib/predict';
import { makeIssue, daysAgo } from './_fixtures';

const NOW = Date.now();

describe('forecastFixes', () => {
  it('produces a forecast only for open issues, not resolved ones', () => {
    const issues = [
      makeIssue({ status: 'open' }),
      makeIssue({ status: 'in_progress' }),
      makeIssue({ status: 'resolved', createdAt: daysAgo(3, NOW), updatedAt: daysAgo(1, NOW) }),
    ];
    const forecasts = forecastFixes(issues, NOW);
    expect(forecasts).toHaveLength(2);
  });

  it('never predicts a resolution date in the past for an open issue', () => {
    const stale = makeIssue({ status: 'open', severity: 5, createdAt: daysAgo(60, NOW) });
    const [f] = forecastFixes([stale], NOW);
    expect(f.forecastDate).toBeGreaterThanOrEqual(NOW);
    expect(f.remainingDays).toBeGreaterThanOrEqual(0);
  });

  it('forecasts a higher-severity issue to resolve sooner than a low one', () => {
    // Same category + filing time; severity is the only difference.
    const created = daysAgo(1, NOW);
    const sev5 = makeIssue({ id: 'sev5', severity: 5, status: 'open', createdAt: created });
    const sev1 = makeIssue({ id: 'sev1', severity: 1, status: 'open', createdAt: created });
    const out = forecastFixes([sev5, sev1], NOW);
    const f5 = out.find((f) => f.issueId === 'sev5')!;
    const f1 = out.find((f) => f.issueId === 'sev1')!;
    expect(f5.forecastDays).toBeLessThan(f1.forecastDays);
  });

  it('marks low confidence when there is no resolution history', () => {
    const [f] = forecastFixes([makeIssue({ status: 'open' })], NOW);
    expect(f.confidence).toBe('low');
  });

  it('sorts forecasts by soonest predicted resolution', () => {
    const out = forecastFixes(
      [
        makeIssue({ severity: 1, status: 'open', createdAt: NOW }),
        makeIssue({ severity: 5, status: 'open', createdAt: NOW }),
      ],
      NOW,
    );
    for (let i = 1; i < out.length; i++) {
      expect(out[i].forecastDate).toBeGreaterThanOrEqual(out[i - 1].forecastDate);
    }
  });
});

describe('computePredictions', () => {
  it('returns headline counts consistent with the underlying forecasts', () => {
    const p = computePredictions(
      [makeIssue({ status: 'open' }), makeIssue({ status: 'resolved', createdAt: daysAgo(2, NOW), updatedAt: daysAgo(1, NOW) })],
      NOW,
    );
    expect(p.openCount).toBe(p.forecasts.length);
    expect(p.openCount).toBe(1);
    expect(p.predictedSlaBreaches).toBe(
      p.forecasts.filter((f) => f.willBreachSla).length,
    );
    expect(p.generatedAt).toBe(NOW);
  });

  it('is fully deterministic for a fixed `now`', () => {
    const issues = [makeIssue({ status: 'open' }), makeIssue({ status: 'open', severity: 5 })];
    expect(computePredictions(issues, NOW)).toEqual(computePredictions(issues, NOW));
  });
});
