import { describe, expect, it } from 'vitest';
import type { Match, SweepstakeData } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { applySeedFixtureCorrections, needsSeedFixtureCorrection } from './seedCorrections';

function match(patch: Partial<Match> = {}): Match {
  return {
    id: 'm-H-md1-KSA-URU',
    externalId: null,
    groupLetter: 'H',
    stage: 'group',
    homeTeamId: 't-ksa',
    awayTeamId: 't-uru',
    kickoffAt: '2026-06-13T20:00:00.000Z',
    status: 'live',
    homeScore: 1,
    awayScore: 0,
    homePens: null,
    awayPens: null,
    apiHomeScore: 1,
    apiAwayScore: 0,
    overrideHomeScore: null,
    overrideAwayScore: null,
    overrideHomePens: null,
    overrideAwayPens: null,
    hasManualOverride: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch,
  };
}

function data(matches: Match[]): SweepstakeData {
  return { players: [], teams: [], matches, settings: DEFAULT_SETTINGS };
}

describe('seed fixture corrections', () => {
  it('corrects the legacy fake-live Saudi Arabia v Uruguay seed row', () => {
    const result = applySeedFixtureCorrections(data([match()]), '2026-06-13T00:00:00.000Z');
    expect(result.changed).toBe(true);
    expect(result.data.matches[0]).toMatchObject({
      kickoffAt: '2026-06-15T22:00:00.000Z',
      status: 'scheduled',
      homeScore: null,
      awayScore: null,
      apiHomeScore: null,
      apiAwayScore: null,
      updatedAt: '2026-06-13T00:00:00.000Z',
    });
  });

  it('clears legacy fake-live state on any seeded fixture', () => {
    const result = applySeedFixtureCorrections(
      data([match({ id: 'm-B-md2-CAN-QAT' })]),
      '2026-06-13T00:00:00.000Z',
    );
    expect(result.changed).toBe(true);
    expect(result.data.matches[0]).toMatchObject({
      kickoffAt: '2026-06-13T20:00:00.000Z',
      status: 'scheduled',
      homeScore: null,
      awayScore: null,
      apiHomeScore: null,
      apiAwayScore: null,
    });
  });

  it('does not touch manual overrides', () => {
    expect(needsSeedFixtureCorrection(match({ hasManualOverride: true }))).toBe(false);
  });

  it('does not touch API-linked rows', () => {
    expect(needsSeedFixtureCorrection(match({ externalId: '13' }))).toBe(false);
  });
});
