import { describe, expect, it } from 'vitest';
import type { Match, Team } from '@/lib/types';
import {
  computeThirdPlaceRanking,
  rankThirdPlaceCandidates,
  type ThirdPlaceRankingCandidate,
} from './thirdPlaceRanking';

const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

function candidate(
  groupLetter: string,
  points: number,
  goalDifference: number,
  goalsFor: number,
): ThirdPlaceRankingCandidate {
  return {
    groupLetter,
    teamId: `${groupLetter}-third`,
    points,
    goalDifference,
    goalsFor,
  };
}

function team(id: string, name: string, groupLetter: string): Team {
  return {
    id,
    name,
    groupLetter,
    ownerPlayerId: null,
    createdAt: '',
    updatedAt: '',
  };
}

function match(p: Partial<Match> & Pick<Match, 'id' | 'groupLetter' | 'homeTeamId' | 'awayTeamId'>): Match {
  return {
    externalId: null,
    stage: 'group',
    bracketSlot: null,
    kickoffAt: '2026-06-11T16:00:00.000Z',
    status: 'finished',
    homeScore: 0,
    awayScore: 0,
    homePens: null,
    awayPens: null,
    apiHomeScore: null,
    apiAwayScore: null,
    overrideHomeScore: null,
    overrideAwayScore: null,
    overrideHomePens: null,
    overrideAwayPens: null,
    hasManualOverride: false,
    createdAt: '',
    updatedAt: '',
    ...p,
  };
}

function groupTeams(groupLetter: string): Team[] {
  return [
    team(`${groupLetter}-winner`, `${groupLetter} Winner`, groupLetter),
    team(`${groupLetter}-runner`, `${groupLetter} Runner`, groupLetter),
    team(`${groupLetter}-third`, `${groupLetter} Third`, groupLetter),
    team(`${groupLetter}-fourth`, `${groupLetter} Fourth`, groupLetter),
  ];
}

function completeGroupMatches(groupLetter: string, thirdWinGoals: number): Match[] {
  const winner = `${groupLetter}-winner`;
  const runner = `${groupLetter}-runner`;
  const third = `${groupLetter}-third`;
  const fourth = `${groupLetter}-fourth`;

  return [
    match({ id: `${groupLetter}-1`, groupLetter, homeTeamId: winner, awayTeamId: runner, homeScore: 1, awayScore: 0 }),
    match({ id: `${groupLetter}-2`, groupLetter, homeTeamId: winner, awayTeamId: third, homeScore: 2, awayScore: 0 }),
    match({ id: `${groupLetter}-3`, groupLetter, homeTeamId: winner, awayTeamId: fourth, homeScore: 2, awayScore: 0 }),
    match({ id: `${groupLetter}-4`, groupLetter, homeTeamId: runner, awayTeamId: third, homeScore: 2, awayScore: 0 }),
    match({ id: `${groupLetter}-5`, groupLetter, homeTeamId: runner, awayTeamId: fourth, homeScore: 2, awayScore: 0 }),
    match({
      id: `${groupLetter}-6`,
      groupLetter,
      homeTeamId: third,
      awayTeamId: fourth,
      homeScore: thirdWinGoals,
      awayScore: 0,
    }),
  ];
}

describe('rankThirdPlaceCandidates', () => {
  it('ranks third-place candidates by points, goal difference, then goals for', () => {
    const ranking = rankThirdPlaceCandidates([
      candidate('A', 4, 2, 5),
      candidate('B', 5, -1, 3),
      candidate('C', 4, 3, 1),
      candidate('D', 4, 2, 7),
      candidate('E', 3, 4, 8),
      candidate('F', 3, 4, 7),
      candidate('G', 2, 5, 9),
      candidate('H', 2, 4, 9),
      candidate('I', 2, 3, 9),
      candidate('J', 1, 1, 1),
      candidate('K', 1, 0, 1),
      candidate('L', 0, 0, 0),
    ]);

    expect(ranking.slice(0, 6).map((row) => row.groupLetter)).toEqual(['B', 'C', 'D', 'A', 'E', 'F']);
  });

  it('marks clear top-eight candidates as qualified and clear bottom-four as eliminated', () => {
    const ranking = rankThirdPlaceCandidates(GROUP_LETTERS.map((groupLetter, index) => candidate(groupLetter, 12 - index, 0, 0)));

    expect(ranking.slice(0, 8).every((row) => row.qualifiedState === 'qualified')).toBe(true);
    expect(ranking.slice(8).every((row) => row.qualifiedState === 'eliminated')).toBe(true);
  });

  it('marks boundary ties as unresolved when extra tie-break data would be needed', () => {
    const ranking = rankThirdPlaceCandidates([
      candidate('A', 6, 0, 0),
      candidate('B', 6, 0, 0),
      candidate('C', 6, 0, 0),
      candidate('D', 6, 0, 0),
      candidate('E', 6, 0, 0),
      candidate('F', 6, 0, 0),
      candidate('G', 6, 0, 0),
      candidate('H', 4, 0, 0),
      candidate('I', 4, 0, 0),
      candidate('J', 2, 0, 0),
      candidate('K', 2, 0, 0),
      candidate('L', 2, 0, 0),
    ]);

    expect(ranking.slice(0, 7).every((row) => row.qualifiedState === 'qualified')).toBe(true);
    expect(ranking.filter((row) => row.qualifiedState === 'unresolved').map((row) => row.groupLetter)).toEqual([
      'H',
      'I',
    ]);
    expect(ranking.slice(9).every((row) => row.qualifiedState === 'eliminated')).toBe(true);
  });
});

describe('computeThirdPlaceRanking', () => {
  it('ranks third-place teams once all 12 groups are complete', () => {
    const teams = GROUP_LETTERS.flatMap((groupLetter) => groupTeams(groupLetter));
    const matches = GROUP_LETTERS.flatMap((groupLetter, index) =>
      completeGroupMatches(groupLetter, GROUP_LETTERS.length - index),
    );

    const ranking = computeThirdPlaceRanking(teams, matches);

    expect(ranking).toHaveLength(12);
    expect(ranking.map((row) => row.teamId)).toEqual(GROUP_LETTERS.map((groupLetter) => `${groupLetter}-third`));
    expect(ranking.slice(0, 8).every((row) => row.qualifiedState === 'qualified')).toBe(true);
    expect(ranking.slice(8).every((row) => row.qualifiedState === 'eliminated')).toBe(true);
  });

  it('does not produce third-place qualification before every group is complete', () => {
    const teams = GROUP_LETTERS.flatMap((groupLetter) => groupTeams(groupLetter));
    const matches = GROUP_LETTERS.flatMap((groupLetter, index) =>
      completeGroupMatches(groupLetter, GROUP_LETTERS.length - index),
    ).filter((match) => match.id !== 'L-6');

    expect(computeThirdPlaceRanking(teams, matches)).toEqual([]);
  });

  it('does not produce third-place qualification before all 12 groups are available', () => {
    const teams = GROUP_LETTERS.slice(0, 11).flatMap((groupLetter) => groupTeams(groupLetter));
    const matches = GROUP_LETTERS.slice(0, 11).flatMap((groupLetter, index) =>
      completeGroupMatches(groupLetter, GROUP_LETTERS.length - index),
    );

    expect(computeThirdPlaceRanking(teams, matches)).toEqual([]);
  });
});
