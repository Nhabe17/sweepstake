import type { SweepstakeData } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { SEED_PLAYERS } from './players';
import { SEED_TEAMS } from './teams';
import { SEED_MATCHES } from './matches';

/** A fresh, deterministic snapshot of all seed data. */
export function buildSeedData(): SweepstakeData {
  return {
    players: structuredClone(SEED_PLAYERS),
    teams: structuredClone(SEED_TEAMS),
    matches: structuredClone(SEED_MATCHES),
    settings: { ...DEFAULT_SETTINGS },
  };
}

export { SEED_PLAYERS, SEED_TEAMS, SEED_MATCHES };
