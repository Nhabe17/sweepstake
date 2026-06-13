import type { Match, Settings, Team } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { teamPointsInMatch } from './effectiveResult';

export interface GroupRow {
  team: Team;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number;
}

/**
 * Official group table for one group. Only group-stage finished matches count.
 * Sort: points → goal difference → goals for → team name.
 */
export function computeGroupTable(
  groupLetter: string,
  teams: Team[],
  matches: Match[],
  settings: Settings = DEFAULT_SETTINGS,
): GroupRow[] {
  const groupTeams = teams.filter((t) => t.groupLetter === groupLetter);
  const groupMatches = matches.filter((m) => m.stage === 'group' && m.groupLetter === groupLetter);

  const rows: GroupRow[] = groupTeams.map((team) => {
    const row: GroupRow = {
      team,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      position: 0,
    };
    for (const match of groupMatches) {
      const tp = teamPointsInMatch(match, team.id, settings);
      if (!tp) continue;
      row.played += 1;
      row.goalsFor += tp.goalsFor;
      row.goalsAgainst += tp.goalsAgainst;
      row.points += tp.points;
      if (tp.result === 'W') row.wins += 1;
      else if (tp.result === 'D') row.draws += 1;
      else row.losses += 1;
    }
    row.goalDifference = row.goalsFor - row.goalsAgainst;
    return row;
  });

  rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.team.name.localeCompare(b.team.name),
  );
  rows.forEach((row, i) => (row.position = i + 1));
  return rows;
}
