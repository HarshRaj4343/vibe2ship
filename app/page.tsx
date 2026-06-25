import Link from 'next/link';
import LandingStats from '@/components/LandingStats';

const PIPELINE = [
  { n: '1', title: 'Validate', body: 'Is it a real civic issue?' },
  { n: '2', title: 'Categorize', body: 'Pothole, leak, light, waste…' },
  { n: '3', title: 'Severity', body: 'Score 1–5 + safety risk' },
  { n: '4', title: 'Route', body: 'To the right department' },
];

const FEATURES = [
  {
    icon: '🔍',
    title: 'AI Resolution Verification',
    body: 'Upload an "after" photo and the agent compares it to the original to confirm the fix actually happened.',
    tag: 'Closes the loop',
  },
  {
    icon: '🛰️',
    title: 'Municipal Command Center',
    body: 'An agent reasons across every open issue to produce a prioritized daily action plan and detect hotspots.',
    tag: 'City-wide reasoning',
  },
  {
    icon: '📨',
    title: 'Auto-drafted complaints',
    body: 'One tap turns a report into a formal complaint letter to the responsible department, with a tracking ID.',
    tag: 'Takes action',
  },
  {
    icon: '🎙️',
    title: 'Voice reporting',
    body: 'Describe the issue out loud — speech is transcribed and fed into the AI pipeline.',
    tag: 'Multimodal',
  },
];

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* ambient gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-gradient-to-b from-blue-50 via-indigo-50/40 to-transparent" />

      <div className="mx-auto max-w-6xl px-4">
        <section className="py-16 text-center sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-blue-700 shadow-sm ring-1 ring-blue-100">
            ✨ Powered by Gemini 2.5 Flash · Firestore · Maps · Cloud Run
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            From neighborhood problem to{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              verified fix
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Snap a photo of a civic issue. An autonomous AI agent validates,
            triages, routes, drafts the complaint — and later confirms it was
            actually resolved. Citizens earn points the whole way.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/report"
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Report an issue
            </Link>
            <Link
              href="/command"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              🛰️ Open Command Center
            </Link>
          </div>

          <div className="mt-12">
            <LandingStats />
          </div>
        </section>

        {/* Agent pipeline */}
        <section className="pb-16">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-slate-400">
            The 4-step Gemini Vision agent
          </h2>
          <div className="mx-auto mt-6 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            {PIPELINE.map((p) => (
              <div
                key={p.n}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-center"
              >
                <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                  {p.n}
                </span>
                <h3 className="mt-3 font-semibold text-slate-900">{p.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Hero features */}
        <section className="pb-24">
          <h2 className="text-center text-2xl font-bold text-slate-900">
            Not just reporting — an autonomous resolution platform
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{f.icon}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {f.tag}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
