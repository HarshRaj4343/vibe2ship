import type { AgentStep, AgentStepKind } from './types';

/**
 * Factory for agent trace steps, shared by the intake agent (lib/agent.ts) and
 * the briefing agent (lib/briefing-agent.ts) so both produce the same
 * AgentStep shape that <AgentTrace> renders.
 */
let stepCounter = 0;

export function makeStep(
  kind: AgentStepKind,
  title: string,
  extra: Partial<AgentStep> = {},
): AgentStep {
  return {
    id: `s${Date.now()}-${stepCounter++}`,
    kind,
    title,
    status: extra.status ?? 'done',
    at: Date.now(),
    ...extra,
  };
}
