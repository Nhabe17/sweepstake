import { describe, expect, it } from 'vitest';
import { buildSeedData } from './index';
import { GROUP_LETTERS } from './teams';

describe('seed data integrity', () => {
  const { players, teams, matches } = buildSeedData();

  it('has 8 players with unique display codes', () => {
    expect(players).toHaveLength(8);
    expect(new Set(players.map((p) => p.displayCode)).size).toBe(8);
  });

  it('has exactly one admin', () => {
    expect(players.filter((p) => p.isAdmin)).toHaveLength(1);
  });

  it('has 48 teams across 12 groups of 4', () => {
    expect(teams).toHaveLength(48);
    expect(GROUP_LETTERS).toHaveLength(12);
    for (const g of GROUP_LETTERS) {
      expect(teams.filter((t) => t.groupLetter === g)).toHaveLength(4);
    }
  });

  it('has 6 pots of 8 teams', () => {
    for (let pot = 1; pot <= 6; pot++) {
      expect(teams.filter((t) => t.pot === pot)).toHaveLength(8);
    }
  });

  it('assigns exactly 6 teams to each player', () => {
    for (const p of players) {
      expect(teams.filter((t) => t.ownerPlayerId === p.id)).toHaveLength(6);
    }
  });

  it('gives each player one team from each pot (fair draw)', () => {
    for (const p of players) {
      const pots = teams.filter((t) => t.ownerPlayerId === p.id).map((t) => t.pot).sort();
      expect(pots).toEqual([1, 2, 3, 4, 5, 6]);
    }
  });

  it('generates 72 group matches (6 per group) with valid team references', () => {
    expect(matches).toHaveLength(72);
    const ids = new Set(teams.map((t) => t.id));
    for (const m of matches) {
      expect(ids.has(m.homeTeamId)).toBe(true);
      expect(ids.has(m.awayTeamId)).toBe(true);
    }
  });

  it('seeds every fixture as scheduled with no fabricated results (real-pending)', () => {
    expect(matches.every((m) => m.status === 'scheduled')).toBe(true);
    expect(
      matches.every(
        (m) =>
          m.homeScore === null &&
          m.awayScore === null &&
          m.homePens === null &&
          m.awayPens === null &&
          m.apiHomeScore === null &&
          m.apiAwayScore === null,
      ),
    ).toBe(true);
  });

  it('keeps all fixtures within the real group-stage window (11–27 June 2026)', () => {
    for (const m of matches) {
      const ms = +new Date(m.kickoffAt);
      expect(ms).toBeGreaterThanOrEqual(+new Date('2026-06-11T00:00:00.000Z'));
      expect(ms).toBeLessThanOrEqual(+new Date('2026-06-27T23:59:59.000Z'));
    }
  });

  it('uses the official kickoff for Saudi Arabia v Uruguay', () => {
    const match = matches.find((m) => m.id === 'm-H-md1-KSA-URU');
    expect(match).toMatchObject({
      kickoffAt: '2026-06-15T22:00:00.000Z',
      status: 'scheduled',
      homeScore: null,
      awayScore: null,
      apiHomeScore: null,
      apiAwayScore: null,
    });
  });
});
