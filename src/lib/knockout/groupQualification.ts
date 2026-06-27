import type { Match, Settings, Team } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { computeGroupTable } from '@/lib/calculations/groupStandings';

export interface GroupQualification {
  groupLetter: string;
  complete: boolean;
  winnerTeamId: string | null;
  runnerUpTeamId: string | null;
  thirdPlaceTeamId: string | null;
}

export function computeGroupQualification(
  groupLetter: string,
  teams: Team[],
  matches: Match[],
  settings: Settings = DEFAULT_SETTINGS,
): GroupQualification {
  const complete = isGroupComplete(groupLetter, teams, matches);
  if (!complete) return emptyGroupQualification(groupLetter, false);

  const table = computeGroupTable(groupLetter, teams, matches, settings);
  return {
    groupLetter,
    complete: true,
    winnerTeamId: table[0]?.team.id ?? null,
    runnerUpTeamId: table[1]?.team.id ?? null,
    thirdPlaceTeamId: table[2]?.team.id ?? null,
  };
}

export function computeGroupQualifications(
  teams: Team[],
  matches: Match[],
  settings: Settings = DEFAULT_SETTINGS,
): GroupQualification[] {
  return uniqueGroupLetters(teams).map((groupLetter) =>
    computeGroupQualification(groupLetter, teams, matches, settings),
  );
}

export function isGroupComplete(groupLetter: string, teams: Team[], matches: Match[]): boolean {
  const groupTeams = teams.filter((team) => team.groupLetter === groupLetter);
  const expectedMatchCount = (groupTeams.length * (groupTeams.length - 1)) / 2;
  if (expectedMatchCount <= 0) return false;

  const groupTeamIds = new Set(groupTeams.map((team) => team.id));
  const groupMatches = matches.filter(
    (match) =>
      match.stage === 'group' &&
      match.groupLetter === groupLetter &&
      groupTeamIds.has(match.homeTeamId) &&
      groupTeamIds.has(match.awayTeamId) &&
      match.homeTeamId !== match.awayTeamId,
  );

  if (groupMatches.length !== expectedMatchCount) return false;
  if (!groupMatches.every((match) => match.status === 'finished')) return false;

  const uniquePairs = new Set(groupMatches.map((match) => matchPairKey(match)));
  return uniquePairs.size === expectedMatchCount;
}

function emptyGroupQualification(groupLetter: string, complete: boolean): GroupQualification {
  return {
    groupLetter,
    complete,
    winnerTeamId: null,
    runnerUpTeamId: null,
    thirdPlaceTeamId: null,
  };
}

function uniqueGroupLetters(teams: Team[]): string[] {
  return Array.from(new Set(teams.map((team) => team.groupLetter))).sort((a, b) => a.localeCompare(b));
}

function matchPairKey(match: Match): string {
  return [match.homeTeamId, match.awayTeamId].sort().join(':');
}
