// Domain model for the World Cup Sweepstake.
// IDs are stable text strings (not generated UUIDs) so seed data is deterministic and
// idempotent to re-seed. The Supabase schema uses text primary keys to match.

export type Stage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final' | 'third_place';

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed';

export interface Player {
  id: string;
  name: string;
  displayCode: string;
  email?: string | null;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  countryCode?: string | null;
  groupLetter: string;
  pot?: number | null;
  ownerPlayerId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Match {
  id: string;
  externalId?: string | null;
  groupLetter?: string | null;
  stage: Stage;
  homeTeamId: string;
  awayTeamId: string;
  kickoffAt: string; // ISO timestamp
  status: MatchStatus;
  // Live / API-sourced scores.
  homeScore?: number | null;
  awayScore?: number | null;
  // Penalty-shootout result for knockout matches (a shootout win counts as a win).
  homePens?: number | null;
  awayPens?: number | null;
  apiHomeScore?: number | null;
  apiAwayScore?: number | null;
  // Manual admin override — wins over the API/live score when present.
  overrideHomeScore?: number | null;
  overrideAwayScore?: number | null;
  overrideHomePens?: number | null;
  overrideAwayPens?: number | null;
  odds?: MatchOdds | null;
  hasManualOverride: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OddsPrice {
  price: number;
  bookmaker: string;
  lastUpdate?: string | null;
}

export interface MatchOdds {
  provider: 'the-odds-api';
  eventId: string;
  market: string;
  region: string;
  format: string;
  home: OddsPrice | null;
  draw: OddsPrice | null;
  away: OddsPrice | null;
  providerLastUpdate?: string | null;
  syncedAt: string;
}

export interface Settings {
  tournamentName: string;
  teamsLocked: boolean;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  showOdds: boolean;
  bonusesEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  tournamentName: 'World Cup Sweepstake',
  teamsLocked: false,
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  showOdds: false,
  bonusesEnabled: false,
};

export interface SweepstakeData {
  players: Player[];
  teams: Team[];
  matches: Match[];
  settings: Settings;
}
