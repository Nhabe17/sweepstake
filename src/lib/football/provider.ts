import type { Match } from '@/lib/types';

// Abstraction over a football data source. The app ships with a mock provider backed by
// seed data; a real API provider can be implemented later behind the same interface.
export interface FootballProvider {
  /** All known fixtures (scheduled + finished). */
  getFixtures(): Promise<Match[]>;
  /** Fixtures kicking off on a given calendar day (local time). */
  getMatchesByDate(date: Date): Promise<Match[]>;
  /** Finished matches with scores. */
  getMatchResults(): Promise<Match[]>;
  /**
   * Push the provider's fixtures/results into the database (api_* columns), leaving any
   * manual overrides intact. No-op for the mock provider.
   */
  syncMatchesToDatabase(): Promise<{ updated: number }>;
}
