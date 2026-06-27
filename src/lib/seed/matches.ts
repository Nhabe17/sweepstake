import type { Match } from '@/lib/types';
import { SEEDED_FIXTURE_CORRECTIONS } from '@/lib/data/seedCorrections';
import { GROUP_LETTERS, SEED_TEAMS } from './teams';

const TS = '2026-01-01T00:00:00.000Z';

// Real round-robin pairings for a group of 4 (indices into the group's team list).
const PAIRINGS: Array<{ md: number; home: number; away: number }> = [
  { md: 1, home: 0, away: 1 },
  { md: 1, home: 2, away: 3 },
  { md: 2, home: 0, away: 2 },
  { md: 2, home: 3, away: 1 },
  { md: 3, home: 3, away: 0 },
  { md: 3, home: 1, away: 2 },
];

// Real 2026 group-stage matchday windows (matches 1–72 run 11–27 June). Exact kickoff times
// are placeholders within the correct window; the football-data.org sync overwrites kickoff_at
// (and matches a fixture to its row by the unique team pair, not by time) once it runs.
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

// Seed fixtures are "real-pending": real teams and matchups, but no results — every match is
// scheduled with empty scores. Results (and exact kickoff times) come only from the live
// football-data.org sync, so the demo never shows fabricated standings, points, or bracket teams.
function buildMatches(): Match[] {
  const matches: Match[] = [];

  GROUP_LETTERS.forEach((group, gi) => {
    const teams = SEED_TEAMS.filter((t) => t.groupLetter === group);
    PAIRINGS.forEach((p, slot) => {
      const home = teams[p.home];
      const away = teams[p.away];
      const id = `m-${group}-md${p.md}-${home.countryCode}-${away.countryCode}`;
      const ko = SEEDED_FIXTURE_CORRECTIONS[id]?.kickoffAt ?? kickoff(gi, p.md, slot % 2);

      matches.push({
        id,
        externalId: null,
        groupLetter: group,
        stage: 'group',
        homeTeamId: home.id,
        awayTeamId: away.id,
        kickoffAt: ko,
        status: 'scheduled',
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
        createdAt: TS,
        updatedAt: TS,
      });
    });
  });

  return matches;
}

export const SEED_MATCHES: Match[] = buildMatches();
