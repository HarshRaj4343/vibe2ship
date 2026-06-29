import {
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  arrayUnion,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getGeohash } from '@/lib/geo';
import { POINTS, eligibleBadges } from '@/lib/points';
import type { IssueCategory, Severity, StoredAiAnalysis } from '@/lib/types';

/**
 * Shared server-side issue helpers used by BOTH the classic route
 * (app/api/issues/route.ts) and the autonomous agent's tools
 * (lib/agent-tools.ts), so the two intake paths never drift apart.
 */

export interface CreateIssueInput {
  title: string;
  description?: string;
  category: IssueCategory;
  severity: Severity;
  imageUrl?: string;
  lat: number;
  lng: number;
  reportedBy: string;
  assignedDept: string;
  aiAnalysis: StoredAiAnalysis | Record<string, unknown>;
}

/**
 * Create a fresh issue document (no dedup — callers run findDuplicateIssue
 * first). Mirrors the shape written by the classic POST /api/issues route.
 * Returns the new document id.
 */
export async function createIssueDoc(input: CreateIssueInput): Promise<string> {
  const geohash = getGeohash(input.lat, input.lng);
  const docRef = await addDoc(collection(db, 'issues'), {
    title: input.title,
    description: input.description ?? '',
    category: input.category,
    severity: input.severity,
    status: 'open',
    imageUrl: input.imageUrl ?? '',
    lat: input.lat,
    lng: input.lng,
    geohash,
    upvoteCount: 0,
    verifiedCount: 0,
    reportedBy: input.reportedBy,
    assignedDept:
      input.assignedDept ??
      (input.aiAnalysis as { routeTo?: string })?.routeTo ??
      'Municipal Corporation',
    aiAnalysis: input.aiAnalysis ?? {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export interface AwardedBadge {
  id: string;
  name: string;
}

export interface AwardResult {
  points: number;
  newBadges: AwardedBadge[];
}

/**
 * Increment a user's counters + points, then award any newly-earned badges.
 * Creates the user document on first activity. Returns the points awarded and
 * any badges newly earned (useful for the agent trace + toast).
 */
export async function awardPoints(
  userId: string,
  basePoints: number,
  kind: 'report' | 'verify',
  profile?: { name?: string; email?: string },
): Promise<AwardResult> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  const counterField = kind === 'report' ? 'issuesReported' : 'issuesVerified';

  if (!userSnap.exists()) {
    const isFirstReport = kind === 'report';
    await setDoc(userRef, {
      name: profile?.name || 'Anonymous Citizen',
      email: profile?.email || '',
      points: basePoints + (isFirstReport ? POINTS.FIRST_REPORT : 0),
      badges: [],
      issuesReported: kind === 'report' ? 1 : 0,
      issuesVerified: kind === 'verify' ? 1 : 0,
      createdAt: serverTimestamp(),
    });
  } else {
    await updateDoc(userRef, {
      points: increment(basePoints),
      [counterField]: increment(1),
      // Backfill the display name/email once the citizen signs in.
      ...(profile?.name ? { name: profile.name } : {}),
      ...(profile?.email ? { email: profile.email } : {}),
    });
  }

  // Re-read counters and award any newly-eligible badges.
  const fresh = await getDoc(userRef);
  const data = fresh.data() as
    | { issuesReported?: number; issuesVerified?: number; badges?: { id: string }[] }
    | undefined;
  if (!data) return { points: basePoints, newBadges: [] };

  const earned = eligibleBadges({
    issuesReported: data.issuesReported ?? 0,
    issuesVerified: data.issuesVerified ?? 0,
  });
  const heldIds = new Set((data.badges ?? []).map((b) => b.id));
  const newBadges = earned
    .filter((b) => !heldIds.has(b.id))
    .map((b) => ({ id: b.id, name: b.name, awardedAt: Timestamp.now() }));

  if (newBadges.length > 0) {
    await updateDoc(userRef, { badges: arrayUnion(...newBadges) });
  }

  return {
    points: basePoints,
    newBadges: newBadges.map((b) => ({ id: b.id, name: b.name })),
  };
}
