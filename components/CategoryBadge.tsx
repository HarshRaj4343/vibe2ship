import type { IssueCategory } from '@/lib/types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/types';
import CategoryIcon from '@/components/CategoryIcon';

export default function CategoryBadge({ category }: { category: IssueCategory }) {
  const color = CATEGORY_COLORS[category];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}1A`, color }}
    >
      <CategoryIcon category={category} className="h-3.5 w-3.5" aria-hidden />
      {CATEGORY_LABELS[category]}
    </span>
  );
}
