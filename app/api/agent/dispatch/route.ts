import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DispatchState } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * POST /api/agent/dispatch
 * Body: { issueId, action: 'approve' | 'reject', decidedBy? }
 *
 * The human-in-the-loop checkpoint for the autonomous loop: a person approves
 * (→ dispatched) or rejects the agent-drafted complaint before it goes out.
 */
export async function POST(req: NextRequest) {
  try {
    const { issueId, action, decidedBy } = (await req.json()) as {
      issueId: string;
      action: 'approve' | 'reject';
      decidedBy?: string;
    };

    if (!issueId || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json(
        { error: "issueId and action ('approve' | 'reject') are required" },
        { status: 400 },
      );
    }

    const issueRef = doc(db, 'issues', issueId);
    const snap = await getDoc(issueRef);
    if (!snap.exists()) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    const current = (snap.data().dispatch ?? {}) as Partial<DispatchState>;
    const dispatch: DispatchState = {
      status: action === 'approve' ? 'dispatched' : 'rejected',
      queuedAt: current.queuedAt ?? Date.now(),
      decidedAt: Date.now(),
      // Omit optional fields when absent — Firestore rejects undefined values.
      ...(current.complaintRef ? { complaintRef: current.complaintRef } : {}),
      ...(decidedBy ? { decidedBy } : {}),
    };

    await updateDoc(issueRef, { dispatch, updatedAt: serverTimestamp() });

    return NextResponse.json({ ok: true, dispatch });
  } catch (err) {
    console.error('Dispatch decision failed:', err);
    return NextResponse.json({ error: 'Failed to update dispatch' }, { status: 500 });
  }
}
