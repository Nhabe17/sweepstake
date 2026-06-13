import type { Match, Player, Settings, Team } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { teamPointsInMatch } from './effectiveResult';

export interface TeamBreakdown {
  team: Team;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  played: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface LeaderboardRow {
  player: Player;
  rank: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  teams: TeamBreakdown[];
}

/**
 * Sweepstake leaderboard: per player, sum points from every owned team across ALL
 * finished matches (group stage and knockouts). Each owned team is scored on its own
 * result, so two owned teams meeting — even owned by the same player — score separately.
 *
 * Sort: points → wins → goal difference → goals for → player name.
 */
export function computeLeaderboard(
  players: Player[],
  teams: Team[],
  matches: Match[],
  settings: Settings = DEFAULT_SETTINGS,
): LeaderboardRow[] {
  const rows: LeaderboardRow[] = players.map((player) => {
    const ownedTeams = teams.filter((t) => t.ownerPlayerId === player.id);
    const breakdowns: TeamBreakdown[] = ownedTeams.map((team) => {
      const bd: TeamBreakdown = {
        team,
        points: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        played: 0,
        goalsFor: 0,
        goalsAgainst: 0,
      };
      for (const match of matches) {
        const tp = teamPointsInMatch(match, team.id, settings);
        if (!tp) continue;
        bd.played += 1;
        bd.points += tp.points;
        bd.goalsFor += tp.goalsFor;
        bd.goalsAgainst += tp.goalsAgainst;
        if (tp.result === 'W') bd.wins += 1;
        else if (tp.result === 'D') bd.draws += 1;
        else bd.losses += 1;
      }
      return bd;
    });

    const totals = breakdowns.reduce(
      (acc, bd) => {
        acc.points += bd.points;
        acc.wins += bd.wins;
        acc.draws += bd.draws;
        acc.losses += bd.losses;
        acc.goalsFor += bd.goalsFor;
        acc.goalsAgainst += bd.goalsAgainst;
        return acc;
      },
      { points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 },
    );

    return {
      player,
      rank: 0,
      ...totals,
      goalDifference: totals.goalsFor - totals.goalsAgainst,
      teams: breakdowns,
    };
  });

  rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.player.name.localeCompare(b.player.name),
  );
  rows.forEach((row, i) => (row.rank = i + 1));
  return rows;
}
