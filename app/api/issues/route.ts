import { NextRequest, NextResponse } from 'next/server';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { findDuplicateIssue } from '@/lib/geo';
import { POINTS } from '@/lib/points';
import { awardPoints, createIssueDoc } from '@/lib/server/issues';
import type { CreateIssuePayload, IssueCategory } from '@/lib/types';

export const runtime = 'nodejs';

const VALID_CATEGORIES: IssueCategory[] = [
  'pothole',
  'water_leak',
  'streetlight',
  'waste',
  'other',
];

/**
 * GET /api/issues
 * Optional query params: ?category=pothole&status=open
 * Returns all matching issues ordered by recency (serialized timestamps).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const constraints = [];
    if (category && VALID_CATEGORIES.includes(category as IssueCategory)) {
      constraints.push(where('category', '==', category));
    }
    if (status) {
      constraints.push(where('status', '==', status));
    }
    constraints.push(orderBy('createdAt', 'desc'));

    const snap = await getDocs(query(collection(db, 'issues'), ...constraints));

    const issues = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: (data.createdAt as Timestamp | undefined)?.toMillis() ?? Date.now(),
        updatedAt: (data.updatedAt as Timestamp | undefined)?.toMillis() ?? Date.now(),
      };
    });

    return NextResponse.json({ issues });
  } catch (err) {
    console.error('Failed to fetch issues:', err);
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 });
  }
}

/**
 * POST /api/issues
 * Creates a new issue. Runs geo-deduplication first: if an unresolved issue of
 * the same category exists within 200m, the new report is folded into it as a
 * verification (bumping verifiedCount) instead of creating a duplicate.
 * Awards points and badges to the reporting citizen.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateIssuePayload;

    const {
      title,
      description,
      category,
      severity,
      imageUrl,
      lat,
      lng,
      reportedBy,
      reporterName,
      reporterEmail,
      assignedDept,
      aiAnalysis,
    } = body;

    const profile = { name: reporterName, email: reporterEmail };

    if (
      !title ||
      !category ||
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      !reportedBy
    ) {
      return NextResponse.json(
        { error: 'Missing required fields (title, category, lat, lng, reportedBy)' },
        { status: 400 },
      );
    }

    // --- Agent step: deduplicate against nearby unresolved issues ---
    const duplicateId = await findDuplicateIssue(lat, lng, category, 0.2);
    if (duplicateId) {
      await updateDoc(doc(db, 'issues', duplicateId), {
        verifiedCount: increment(1),
        updatedAt: serverTimestamp(),
      });
      await awardPoints(reportedBy, POINTS.VERIFY_ISSUE, 'verify', profile);
      return NextResponse.json(
        { id: duplicateId, deduplicated: true },
        { status: 200 },
      );
    }

    // --- Create a fresh issue ---
    const id = await createIssueDoc({
      title,
      description,
      category,
      severity,
      imageUrl,
      lat,
      lng,
      reportedBy,
      assignedDept: assignedDept ?? aiAnalysis?.routeTo ?? 'Municipal Corporation',
      aiAnalysis: aiAnalysis ?? {},
    });

    await awardPoints(reportedBy, POINTS.REPORT_ISSUE, 'report', profile);

    return NextResponse.json({ id, deduplicated: false }, { status: 201 });
  } catch (err) {
    console.error('Failed to create issue:', err);
    return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 });
  }
}
