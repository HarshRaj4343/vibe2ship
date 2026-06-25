import Link from 'next/link';
import type { SerializedIssue } from '@/lib/types';
import CategoryBadge from './CategoryBadge';
import StatusBadge from './StatusBadge';
import SeverityBar from './SeverityBar';

export default function IssueCard({ issue }: { issue: SerializedIssue }) {
  return (
    <Link
      href={`/issue/${issue.id}`}
      className="group flex gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md"
    >
      {issue.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={issue.imageUrl}
          alt={issue.title}
          className="h-20 w-20 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-2xl">
          📍
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <CategoryBadge category={issue.category} />
          <StatusBadge status={issue.status} />
        </div>
        <h3 className="mt-1.5 truncate font-semibold text-slate-900 group-hover:text-blue-600">
          {issue.title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">
          {issue.description || issue.aiAnalysis?.reasoning || 'No description'}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <SeverityBar severity={issue.severity} showLabel={false} />
          <span className="text-xs text-slate-400">
            ▲ {issue.upvoteCount} · ✓ {issue.verifiedCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
