interface Stat {
  label: string;
  value: string | number;
  icon: string;
  accent: string;
}

export default function StatsGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">{s.label}</span>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg"
              style={{ backgroundColor: `${s.accent}1A` }}
            >
              {s.icon}
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
