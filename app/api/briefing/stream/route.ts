import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { runBriefingAgent, type BriefingIssue } from '@/lib/briefing-agent';
import type { AgentStep, CityBriefing } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/briefing/stream  (Server-Sent Events)
 *
 * Streams the multi-step planning agent's reasoning as it assesses load, finds
 * hotspots, and prioritizes — then sends the final CityBriefing.
 *   { type: 'step',   step }
 *   { type: 'result', briefing }
 *   { type: 'error',  error }
 */
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      try {
        const snap = await getDocs(
          query(
            collection(db, 'issues'),
            where('status', 'in', ['open', 'in_progress']),
          ),
        );

        const issues: BriefingIssue[] = snap.docs.map((d) => {
          const data = d.data() as {
            title: string;
            category: string;
            severity: number;
            status: string;
            upvoteCount?: number;
            assignedDept?: string;
            lat: number;
            lng: number;
            aiAnalysis?: { safetyRisk?: boolean };
          };
          return {
            id: d.id,
            title: data.title,
            category: data.category,
            severity: data.severity,
            status: data.status,
            upvoteCount: data.upvoteCount ?? 0,
            safetyRisk: Boolean(data.aiAnalysis?.safetyRisk),
            assignedDept: data.assignedDept ?? 'Municipal Corporation',
            area: `${data.lat.toFixed(2)}, ${data.lng.toFixed(2)}`,
          };
        });

        if (issues.length === 0) {
          const empty: CityBriefing = {
            summary: 'No open issues right now — the city is all clear.',
            topActions: [],
            hotspots: [],
            departmentLoad: [],
            generatedAt: Date.now(),
          };
          send({ type: 'result', briefing: empty });
          controller.close();
          return;
        }

        const briefing = await runBriefingAgent(issues, (step: AgentStep) =>
          send({ type: 'step', step }),
        );
        send({ type: 'result', briefing });
      } catch (err) {
        console.error('Briefing stream failed:', err);
        send({
          type: 'error',
          error: 'Could not generate the command center briefing.',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
