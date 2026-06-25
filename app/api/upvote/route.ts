import { NextRequest, NextResponse } from 'next/server';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { POINTS } from '@/lib/points';

export const runtime = 'nodejs';

/**
 * POST /api/upvote
 * Body: { issueId: string, userId: string }
 * Records an upvote (one per user per issue), bumps the issue's upvoteCount,
 * and awards verification points to the voting citizen.
 */
export async function POST(req: NextRequest) {
  try {
    const { issueId, userId, userName, userEmail } = (await req.json()) as {
      issueId: string;
      userId: string;
      userName?: string;
      userEmail?: string;
    };

    if (!issueId || !userId) {
      return NextResponse.json(
        { error: 'issueId and userId are required' },
        { status: 400 },
      );
    }

    // Enforce one upvote per user per issue.
    const existing = await getDocs(
      query(
        collection(db, 'upvotes'),
        where('issueId', '==', issueId),
        where('userId', '==', userId),
      ),
    );
    if (!existing.empty) {
      return NextResponse.json(
        { error: 'You have already upvoted this issue', alreadyVoted: true },
        { status: 409 },
      );
    }

    const issueRef = doc(db, 'issues', issueId);
    const issueSnap = await getDoc(issueRef);
    if (!issueSnap.exists()) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    await addDoc(collection(db, 'upvotes'), {
      issueId,
      userId,
      createdAt: serverTimestamp(),
    });

    await updateDoc(issueRef, {
      upvoteCount: increment(1),
      updatedAt: serverTimestamp(),
    });

    // Award points to the voter (create the user doc if first-time).
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        name: userName || 'Anonymous Citizen',
        email: userEmail || '',
        points: POINTS.VERIFY_ISSUE,
        badges: [],
        issuesReported: 0,
        issuesVerified: 1,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        points: increment(POINTS.VERIFY_ISSUE),
        issuesVerified: increment(1),
        ...(userName ? { name: userName } : {}),
        ...(userEmail ? { email: userEmail } : {}),
      });
    }

    const newCount = (issueSnap.data().upvoteCount ?? 0) + 1;
    return NextResponse.json({
      ok: true,
      upvoteCount: newCount,
      pointsAwarded: POINTS.VERIFY_ISSUE,
    });
  } catch (err) {
    console.error('Failed to record upvote:', err);
    return NextResponse.json({ error: 'Failed to record upvote' }, { status: 500 });
  }
}
