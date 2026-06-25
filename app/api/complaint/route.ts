import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { draftComplaint } from '@/lib/gemini';
import type { ComplaintDraft } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * POST /api/complaint
 * Body: { issueId }
 *
 * Auto-drafts a formal complaint letter to the routed department and persists
 * it (with a generated reference ID) on the issue. Returns the cached draft if
 * one already exists.
 */
export async function POST(req: NextRequest) {
  try {
    const { issueId } = (await req.json()) as { issueId: string };
    if (!issueId) {
      return NextResponse.json({ error: 'issueId is required' }, { status: 400 });
    }

    const issueRef = doc(db, 'issues', issueId);
    const snap = await getDoc(issueRef);
    if (!snap.exists()) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    const issue = snap.data() as {
      title: string;
      description: string;
      category: string;
      severity: number;
      assignedDept: string;
      aiAnalysis?: { reasoning?: string };
      complaint?: ComplaintDraft;
    };

    // Return the existing draft if we already generated one.
    if (issue.complaint?.body) {
      return NextResponse.json({ complaint: issue.complaint, cached: true });
    }

    const referenceId = `CH-${new Date().getFullYear()}-${issueId
      .slice(0, 4)
      .toUpperCase()}`;

    const drafted = await draftComplaint({
      title: issue.title,
      description: issue.description ?? '',
      category: issue.category,
      severity: issue.severity,
      assignedDept: issue.assignedDept,
      reasoning: issue.aiAnalysis?.reasoning ?? '',
      referenceId,
    });

    const complaint: ComplaintDraft = {
      referenceId,
      department: issue.assignedDept,
      subject: drafted.subject,
      body: drafted.body,
      generatedAt: Date.now(),
    };

    await updateDoc(issueRef, { complaint, updatedAt: serverTimestamp() });

    return NextResponse.json({ complaint, cached: false });
  } catch (err) {
    console.error('Complaint drafting failed:', err);
    return NextResponse.json(
      { error: 'Could not draft the complaint. Please try again.' },
      { status: 500 },
    );
  }
}
