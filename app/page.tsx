import Link from 'next/link';
import LandingStats from '@/components/LandingStats';
import Reveal from '@/components/Reveal';
import { T } from '@/lib/i18n';
import { Search, Radar, Mail, Mic, RotateCw, BarChart3 } from '@/components/icons';

const PIPELINE = [
  { n: '1', title: 'Validate', body: 'Is it a real civic issue?' },
  { n: '2', title: 'Categorize', body: 'Pothole, leak, light, waste…' },
  { n: '3', title: 'Severity', body: 'Score 1–5 + safety risk' },
  { n: '4', title: 'Route', body: 'To the right department' },
];

const FEATURES = [
  {
    Icon: Search,
    title: 'Before/after AI verification',
    body: 'Upload an "after" photo and the agent skeptically compares it to the original to confirm the fix actually happened — no rubber-stamping.',
    tag: 'Closes the loop',
  },
  {
    Icon: RotateCw,
    title: 'Geo-dedup fold-in',
    body: 'Report a problem someone already flagged nearby and the agent folds it into the existing issue within 200m — one issue, many verifications, zero duplicate triage.',
    tag: 'No double work',
  },
  {
    Icon: Radar,
    title: 'Municipal Command Center',
    body: 'A live agent reasons across every open issue, streaming its plan as it goes, to produce a prioritized daily action list and detect hotspots.',
    tag: 'City-wide reasoning',
  },
  {
    Icon: Mail,
    title: 'Auto-drafted complaint letters',
    body: 'One tap turns a photo into a formal, department-addressed complaint letter with a tracking ID — the citizen never drafts a word.',
    tag: 'Headline wow',
  },
  {
    Icon: BarChart3,
    title: 'Predictive outlook',
    body: 'Forecasts when each open issue will be fixed, flags chronic repeat-offender areas, and spots emerging hotspots before they peak.',
    tag: 'Sees ahead',
  },
  {
    Icon: Mic,
    title: 'Hindi voice reporting',
    body: 'Speak the issue in Hindi or English — Gemini multimodal transcribes it to clean English and feeds it straight into the pipeline.',
    tag: 'Multimodal',
  },
];

function Flourish() {
  // A faint, symmetric mandala-derived flourish — geometric, resolving into
  // coherence as a whole, per the Sarvam visual grammar.
  return (
    <svg
      viewBox="0 0 240 24"
      className="mx-auto h-5 w-48 text-sarvam-orange/50"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M120 12c-14 0-22-8-34-8-9 0-15 5-15 8s6 8 15 8c12 0 20-8 34-8"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M120 12c14 0 22-8 34-8 9 0 15 5 15 8s-6 8-15 8c-12 0-20-8-34-8"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="120" cy="12" r="2.4" fill="currentColor" />
      <path d="M40 12h28M172 12h28" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

const PARTNERS = [
  'Gemini 2.5 Flash',
  'Firestore',
  'Google Maps',
  'Cloud Run',
  'Gemini multimodal voice',
];

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4">
        <section className="py-20 text-center sm:py-28">
          <div className="animate-float">
            <Flourish />
          </div>
          <p
            className="mt-6 animate-fade-up font-medium text-sarvam-blue"
            style={{ animationDelay: '60ms' }}
          >
            <T>India&apos;s civic resolution agent</T>
          </p>
          <h1
            className="mx-auto mt-5 max-w-3xl animate-fade-up font-serif text-5xl font-medium leading-[1.05] tracking-tight text-ink sm:text-7xl"
            style={{ animationDelay: '140ms' }}
          >
            <T>Civic action for all</T>
          </h1>
          <p
            className="mx-auto mt-6 max-w-xl animate-fade-up text-lg text-ink/70"
            style={{ animationDelay: '220ms' }}
          >
            <T>
              Snap a photo. An autonomous AI agent validates, triages, routes and
              drafts the complaint — then confirms it was actually resolved.
            </T>
          </p>
          <div
            className="mt-9 flex animate-fade-up flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: '300ms' }}
          >
            <Link
              href="/report"
              className="btn-primary px-7 py-3.5 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <T>Report an issue</T>
            </Link>
            <Link
              href="/command"
              className="btn-ghost flex items-center gap-2 px-7 py-3.5 transition hover:-translate-y-0.5"
            >
              <Radar className="h-4 w-4" /> Command Center
            </Link>
          </div>
          <Link
            href="/whatsapp"
            className="mt-4 inline-flex animate-fade-up items-center gap-1.5 text-sm font-medium text-emerald-700 transition hover:text-emerald-800"
            style={{ animationDelay: '340ms' }}
          >
            <Mic className="h-4 w-4" /> Or report on WhatsApp — no app needed
          </Link>

          <div
            className="mt-14 animate-fade-up"
            style={{ animationDelay: '380ms' }}
          >
            <LandingStats />
          </div>
        </section>

        {/* Tech strip */}
        <Reveal as="section" className="pb-16">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-ink/40">
            Built with sovereign-scale Google AI
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {PARTNERS.map((p) => (
              <span
                key={p}
                className="text-sm font-semibold tracking-tight text-ink/45 transition-colors hover:text-sarvam-blue"
              >
                {p}
              </span>
            ))}
          </div>
        </Reveal>

        {/* Agent pipeline */}
        <section className="pb-16">
          <Reveal>
            <h2 className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-ink/40">
              The 4-step Gemini Vision agent
            </h2>
          </Reveal>
          <div className="mx-auto mt-7 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            {PIPELINE.map((p, i) => (
              <Reveal key={p.n} delay={i * 0.08}>
                <div className="glass-card hover-lift h-full p-5 text-center">
                  <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sarvam-blue to-sarvam-orange font-bold text-white">
                    {p.n}
                  </span>
                  <h3 className="mt-3 font-semibold text-ink">{p.title}</h3>
                  <p className="mt-1 text-xs text-ink/55">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Hero features */}
        <section className="pb-28">
          <Reveal>
            <h2 className="text-center font-serif text-3xl font-medium text-ink sm:text-4xl">
              Not just reporting — an autonomous resolution platform
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.08}>
                <div className="glass-card-lg hover-lift group h-full p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sarvam-sky/25 text-sarvam-blue transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                      <f.Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-sarvam-peach/40 px-3 py-1 text-xs font-medium text-ink/70">
                      {f.tag}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-ink">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm text-ink/65">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
