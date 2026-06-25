'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import IssueMap from '@/components/IssueMap';
import CategoryBadge from '@/components/CategoryBadge';
import StatusBadge from '@/components/StatusBadge';
import SeverityBar from '@/components/SeverityBar';
import PointsToast from '@/components/PointsToast';
import ResolutionVerifier from '@/components/ResolutionVerifier';
import ComplaintDrafter from '@/components/ComplaintDrafter';
import { useAuth } from '@/lib/auth';
import type { IssueStatus, ResolutionVerification, SerializedIssue } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/types';

const STATUS_ORDER: IssueStatus[] = ['open', 'in_progress', 'resolved'];

export default function IssueDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { identity } = useAuth();

  const [issue, setIssue] = useState<SerializedIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [voting, setVoting] = useState(false);
  const [toast, setToast] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/issues/${id}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setIssue(data.issue);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function upvote() {
    if (!issue) return;
    setVoting(true);
    try {
      const res = await fetch('/api/upvote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueId: issue.id,
          userId: identity.uid,
          userName: identity.name,
          userEmail: identity.email,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast(data.pointsAwarded ?? 5);
        setIssue({ ...issue, upvoteCount: data.upvoteCount });
      } else if (data.alreadyVoted) {
        setToast(0);
      }
    } finally {
      setVoting(false);
    }
  }

  async function updateStatus(status: IssueStatus) {
    if (!issue) return;
    const res = await fetch(`/api/issues/${issue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setIssue({ ...issue, status, updatedAt: Date.now() });
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-400">
        Loading issue…
      </div>
    );
  }

  if (notFound || !issue) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-4xl">🤷</p>
        <p className="mt-3 font-medium text-slate-700">Issue not found</p>
      </div>
    );
  }

  const currentStep = STATUS_ORDER.indexOf(issue.status);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {issue.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={issue.imageUrl}
          alt={issue.title}
          className="h-72 w-full rounded-2xl object-cover"
        />
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <CategoryBadge category={issue.category} />
        <StatusBadge status={issue.status} />
        {issue.aiAnalysis?.safetyRisk && (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
            ⚠️ Safety risk
          </span>
        )}
      </div>

      <h1 className="mt-3 text-2xl font-bold text-slate-900">{issue.title}</h1>
      <div className="mt-2">
        <SeverityBar severity={issue.severity} />
      </div>
      {issue.description && (
        <p className="mt-3 text-slate-600">{issue.description}</p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={upvote}
          disabled={voting}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
        >
          ▲ Upvote ({issue.upvoteCount})
        </button>
        <span className="text-sm text-slate-500">
          ✓ {issue.verifiedCount} community verifications
        </span>
      </div>

      {/* AI analysis accordion */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        <button
          onClick={() => setShowReasoning((v) => !v)}
          className="flex w-full items-center justify-between p-4 text-left font-semibold text-slate-900"
        >
          <span>🤖 AI analysis &amp; reasoning</span>
          <span>{showReasoning ? '−' : '+'}</span>
        </button>
        {showReasoning && (
          <div className="space-y-2 border-t border-slate-100 p-4 text-sm text-slate-600">
            <p>{issue.aiAnalysis?.reasoning}</p>
            <p>
              <span className="font-medium text-slate-700">Confidence:</span>{' '}
              {Math.round((issue.aiAnalysis?.confidence ?? 0) * 100)}%
            </p>
            <p>
              <span className="font-medium text-slate-700">Routed to:</span>{' '}
              {issue.assignedDept}
            </p>
          </div>
        )}
      </div>

      {/* Agentic actions */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ResolutionVerifier
          issueId={issue.id}
          existing={issue.resolution}
          onVerified={(r: ResolutionVerification) =>
            setIssue((prev) =>
              prev
                ? {
                    ...prev,
                    resolution: r,
                    status: r.isResolved ? 'resolved' : prev.status,
                  }
                : prev,
            )
          }
        />
        <ComplaintDrafter issueId={issue.id} existing={issue.complaint} />
      </div>

      {/* Status timeline */}
      <div className="mt-6">
        <h2 className="mb-3 font-semibold text-slate-900">Status timeline</h2>
        <div className="flex items-center">
          {STATUS_ORDER.map((s, i) => (
            <div key={s} className="flex flex-1 items-center last:flex-none">
              <button
                onClick={() => updateStatus(s)}
                className={`flex flex-col items-center ${
                  i <= currentStep ? 'text-blue-600' : 'text-slate-300'
                }`}
                title="Click to set status"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                    i <= currentStep ? 'bg-blue-600 text-white' : 'bg-slate-200'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="mt-1 text-xs font-medium">{STATUS_LABELS[s]}</span>
              </button>
              {i < STATUS_ORDER.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    i < currentStep ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="mt-6">
        <h2 className="mb-3 font-semibold text-slate-900">Location</h2>
        <div className="h-64 overflow-hidden rounded-xl border border-slate-200">
          <IssueMap issues={[issue]} selectedId={issue.id} />
        </div>
      </div>

      {toast !== null && (
        <PointsToast
          points={toast}
          message={toast === 0 ? 'Already verified by you' : 'Thanks for verifying!'}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}
