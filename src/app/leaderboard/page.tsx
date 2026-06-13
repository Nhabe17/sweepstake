'use client';

import { useMemo } from 'react';
import { useSweepstake } from '@/hooks/useSweepstake';
import { computeLeaderboard } from '@/lib/calculations/sweepstakeLeaderboard';
import PageHeader from '@/components/PageHeader';
import LeaderboardCard from '@/components/LeaderboardCard';
import { LoadingState, EmptyState } from '@/components/states';

export default function LeaderboardPage() {
  const view = useSweepstake();
  const { players, teams, matches, settings, loading } = view;

  const leaderboard = useMemo(
    () => computeLeaderboard(players, teams, matches, settings),
    [players, teams, matches, settings],
  );

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-3">
      <PageHeader title="Leaderboard" subtitle="Tap a player to see their teams" />
      {leaderboard.length ? (
        leaderboard.map((row) => (
          <LeaderboardCard key={row.player.id} row={row} teams={teams} matches={matches} settings={settings} />
        ))
      ) : (
        <EmptyState title="No players yet" hint="Add players in the Admin area." />
      )}
    </div>
  );
}
