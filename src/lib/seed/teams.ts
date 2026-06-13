import type { Team } from '@/lib/types';

const TS = '2026-01-01T00:00:00.000Z';

// Real 2026 World Cup draw (FIFA final draw, 5 Dec 2025): 12 groups A–L, 4 teams each.
// `pot` is the sweepstake's own 6-pot tiering (8 teams per pot) used by the fair draw.
// `owner` is the seeded ownership: each of the 8 players holds one team from each pot.
// Tuple: [name, countryCode, group, pot, ownerPlayerId]
type Row = [string, string, string, number, string];

const ROWS: Row[] = [
  // Group A
  ['Mexico', 'MEX', 'A', 2, 'p-mum'],
  ['South Africa', 'RSA', 'A', 6, 'p-yiannis'],
  ['Korea Republic', 'KOR', 'A', 3, 'p-mum'],
  ['Czechia', 'CZE', 'A', 6, 'p-aiza'],
  // Group B
  ['Canada', 'CAN', 'B', 3, 'p-nan'],
  ['Switzerland', 'SUI', 'B', 2, 'p-nan'],
  ['Qatar', 'QAT', 'B', 5, 'p-aiza'],
  ['Bosnia and Herzegovina', 'BIH', 'B', 6, 'p-dad'],
  // Group C
  ['Brazil', 'BRA', 'C', 1, 'p-sarah'],
  ['Morocco', 'MAR', 'C', 2, 'p-dad'],
  ['Haiti', 'HAI', 'C', 6, 'p-mum'],
  ['Scotland', 'SCO', 'C', 5, 'p-yiannis'],
  // Group D
  ['United States', 'USA', 'D', 2, 'p-sarah'],
  ['Paraguay', 'PAR', 'D', 4, 'p-alex'],
  ['Australia', 'AUS', 'D', 3, 'p-tom'],
  ['Türkiye', 'TUR', 'D', 4, 'p-mum'],
  // Group E
  ['Germany', 'GER', 'E', 1, 'p-nan'],
  ['Curaçao', 'CUW', 'E', 6, 'p-sarah'],
  ["Côte d'Ivoire", 'CIV', 'E', 4, 'p-dad'],
  ['Ecuador', 'ECU', 'E', 3, 'p-sarah'],
  // Group F
  ['Netherlands', 'NED', 'F', 1, 'p-tom'],
  ['Japan', 'JPN', 'F', 3, 'p-yiannis'],
  ['Tunisia', 'TUN', 'F', 4, 'p-tom'],
  ['Sweden', 'SWE', 'F', 4, 'p-sarah'],
  // Group G
  ['Belgium', 'BEL', 'G', 2, 'p-yiannis'],
  ['Egypt', 'EGY', 'G', 4, 'p-aiza'],
  ['Iran', 'IRN', 'G', 3, 'p-dad'],
  ['New Zealand', 'NZL', 'G', 6, 'p-alex'],
  // Group H
  ['Spain', 'ESP', 'H', 1, 'p-dad'],
  ['Cabo Verde', 'CPV', 'H', 5, 'p-sarah'],
  ['Saudi Arabia', 'KSA', 'H', 5, 'p-dad'],
  ['Uruguay', 'URU', 'H', 2, 'p-tom'],
  // Group I
  ['France', 'FRA', 'I', 1, 'p-aiza'],
  ['Senegal', 'SEN', 'I', 3, 'p-aiza'],
  ['Norway', 'NOR', 'I', 4, 'p-yiannis'],
  ['Iraq', 'IRQ', 'I', 5, 'p-nan'],
  // Group J
  ['Argentina', 'ARG', 'J', 1, 'p-yiannis'],
  ['Algeria', 'ALG', 'J', 4, 'p-nan'],
  ['Austria', 'AUT', 'J', 3, 'p-alex'],
  ['Jordan', 'JOR', 'J', 6, 'p-tom'],
  // Group K
  ['Portugal', 'POR', 'K', 1, 'p-alex'],
  ['Uzbekistan', 'UZB', 'K', 5, 'p-mum'],
  ['Colombia', 'COL', 'K', 2, 'p-alex'],
  ['Congo DR', 'COD', 'K', 6, 'p-nan'],
  // Group L
  ['England', 'ENG', 'L', 1, 'p-mum'],
  ['Croatia', 'CRO', 'L', 2, 'p-aiza'],
  ['Ghana', 'GHA', 'L', 5, 'p-tom'],
  ['Panama', 'PAN', 'L', 5, 'p-alex'],
];

export const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

export const SEED_TEAMS: Team[] = ROWS.map(([name, countryCode, groupLetter, pot, ownerPlayerId]) => ({
  id: `t-${countryCode.toLowerCase()}`,
  name,
  countryCode,
  groupLetter,
  pot,
  ownerPlayerId,
  createdAt: TS,
  updatedAt: TS,
}));
