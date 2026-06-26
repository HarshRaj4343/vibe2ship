import Link from 'next/link';
import LandingStats from '@/components/LandingStats';
import { Search, Radar, Mail, Mic } from '@/components/icons';

const PIPELINE = [
  { n: '1', title: 'Validate', body: 'Is it a real civic issue?' },
  { n: '2', title: 'Categorize', body: 'Pothole, leak, light, waste…' },
  { n: '3', title: 'Severity', body: 'Score 1–5 + safety risk' },
  { n: '4', title: 'Route', body: 'To the right department' },
];

const FEATURES = [
  {
    Icon: Search,
    title: 'AI Resolution Verification',
    body: 'Upload an "after" photo and the agent compares it to the original to confirm the fix actually happened.',
    tag: 'Closes the loop',
  },
  {
    Icon: Radar,
    title: 'Municipal Command Center',
    body: 'An agent reasons across every open issue to produce a prioritized daily action plan and detect hotspots.',
    tag: 'City-wide reasoning',
  },
  {
    Icon: Mail,
    title: 'Auto-drafted complaints',
    body: 'One tap turns a report into a formal complaint letter to the responsible department, with a tracking ID.',
    tag: 'Takes action',
  },
  {
    Icon: Mic,
    title: 'Voice reporting',
    body: 'Describe the issue out loud — speech is transcribed and fed into the AI pipeline.',
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
  'Web Speech API',
];

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4">
        <section className="py-20 text-center sm:py-28">
          <Flourish />
          <p className="mt-6 font-medium text-sarvam-blue">
            India&apos;s civic resolution agent
          </p>
          <h1 className="mx-auto mt-5 max-w-3xl font-serif text-5xl font-medium leading-[1.05] tracking-tight text-ink sm:text-7xl">
            Civic action for all
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-ink/70">
            Snap a photo. An autonomous AI agent validates, triages, routes and
            drafts the complaint — then confirms it was actually resolved.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/report"
              className="btn-primary px-7 py-3.5"
            >
              Report an issue
            </Link>
            <Link
              href="/command"
              className="btn-ghost flex items-center gap-2 px-7 py-3.5"
            >
              <Radar className="h-4 w-4" /> Command Center
            </Link>
          </div>

          <div className="mt-14">
            <LandingStats />
          </div>
        </section>

        {/* Tech strip */}
        <section className="pb-16">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-ink/40">
            Built with sovereign-scale Google AI
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {PARTNERS.map((p) => (
              <span
                key={p}
                className="text-sm font-semibold tracking-tight text-ink/45"
              >
                {p}
              </span>
            ))}
          </div>
        </section>

        {/* Agent pipeline */}
        <section className="pb-16">
          <h2 className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-ink/40">
            The 4-step Gemini Vision agent
          </h2>
          <div className="mx-auto mt-7 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            {PIPELINE.map((p) => (
              <div
                key={p.n}
                className="glass-card p-5 text-center"
              >
                <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sarvam-blue to-sarvam-orange font-bold text-white">
                  {p.n}
                </span>
                <h3 className="mt-3 font-semibold text-ink">{p.title}</h3>
                <p className="mt-1 text-xs text-ink/55">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Hero features */}
        <section className="pb-28">
          <h2 className="text-center font-serif text-3xl font-medium text-ink sm:text-4xl">
            Not just reporting — an autonomous resolution platform
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="glass-card-lg glass-card-hover p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sarvam-sky/25 text-sarvam-blue">
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
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
