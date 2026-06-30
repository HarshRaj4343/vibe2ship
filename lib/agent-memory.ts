import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  limit,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { IssueCategory } from '@/lib/types';

/**
 * Persistent cross-session agent memory stored in the `agentMemory` Firestore
 * collection. After each intake run the agent writes a structured insight
 * (what category, which dept, how fast similar issues resolve, any pattern).
 * On the *next* run, the most recent memories are injected into the agent's
 * system prompt so it can reason with institutional knowledge it accumulated.
 *
 * This is deliberate agentic memory — not just a log. The insights are short,
 * opinionated sentences the agent can actually use ("Sector 12 potholes always
 * go to PWD, resolved in ~4 days based on 6 past cases").
 */

export interface AgentMemoryEntry {
  category: IssueCategory;
  dept: string;
  area: string;
  insight: string; // one sentence the agent can re-use
  issueId: string;
  createdAt: number; // epoch millis (for display; Firestore uses serverTimestamp)
}

const MEMORY_COLLECTION = 'agentMemory';
const MAX_RECALL = 8; // inject the 8 most recent memories

/** Write a new memory insight after a successful intake run. */
export async function writeAgentMemory(entry: AgentMemoryEntry): Promise<void> {
  try {
    await addDoc(collection(db, MEMORY_COLLECTION), {
      ...entry,
      storedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('[agent-memory] Failed to write memory:', e);
  }
}

/** Read the most recent memories to hydrate the agent's system prompt. */
export async function readAgentMemories(): Promise<AgentMemoryEntry[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, MEMORY_COLLECTION),
        orderBy('storedAt', 'desc'),
        limit(MAX_RECALL),
      ),
    );
    return snap.docs.map((d) => d.data() as AgentMemoryEntry);
  } catch {
    return [];
  }
}

/** Format memories as a compact bullet list for the system prompt. */
export function formatMemoriesForPrompt(memories: AgentMemoryEntry[]): string {
  if (memories.length === 0) return '';
  const bullets = memories
    .map((m) => `• [${m.category}] ${m.insight}`)
    .join('\n');
  return `\n\nPAST LEARNINGS (from previous intake sessions — use these to inform routing and estimates):\n${bullets}`;
}

/**
 * Build a memory insight from a completed intake run.
 * Called by the agent after a successful create_issue + award_points sequence.
 */
export function buildInsight(
  category: IssueCategory,
  dept: string,
  area: string,
  etaDays: number | null,
  safetyRisk: boolean,
): string {
  const eta = etaDays ? ` resolved in ~${etaDays} day(s)` : '';
  const risk = safetyRisk ? ' (safety risk — escalate immediately)' : '';
  return `${category.replace('_', ' ')} issues in ${area} go to ${dept}${eta}${risk}.`;
}
