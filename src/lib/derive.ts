import type { Match, Settings, Team } from '@/lib/types';
import { computeGroupTable } from '@/lib/calculations/groupStandings';

export function matchesForTeam(teamId: string, matches: Match[]): Match[] {
  return matches.filter((m) => m.homeTeamId === teamId || m.awayTeamId === teamId);
}

/** The team's earliest match that hasn't finished, if any. */
export function nextMatchForTeam(teamId: string, matches: Match[]): Match | null {
  return (
    matchesForTeam(teamId, matches)
      .filter((m) => m.status === 'scheduled' || m.status === 'live')
      .sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt))[0] ?? null
  );
}

/** The team's most recent finished match, if any. */
export function lastResultForTeam(teamId: string, matches: Match[]): Match | null {
  return (
    matchesForTeam(teamId, matches)
      .filter((m) => m.status === 'finished')
      .sort((a, b) => +new Date(b.kickoffAt) - +new Date(a.kickoffAt))[0] ?? null
  );
}

export type TeamStatus = 'active' | 'qualified' | 'eliminated' | 'unknown';

/**
 * Approximate group-stage status. Once all 6 group matches are finished, the top two
 * are treated as qualified and the rest eliminated. (Best-third qualification is a future
 * refinement; flagged in the plan.)
 */
export function teamStatusInGroup(team: Team, allTeams: Team[], matches: Match[], settings: Settings): TeamStatus {
  const groupMatches = matches.filter((m) => m.stage === 'group' && m.groupLetter === team.groupLetter);
  if (groupMatches.length === 0) return 'unknown';
  if (!groupMatches.every((m) => m.status === 'finished')) return 'active';
  const groupTeams = allTeams.filter((t) => t.groupLetter === team.groupLetter);
  const table = computeGroupTable(team.groupLetter, groupTeams, groupMatches, settings);
  const pos = table.find((r) => r.team.id === team.id)?.position ?? 99;
  return pos <= 2 ? 'qualified' : 'eliminated';
}

export const STATUS_LABEL: Record<TeamStatus, string> = {
  active: 'Active',
  qualified: 'Qualified',
  eliminated: 'Eliminated',
  unknown: 'Not started',
};
