import type { IssueStatus } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/types';

const STYLES: Record<IssueStatus, string> = {
  open: 'bg-red-100 text-red-700 ring-red-600/20',
  in_progress: 'bg-amber-100 text-amber-700 ring-amber-600/20',
  resolved: 'bg-green-100 text-green-700 ring-green-600/20',
};

export default function StatusBadge({ status }: { status: IssueStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
