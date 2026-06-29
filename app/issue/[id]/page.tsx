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
import AgentTrace from '@/components/AgentTrace';
import { useAuth } from '@/lib/auth';
import type { IssueStatus, ResolutionVerification, SerializedIssue } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/types';
import EmptyState from '@/components/EmptyState';
import { HelpCircle, AlertTriangle, Check, Bot, ArrowUp, Clock } from '@/components/icons';

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
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        <div className="skeleton h-72" />
        <div className="skeleton h-7 w-24" />
        <div className="skeleton h-9 w-3/4" />
        <div className="skeleton h-20" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="skeleton h-40" />
          <div className="skeleton h-40" />
        </div>
      </div>
    );
  }

  if (notFound || !issue) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={<HelpCircle className="h-6 w-6" />}
          title="Issue not found"
          hint="It may have been resolved and archived, or the link is incorrect."
        />
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
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
            <AlertTriangle className="h-3.5 w-3.5" /> Safety risk
          </span>
        )}
        {issue.dispatch && <DispatchBadge status={issue.dispatch.status} />}
        {issue.resolutionEstimate && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sarvam-sky/40 px-2.5 py-0.5 text-xs font-medium text-sarvam-blue">
            <Clock className="h-3.5 w-3.5" /> Est. ~{issue.resolutionEstimate.etaDays}d to fix
          </span>
        )}
      </div>

      <h1 className="mt-3 font-serif text-3xl font-medium text-ink">{issue.title}</h1>
      <div className="mt-2">
        <SeverityBar severity={issue.severity} />
      </div>
      {issue.description && (
        <p className="mt-3 text-ink/65">{issue.description}</p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={upvote}
          disabled={voting}
          className="btn-primary flex items-center gap-1.5 px-5 py-2 text-sm"
        >
          <ArrowUp className="h-4 w-4" /> Upvote ({issue.upvoteCount})
        </button>
        <span className="flex items-center gap-1.5 text-sm text-ink/55">
          <Check className="h-4 w-4 text-emerald-600" /> {issue.verifiedCount} community verifications
        </span>
      </div>

      {/* AI analysis accordion */}
      <div className="glass-card mt-6">
        <button
          onClick={() => setShowReasoning((v) => !v)}
          className="flex w-full items-center justify-between p-4 text-left font-semibold text-ink"
        >
          <span className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-sarvam-blue" /> AI analysis &amp; reasoning
          </span>
          <span>{showReasoning ? '−' : '+'}</span>
        </button>
        {showReasoning && (
          <div className="space-y-3 border-t border-white/50 p-4 text-sm text-ink/65">
            <p>{issue.aiAnalysis?.reasoning}</p>
            <p>
              <span className="font-medium text-ink">Confidence:</span>{' '}
              {Math.round((issue.aiAnalysis?.confidence ?? 0) * 100)}%
            </p>
            <p>
              <span className="font-medium text-ink">Routed to:</span>{' '}
              {issue.assignedDept}
            </p>
            {issue.resolutionEstimate && (
              <p>
                <span className="font-medium text-ink">Est. resolution:</span>{' '}
                ~{issue.resolutionEstimate.etaDays} day(s){' '}
                <span className="text-ink/40">
                  ({issue.resolutionEstimate.basis})
                </span>
              </p>
            )}
            {issue.agentTrace && issue.agentTrace.length > 0 && (
              <div className="border-t border-white/50 pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-sarvam-blue">
                  Autonomous agent trace
                </p>
                <AgentTrace steps={issue.agentTrace} />
              </div>
            )}
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
        <h2 className="mb-3 font-semibold text-ink">Status timeline</h2>
        <div className="flex items-center">
          {STATUS_ORDER.map((s, i) => (
            <div key={s} className="flex flex-1 items-center last:flex-none">
              <button
                onClick={() => updateStatus(s)}
                className={`flex flex-col items-center ${
                  i <= currentStep ? 'text-sarvam-blue' : 'text-ink/30'
                }`}
                title="Click to set status"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                    i <= currentStep
                      ? 'bg-gradient-to-br from-sarvam-blue to-sarvam-orange text-white'
                      : 'bg-ink/10'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="mt-1 text-xs font-medium">{STATUS_LABELS[s]}</span>
              </button>
              {i < STATUS_ORDER.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    i < currentStep ? 'bg-sarvam-blue' : 'bg-ink/10'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="mt-6">
        <h2 className="mb-3 font-semibold text-ink">Location</h2>
        <div className="h-64 overflow-hidden rounded-3xl border border-white/60">
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

function DispatchBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    queued: { label: 'Dispatch: awaiting approval', cls: 'bg-amber-100 text-amber-700' },
    approved: { label: 'Dispatch: approved', cls: 'bg-emerald-100 text-emerald-700' },
    dispatched: { label: 'Dispatched to dept', cls: 'bg-emerald-100 text-emerald-700' },
    rejected: { label: 'Dispatch: rejected', cls: 'bg-ink/10 text-ink/60' },
  };
  const m = map[status] ?? map.queued;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${m.cls}`}
    >
      {m.label}
    </span>
  );
}
