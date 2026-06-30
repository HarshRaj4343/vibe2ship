import type { SVGProps } from 'react';
import type { IssueCategory } from '@/lib/types';
import {
  Construction,
  Droplet,
  Lightbulb,
  Trash2,
  MapPin,
} from '@/components/icons';

/**
 * Distinct icon per civic-issue category. Keeps category identity legible at a
 * glance — on map pins, badges and legends — instead of relying on color alone
 * (also helps color-blind users). Color is applied by the caller via
 * `currentColor` / CATEGORY_COLORS.
 */
const ICONS: Record<
  IssueCategory,
  (props: SVGProps<SVGSVGElement>) => JSX.Element
> = {
  pothole: Construction,
  water_leak: Droplet,
  streetlight: Lightbulb,
  waste: Trash2,
  other: MapPin,
};

export default function CategoryIcon({
  category,
  ...props
}: { category: IssueCategory } & SVGProps<SVGSVGElement>) {
  const Glyph = ICONS[category] ?? MapPin;
  return <Glyph {...props} />;
}
