import type { ReactNode } from 'react';

interface Stat {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent: string;
}

export default function StatsGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className="glass-card hover-lift animate-fade-up p-5"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink/55">{s.label}</span>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${s.accent}1A`, color: s.accent }}
            >
              {s.icon}
            </span>
          </div>
          <p className="mt-3 font-serif text-3xl font-medium text-ink">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
