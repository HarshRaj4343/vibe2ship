'use client';

import { useState } from 'react';
import type { ComplaintDraft } from '@/lib/types';
import { Mail, PenLine, Check } from './icons';

export default function ComplaintDrafter({
  issueId,
  existing,
}: {
  issueId: string;
  existing?: ComplaintDraft;
}) {
  const [draft, setDraft] = useState<ComplaintDraft | null>(existing ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setDraft(data.complaint);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not draft complaint');
    } finally {
      setLoading(false);
    }
  }

  function copyText() {
    if (!draft) return;
    navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    if (!draft) return;
    const blob = new Blob([`${draft.subject}\n\n${draft.body}`], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draft.referenceId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-3xl border border-sarvam-sky/40 bg-sarvam-sky/15 p-4 backdrop-blur">
      <h3 className="flex items-center gap-2 font-semibold text-ink">
        <Mail className="h-5 w-5 text-sarvam-blue" /> Official complaint
      </h3>
      <p className="mt-1 text-sm text-ink/55">
        Let the agent draft a formal letter to the responsible department.
      </p>

      {!draft && (
        <button
          onClick={generate}
          disabled={loading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-ink py-2.5 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:opacity-40"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Drafting…
            </>
          ) : (
            <>
              <PenLine className="h-4 w-4" /> Generate complaint letter
            </>
          )}
        </button>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {draft && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-md bg-ink px-2 py-1 font-mono text-xs text-white">
              Ref: {draft.referenceId}
            </span>
            <span className="text-xs text-ink/55">To: {draft.department}</span>
          </div>
          <div className="mt-3 rounded-2xl border border-white/60 bg-white/70 p-4">
            <p className="font-semibold text-ink">{draft.subject}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink/70">
              {draft.body}
            </p>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={copyText}
              className="flex items-center gap-1.5 rounded-full border border-ink/15 bg-white/70 px-4 py-1.5 text-sm font-medium text-ink transition hover:bg-white"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" /> Copied
                </>
              ) : (
                'Copy'
              )}
            </button>
            <button
              onClick={download}
              className="rounded-full border border-ink/15 bg-white/70 px-4 py-1.5 text-sm font-medium text-ink transition hover:bg-white"
            >
              Download .txt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
