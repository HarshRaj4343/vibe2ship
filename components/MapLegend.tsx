'use client';

import CategoryIcon from '@/components/CategoryIcon';
import type { IssueCategory } from '@/lib/types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/types';

const CATEGORIES: IssueCategory[] = [
  'pothole',
  'water_leak',
  'streetlight',
  'waste',
  'other',
];

/** Floating legend mapping each category icon + color to its label. */
export default function MapLegend() {
  return (
    <div className="absolute bottom-24 left-4 z-20 rounded-2xl border border-white/60 bg-white/80 p-3 shadow-[0_8px_30px_-12px_rgba(28,27,46,0.3)] backdrop-blur-xl md:bottom-6">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/45">
        Legend
      </p>
      <ul className="space-y-1.5">
        {CATEGORIES.map((c) => (
          <li key={c} className="flex items-center gap-2 text-xs font-medium text-ink/75">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full border border-white text-white shadow-sm"
              style={{ backgroundColor: CATEGORY_COLORS[c] }}
            >
              <CategoryIcon category={c} className="h-3 w-3" />
            </span>
            {CATEGORY_LABELS[c]}
          </li>
        ))}
      </ul>
    </div>
  );
}
