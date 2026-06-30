'use client';

import { useMemo, useState } from 'react';
import { useSweepstake } from '@/hooks/useSweepstake';
import { computeLeaderboard } from '@/lib/calculations/sweepstakeLeaderboard';
import { computeKnockoutLeaderboard } from '@/lib/knockout/knockoutSurvival';
import PageHeader from '@/components/PageHeader';
import LeaderboardCard from '@/components/LeaderboardCard';
import KnockoutLeaderboardCard from '@/components/KnockoutLeaderboardCard';
import { LoadingState, EmptyState } from '@/components/states';

type Board = 'points' | 'survivors';

export default function LeaderboardPage() {
  const view = useSweepstake();
  const { players, teams, matches, settings, loading } = view;
  const [board, setBoard] = useState<Board>('survivors');

  const leaderboard = useMemo(
    () => computeLeaderboard(players, teams, matches, settings),
    [players, teams, matches, settings],
  );
  const knockoutBoard = useMemo(
    () => computeKnockoutLeaderboard(players, teams, matches, settings),
    [players, teams, matches, settings],
  );

  if (loading) return <LoadingState />;

  const lastPlacePoints = leaderboard[leaderboard.length - 1]?.points ?? 0;
  const bottomCount = leaderboard.filter((r) => r.points === lastPlacePoints).length;

  return (
    <div className="space-y-3">
      <PageHeader
        title="Leaderboard"
        subtitle={board === 'points' ? 'Tap a player to see their teams' : 'Teams still alive in the tournament'}
      />

      <div role="tablist" aria-label="Leaderboard type" className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {(
          [
            ['points', 'Points'],
            ['survivors', 'Survivors'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={board === value}
            onClick={() => setBoard(value)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              board === value ? 'bg-white text-brand-dark shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {board === 'points' ? (
        leaderboard.length ? (
          leaderboard.map((row) => (
            <LeaderboardCard key={row.player.id} row={row} teams={teams} matches={matches} settings={settings} totalPlayers={leaderboard.length} lastPlacePoints={lastPlacePoints} bottomCount={bottomCount} />
          ))
        ) : (
          <EmptyState title="No players yet" hint="Add players in the Admin area." />
        )
      ) : knockoutBoard.length ? (
        knockoutBoard.map((row) => (
          <KnockoutLeaderboardCard key={row.player.id} row={row} teams={teams} matches={matches} />
        ))
      ) : (
        <EmptyState title="No players yet" hint="Add players in the Admin area." />
      )}
    </div>
  );
}
