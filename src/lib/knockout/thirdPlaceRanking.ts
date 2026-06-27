import type { Match, Settings, Team } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { computeGroupTable } from '@/lib/calculations/groupStandings';
import { isGroupComplete } from './groupQualification';

export type ThirdPlaceQualifiedState = 'qualified' | 'eliminated' | 'unresolved';

export interface ThirdPlaceRankingCandidate {
  groupLetter: string;
  teamId: string;
  points: number;
  goalDifference: number;
  goalsFor: number;
}

export interface ThirdPlaceRankingRow extends ThirdPlaceRankingCandidate {
  qualifiedState: ThirdPlaceQualifiedState;
}

export const THIRD_PLACE_REQUIRED_GROUP_COUNT = 12;
export const THIRD_PLACE_ADVANCING_COUNT = 8;

export function computeThirdPlaceRanking(
  teams: Team[],
  matches: Match[],
  settings: Settings = DEFAULT_SETTINGS,
): ThirdPlaceRankingRow[] {
  const groupLetters = uniqueGroupLetters(teams);
  if (groupLetters.length !== THIRD_PLACE_REQUIRED_GROUP_COUNT) return [];

  const candidates: ThirdPlaceRankingCandidate[] = [];
  for (const groupLetter of groupLetters) {
    if (!isGroupComplete(groupLetter, teams, matches)) return [];

    const table = computeGroupTable(groupLetter, teams, matches, settings);
    const thirdPlace = table[2];
    if (!thirdPlace) return [];

    candidates.push({
      groupLetter,
      teamId: thirdPlace.team.id,
      points: thirdPlace.points,
      goalDifference: thirdPlace.goalDifference,
      goalsFor: thirdPlace.goalsFor,
    });
  }

  return rankThirdPlaceCandidates(candidates);
}

export function rankThirdPlaceCandidates(
  candidates: readonly ThirdPlaceRankingCandidate[],
  advancingCount = THIRD_PLACE_ADVANCING_COUNT,
): ThirdPlaceRankingRow[] {
  const rows = [...candidates]
    .sort(compareThirdPlaceCandidates)
    .map((candidate): ThirdPlaceRankingRow => ({ ...candidate, qualifiedState: 'unresolved' }));

  let start = 0;
  while (start < rows.length) {
    let end = start;
    while (end + 1 < rows.length && hasSameRankingMetrics(rows[start], rows[end + 1])) {
      end++;
    }

    const qualifiedState = qualificationStateForRange(start, end, advancingCount);
    for (let index = start; index <= end; index++) {
      rows[index].qualifiedState = qualifiedState;
    }

    start = end + 1;
  }

  return rows;
}

function qualificationStateForRange(
  start: number,
  end: number,
  advancingCount: number,
): ThirdPlaceQualifiedState {
  if (end < advancingCount) return 'qualified';
  if (start >= advancingCount) return 'eliminated';
  return 'unresolved';
}

function compareThirdPlaceCandidates(a: ThirdPlaceRankingCandidate, b: ThirdPlaceRankingCandidate): number {
  return (
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor ||
    a.groupLetter.localeCompare(b.groupLetter)
  );
}

function hasSameRankingMetrics(a: ThirdPlaceRankingCandidate, b: ThirdPlaceRankingCandidate): boolean {
  return a.points === b.points && a.goalDifference === b.goalDifference && a.goalsFor === b.goalsFor;
}

function uniqueGroupLetters(teams: Team[]): string[] {
  return Array.from(new Set(teams.map((team) => team.groupLetter))).sort((a, b) => a.localeCompare(b));
}
