import { NextResponse } from 'next/server';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateBriefing } from '@/lib/gemini';
import type { CityBriefing } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/briefing
 * The Command Center agent reasons over every open/in-progress issue and
 * returns a prioritized municipal action plan, hotspots and department load.
 */
export async function GET() {
  try {
    const snap = await getDocs(
      query(collection(db, 'issues'), where('status', 'in', ['open', 'in_progress'])),
    );

    const issues = snap.docs.map((d) => {
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
        // Coarse area label for clustering (≈1km grid).
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
      return NextResponse.json({ briefing: empty });
    }

    const result = await generateBriefing(issues);
    const briefing: CityBriefing = { ...result, generatedAt: Date.now() };
    return NextResponse.json({ briefing });
  } catch (err) {
    console.error('Briefing generation failed:', err);
    return NextResponse.json(
      { error: 'Could not generate the command center briefing.' },
      { status: 500 },
    );
  }
}
