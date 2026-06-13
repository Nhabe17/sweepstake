import type { Player, Team } from '@/lib/types';

export type Assignment = Record<string, string | null>; // teamId -> playerId | null

type Rng = () => number;

/** Fisher–Yates shuffle returning a new array. */
export function shuffle<T>(input: T[], rng: Rng = Math.random): T[] {
  const arr = input.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Simple draw: shuffle all teams and deal them out round-robin, so team counts differ
 * by at most one when players don't divide the team count evenly.
 */
export function simpleDraw(teams: Team[], players: Player[], rng: Rng = Math.random): Assignment {
  const assignment: Assignment = {};
  if (players.length === 0) {
    teams.forEach((t) => (assignment[t.id] = null));
    return assignment;
  }
  shuffle(teams, rng).forEach((team, i) => {
    assignment[team.id] = players[i % players.length].id;
  });
  return assignment;
}

/** Whether the fair (pot-based) draw can run: every pot must hold exactly one team per player. */
export function canFairDraw(teams: Team[], players: Player[]): boolean {
  if (players.length === 0) return false;
  const pots = new Map<number, number>();
  for (const t of teams) {
    if (t.pot == null) return false;
    pots.set(t.pot, (pots.get(t.pot) ?? 0) + 1);
  }
  return [...pots.values()].every((count) => count === players.length);
}

/**
 * Fair draw: within each pot, shuffle the teams and give one to each player. Every player
 * ends up with exactly one team from each pot (e.g. one Pot-1 side, one Pot-6 side).
 */
export function fairDraw(teams: Team[], players: Player[], rng: Rng = Math.random): Assignment {
  const assignment: Assignment = {};
  const pots = new Map<number, Team[]>();
  for (const t of teams) {
    const pot = t.pot ?? 0;
    if (!pots.has(pot)) pots.set(pot, []);
    pots.get(pot)!.push(t);
  }
  for (const potTeams of pots.values()) {
    shuffle(potTeams, rng).forEach((team, i) => {
      assignment[team.id] = players[i % players.length]?.id ?? null;
    });
  }
  return assignment;
}
