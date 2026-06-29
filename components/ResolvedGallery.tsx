/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { SerializedIssue } from '@/lib/types';
import { CheckCircle } from '@/components/icons';

const DAY_MS = 86_400_000;

/**
 * Before/after proof-of-resolution gallery. Shows resolved issues that carry a
 * verified "after" photo next to their original report — concrete evidence the
 * loop closes, not just a status flip.
 */
export default function ResolvedGallery({ issues }: { issues: SerializedIssue[] }) {
  const resolved = issues
    .filter((i) => i.status === 'resolved' && i.resolution?.afterImageUrl)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 6);

  if (resolved.length === 0) return null;

  return (
    <section>
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink">
        <CheckCircle className="h-5 w-5 text-emerald-500" /> Before → after: proof of
        resolution
      </h2>
      <p className="mb-4 text-sm text-ink/55">
        AI-verified fixes, with the original report and the resolved photo side by
        side.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resolved.map((i) => {
          const days = Math.max(1, Math.round((i.updatedAt - i.createdAt) / DAY_MS));
          return (
            <Link
              key={i.id}
              href={`/issue/${i.id}`}
              className="glass-card glass-card-hover block overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-0.5">
                <figure className="relative m-0">
                  <img
                    src={i.imageUrl}
                    alt="Before resolution"
                    className="h-32 w-full object-cover"
                  />
                  <figcaption className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
                    Before
                  </figcaption>
                </figure>
                <figure className="relative m-0">
                  <img
                    src={i.resolution!.afterImageUrl}
                    alt="After resolution"
                    className="h-32 w-full object-cover"
                  />
                  <figcaption className="absolute left-1.5 top-1.5 rounded-full bg-emerald-600/85 px-2 py-0.5 text-[10px] font-medium text-white">
                    After
                  </figcaption>
                </figure>
              </div>
              <div className="p-3">
                <p className="line-clamp-1 text-sm font-medium text-ink">{i.title}</p>
                <p className="mt-1 text-xs text-ink/50">
                  <span className="font-medium text-emerald-600">
                    {i.resolution!.verdict || 'Confirmed fixed'}
                  </span>{' '}
                  · resolved in {days}d
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
