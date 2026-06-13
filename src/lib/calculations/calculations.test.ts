import { describe, expect, it } from 'vitest';
import type { Match, Player, Settings, Team } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { getOutcome, getEffectiveScore, teamPointsInMatch } from './effectiveResult';
import { computeGroupTable } from './groupStandings';
import { computeLeaderboard } from './sweepstakeLeaderboard';
import { computeMatchImpact } from './matchImpact';

const S: Settings = DEFAULT_SETTINGS;

function player(id: string, name: string, code: string): Player {
  return { id, name, displayCode: code, isAdmin: false, createdAt: '', updatedAt: '' };
}
function team(id: string, name: string, group: string, owner: string | null): Team {
  return { id, name, groupLetter: group, ownerPlayerId: owner, createdAt: '', updatedAt: '' };
}
function match(p: Partial<Match> & Pick<Match, 'id' | 'homeTeamId' | 'awayTeamId'>): Match {
  return {
    stage: 'group',
    groupLetter: 'A',
    kickoffAt: '2026-06-11T16:00:00.000Z',
    status: 'finished',
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
    externalId: null,
    createdAt: '',
    updatedAt: '',
    ...p,
  };
}

describe('teamPointsInMatch', () => {
  it('awards 3 for a win, 0 for a loss', () => {
    const m = match({ id: 'm1', homeTeamId: 'h', awayTeamId: 'a', homeScore: 2, awayScore: 1 });
    expect(teamPointsInMatch(m, 'h', S)).toMatchObject({ points: 3, result: 'W', goalsFor: 2, goalsAgainst: 1 });
    expect(teamPointsInMatch(m, 'a', S)).toMatchObject({ points: 0, result: 'L', goalsFor: 1, goalsAgainst: 2 });
  });

  it('awards 1 each for a draw', () => {
    const m = match({ id: 'm1', homeTeamId: 'h', awayTeamId: 'a', homeScore: 1, awayScore: 1 });
    expect(teamPointsInMatch(m, 'h', S)?.points).toBe(1);
    expect(teamPointsInMatch(m, 'a', S)?.points).toBe(1);
  });

  it('does not score unfinished matches (e.g. live)', () => {
    const m = match({ id: 'm1', homeTeamId: 'h', awayTeamId: 'a', homeScore: 1, awayScore: 0, status: 'live' });
    expect(teamPointsInMatch(m, 'h', S)).toBeNull();
  });

  it('returns null for a team not in the match', () => {
    const m = match({ id: 'm1', homeTeamId: 'h', awayTeamId: 'a', homeScore: 1, awayScore: 0 });
    expect(teamPointsInMatch(m, 'x', S)).toBeNull();
  });
});

describe('penalty shootout (knockout)', () => {
  it('counts a shootout win as a win', () => {
    const m = match({
      id: 'ko',
      stage: 'r32',
      groupLetter: null,
      homeTeamId: 'h',
      awayTeamId: 'a',
      homeScore: 1,
      awayScore: 1,
      homePens: 4,
      awayPens: 3,
    });
    expect(getOutcome(getEffectiveScore(m)!)).toBe('home');
    expect(teamPointsInMatch(m, 'h', S)?.points).toBe(3);
    expect(teamPointsInMatch(m, 'a', S)?.points).toBe(0);
  });
});

describe('manual override', () => {
  it('uses override scores over the live/API score and flips the result', () => {
    const m = match({
      id: 'm1',
      homeTeamId: 'h',
      awayTeamId: 'a',
      homeScore: 0,
      awayScore: 3,
      hasManualOverride: true,
      overrideHomeScore: 2,
      overrideAwayScore: 1,
    });
    const eff = getEffectiveScore(m)!;
    expect(eff.fromOverride).toBe(true);
    expect(teamPointsInMatch(m, 'h', S)?.points).toBe(3);
  });
});

describe('computeGroupTable', () => {
  it('ranks by points then goal difference', () => {
    const teams = [
      team('t1', 'Alpha', 'A', null),
      team('t2', 'Bravo', 'A', null),
      team('t3', 'Charlie', 'A', null),
      team('t4', 'Delta', 'A', null),
    ];
    const matches = [
      match({ id: 'm1', homeTeamId: 't1', awayTeamId: 't2', homeScore: 3, awayScore: 0 }),
      match({ id: 'm2', homeTeamId: 't3', awayTeamId: 't4', homeScore: 1, awayScore: 0 }),
    ];
    const table = computeGroupTable('A', teams, matches, S);
    expect(table[0].team.id).toBe('t1'); // +3 GD
    expect(table[0].points).toBe(3);
    expect(table[1].team.id).toBe('t3'); // +1 GD
    expect(table[3].team.id).toBe('t2'); // worst GD
  });

  it('ignores knockout matches', () => {
    const teams = [team('t1', 'Alpha', 'A', null), team('t2', 'Bravo', 'A', null)];
    const matches = [
      match({ id: 'm1', stage: 'r32', groupLetter: null, homeTeamId: 't1', awayTeamId: 't2', homeScore: 5, awayScore: 0 }),
    ];
    const table = computeGroupTable('A', teams, matches, S);
    expect(table.every((r) => r.played === 0)).toBe(true);
  });
});

describe('computeLeaderboard', () => {
  const yiannis = player('p1', 'Yiannis', 'Y');
  const aiza = player('p2', 'Aiza', 'A');

  it('sums points across owned teams and includes knockout matches', () => {
    const teams = [
      team('t1', 'Mexico', 'A', 'p1'),
      team('t2', 'Brazil', 'B', 'p1'),
      team('t3', 'Canada', 'A', 'p2'),
    ];
    const matches = [
      match({ id: 'm1', homeTeamId: 't1', awayTeamId: 't3', homeScore: 2, awayScore: 1 }), // Mexico win
      match({ id: 'm2', stage: 'r32', groupLetter: null, homeTeamId: 't2', awayTeamId: 't3', homeScore: 1, awayScore: 1, homePens: 5, awayPens: 4 }), // Brazil pens win
    ];
    const lb = computeLeaderboard([yiannis, aiza], teams, matches, S);
    const y = lb.find((r) => r.player.id === 'p1')!;
    expect(y.points).toBe(6); // 3 + 3
    expect(y.rank).toBe(1);
    const a = lb.find((r) => r.player.id === 'p2')!;
    expect(a.points).toBe(0); // two losses
  });

  it('awards both owners when their teams meet', () => {
    const teams = [team('t1', 'Mexico', 'A', 'p1'), team('t2', 'Canada', 'A', 'p2')];
    const matches = [match({ id: 'm1', homeTeamId: 't1', awayTeamId: 't2', homeScore: 1, awayScore: 1 })];
    const lb = computeLeaderboard([yiannis, aiza], teams, matches, S);
    expect(lb.find((r) => r.player.id === 'p1')!.points).toBe(1);
    expect(lb.find((r) => r.player.id === 'p2')!.points).toBe(1);
  });

  it('scores both teams separately when one player owns both sides', () => {
    const teams = [team('t1', 'Mexico', 'A', 'p1'), team('t2', 'Canada', 'A', 'p1')];
    const matches = [match({ id: 'm1', homeTeamId: 't1', awayTeamId: 't2', homeScore: 2, awayScore: 1 })];
    const lb = computeLeaderboard([yiannis], teams, matches, S);
    expect(lb[0].points).toBe(3); // win for Mexico (3) + loss for Canada (0)
    expect(lb[0].wins).toBe(1);
    expect(lb[0].losses).toBe(1);
  });

  it('breaks ties by wins then goal difference', () => {
    const teams = [
      team('t1', 'A1', 'A', 'p1'),
      team('t2', 'A2', 'A', 'p2'),
      team('t3', 'B1', 'B', 'p1'),
      team('t4', 'B2', 'B', 'p2'),
    ];
    // Both players: 3 points. p1 wins by goal difference.
    const matches = [
      match({ id: 'm1', homeTeamId: 't1', awayTeamId: 't3', homeScore: 4, awayScore: 0 }),
      match({ id: 'm2', homeTeamId: 't2', awayTeamId: 't4', homeScore: 1, awayScore: 0 }),
    ];
    const lb = computeLeaderboard([yiannis, aiza], teams, matches, S);
    expect(lb[0].player.id).toBe('p1');
  });
});

describe('computeMatchImpact', () => {
  const yiannis = player('p1', 'Yiannis', 'Y');
  const aiza = player('p2', 'Aiza', 'A');

  it('shows per-result deltas for two different owners', () => {
    const impact = computeMatchImpact(yiannis, aiza, S);
    expect(impact.homeWin).toEqual([{ playerId: 'p1', code: 'Y', delta: 3 }]);
    expect(impact.draw).toEqual([
      { playerId: 'p1', code: 'Y', delta: 1 },
      { playerId: 'p2', code: 'A', delta: 1 },
    ]);
    expect(impact.awayWin).toEqual([{ playerId: 'p2', code: 'A', delta: 3 }]);
  });

  it('aggregates when one player owns both teams', () => {
    const impact = computeMatchImpact(yiannis, yiannis, S);
    expect(impact.draw).toEqual([{ playerId: 'p1', code: 'Y', delta: 2 }]);
    expect(impact.homeWin).toEqual([{ playerId: 'p1', code: 'Y', delta: 3 }]);
  });
});
