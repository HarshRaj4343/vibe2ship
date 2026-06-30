import { NextRequest, NextResponse } from 'next/server';
import {
  doc,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { POINTS } from '@/lib/points';
import { sendPush } from '@/lib/server/fcm';
import type { IssueStatus } from '@/lib/types';

export const runtime = 'nodejs';

const VALID_STATUSES: IssueStatus[] = ['open', 'in_progress', 'resolved'];

/** GET /api/issues/[id] — fetch a single issue with serialized timestamps. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const snap = await getDoc(doc(db, 'issues', params.id));
    if (!snap.exists()) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }
    const data = snap.data();
    return NextResponse.json({
      issue: {
        id: snap.id,
        ...data,
        createdAt: (data.createdAt as Timestamp | undefined)?.toMillis() ?? Date.now(),
        updatedAt: (data.updatedAt as Timestamp | undefined)?.toMillis() ?? Date.now(),
      },
    });
  } catch (err) {
    console.error('Failed to fetch issue:', err);
    return NextResponse.json({ error: 'Failed to fetch issue' }, { status: 500 });
  }
}

/**
 * PATCH /api/issues/[id] — update status.
 * When an issue moves to "resolved", the original reporter receives a
 * resolution bonus.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { status } = (await req.json()) as { status: IssueStatus };

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    const issueRef = doc(db, 'issues', params.id);
    const issueSnap = await getDoc(issueRef);
    if (!issueSnap.exists()) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    const issue = issueSnap.data() as {
      status: IssueStatus;
      reportedBy: string;
      title: string;
      communityUpdate?: string;
    };
    const wasResolved = issue.status === 'resolved';

    await updateDoc(issueRef, { status, updatedAt: serverTimestamp() });

    // On transition into "resolved": award bonus + send FCM push to reporter.
    if (status === 'resolved' && !wasResolved && issue.reportedBy) {
      await updateDoc(doc(db, 'users', issue.reportedBy), {
        points: increment(POINTS.ISSUE_RESOLVED),
      }).catch((e) => console.error('Resolution bonus failed:', e));

      // Send push notification if the reporter stored an FCM token.
      const userSnap = await getDoc(doc(db, 'users', issue.reportedBy)).catch(() => null);
      const fcmToken = (userSnap?.data() as { fcmToken?: string } | undefined)?.fcmToken;
      if (fcmToken) {
        await sendPush(
          fcmToken,
          'Issue Resolved! 🎉',
          `"${issue.title}" has been marked as resolved. +${POINTS.ISSUE_RESOLVED} points awarded.`,
          { url: `/issue/${params.id}` },
        );
      }
    }

    return NextResponse.json({ ok: true, status });
  } catch (err) {
    console.error('Failed to update issue:', err);
    return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 });
  }
}
