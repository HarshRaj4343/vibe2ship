'use client';

import type { AgentStep } from '@/lib/types';
import { Sparkles, Wrench, Check, Bot, AlertTriangle, ArrowRight } from './icons';

/**
 * Renders the autonomous agent's reasoning trace — used live (streaming) on the
 * /agent console and statically on the issue page. Each step shows what the
 * agent thought, which tool it invoked, and what came back.
 */
export default function AgentTrace({
  steps,
  running = false,
}: {
  steps: AgentStep[];
  running?: boolean;
}) {
  if (!steps.length) return null;

  return (
    <ol className="space-y-2.5">
      {steps.map((step, i) => (
        <li
          key={step.id}
          className="flex gap-3"
          style={{ animation: `toast-in 0.35s ease-out ${Math.min(i, 8) * 0.04}s both` }}
        >
          <StepGlyph step={step} />
          <div className="min-w-0 flex-1 pb-0.5">
            <p className="text-sm font-medium text-ink">{step.title}</p>
            {step.tool && step.kind === 'tool_call' && (
              <p className="mt-0.5 font-mono text-[11px] text-sarvam-blue">
                {step.tool}({formatArgs(step.args)})
              </p>
            )}
            {step.kind === 'tool_result' && (
              <p className="mt-0.5 text-xs text-ink/55">{formatResult(step.result)}</p>
            )}
            {step.detail && step.kind !== 'tool_call' && (
              <p className="mt-0.5 text-xs leading-relaxed text-ink/55">{step.detail}</p>
            )}
          </div>
        </li>
      ))}
      {running && (
        <li className="flex items-center gap-3 pl-0.5 text-xs text-ink/45">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-sarvam-blue/40 border-t-sarvam-blue" />
          Agent is thinking…
        </li>
      )}
    </ol>
  );
}

function StepGlyph({ step }: { step: AgentStep }) {
  const base =
    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full';

  if (step.status === 'running') {
    return (
      <span className={`${base} bg-sarvam-sky/40 text-sarvam-blue`}>
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-sarvam-blue/40 border-t-sarvam-blue" />
      </span>
    );
  }

  switch (step.kind) {
    case 'thought':
      return (
        <span className={`${base} bg-sarvam-sky/40 text-sarvam-blue`}>
          <Sparkles className="h-3.5 w-3.5" />
        </span>
      );
    case 'tool_call':
      return (
        <span className={`${base} bg-sarvam-peach/40 text-sarvam-orange`}>
          <Wrench className="h-3.5 w-3.5" />
        </span>
      );
    case 'tool_result':
      return (
        <span className={`${base} bg-emerald-100 text-emerald-700`}>
          <Check className="h-3.5 w-3.5" />
        </span>
      );
    case 'final':
      return (
        <span className={`${base} bg-ink text-white`}>
          <Bot className="h-3.5 w-3.5" />
        </span>
      );
    case 'error':
      return (
        <span className={`${base} bg-red-100 text-red-600`}>
          <AlertTriangle className="h-3.5 w-3.5" />
        </span>
      );
    default:
      return (
        <span className={`${base} bg-ink/10 text-ink/60`}>
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      );
  }
}

function formatArgs(args: unknown): string {
  if (!args || typeof args !== 'object') return '';
  return Object.entries(args as Record<string, unknown>)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join(', ');
}

function formatResult(result: unknown): string {
  if (result == null) return '';
  if (typeof result !== 'object') return String(result);
  const r = result as Record<string, unknown>;
  // Prefer a human-friendly field if the tool provided one.
  if (typeof r.instruction === 'string') return r.instruction;
  if (typeof r.note === 'string') return r.note;
  return Object.entries(r)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' · ');
}
