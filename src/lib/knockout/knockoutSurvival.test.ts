import { describe, expect, it } from 'vitest';
import type { Match, Player, Stage, Team } from '@/lib/types';
import { computeKnockoutLeaderboard, computeTeamSurvival } from './knockoutSurvival';

function team(id: string, name: string, groupLetter = 'A', ownerPlayerId: string | null = null): Team {
  return { id, name, groupLetter, ownerPlayerId, createdAt: '', updatedAt: '' };
}

function player(id: string, name: string): Player {
  return { id, name, displayCode: id.toUpperCase(), isAdmin: false, createdAt: '', updatedAt: '' };
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

const groupATeams = [team('t1', 'Alpha'), team('t2', 'Bravo'), team('t3', 'Charlie'), team('t4', 'Delta')];

// Final standings: t1 1st, t2 2nd, t3 3rd, t4 4th.
function completeGroupA(): Match[] {
  return [
    match({ id: 'a1', homeTeamId: 't1', awayTeamId: 't2', homeScore: 2, awayScore: 0 }),
    match({ id: 'a2', homeTeamId: 't1', awayTeamId: 't3', homeScore: 1, awayScore: 0 }),
    match({ id: 'a3', homeTeamId: 't1', awayTeamId: 't4', homeScore: 3, awayScore: 0 }),
    match({ id: 'a4', homeTeamId: 't2', awayTeamId: 't3', homeScore: 2, awayScore: 1 }),
    match({ id: 'a5', homeTeamId: 't2', awayTeamId: 't4', homeScore: 1, awayScore: 1 }),
    match({ id: 'a6', homeTeamId: 't3', awayTeamId: 't4', homeScore: 2, awayScore: 0 }),
  ];
}

function knockout(id: string, stage: Stage, homeTeamId: string, awayTeamId: string, extra: Partial<Match> = {}): Match {
  return match({ id, stage, groupLetter: null, homeTeamId, awayTeamId, ...extra });
}

describe('computeTeamSurvival', () => {
  it('keeps group winners/runners-up in and eliminates the 4th-placed team at the group stage', () => {
    const survival = computeTeamSurvival(groupATeams, completeGroupA());

    expect(survival.get('t1')).toMatchObject({ status: 'in' });
    expect(survival.get('t2')).toMatchObject({ status: 'in' });
    expect(survival.get('t4')).toMatchObject({ status: 'out', eliminatedAtStage: 'group' });
  });

  it('leaves a third-placed team pending when the cross-group ranking is not yet computable', () => {
    const survival = computeTeamSurvival(groupATeams, completeGroupA());
    expect(survival.get('t3')).toMatchObject({ status: 'pending' });
  });

  it('treats every team as pending while the group is incomplete', () => {
    const survival = computeTeamSurvival(groupATeams, completeGroupA().slice(0, 5));
    for (const t of groupATeams) expect(survival.get(t.id)?.status).toBe('pending');
  });

  it('eliminates the loser of a knockout match and advances the winner', () => {
    const matches = [...completeGroupA(), knockout('k1', 'r16', 't1', 't2', { homeScore: 1, awayScore: 0 })];
    const survival = computeTeamSurvival(groupATeams, matches);

    expect(survival.get('t1')).toMatchObject({ status: 'in', currentStage: 'r16' });
    expect(survival.get('t2')).toMatchObject({ status: 'out', eliminatedAtStage: 'r16' });
  });

  it('counts a penalty-shootout defeat as elimination', () => {
    const matches = [
      ...completeGroupA(),
      knockout('k1', 'qf', 't1', 't2', { homeScore: 1, awayScore: 1, homePens: 2, awayPens: 4 }),
    ];
    const survival = computeTeamSurvival(groupATeams, matches);

    expect(survival.get('t1')).toMatchObject({ status: 'out', eliminatedAtStage: 'qf' });
    expect(survival.get('t2')).toMatchObject({ status: 'in', currentStage: 'qf' });
  });

  it('keeps the champion in after winning the final', () => {
    const matches = [...completeGroupA(), knockout('k1', 'final', 't1', 't2', { homeScore: 2, awayScore: 1 })];
    const survival = computeTeamSurvival(groupATeams, matches);

    expect(survival.get('t1')).toMatchObject({ status: 'in', currentStage: 'final' });
    expect(survival.get('t2')).toMatchObject({ status: 'out', eliminatedAtStage: 'final' });
  });
});

describe('computeKnockoutLeaderboard', () => {
  const alice = player('a', 'Alice');
  const bob = player('b', 'Bob');

  it('ranks players by surviving team count', () => {
    const teams = [
      team('t1', 'Alpha', 'A', 'a'), // in
      team('t2', 'Bravo', 'A', 'b'), // out (lost r16)
      team('t3', 'Charlie', 'A', 'a'), // pending (3rd)
      team('t4', 'Delta', 'A', 'b'), // out (group)
    ];
    const matches = [...completeGroupA(), knockout('k1', 'r16', 't1', 't2', { homeScore: 3, awayScore: 0 })];

    const board = computeKnockoutLeaderboard([bob, alice], teams, matches);

    expect(board.map((r) => [r.player.id, r.rank, r.remainingCount])).toEqual([
      ['a', 1, 1],
      ['b', 2, 0],
    ]);
    expect(board[0].totalOwned).toBe(2);
  });

  it('uses dense ranking so count tiers read 1, 1, 2', () => {
    const cara = player('c', 'Cara');
    const teams = [
      team('t1', 'Alpha', 'A', 'a'), // in -> Alice 1 remaining
      team('t2', 'Bravo', 'A', 'b'), // in -> Bob 1 remaining
      team('t4', 'Delta', 'A', 'c'), // out (group) -> Cara 0 remaining
    ];

    const board = computeKnockoutLeaderboard([alice, bob, cara], teams, completeGroupA());

    expect(board.map((r) => [r.player.id, r.rank, r.remainingCount])).toEqual([
      ['a', 1, 1],
      ['b', 1, 1],
      ['c', 2, 0],
    ]);
  });

  it('breaks ties on the furthest round reached, then player name', () => {
    // Both own one surviving team; Bob's is in the QF, Alice's only in the R16.
    const teams = [
      team('t1', 'Alpha', 'A', 'b'), // Bob — reaches QF
      team('t2', 'Bravo', 'A', 'a'), // Alice — reaches R16
    ];
    const matches = [
      ...completeGroupA(),
      knockout('r16a', 'r16', 't2', 't3', { homeScore: 1, awayScore: 0 }),
      knockout('r16b', 'r16', 't1', 't4', { homeScore: 1, awayScore: 0 }),
      knockout('qf', 'qf', 't1', 't5', { status: 'scheduled', homeScore: null, awayScore: null }),
    ];

    const board = computeKnockoutLeaderboard([alice, bob], teams, matches);

    expect(board.map((r) => r.player.id)).toEqual(['b', 'a']);
    expect(board.map((r) => r.remainingCount)).toEqual([1, 1]);
  });
});
