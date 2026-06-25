import type { IssueCategory } from '@/lib/types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/types';

export default function CategoryBadge({ category }: { category: IssueCategory }) {
  const color = CATEGORY_COLORS[category];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}1A`, color }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {CATEGORY_LABELS[category]}
    </span>
  );
}
