import { GoogleGenerativeAI, type ChatSession, type Part } from '@google/generative-ai';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  agentToolDeclarations,
  agentToolExecutors,
  type AgentSession,
} from '@/lib/agent-tools';
import { makeStep } from '@/lib/agent-step';
import {
  readAgentMemories,
  writeAgentMemory,
  formatMemoriesForPrompt,
  buildInsight,
} from '@/lib/agent-memory';
import type { AgentStep, DispatchState, IssueCategory } from '@/lib/types';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey ?? '');
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const MAX_TURNS = 10;

const BASE_SYSTEM_INSTRUCTION = `You are the autonomous intake agent for UrbanPulse, a civic issue reporting system.
A citizen has uploaded a photo (and maybe a description) of a potential community problem.

You operate by CALLING TOOLS yourself — you decide what to do, in what order. Do not just describe steps; invoke the tools.

Your job, end to end:
1. Look at the photo and decide if it is a real, reportable civic infrastructure issue (pothole, road damage, water leak/flooding, broken streetlight, illegal waste dump, damaged public property). If it clearly is NOT, explain why in your final message and call no further tools.
2. Categorize it: pothole, water_leak, streetlight, waste, or other. Assess severity 1-5, whether it is a direct safety risk, and your confidence (0-1) in that categorization.
3. SELF-CHECK: if your confidence in the category or severity is below 0.7, call critique_analysis with your current analysis to re-examine the photo and challenge yourself BEFORE going further. Adopt the critique's verdict.
4. Call find_duplicate_issue to check for a nearby existing report.
   - If a duplicate is found: call award_points with kind='verify', then STOP (do not create an issue).
   - If no duplicate:
     a. Call lookup_resolution_history for this category to recall how long similar issues took to resolve and which department usually fixed them — use this to inform routing and as the resolution estimate.
     b. Call route_to_department.
     c. Call create_issue with your full analysis (pass estResolutionDays from the history lookup if available). This single step also drafts the official complaint and queues it for dispatch.
     d. Call award_points with kind='report'.
5. Finish with a one-sentence summary of what you did.

Always narrate a brief sentence of reasoning before each tool call so the citizen can follow along. Be decisive.`;

/**
 * Gemini Flash models intermittently return 503 (overloaded) / 429 (rate
 * limited). Each agent turn is its own API call, so a single transient blip
 * would otherwise abort the whole autonomous loop. Retry those with backoff.
 */
async function sendWithRetry(
  chat: ChatSession,
  parts: string | Array<string | Part>,
  maxRetries = 4,
) {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return (await chat.sendMessage(parts)).response;
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const transient =
        /\b(503|429|500)\b|overload|high demand|unavailable|rate|quota/i.test(msg);
      if (!transient || attempt === maxRetries) throw err;
      // Honor the server's suggested retry delay (e.g. "retry in 15.6s" or
      // RetryInfo "retryDelay":"15s") — free-tier quota is only 5 req/min and a
      // full agent chain makes ~7 calls, so this keeps the loop from aborting.
      const m = msg.match(/retry(?:Delay)?["':\s]+(\d+(?:\.\d+)?)s/i);
      const suggested = m ? Math.ceil(parseFloat(m[1]) * 1000) : 0;
      const backoff = Math.min(Math.max(suggested, 800 * 2 ** attempt), 30_000);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastErr;
}

/** Split a data URL into mime + base64 for inline Gemini input. */
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:(.+?);base64,(.*)$/s.exec(dataUrl);
  if (!match) return { mimeType: 'image/jpeg', data: dataUrl };
  return { mimeType: match[1], data: match[2] };
}

const TOOL_TITLES: Record<string, string> = {
  find_duplicate_issue: 'Checking for nearby duplicate reports',
  lookup_resolution_history: 'Recalling how similar issues were resolved',
  critique_analysis: 'Double-checking its own analysis',
  route_to_department: 'Routing to the right department',
  create_issue: 'Filing the issue',
  award_points: 'Awarding civic points',
};

export interface IntakeAgentInput {
  imageUrl: string; // compressed data URL
  description?: string;
  lat: number;
  lng: number;
  userId: string;
  reporterName?: string;
  reporterEmail?: string;
}

export interface IntakeAgentResult {
  issueId?: string;
  deduplicated: boolean;
  rejected: boolean;
  summary: string;
  trace: AgentStep[];
  dispatch?: DispatchState;
  complaint?: { referenceId: string; subject: string; body: string };
}

/**
 * Runs the autonomous tool-use intake agent. Each step (reasoning, tool call,
 * tool result, final summary) is emitted via `onStep` as it happens, so the
 * caller can stream them live. The full trace is also persisted onto the
 * created issue for replay on the issue page.
 */
export async function runIntakeAgent(
  input: IntakeAgentInput,
  onStep: (step: AgentStep) => void,
): Promise<IntakeAgentResult> {
  const trace: AgentStep[] = [];
  const emit = (step: AgentStep) => {
    trace.push(step);
    onStep(step);
  };

  const session: AgentSession = {
    userId: input.userId,
    profile: { name: input.reporterName, email: input.reporterEmail },
    lat: input.lat,
    lng: input.lng,
    imageUrl: input.imageUrl,
    description: input.description,
  };

  // Hydrate the system prompt with cross-session agent memories.
  const memories = await readAgentMemories();
  const systemInstruction = BASE_SYSTEM_INSTRUCTION + formatMemoriesForPrompt(memories);
  if (memories.length > 0) {
    emit(makeStep('thought', `Recalled ${memories.length} past insight(s) from memory`, {
      detail: memories.map((m) => m.insight).join(' | '),
    }));
  }

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    tools: [{ functionDeclarations: agentToolDeclarations }],
    systemInstruction,
  });
  const chat = model.startChat();

  const image = parseDataUrl(input.imageUrl);
  emit(makeStep('thought', 'Looking at the photo', { detail: input.description }));

  let response = await sendWithRetry(chat, [
    input.description
      ? `Citizen's description: "${input.description}". Analyze the photo and run the full intake.`
      : 'Analyze the photo and run the full intake.',
    { inlineData: { mimeType: image.mimeType, data: image.data } },
  ]);

  let summary = '';

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const calls = response.functionCalls() ?? [];

    // Surface any reasoning text the model produced this turn.
    const text = safeText(response);
    if (text) {
      if (calls.length > 0) {
        emit(makeStep('thought', text));
      } else {
        summary = text;
      }
    }

    if (calls.length === 0) {
      // No more tool calls — the agent is done.
      break;
    }

    const responses = [];
    for (const call of calls) {
      const args = (call.args ?? {}) as Record<string, unknown>;
      const callStep = makeStep('tool_call', TOOL_TITLES[call.name] ?? call.name, {
        tool: call.name,
        args,
      });
      emit(callStep);

      const executor = agentToolExecutors[call.name];
      let result: Record<string, unknown>;
      if (!executor) {
        result = { error: `Unknown tool: ${call.name}` };
        emit(
          makeStep('error', `Unknown tool: ${call.name}`, {
            tool: call.name,
            status: 'error',
          }),
        );
      } else {
        try {
          result = await executor(args, session);
          emit(
            makeStep('tool_result', TOOL_TITLES[call.name] ?? call.name, {
              tool: call.name,
              result,
            }),
          );

          // create_issue bundles the complaint draft + dispatch queue in one
          // model round-trip (to stay within the free-tier request budget).
          // Surface those as their own trace steps so the reasoning stays
          // legible.
          if (call.name === 'create_issue' && result.complaintRef) {
            emit(
              makeStep('decision', 'Drafted the official complaint', {
                detail: `Ref ${result.complaintRef}${
                  result.complaintSubject ? ` — ${result.complaintSubject}` : ''
                }`,
              }),
            );
            emit(
              makeStep('decision', 'Queued dispatch for human approval', {
                detail: 'Awaiting an approver before the complaint is sent.',
              }),
            );
          }
        } catch (err) {
          result = {
            error: err instanceof Error ? err.message : 'Tool execution failed',
          };
          emit(
            makeStep('error', `${call.name} failed`, {
              tool: call.name,
              status: 'error',
              detail: String(result.error),
            }),
          );
        }
      }

      responses.push({
        functionResponse: { name: call.name, response: result },
      });
    }

    response = await sendWithRetry(chat, responses);
  }

  if (!summary) summary = safeText(response) || 'Intake complete.';
  emit(makeStep('final', summary));

  const rejected = !session.issueId && !session.deduplicated;

  // Persist the trace onto the newly created issue for replay. Round-trip
  // through JSON to strip any `undefined` field values, which the Firestore
  // client SDK rejects.
  if (session.issueId && !session.deduplicated) {
    const safeTrace = JSON.parse(JSON.stringify(trace));
    await updateDoc(doc(db, 'issues', session.issueId), {
      agentTrace: safeTrace,
      updatedAt: serverTimestamp(),
    }).catch((e) => console.error('Failed to persist agent trace:', e));

    // Write a memory insight so future agent sessions can learn from this run.
    if (session.category && session.assignedDept) {
      const area = `${Math.round(input.lat * 100) / 100},${Math.round(input.lng * 100) / 100}`;
      await writeAgentMemory({
        category: session.category as IssueCategory,
        dept: session.assignedDept,
        area,
        insight: buildInsight(
          session.category as IssueCategory,
          session.assignedDept,
          area,
          session.resolutionEstimate?.etaDays ?? null,
          Boolean(session.severity && session.severity >= 4),
        ),
        issueId: session.issueId,
        createdAt: Date.now(),
      });
    }
  }

  return {
    issueId: session.issueId,
    deduplicated: Boolean(session.deduplicated),
    rejected,
    summary,
    trace,
    dispatch: session.dispatch,
    complaint: session.complaint,
  };
}

/** response.text() throws if the response was pure function calls — guard it. */
function safeText(response: { text: () => string }): string {
  try {
    return response.text().trim();
  } catch {
    return '';
  }
}
