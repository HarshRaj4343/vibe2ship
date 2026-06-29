import { GoogleGenerativeAI } from '@google/generative-ai';
import { makeStep } from '@/lib/agent-step';
import type { AgentStep, CityBriefing } from '@/lib/types';

/**
 * Multi-step municipal planning agent. Instead of one opaque call, it reasons
 * in visible phases — assess department load → find hotspots → prioritize →
 * action plan — emitting each as an AgentStep so the /command UI can stream the
 * agent's thinking live before showing the final briefing.
 */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export interface BriefingIssue {
  id: string;
  title: string;
  category: string;
  severity: number;
  status: string;
  upvoteCount: number;
  safetyRisk: boolean;
  assignedDept: string;
  area: string;
}

function parseJson<T>(text: string): T {
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean) as T;
}

function compact(issues: BriefingIssue[]): string {
  return issues
    .map(
      (i) =>
        `- id=${i.id} | ${i.title} | ${i.category} | sev ${i.severity} | ${i.status} | ${i.upvoteCount} upvotes${i.safetyRisk ? ' | SAFETY RISK' : ''} | dept=${i.assignedDept} | area=${i.area}`,
    )
    .join('\n');
}

export async function runBriefingAgent(
  issues: BriefingIssue[],
  onStep: (step: AgentStep) => void,
): Promise<CityBriefing> {
  const trace: AgentStep[] = [];
  const emit = (s: AgentStep) => {
    trace.push(s);
    onStep(s);
  };
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  emit(makeStep('thought', `Reviewing ${issues.length} open issue(s)`));

  // --- Step 1: assess department load (deterministic) -----------------------
  const loadMap: Record<string, number> = {};
  for (const i of issues) loadMap[i.assignedDept] = (loadMap[i.assignedDept] ?? 0) + 1;
  const departmentLoad = Object.entries(loadMap)
    .map(([department, open]) => ({ department, open }))
    .sort((a, b) => b.open - a.open);
  emit(
    makeStep('decision', 'Assessed department load', {
      detail: departmentLoad.map((d) => `${d.department}: ${d.open}`).join(' · '),
    }),
  );

  // --- Step 2: find hotspots (model) ---------------------------------------
  emit(makeStep('tool_call', 'Scanning for geographic hotspots'));
  let hotspots: CityBriefing['hotspots'] = [];
  try {
    const res = await model.generateContent(`
You are a city operations analyst. From these open civic issues, identify
geographic hotspots — areas with multiple issues that should be escalated as a
cluster. Group by the "area" label.

Issues:
${compact(issues)}

Return ONLY valid JSON, no markdown:
{ "hotspots": [ { "area": "<area>", "count": 3, "note": "<why this cluster matters>" } ] }`);
    hotspots = parseJson<{ hotspots: CityBriefing['hotspots'] }>(
      res.response.text(),
    ).hotspots;
    if (!Array.isArray(hotspots)) hotspots = [];
  } catch {
    hotspots = [];
  }
  emit(
    makeStep('decision', 'Identified hotspots', {
      detail:
        hotspots.length > 0
          ? hotspots.map((h) => `${h.area} (${h.count})`).join(' · ')
          : 'No significant clusters detected.',
    }),
  );

  // --- Step 3: prioritize + situational summary (model) --------------------
  emit(makeStep('tool_call', "Prioritizing today's action plan"));
  let summary = '';
  let topActions: CityBriefing['topActions'] = [];
  try {
    const res = await model.generateContent(`
You are the AI operations chief for a city's civic maintenance command center.
Using the open issues, the department load, and the hotspots below, produce a
prioritized action plan for today.

Prioritize by: direct safety risk first, then severity, then community demand
(upvotes), then clustering (issues in the same hotspot escalate).

Department load: ${JSON.stringify(departmentLoad)}
Hotspots: ${JSON.stringify(hotspots)}

Issues:
${compact(issues)}

Return ONLY valid JSON, no markdown:
{
  "summary": "2-3 sentence situational overview for the city manager.",
  "topActions": [ { "issueId": "<id>", "title": "<title>", "priority": 1, "reason": "<why this first>" } ]
}
Limit topActions to the 5 most urgent.`);
    const p = parseJson<{ summary: string; topActions: CityBriefing['topActions'] }>(
      res.response.text(),
    );
    summary = p.summary || '';
    topActions = Array.isArray(p.topActions) ? p.topActions.slice(0, 5) : [];
  } catch {
    summary = 'Generated a prioritized plan across the open issues.';
    topActions = [];
  }
  emit(
    makeStep('decision', 'Prioritized the action plan', {
      detail: `${topActions.length} top action(s) selected.`,
    }),
  );

  emit(makeStep('final', summary || 'Briefing ready.'));

  return {
    summary: summary || 'No open issues to brief on.',
    topActions,
    hotspots,
    departmentLoad,
    generatedAt: Date.now(),
  };
}
