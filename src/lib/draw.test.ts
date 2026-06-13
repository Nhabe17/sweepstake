import { describe, expect, it } from 'vitest';
import type { Player, Team } from '@/lib/types';
import { canFairDraw, fairDraw, simpleDraw } from './draw';
import { buildSeedData } from './seed';

// Seeded PRNG so draw tests are deterministic.
function rng(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

const { teams, players } = buildSeedData();

describe('simpleDraw', () => {
  it('assigns every team and 6 per player with 8 players / 48 teams', () => {
    const a = simpleDraw(teams, players, rng(1));
    expect(Object.keys(a)).toHaveLength(48);
    for (const p of players) {
      expect(Object.values(a).filter((id) => id === p.id)).toHaveLength(6);
    }
  });
});

describe('fairDraw', () => {
  it('is possible for the seed (6 pots of 8, 8 players)', () => {
    expect(canFairDraw(teams, players)).toBe(true);
  });

  it('gives each player exactly one team from every pot', () => {
    const a = fairDraw(teams, players, rng(7));
    const potById = new Map(teams.map((t) => [t.id, t.pot]));
    for (const p of players) {
      const pots = Object.entries(a)
        .filter(([, owner]) => owner === p.id)
        .map(([teamId]) => potById.get(teamId))
        .sort();
      expect(pots).toEqual([1, 2, 3, 4, 5, 6]);
    }
  });

  it('cannot fair-draw when player count != teams per pot', () => {
    const seven: Player[] = players.slice(0, 7);
    expect(canFairDraw(teams, seven)).toBe(false);
  });
});
