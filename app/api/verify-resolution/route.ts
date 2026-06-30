import { NextRequest, NextResponse } from 'next/server';
import {
  doc,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { verifyResolution, draftCommunityUpdate } from '@/lib/gemini';
import { geminiErrorResponse } from '@/lib/api';
import { POINTS } from '@/lib/points';
import type { ResolutionVerification } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * POST /api/verify-resolution
 * Body: { issueId, afterImageUrl }   (afterImageUrl = compressed data URL)
 *
 * The Resolution Verification Agent compares the original "before" photo with
 * the uploaded "after" photo. If it confirms the fix, the issue is marked
 * resolved and the original reporter receives the resolution bonus.
 */
export async function POST(req: NextRequest) {
  try {
    const { issueId, afterImageUrl } = (await req.json()) as {
      issueId: string;
      afterImageUrl: string;
    };

    if (!issueId || !afterImageUrl) {
      return NextResponse.json(
        { error: 'issueId and afterImageUrl are required' },
        { status: 400 },
      );
    }

    const issueRef = doc(db, 'issues', issueId);
    const snap = await getDoc(issueRef);
    if (!snap.exists()) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    const issue = snap.data() as {
      title: string;
      category: string;
      imageUrl: string;
      reportedBy: string;
      status: string;
      verifiedCount?: number;
      createdAt?: { toMillis: () => number };
      assignedDept?: string;
    };

    if (!issue.imageUrl) {
      return NextResponse.json(
        { error: 'This issue has no original photo to compare against.' },
        { status: 400 },
      );
    }

    const result = await verifyResolution(
      issue.imageUrl,
      afterImageUrl,
      issue.title,
      issue.category,
    );

    const resolution: ResolutionVerification = {
      ...result,
      afterImageUrl,
      verifiedAt: Date.now(),
    };

    const updates: Record<string, unknown> = {
      resolution,
      updatedAt: serverTimestamp(),
    };
    // Only flip to resolved (and pay the bonus) if the agent confirms the fix.
    if (result.isResolved && issue.status !== 'resolved') {
      updates.status = 'resolved';

      // Draft a public community update celebrating the resolution.
      const communityUpdate = await draftCommunityUpdate({
        title: issue.title,
        category: issue.category,
        verifiedCount: issue.verifiedCount ?? 0,
        createdAt: issue.createdAt?.toMillis?.() ?? Date.now(),
        assignedDept: issue.assignedDept ?? 'Municipal Corporation',
      }).catch(() => null);
      if (communityUpdate) updates.communityUpdate = communityUpdate;
    }
    await updateDoc(issueRef, updates);

    if (result.isResolved && issue.status !== 'resolved' && issue.reportedBy) {
      await updateDoc(doc(db, 'users', issue.reportedBy), {
        points: increment(POINTS.ISSUE_RESOLVED),
      }).catch((e) => console.error('Resolution bonus failed:', e));
    }

    return NextResponse.json({ resolution });
  } catch (err) {
    console.error('Resolution verification failed:', err);
    return geminiErrorResponse(
      err,
      'Could not verify the photo. Please try a clearer "after" shot.',
    );
  }
}
