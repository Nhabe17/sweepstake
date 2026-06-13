import type { Match } from '@/lib/types';
import { SEEDED_FIXTURE_CORRECTIONS } from '@/lib/data/seedCorrections';
import { GROUP_LETTERS, SEED_TEAMS } from './teams';

const TS = '2026-01-01T00:00:00.000Z';

// The reference "now" the seed is built around. The 2026 group stage runs ~11–27 June;
// matches kicking off before this are seeded as finished results, the rest as upcoming.
export const SEED_NOW = new Date('2026-06-13T20:00:00.000Z');

// Deterministic PRNG so the seed (and the demo it produces) is stable across runs.
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Round-robin pairings for a group of 4 (indices into the group's team list).
const PAIRINGS: Array<{ md: number; home: number; away: number }> = [
  { md: 1, home: 0, away: 1 },
  { md: 1, home: 2, away: 3 },
  { md: 2, home: 0, away: 2 },
  { md: 2, home: 3, away: 1 },
  { md: 3, home: 3, away: 0 },
  { md: 3, home: 1, away: 2 },
];

const MATCHDAY_BASE: Record<number, string> = {
  1: '2026-06-11',
  2: '2026-06-17',
  3: '2026-06-23',
};

function kickoff(groupIndex: number, matchday: number, slot: number): string {
  const base = new Date(`${MATCHDAY_BASE[matchday]}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + Math.floor(groupIndex / 3));
  base.setUTCHours(16 + slot * 3 + (groupIndex % 3));
  return base.toISOString();
}

function genGoals(rand: () => number, pot: number, oppPot: number): number {
  const edge = (oppPot - pot) * 0.2; // stronger (lower pot) team scores a bit more
  return Math.max(0, Math.min(5, Math.round(rand() * 2.4 + edge)));
}

function buildMatches(): Match[] {
  const matches: Match[] = [];

  GROUP_LETTERS.forEach((group, gi) => {
    const teams = SEED_TEAMS.filter((t) => t.groupLetter === group);
    PAIRINGS.forEach((p, slot) => {
      const home = teams[p.home];
      const away = teams[p.away];
      const id = `m-${group}-md${p.md}-${home.countryCode}-${away.countryCode}`;
      const ko = SEEDED_FIXTURE_CORRECTIONS[id]?.kickoffAt ?? kickoff(gi, p.md, slot % 2);
      const finished = new Date(ko) < SEED_NOW;

      const rand = mulberry32(hash(id));
      const homeScore = finished ? genGoals(rand, home.pot ?? 3, away.pot ?? 3) : null;
      const awayScore = finished ? genGoals(rand, away.pot ?? 3, home.pot ?? 3) : null;

      matches.push({
        id,
        externalId: null,
        groupLetter: group,
        stage: 'group',
        homeTeamId: home.id,
        awayTeamId: away.id,
        kickoffAt: ko,
        status: finished ? 'finished' : 'scheduled',
        homeScore,
        awayScore,
        homePens: null,
        awayPens: null,
        apiHomeScore: homeScore,
        apiAwayScore: awayScore,
        overrideHomeScore: null,
        overrideAwayScore: null,
        overrideHomePens: null,
        overrideAwayPens: null,
        hasManualOverride: false,
        createdAt: TS,
        updatedAt: TS,
      });
    });
  });

  return matches;
}

export const SEED_MATCHES: Match[] = buildMatches();
