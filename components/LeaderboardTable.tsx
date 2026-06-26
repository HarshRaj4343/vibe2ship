interface LeaderUser {
  id: string;
  name: string;
  points: number;
  issuesReported: number;
  badgeCount: number;
}

// Top-3 ranks get a colored medal-style badge (gold / silver / bronze).
const MEDAL_STYLES = [
  'bg-amber-100 text-amber-700 ring-1 ring-amber-300',
  'bg-slate-100 text-slate-600 ring-1 ring-slate-300',
  'bg-orange-100 text-orange-700 ring-1 ring-orange-300',
];

export default function LeaderboardTable({ users }: { users: LeaderUser[] }) {
  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink/20 p-8 text-center text-sm text-ink/40">
        No citizens on the leaderboard yet. Be the first to report an issue!
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/40 text-xs uppercase tracking-wide text-ink/50">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Citizen</th>
            <th className="px-4 py-3 text-right">Reports</th>
            <th className="px-4 py-3 text-right">Badges</th>
            <th className="px-4 py-3 text-right">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/50">
          {users.map((u, i) => (
            <tr key={u.id} className="transition hover:bg-white/40">
              <td className="px-4 py-3">
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    MEDAL_STYLES[i] ?? 'text-ink/50'
                  }`}
                >
                  {i + 1}
                </span>
              </td>
              <td className="px-4 py-3 font-medium text-ink">{u.name}</td>
              <td className="px-4 py-3 text-right text-ink/60">
                {u.issuesReported}
              </td>
              <td className="px-4 py-3 text-right text-ink/60">{u.badgeCount}</td>
              <td className="px-4 py-3 text-right font-semibold text-sarvam-blue">
                {u.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
