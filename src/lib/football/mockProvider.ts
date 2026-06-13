import type { Match } from '@/lib/types';
import { SEED_MATCHES } from '@/lib/seed';
import { isSameDay } from '@/lib/format';
import type { FootballProvider } from './provider';

// Mock provider backed by the deterministic seed fixtures. Lets the whole app run and be
// tested with no API key.
export const mockProvider: FootballProvider = {
  async getFixtures() {
    return structuredClone(SEED_MATCHES);
  },
  async getMatchesByDate(date: Date) {
    return SEED_MATCHES.filter((m) => isSameDay(new Date(m.kickoffAt), date));
  },
  async getMatchResults() {
    return SEED_MATCHES.filter((m) => m.status === 'finished');
  },
  async syncMatchesToDatabase() {
    // Seed data is already in the store; nothing to sync.
    return { updated: 0 };
  },
};
