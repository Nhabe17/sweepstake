import { describe, expect, it } from 'vitest';
import {
  buildFootballDataInsertRow,
  buildFootballDataUpdatePatch,
  resolveFootballDataSyncTarget,
  teamIdsForFootballDataMatch,
  type ExistingMatchRow,
  type FdMatch,
  type MatchTeamIds,
  type ResolvedKnockoutSlot,
} from './footballDataSync';

function apiMatch(p: Partial<FdMatch> & Pick<FdMatch, 'id'>): FdMatch {
  return {
    utcDate: '2026-06-29T02:00:00.000Z',
    status: 'TIMED',
    stage: null,
    homeTeam: { tla: 'GER' },
    awayTeam: { tla: 'USA' },
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

// The Round of 32 slot anchored by GER + USA (provider sends 'LAST_32').
const gerUsaR32Slot: ResolvedKnockoutSlot = { stage: 'r32', bracketSlot: 1, anchorTeamIds: ['t-ger', 't-usa'] };

function existing(p: Partial<ExistingMatchRow> & Pick<ExistingMatchRow, 'id'>): ExistingMatchRow {
  return {
    externalId: null,
    stage: 'group',
    bracketSlot: null,
    homeTeamId: 't-ger',
    awayTeamId: 't-usa',
    kickoffAt: '2026-06-29T02:00:00.000Z',
    hasManualOverride: false,
    ...p,
  };
}

const teamIds: MatchTeamIds = { homeId: 't-ger', awayId: 't-usa' };

describe('resolveFootballDataSyncTarget', () => {
  it('inserts a new Round of 32 fixture into the slot whose projected teams match', () => {
    const match = apiMatch({ id: 73, stage: 'LAST_32' });

    const target = resolveFootballDataSyncTarget(match, [], teamIds, [gerUsaR32Slot]);
    const row = target ? buildFootballDataInsertRow(match, target, teamIds, '2026-06-01T00:00:00.000Z') : null;

    expect(target).toMatchObject({
      action: 'insert',
      id: 'm-r32-1',
      stage: 'r32',
      bracketSlot: 1,
    });
    expect(row).toMatchObject({
      id: 'm-r32-1',
      external_id: '73',
      stage: 'r32',
      bracket_slot: 1,
      home_team_id: 't-ger',
      away_team_id: 't-usa',
    });
  });

  it('skips a knockout fixture whose round is not yet resolvable to a slot', () => {
    const match = apiMatch({ id: 73, stage: 'LAST_32' });

    // No slot is anchored by either team yet (e.g. group results not finished), so it is
    // left for a later sync rather than guessed into a wrong slot.
    expect(resolveFootballDataSyncTarget(match, [], teamIds, [])).toBeNull();
  });

  it('places a best-third fixture via its fixed opponent, taking the third-placer from the API', () => {
    // Slot 2 is "Winner Group E vs best third". Only the group winner anchors it; the actual
    // third-placed opponent (USA here) is unknown to the projection but comes from the fixture.
    const match = apiMatch({
      id: 74,
      stage: 'LAST_32',
      homeTeam: { tla: 'GER' }, // resolves to t-ger, the Group E winner anchor
      awayTeam: { tla: 'USA' }, // the best-third opponent, only known from the provider
    });
    const winnerOnlySlot: ResolvedKnockoutSlot = { stage: 'r32', bracketSlot: 2, anchorTeamIds: ['t-ger'] };

    const target = resolveFootballDataSyncTarget(match, [], teamIds, [winnerOnlySlot]);
    const row = target ? buildFootballDataInsertRow(match, target, teamIds, '2026-06-01T00:00:00.000Z') : null;

    expect(target).toMatchObject({ action: 'insert', id: 'm-r32-2', stage: 'r32', bracketSlot: 2 });
    expect(row).toMatchObject({
      stage: 'r32',
      bracket_slot: 2,
      home_team_id: 't-ger',
      away_team_id: 't-usa',
    });
  });

  it('updates an existing fixture by external id before considering bracket slot', () => {
    const match = apiMatch({ id: 900, stage: 'LAST_32' });
    const rows = [
      existing({ id: 'm-r32-1', stage: 'r32', bracketSlot: 1 }),
      existing({ id: 'm-known-provider-row', externalId: '900', stage: 'r32', bracketSlot: 2 }),
    ];

    const target = resolveFootballDataSyncTarget(match, rows, teamIds, [gerUsaR32Slot]);

    expect(target).toMatchObject({
      action: 'update',
      id: 'm-known-provider-row',
      stage: 'r32',
      bracketSlot: 2,
    });
  });

  it('does not overwrite a group-stage row for a knockout rematch', () => {
    const match = apiMatch({ id: 73, stage: 'LAST_32' });
    const rows = [
      existing({
        id: 'm-group-ger-usa',
        stage: 'group',
        bracketSlot: null,
        kickoffAt: '2026-06-29T02:00:00.000Z',
      }),
    ];

    const target = resolveFootballDataSyncTarget(match, rows, teamIds, [gerUsaR32Slot]);

    expect(target).toMatchObject({
      action: 'insert',
      id: 'm-r32-1',
      stage: 'r32',
      bracketSlot: 1,
    });
  });

  it('skips an existing manual override row', () => {
    const match = apiMatch({ id: 73, stage: 'LAST_32' });
    const rows = [
      existing({
        id: 'm-r32-1',
        stage: 'r32',
        bracketSlot: 1,
        hasManualOverride: true,
      }),
    ];

    expect(resolveFootballDataSyncTarget(match, rows, teamIds, [gerUsaR32Slot])).toBeNull();
  });

  it('falls back to group pair and kickoff proximity for group matches', () => {
    const match = apiMatch({
      id: 12,
      stage: 'GROUP_STAGE',
      utcDate: '2026-06-11T16:00:00.000Z',
    });
    const rows = [
      existing({
        id: 'm-near',
        stage: 'group',
        kickoffAt: '2026-06-11T18:00:00.000Z',
      }),
      existing({
        id: 'm-far',
        stage: 'group',
        kickoffAt: '2026-06-20T18:00:00.000Z',
      }),
    ];

    const target = resolveFootballDataSyncTarget(match, rows, teamIds);

    expect(target).toMatchObject({ action: 'update', id: 'm-near', stage: 'group' });
  });

  it('reconciles a group fixture by team pair even when the seed kickoff is far off', () => {
    // Real fixture kicks off two weeks from the placeholder seed time; the unique team pair
    // still identifies the row (no kickoff-tolerance gate to drop it).
    const match = apiMatch({ id: 12, stage: 'GROUP_STAGE', utcDate: '2026-06-27T16:00:00.000Z' });
    const rows = [existing({ id: 'm-seed', stage: 'group', kickoffAt: '2026-06-11T18:00:00.000Z' })];

    const target = resolveFootballDataSyncTarget(match, rows, teamIds);

    expect(target).toMatchObject({ action: 'update', id: 'm-seed', stage: 'group' });
  });

  it('leaves a fixture with an unrecognised stage alone', () => {
    const match = apiMatch({ id: 12, stage: 'PLAYOFF', utcDate: '2026-06-11T16:00:00.000Z' });
    const rows = [existing({ id: 'm-seed', stage: 'group', kickoffAt: '2026-06-11T18:00:00.000Z' })];

    expect(resolveFootballDataSyncTarget(match, rows, teamIds)).toBeNull();
  });

  it('maps penalty shootout scores without using penalty goals as match goals', () => {
    const match = apiMatch({
      id: 73,
      stage: 'LAST_32',
      status: 'FINISHED',
      score: {
        duration: 'PENALTY_SHOOTOUT',
        fullTime: { home: 6, away: 5 },
        regularTime: { home: 1, away: 1 },
        extraTime: { home: 0, away: 0 },
        penalties: { home: 5, away: 4 },
      },
    });
    const target = resolveFootballDataSyncTarget(
      match,
      [existing({ id: 'm-r32-1', stage: 'r32', bracketSlot: 1 })],
      teamIds,
      [gerUsaR32Slot],
    )!;

    const patch = buildFootballDataUpdatePatch(match, target, teamIds, '2026-06-01T00:00:00.000Z');

    expect(patch).toMatchObject({
      home_score: 1,
      away_score: 1,
      api_home_score: 1,
      api_away_score: 1,
      home_pens: 5,
      away_pens: 4,
    });
  });

  it('swaps score orientation for an existing reversed group-stage row', () => {
    const match = apiMatch({
      id: 12,
      stage: 'GROUP_STAGE',
      utcDate: '2026-06-11T16:00:00.000Z',
      status: 'FINISHED',
      score: {
        duration: 'REGULAR',
        fullTime: { home: 2, away: 1 },
        regularTime: null,
        extraTime: null,
        penalties: null,
      },
    });
    const target = resolveFootballDataSyncTarget(
      match,
      [
        existing({
          id: 'm-reversed',
          homeTeamId: 't-usa',
          awayTeamId: 't-ger',
          kickoffAt: '2026-06-11T16:00:00.000Z',
        }),
      ],
      teamIds,
    )!;

    const patch = buildFootballDataUpdatePatch(match, target, teamIds, '2026-06-01T00:00:00.000Z');

    expect(target).toMatchObject({ id: 'm-reversed', swapGoals: true, updateTeams: false });
    expect(patch).toMatchObject({
      home_score: 1,
      away_score: 2,
      api_home_score: 1,
      api_away_score: 2,
    });
  });
});

describe('teamIdsForFootballDataMatch', () => {
  it('returns null when either provider team is unknown', () => {
    const tlaToId = new Map([['GER', 't-ger']]);
    expect(teamIdsForFootballDataMatch(apiMatch({ id: 73 }), tlaToId)).toBeNull();
  });
});
