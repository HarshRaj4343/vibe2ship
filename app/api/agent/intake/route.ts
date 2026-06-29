import { NextRequest } from 'next/server';
import { runIntakeAgent } from '@/lib/agent';
import type { AgentStep } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/agent/intake  (Server-Sent Events)
 *
 * Body (JSON): { imageUrl (data URL), description?, lat, lng, reportedBy,
 *                reporterName?, reporterEmail? }
 *
 * Runs the autonomous tool-use intake agent and STREAMS its reasoning trace
 * live as SSE `data:` frames:
 *   { type: 'step',   step }   — emitted for every thought / tool call / result
 *   { type: 'result', result } — the final outcome (issueId, dispatch, complaint)
 *   { type: 'error',  error }  — if the run failed
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    imageUrl?: string;
    description?: string;
    lat?: number;
    lng?: number;
    reportedBy?: string;
    reporterName?: string;
    reporterEmail?: string;
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      if (!body.imageUrl || !body.reportedBy) {
        send({ type: 'error', error: 'imageUrl and reportedBy are required.' });
        controller.close();
        return;
      }

      try {
        const result = await runIntakeAgent(
          {
            imageUrl: body.imageUrl,
            description: body.description,
            lat: typeof body.lat === 'number' ? body.lat : 0,
            lng: typeof body.lng === 'number' ? body.lng : 0,
            userId: body.reportedBy,
            reporterName: body.reporterName,
            reporterEmail: body.reporterEmail,
          },
          (step: AgentStep) => send({ type: 'step', step }),
        );
        send({ type: 'result', result });
      } catch (err) {
        console.error('Agent intake failed:', err);
        send({
          type: 'error',
          error:
            err instanceof Error
              ? err.message
              : 'The agent could not process this report.',
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
