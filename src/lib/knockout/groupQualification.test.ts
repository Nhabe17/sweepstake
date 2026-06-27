import { describe, expect, it } from 'vitest';
import type { Match, Team } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { computeGroupTable } from '@/lib/calculations/groupStandings';
import {
  computeGroupQualification,
  computeGroupQualifications,
  isGroupComplete,
} from './groupQualification';

function team(id: string, name: string, groupLetter = 'A'): Team {
  return {
    id,
    name,
    groupLetter,
    ownerPlayerId: null,
    createdAt: '',
    updatedAt: '',
  };
}

function match(p: Partial<Match> & Pick<Match, 'id' | 'homeTeamId' | 'awayTeamId'>): Match {
  return {
    externalId: null,
    groupLetter: 'A',
    stage: 'group',
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

const groupATeams = [
  team('t1', 'Alpha'),
  team('t2', 'Bravo'),
  team('t3', 'Charlie'),
  team('t4', 'Delta'),
];

function completeGroupAMatches(): Match[] {
  return [
    match({ id: 'm1', homeTeamId: 't1', awayTeamId: 't2', homeScore: 2, awayScore: 0 }),
    match({ id: 'm2', homeTeamId: 't1', awayTeamId: 't3', homeScore: 1, awayScore: 0 }),
    match({ id: 'm3', homeTeamId: 't1', awayTeamId: 't4', homeScore: 3, awayScore: 0 }),
    match({ id: 'm4', homeTeamId: 't2', awayTeamId: 't3', homeScore: 2, awayScore: 1 }),
    match({ id: 'm5', homeTeamId: 't2', awayTeamId: 't4', homeScore: 1, awayScore: 1 }),
    match({ id: 'm6', homeTeamId: 't3', awayTeamId: 't4', homeScore: 2, awayScore: 0 }),
  ];
}

describe('computeGroupQualification', () => {
  it('does not confirm qualifiers for incomplete groups', () => {
    const qualification = computeGroupQualification('A', groupATeams, completeGroupAMatches().slice(0, 5));

    expect(qualification).toEqual({
      groupLetter: 'A',
      complete: false,
      winnerTeamId: null,
      runnerUpTeamId: null,
      thirdPlaceTeamId: null,
    });
  });

  it('does not confirm qualifiers while any group match is unfinished', () => {
    const matches = completeGroupAMatches();
    matches[5] = match({
      id: 'm6',
      homeTeamId: 't3',
      awayTeamId: 't4',
      status: 'live',
      homeScore: 2,
      awayScore: 0,
    });

    expect(isGroupComplete('A', groupATeams, matches)).toBe(false);
    expect(computeGroupQualification('A', groupATeams, matches).winnerTeamId).toBeNull();
  });

  it('returns winner, runner-up, and third-place candidate for complete groups', () => {
    expect(computeGroupQualification('A', groupATeams, completeGroupAMatches())).toEqual({
      groupLetter: 'A',
      complete: true,
      winnerTeamId: 't1',
      runnerUpTeamId: 't2',
      thirdPlaceTeamId: 't3',
    });
  });

  it('returns empty qualification data for groups with no matches', () => {
    expect(computeGroupQualification('A', groupATeams, [])).toEqual({
      groupLetter: 'A',
      complete: false,
      winnerTeamId: null,
      runnerUpTeamId: null,
      thirdPlaceTeamId: null,
    });
  });

  it('preserves the existing group table ordering', () => {
    const matches = completeGroupAMatches();
    const table = computeGroupTable('A', groupATeams, matches, DEFAULT_SETTINGS);
    const qualification = computeGroupQualification('A', groupATeams, matches, DEFAULT_SETTINGS);

    expect([
      qualification.winnerTeamId,
      qualification.runnerUpTeamId,
      qualification.thirdPlaceTeamId,
    ]).toEqual(table.slice(0, 3).map((row) => row.team.id));
  });

  it('computes qualifications for each team group in deterministic order', () => {
    const teams = [...groupATeams, team('b1', 'Echo', 'B'), team('b2', 'Foxtrot', 'B')];
    const matches = [
      ...completeGroupAMatches(),
      match({
        id: 'b1',
        groupLetter: 'B',
        homeTeamId: 'b1',
        awayTeamId: 'b2',
        homeScore: 1,
        awayScore: 0,
      }),
    ];

    expect(computeGroupQualifications(teams, matches).map((qualification) => qualification.groupLetter)).toEqual([
      'A',
      'B',
    ]);
    expect(computeGroupQualification('B', teams, matches)).toEqual({
      groupLetter: 'B',
      complete: true,
      winnerTeamId: 'b1',
      runnerUpTeamId: 'b2',
      thirdPlaceTeamId: null,
    });
  });
});
