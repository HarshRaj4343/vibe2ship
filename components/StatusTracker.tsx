'use client';

import { useI18n } from '@/lib/i18n';
import type { IssueStatus } from '@/lib/types';
import { Camera, Check, Wrench, CheckCircle } from '@/components/icons';

/**
 * Plain-language, citizen-facing progress tracker:
 *   Reported → Verified → In progress → Resolved
 *
 * Maps the underlying data (status + community verifiedCount) onto a journey a
 * non-technical citizen instantly understands. Labels are bilingual
 * (English / Hindi) and read straight from the language toggle — Hindi is
 * hardcoded here so the labels work even without the Translation API key.
 *
 * Stages the operator can set (In progress, Resolved) are tappable with ≥44px
 * touch targets; "Verified" is community-driven and shown read-only.
 */

type Stage = {
  key: string;
  en: string;
  hi: string;
  Icon: typeof Camera;
  setStatus?: IssueStatus;
};

const STAGES: Stage[] = [
  { key: 'reported', en: 'Reported', hi: 'रिपोर्ट किया', Icon: Camera, setStatus: 'open' },
  { key: 'verified', en: 'Verified', hi: 'सत्यापित', Icon: Check },
  { key: 'in_progress', en: 'In progress', hi: 'कार्य जारी', Icon: Wrench, setStatus: 'in_progress' },
  { key: 'resolved', en: 'Resolved', hi: 'हल हो गया', Icon: CheckCircle, setStatus: 'resolved' },
];

function currentStage(status: IssueStatus, verifiedCount: number): number {
  if (status === 'resolved') return 3;
  if (status === 'in_progress') return 2;
  if (verifiedCount > 0) return 1;
  return 0;
}

export default function StatusTracker({
  status,
  verifiedCount,
  onSet,
}: {
  status: IssueStatus;
  verifiedCount: number;
  onSet?: (status: IssueStatus) => void;
}) {
  const { lang } = useI18n();
  const active = currentStage(status, verifiedCount);

  return (
    <div className="flex items-stretch">
      {STAGES.map((stage, i) => {
        const reached = i <= active;
        const label = lang === 'hi' ? stage.hi : stage.en;
        const clickable = Boolean(onSet && stage.setStatus);

        const dot = (
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
              reached
                ? 'bg-gradient-to-br from-sarvam-blue to-sarvam-orange text-white shadow'
                : 'bg-ink/10 text-ink/40'
            } ${i === active ? 'ring-2 ring-sarvam-blue/40 ring-offset-2' : ''}`}
          >
            <stage.Icon className="h-[18px] w-[18px]" />
          </span>
        );

        return (
          <div key={stage.key} className="flex flex-1 items-center last:flex-none">
            {clickable ? (
              <button
                onClick={() => stage.setStatus && onSet?.(stage.setStatus)}
                title={`${stage.en} · ${stage.hi}`}
                className="flex min-h-[44px] flex-col items-center justify-center gap-1 px-1"
              >
                {dot}
                <span
                  className={`text-[11px] font-medium ${
                    reached ? 'text-ink' : 'text-ink/40'
                  }`}
                >
                  {label}
                </span>
              </button>
            ) : (
              <div className="flex min-h-[44px] flex-col items-center justify-center gap-1 px-1">
                {dot}
                <span
                  className={`text-[11px] font-medium ${
                    reached ? 'text-ink' : 'text-ink/40'
                  }`}
                >
                  {label}
                </span>
              </div>
            )}
            {i < STAGES.length - 1 && (
              <div
                className={`mx-1.5 h-0.5 flex-1 rounded-full transition ${
                  i < active ? 'bg-sarvam-blue' : 'bg-ink/10'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
