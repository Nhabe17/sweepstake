import type { Match, Player, Settings, SweepstakeData } from '@/lib/types';

export interface OverrideInput {
  homeScore: number | null;
  awayScore: number | null;
  homePens?: number | null;
  awayPens?: number | null;
  status: Match['status'];
}

/**
 * Backend-agnostic data access. The local (localStorage) implementation backs the MVP;
 * a Supabase implementation drops in later (M4) behind the same interface.
 */
export interface SweepstakeStore {
  getAll(): Promise<SweepstakeData>;

  // Players
  savePlayer(player: Player): Promise<void>;
  deletePlayer(playerId: string): Promise<void>;

  // Team assignments
  assignTeam(teamId: string, ownerPlayerId: string | null): Promise<void>;
  assignManyTeams(assignments: Record<string, string | null>): Promise<void>;
  clearAssignments(): Promise<void>;

  // Match result overrides
  setOverride(matchId: string, input: OverrideInput): Promise<void>;
  clearOverride(matchId: string): Promise<void>;

  // Settings
  setSettings(patch: Partial<Settings>): Promise<void>;

  /** Restore the original seed snapshot (admin "reset" / first-run). */
  reset(): Promise<void>;
}
