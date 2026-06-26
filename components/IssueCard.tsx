import Link from 'next/link';
import type { SerializedIssue } from '@/lib/types';
import CategoryBadge from './CategoryBadge';
import StatusBadge from './StatusBadge';
import SeverityBar from './SeverityBar';
import { MapPin, Check, ArrowUp } from './icons';

export default function IssueCard({ issue }: { issue: SerializedIssue }) {
  return (
    <Link
      href={`/issue/${issue.id}`}
      className="group glass-card glass-card-hover flex gap-4 p-4"
    >
      {issue.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={issue.imageUrl}
          alt={issue.title}
          className="h-20 w-20 shrink-0 rounded-2xl object-cover"
        />
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-sarvam-sky/20 text-sarvam-blue">
          <MapPin className="h-7 w-7" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <CategoryBadge category={issue.category} />
          <StatusBadge status={issue.status} />
        </div>
        <h3 className="mt-1.5 truncate font-semibold text-ink group-hover:text-sarvam-blue">
          {issue.title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-ink/55">
          {issue.description || issue.aiAnalysis?.reasoning || 'No description'}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <SeverityBar severity={issue.severity} showLabel={false} />
          <span className="flex items-center gap-1.5 text-xs text-ink/45">
            <ArrowUp className="h-3.5 w-3.5" /> {issue.upvoteCount}
            <span className="text-ink/25">·</span>
            <Check className="h-3.5 w-3.5 text-emerald-600" /> {issue.verifiedCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
