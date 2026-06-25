interface LeaderUser {
  id: string;
  name: string;
  points: number;
  issuesReported: number;
  badgeCount: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardTable({ users }: { users: LeaderUser[] }) {
  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
        No citizens on the leaderboard yet. Be the first to report an issue!
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Citizen</th>
            <th className="px-4 py-3 text-right">Reports</th>
            <th className="px-4 py-3 text-right">Badges</th>
            <th className="px-4 py-3 text-right">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((u, i) => (
            <tr key={u.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-700">
                {MEDALS[i] ?? i + 1}
              </td>
              <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
              <td className="px-4 py-3 text-right text-slate-600">
                {u.issuesReported}
              </td>
              <td className="px-4 py-3 text-right text-slate-600">{u.badgeCount}</td>
              <td className="px-4 py-3 text-right font-semibold text-blue-600">
                {u.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
