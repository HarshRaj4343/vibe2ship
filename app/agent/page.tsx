import AgentIntake from '@/components/AgentIntake';
import { Bot } from '@/components/icons';

export default function AgentConsolePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-sarvam-blue ring-1 ring-white/60 backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sarvam-blue opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-sarvam-blue" />
          </span>
          AUTONOMOUS · TOOL USE
        </span>
      </div>
      <h1 className="mt-2 flex items-center gap-2.5 font-serif text-3xl font-medium text-ink">
        <Bot className="h-7 w-7 text-sarvam-blue" /> Autonomous Agent Console
      </h1>
      <p className="mt-1 text-sm text-ink/55">
        Drop a photo and watch the Gemini agent reason and act on its own —
        validating, deduplicating, routing, filing, drafting a complaint, and
        queuing dispatch — every tool call streamed live. You approve before it
        ships.
      </p>
      <div className="mt-6">
        <AgentIntake />
      </div>
    </div>
  );
}
