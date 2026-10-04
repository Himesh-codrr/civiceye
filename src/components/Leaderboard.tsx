import { useMemo } from 'react';
import { Trophy, Medal, Award, Crown } from 'lucide-react';
import { useReports } from '@/hooks/useReports';
import { useBrand } from '@/hooks/useBrand';
import { cn } from '@/utils/cn';

interface LeaderboardProps {
  compact?: boolean;
}

export function Leaderboard({ compact = false }: LeaderboardProps) {
  const { reports } = useReports();
  const { isAmrita } = useBrand();

  const leaders = useMemo(() => {
    const scoped = reports.filter((r) => r.scope === (isAmrita ? 'campus' : 'city'));
    const map = new Map<string, { author: string; count: number; verified: number; votes: number }>();
    for (const r of scoped) {
      const entry = map.get(r.author) ?? { author: r.author, count: 0, verified: 0, votes: 0 };
      entry.count += 1;
      if (r.verified) entry.verified += 1;
      entry.votes += r.votes;
      map.set(r.author, entry);
    }
    return [...map.values()].sort((a, b) => b.verified - a.verified || b.votes - a.votes).slice(compact ? 5 : 5);
  }, [reports, isAmrita, compact]);

  if (!leaders.length) return null;

  if (compact) {
    return (
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Trophy className="h-4 w-4 text-amber-500" /> Top reporters this week
        </h3>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {leaders.map((leader, i) => (
            <div key={leader.author} className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/80 p-2.5 dark:border-white/10 dark:bg-white/5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                {i === 0 ? <Crown className="h-3.5 w-3.5" /> : i === 1 ? <Medal className="h-3.5 w-3.5" /> : i === 2 ? <Award className="h-3.5 w-3.5" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-slate-900 dark:text-white">{leader.author}</div>
                <div className="truncate text-[10px] text-slate-500 dark:text-slate-400">{leader.verified} verified · {leader.votes} votes</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
        <Trophy className="h-4 w-4 text-amber-500" /> Top Reporters — Leaderboard
      </h3>
      <div className={cn('mt-4', compact ? 'grid gap-2 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-3')}>
        {leaders.map((leader, i) => (
          <div key={leader.author} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              {i === 0 ? <Crown className="h-4 w-4" /> : i === 1 ? <Medal className="h-4 w-4" /> : i === 2 ? <Award className="h-4 w-4" /> : <span className="text-xs font-bold">{i+1}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{leader.author}</div>
              <div className="text-xs text-slate-500">{leader.count} reports · {leader.verified} verified · {leader.votes} votes</div>
            </div>
            <div className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">{leader.verified} verified</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">Gamification: points for verified reports, badges, streaks — makes reporting fun and competitive.</p>
    </div>
  );
}
