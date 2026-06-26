import type { ReactNode } from 'react';

export default function EmptyState({
  icon,
  title,
  hint,
  className = '',
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-3xl border border-dashed border-ink/15 bg-white/30 px-6 py-10 text-center backdrop-blur ${className}`}
    >
      {icon && (
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sarvam-sky/20 text-sarvam-blue">
          {icon}
        </span>
      )}
      <p className="font-medium text-ink/70">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink/45">{hint}</p>}
    </div>
  );
}
