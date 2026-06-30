'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Camera, Sparkles, RotateCw, Trophy, X, ArrowRight } from '@/components/icons';

/**
 * 10-second first-run onboarding. Explains the civic loop in four quick cards,
 * shown once per browser (localStorage flag). Skippable at any point; respects
 * the language toggle via `t()`. Mounted globally from the root layout.
 */
const STEPS = [
  {
    Icon: Camera,
    title: 'Snap the problem',
    body: 'Photograph any civic issue — a pothole, water leak, broken streetlight or garbage dump.',
    accent: '#3B82F6',
  },
  {
    Icon: Sparkles,
    title: 'AI triages it',
    body: 'Gemini Vision validates it, picks the category, scores severity and routes it to the right department.',
    accent: '#5b6cff',
  },
  {
    Icon: RotateCw,
    title: 'Track to resolution',
    body: 'Follow the journey: Reported → Verified → In progress → Resolved, with live status updates.',
    accent: '#F97316',
  },
  {
    Icon: Trophy,
    title: 'Confirm & earn',
    body: 'Upload an "after" photo to prove the fix, and earn civic points and badges along the way.',
    accent: '#22C55E',
  },
];

const FLAG = 'urbanpulse_onboarded';

export default function Onboarding() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(FLAG)) setOpen(true);
    } catch {
      /* private mode — just skip */
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(FLAG, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else dismiss();
  }

  if (!open) return null;

  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="glass-card-lg animate-fade-up w-full max-w-md overflow-hidden bg-white/90 p-6">
        <div className="flex items-start justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">
            {t('How UrbanPulse works')}
          </p>
          <button
            onClick={dismiss}
            aria-label={t('Skip')}
            className="-mr-1.5 -mt-1.5 flex h-9 w-9 items-center justify-center rounded-full text-ink/40 transition hover:bg-white/70 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <span
          className="mt-5 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${s.accent}1A`, color: s.accent }}
        >
          <s.Icon className="h-8 w-8" />
        </span>

        <h2 className="mt-4 font-serif text-2xl font-medium text-ink">
          {t(s.title)}
        </h2>
        <p className="mt-2 text-ink/65">{t(s.body)}</p>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-5 bg-sarvam-blue' : 'w-1.5 bg-ink/15'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!last && (
              <button
                onClick={dismiss}
                className="min-h-[44px] px-3 text-sm font-medium text-ink/50 transition hover:text-ink"
              >
                {t('Skip')}
              </button>
            )}
            <button
              onClick={next}
              className="btn-primary inline-flex min-h-[44px] items-center gap-1.5 px-5 py-2.5 text-sm"
            >
              {last ? t('Get started') : t('Next')}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
