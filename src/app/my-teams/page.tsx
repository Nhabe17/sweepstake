'use client';

import { useMemo } from 'react';
import { useSweepstake } from '@/hooks/useSweepstake';
import { useSelectedPlayer } from '@/hooks/useSelectedPlayer';
import { computeLeaderboard } from '@/lib/calculations/sweepstakeLeaderboard';
import { computeGroupTable } from '@/lib/calculations/groupStandings';
import { getEffectiveScore } from '@/lib/calculations/effectiveResult';
import { STATUS_LABEL, lastResultForTeam, nextMatchForTeam, teamStatusInGroup } from '@/lib/derive';
import PageHeader from '@/components/PageHeader';
import TeamName from '@/components/TeamName';
import TeamNameWithOwner from '@/components/TeamNameWithOwner';
import { LoadingState, EmptyState } from '@/components/states';

export default function MyTeamsPage() {
  const view = useSweepstake();
  const { players, teams, matches, settings, loading } = view;
  const [selectedPlayer, setSelectedPlayer] = useSelectedPlayer();

  const row = useMemo(() => {
    const lb = computeLeaderboard(players, teams, matches, settings);
    return lb.find((r) => r.player.id === selectedPlayer) ?? null;
  }, [players, teams, matches, settings, selectedPlayer]);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <PageHeader title="My Teams" subtitle="Pick your player to see your six teams" />

      <select
        value={selectedPlayer ?? ''}
        onChange={(e) => setSelectedPlayer(e.target.value || null)}
        className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-base"
      >
        <option value="">Select player…</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.displayCode})
          </option>
        ))}
      </select>

      {!row ? (
        <EmptyState title="No player selected" hint="Choose your name above." />
      ) : (
        <>
          <div className="rounded-xl bg-gradient-to-br from-pitch to-pitch-dark p-4 text-white shadow-sm">
            <p className="text-lg font-bold">
              {row.player.name} <span className="text-white/70">({row.player.displayCode})</span>
            </p>
            <p className="text-white/80">{row.points} pts · rank #{row.rank}</p>
          </div>

          <div className="space-y-3">
            {row.teams
              .slice()
              .sort((a, b) => b.points - a.points)
              .map((bd) => {
                const next = nextMatchForTeam(bd.team.id, matches);
                const last = lastResultForTeam(bd.team.id, matches);
                const status = teamStatusInGroup(bd.team, teams, matches, settings);
                const groupPos =
                  computeGroupTable(bd.team.groupLetter, teams, matches, settings).find(
                    (r) => r.team.id === bd.team.id,
                  )?.position ?? null;

                const opponentOf = (m: typeof next) =>
                  m ? teams.find((t) => t.id === (m.homeTeamId === bd.team.id ? m.awayTeamId : m.homeTeamId)) : null;

                const nextOpp = opponentOf(next);
                const lastOpp = opponentOf(last);
                const lastScore = last ? getEffectiveScore(last) : null;

                return (
                  <article key={bd.team.id} className="rounded-xl bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-ink">
                        <TeamNameWithOwner team={bd.team} owner={row.player} />
                      </p>
                      <span className="font-bold tabular-nums text-brand-dark">{bd.points} pts</span>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      Group {bd.team.groupLetter}
                      {groupPos ? ` — ${ordinal(groupPos)}` : ''} · {STATUS_LABEL[status]}
                    </p>
                    {next && nextOpp ? (
                      <p className="mt-1 text-sm text-muted">
                        Next: vs <TeamName team={nextOpp} />
                      </p>
                    ) : null}
                    {last && lastOpp && lastScore ? (
                      <p className="mt-1 text-sm text-muted">
                        Last: <TeamName team={bd.team} />{' '}
                        {last.homeTeamId === bd.team.id ? lastScore.homeScore : lastScore.awayScore}
                        –{last.homeTeamId === bd.team.id ? lastScore.awayScore : lastScore.homeScore}{' '}
                        <TeamName team={lastOpp} />
                      </p>
                    ) : null}
                  </article>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
