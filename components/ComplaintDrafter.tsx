'use client';

import { useState } from 'react';
import type { ComplaintDraft } from '@/lib/types';

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
    <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
      <h3 className="flex items-center gap-2 font-semibold text-slate-900">
        📨 Official complaint
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        Let the agent draft a formal letter to the responsible department.
      </p>

      {!draft && (
        <button
          onClick={generate}
          disabled={loading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Drafting…
            </>
          ) : (
            '✍️ Generate complaint letter'
          )}
        </button>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {draft && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-md bg-slate-900 px-2 py-1 font-mono text-xs text-white">
              Ref: {draft.referenceId}
            </span>
            <span className="text-xs text-slate-500">To: {draft.department}</span>
          </div>
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">{draft.subject}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {draft.body}
            </p>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={copyText}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
            <button
              onClick={download}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Download .txt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
