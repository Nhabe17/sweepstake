import { describe, expect, it } from 'vitest';
import type { Match, Team } from '@/lib/types';
import {
  buildKnockoutBracket,
  buildProjectedKnockoutBracket,
  knockoutSlotAnchors,
  type KnockoutBracket,
} from './bracket';
import {
  buildFootballDataInsertRow,
  resolveFootballDataSyncTarget,
  type FdMatch,
} from '@/lib/football/footballDataSync';
import { rowToMatch } from '@/lib/supabase/mappers';

// Slots are rendered in bracket-tree display order, so look them up by bracketSlot, not index.
function slotOf(bracket: KnockoutBracket, stage: string, bracketSlot: number) {
  const slot = bracket.rounds.find((round) => round.stage === stage)?.slots.find((s) => s.bracketSlot === bracketSlot);
  if (!slot) throw new Error(`${stage} slot ${bracketSlot} not found`);
  return slot;
}

function match(p: Partial<Match> & Pick<Match, 'id' | 'stage' | 'bracketSlot' | 'homeTeamId' | 'awayTeamId'>): Match {
  return {
    externalId: null,
    groupLetter: null,
    kickoffAt: '2026-06-29T02:00:00.000Z',
    status: 'scheduled',
    homeScore: null,
    awayScore: null,
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

function groupMatch(p: Partial<Match> & Pick<Match, 'id' | 'groupLetter' | 'homeTeamId' | 'awayTeamId'>): Match {
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

function completeGroupMatches(groupLetter: string, thirdWinGoals = 1): Match[] {
  const winner = `${groupLetter}-winner`;
  const runner = `${groupLetter}-runner`;
  const third = `${groupLetter}-third`;
  const fourth = `${groupLetter}-fourth`;

  return [
    groupMatch({ id: `${groupLetter}-1`, groupLetter, homeTeamId: winner, awayTeamId: runner, homeScore: 1, awayScore: 0 }),
    groupMatch({ id: `${groupLetter}-2`, groupLetter, homeTeamId: winner, awayTeamId: third, homeScore: 2, awayScore: 0 }),
    groupMatch({ id: `${groupLetter}-3`, groupLetter, homeTeamId: winner, awayTeamId: fourth, homeScore: 2, awayScore: 0 }),
    groupMatch({ id: `${groupLetter}-4`, groupLetter, homeTeamId: runner, awayTeamId: third, homeScore: 2, awayScore: 0 }),
    groupMatch({ id: `${groupLetter}-5`, groupLetter, homeTeamId: runner, awayTeamId: fourth, homeScore: 2, awayScore: 0 }),
    groupMatch({
      id: `${groupLetter}-6`,
      groupLetter,
      homeTeamId: third,
      awayTeamId: fourth,
      homeScore: thirdWinGoals,
      awayScore: 0,
    }),
  ];
}

describe('buildKnockoutBracket', () => {
  it('builds the full knockout template without database matches', () => {
    const bracket = buildKnockoutBracket([]);

    expect(bracket.rounds.map((round) => [round.stage, round.slots.length])).toEqual([
      ['r32', 16],
      ['r16', 8],
      ['qf', 4],
      ['sf', 2],
      ['final', 1],
    ]);
    expect(slotOf(bracket, 'r32', 1)).toMatchObject({
      stage: 'r32',
      bracketSlot: 1,
      match: null,
      home: { teamId: null, source: 'tbd' },
      away: { teamId: null, source: 'tbd' },
    });
    expect(bracket.thirdPlace).toMatchObject({
      stage: 'third_place',
      bracketSlot: 1,
      match: null,
    });
  });

  it('overlays existing matches by stage and bracket slot', () => {
    const r32Slot3 = match({
      id: 'm-r32-3',
      stage: 'r32',
      bracketSlot: 3,
      homeTeamId: 't-ger',
      awayTeamId: 't-mex',
    });
    const groupMatch = match({
      id: 'm-group',
      stage: 'group',
      bracketSlot: 1,
      groupLetter: 'A',
      homeTeamId: 't-a',
      awayTeamId: 't-b',
    });

    const bracket = buildKnockoutBracket([groupMatch, r32Slot3]);
    const slot = slotOf(bracket, 'r32', 3);

    expect(slot.match).toBe(r32Slot3);
    expect(slot.home).toMatchObject({ teamId: 't-ger', source: 'match', sourceMatchId: 'm-r32-3' });
    expect(slot.away).toMatchObject({ teamId: 't-mex', source: 'match', sourceMatchId: 'm-r32-3' });
  });

  it('flows finished match winners into the next round per the official feeder map', () => {
    // R16 slot 1 is FIFA match 89 = Winner(match 74) vs Winner(match 77) = R32 slots 2 and 5.
    const r32Slot2 = match({
      id: 'm-r32-2',
      stage: 'r32',
      bracketSlot: 2,
      homeTeamId: 't-arg',
      awayTeamId: 't-den',
      status: 'finished',
      homeScore: 2,
      awayScore: 0,
    });
    const r32Slot5 = match({
      id: 'm-r32-5',
      stage: 'r32',
      bracketSlot: 5,
      homeTeamId: 't-bra',
      awayTeamId: 't-jpn',
      status: 'finished',
      homeScore: 1,
      awayScore: 1,
      homePens: 4,
      awayPens: 5,
    });

    const bracket = buildKnockoutBracket([r32Slot2, r32Slot5]);
    const r16Slot1 = slotOf(bracket, 'r16', 1);

    expect(r16Slot1.match).toBeNull();
    expect(r16Slot1.home).toMatchObject({
      teamId: 't-arg',
      source: 'winner',
      sourceStage: 'r32',
      sourceSlot: 2,
      sourceMatchId: 'm-r32-2',
    });
    expect(r16Slot1.away).toMatchObject({
      teamId: 't-jpn',
      source: 'winner',
      sourceStage: 'r32',
      sourceSlot: 5,
      sourceMatchId: 'm-r32-5',
    });

    // R32 slot 1 must NOT feed R16 slot 1 (it feeds match 90 = R16 slot 2).
    expect(slotOf(bracket, 'r16', 2).home).toMatchObject({ source: 'winner', sourceSlot: 1 });
  });

  it('uses an existing next-round row instead of derived participants', () => {
    const r32Slot1 = match({
      id: 'm-r32-1',
      stage: 'r32',
      bracketSlot: 1,
      homeTeamId: 't-arg',
      awayTeamId: 't-den',
      status: 'finished',
      homeScore: 2,
      awayScore: 0,
    });
    const r16Slot1 = match({
      id: 'm-r16-1',
      stage: 'r16',
      bracketSlot: 1,
      homeTeamId: 't-api-home',
      awayTeamId: 't-api-away',
    });

    const bracket = buildKnockoutBracket([r32Slot1, r16Slot1]);
    const slot = slotOf(bracket, 'r16', 1);

    expect(slot.match).toBe(r16Slot1);
    expect(slot.home).toMatchObject({ teamId: 't-api-home', source: 'match' });
    expect(slot.away).toMatchObject({ teamId: 't-api-away', source: 'match' });
  });

  it('wires the official 2026 feeder tree for every knockout slot', () => {
    const bracket = buildKnockoutBracket([]);
    const feeders = (stage: string, slot: number) => {
      const s = slotOf(bracket, stage, slot);
      return [s.home.sourceSlot, s.away.sourceSlot];
    };

    // Round of 16 (matches 89-96)
    expect(feeders('r16', 1)).toEqual([2, 5]);
    expect(feeders('r16', 2)).toEqual([1, 3]);
    expect(feeders('r16', 3)).toEqual([4, 6]);
    expect(feeders('r16', 4)).toEqual([7, 8]);
    expect(feeders('r16', 5)).toEqual([11, 12]);
    expect(feeders('r16', 6)).toEqual([9, 10]);
    expect(feeders('r16', 7)).toEqual([14, 16]);
    expect(feeders('r16', 8)).toEqual([13, 15]);
    // Quarter-finals (97-100), semi-finals (101-102), final (104)
    expect(feeders('qf', 1)).toEqual([1, 2]);
    expect(feeders('qf', 2)).toEqual([5, 6]);
    expect(feeders('qf', 3)).toEqual([3, 4]);
    expect(feeders('qf', 4)).toEqual([7, 8]);
    expect(feeders('sf', 1)).toEqual([1, 2]);
    expect(feeders('sf', 2)).toEqual([3, 4]);
    expect(feeders('final', 1)).toEqual([1, 2]);
  });
});

describe('buildProjectedKnockoutBracket', () => {
  it('projects a completed Group D winner into the correct Round of 32 slot', () => {
    const bracket = buildProjectedKnockoutBracket(completeGroupMatches('D'), groupTeams('D'));
    const slot9 = slotOf(bracket, 'r32', 9);

    expect(slot9.match).toBeNull();
    expect(slot9.home).toMatchObject({
      teamId: 'D-winner',
      source: 'group_winner',
      sourceGroupLetter: 'D',
    });
    expect(slot9.away).toMatchObject({ teamId: null, source: 'tbd' });
  });

  it('projects a completed Group A runner-up into a fixed runner-up slot', () => {
    const bracket = buildProjectedKnockoutBracket(completeGroupMatches('A'), groupTeams('A'));
    const slot1 = slotOf(bracket, 'r32', 1);

    expect(slot1.home).toMatchObject({
      teamId: 'A-runner',
      source: 'group_runner_up',
      sourceGroupLetter: 'A',
    });
    expect(slot1.away).toMatchObject({ teamId: null, source: 'tbd' });
  });

  it('keeps official synced knockout match teams ahead of projected participants', () => {
    const officialSlot9 = match({
      id: 'm-r32-9',
      stage: 'r32',
      bracketSlot: 9,
      homeTeamId: 'api-home',
      awayTeamId: 'api-away',
    });

    const bracket = buildProjectedKnockoutBracket(
      [...completeGroupMatches('D'), officialSlot9],
      groupTeams('D'),
    );
    const slot9 = slotOf(bracket, 'r32', 9);

    expect(slot9.match).toBe(officialSlot9);
    expect(slot9.home).toMatchObject({ teamId: 'api-home', source: 'match' });
    expect(slot9.away).toMatchObject({ teamId: 'api-away', source: 'match' });
  });

  it('keeps third-place slots as TBD while the app cannot safely resolve them', () => {
    const bracket = buildProjectedKnockoutBracket(completeGroupMatches('E'), groupTeams('E'));
    const slot2 = slotOf(bracket, 'r32', 2);

    expect(slot2.home).toMatchObject({
      teamId: 'E-winner',
      source: 'group_winner',
      sourceGroupLetter: 'E',
    });
    expect(slot2.away).toMatchObject({ teamId: null, source: 'tbd' });
  });

  it('projects a best-third participant only when exactly one allowed group has clearly qualified', () => {
    const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    const thirdWinGoalsByGroup = new Map([
      ['A', 12],
      ['E', 11],
      ['G', 10],
      ['H', 9],
      ['I', 8],
      ['J', 7],
      ['K', 6],
      ['L', 5],
      ['B', 1],
      ['C', 1],
      ['D', 1],
      ['F', 1],
    ]);
    const teams = groupLetters.flatMap((groupLetter) => groupTeams(groupLetter));
    const matches = groupLetters.flatMap((groupLetter) =>
      completeGroupMatches(groupLetter, thirdWinGoalsByGroup.get(groupLetter) ?? 1),
    );

    const bracket = buildProjectedKnockoutBracket(matches, teams);
    const slot2 = slotOf(bracket, 'r32', 2);

    expect(slot2.away).toMatchObject({
      teamId: 'A-third',
      source: 'best_third',
      sourceGroupLetter: 'A',
      sourceAllowedGroupLetters: ['A', 'B', 'C', 'D', 'F'],
    });
  });

  it('keeps later-round winner derivation based on real finished knockout matches', () => {
    // R16 slot 1 feeders are R32 slots 2 and 5 (official match 89).
    const r32Slot2 = match({
      id: 'm-r32-2',
      stage: 'r32',
      bracketSlot: 2,
      homeTeamId: 't-arg',
      awayTeamId: 't-den',
      status: 'finished',
      homeScore: 2,
      awayScore: 0,
    });
    const r32Slot5 = match({
      id: 'm-r32-5',
      stage: 'r32',
      bracketSlot: 5,
      homeTeamId: 't-bra',
      awayTeamId: 't-jpn',
      status: 'finished',
      homeScore: 1,
      awayScore: 1,
      homePens: 4,
      awayPens: 5,
    });

    const bracket = buildProjectedKnockoutBracket(
      [...completeGroupMatches('A'), r32Slot2, r32Slot5],
      groupTeams('A'),
    );
    const r16Slot1 = slotOf(bracket, 'r16', 1);

    expect(r16Slot1.home).toMatchObject({ teamId: 't-arg', source: 'winner' });
    expect(r16Slot1.away).toMatchObject({ teamId: 't-jpn', source: 'winner' });
  });
});

describe('best-third sync end-to-end', () => {
  function fdFixture(p: Partial<FdMatch> & Pick<FdMatch, 'id'>): FdMatch {
    return {
      utcDate: '2026-06-30T18:00:00.000Z',
      status: 'TIMED',
      stage: 'LAST_32',
      homeTeam: { tla: 'GER' },
      awayTeam: { tla: 'PAR' },
      score: {
        duration: 'REGULAR',
        fullTime: { home: null, away: null },
        regularTime: null,
        extraTime: null,
        penalties: null,
      },
      ...p,
    };
  }

  it('fills the best-third slot the projection leaves TBD once the real fixture syncs', () => {
    // Group E is complete, so slot 2 (Winner E vs best third) projects "E-winner vs TBD" — the
    // app will not guess the best-third opponent.
    const groupMatches = completeGroupMatches('E');
    const teams = groupTeams('E');

    const projected = buildProjectedKnockoutBracket(groupMatches, teams);
    const slotBefore = slotOf(projected, 'r32', 2);
    expect(slotBefore.match).toBeNull();
    expect(slotBefore.home).toMatchObject({ teamId: 'E-winner', source: 'group_winner' });
    expect(slotBefore.away).toMatchObject({ teamId: null, source: 'tbd' });

    // The provider publishes the real fixture; we resolve it against the projected anchors.
    const anchors = knockoutSlotAnchors(projected);
    const fixture = fdFixture({ id: 74 });
    const teamIds = { homeId: 'E-winner', awayId: 't-paraguay' }; // provider TLAs map to these ids

    const target = resolveFootballDataSyncTarget(fixture, [], teamIds, anchors);
    expect(target).toMatchObject({ action: 'insert', id: 'm-r32-2', stage: 'r32', bracketSlot: 2 });

    // The inserted row, round-tripped through the DB mapper, overrides the projection.
    const insertedMatch = rowToMatch(buildFootballDataInsertRow(fixture, target!, teamIds, '2026-06-28T00:00:00.000Z'));
    expect(insertedMatch).toMatchObject({ stage: 'r32', bracketSlot: 2, homeTeamId: 'E-winner', awayTeamId: 't-paraguay' });

    const afterSync = buildProjectedKnockoutBracket([...groupMatches, insertedMatch], teams);
    const slotAfter = slotOf(afterSync, 'r32', 2);
    expect(slotAfter.match).not.toBeNull();
    expect(slotAfter.home).toMatchObject({ teamId: 'E-winner', source: 'match' });
    expect(slotAfter.away).toMatchObject({ teamId: 't-paraguay', source: 'match' });
  });
});
