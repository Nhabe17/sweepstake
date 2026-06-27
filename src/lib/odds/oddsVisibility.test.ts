import { describe, expect, it } from 'vitest';
import type { Match, MatchOdds, Settings } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { shouldShowMatchOdds } from './oddsVisibility';

const SETTINGS: Settings = { ...DEFAULT_SETTINGS, showOdds: true };

const ODDS: MatchOdds = {
  provider: 'the-odds-api',
  eventId: 'evt-1',
  market: 'h2h',
  region: 'uk',
  format: 'decimal',
  home: { price: 2.1, bookmaker: 'Book' },
  draw: null,
  away: null,
  providerLastUpdate: null,
  syncedAt: '2026-06-01T00:00:00.000Z',
};

function match(p: Partial<Match>): Match {
  return {
    id: 'm1',
    externalId: null,
    groupLetter: null,
    stage: 'r32',
    bracketSlot: 1,
    homeTeamId: 't-home',
    awayTeamId: 't-away',
    kickoffAt: '2026-06-29T02:00:00.000Z',
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
    odds: ODDS,
    hasManualOverride: false,
    createdAt: '',
    updatedAt: '',
    ...p,
  };
}

describe('shouldShowMatchOdds', () => {
  it('shows odds for scheduled knockout matches with available odds', () => {
    expect(shouldShowMatchOdds(match({}), SETTINGS)).toBe(true);
  });

  it('hides odds when the setting is disabled', () => {
    expect(shouldShowMatchOdds(match({}), { ...SETTINGS, showOdds: false })).toBe(false);
  });

  it('hides odds for live and finished matches', () => {
    expect(shouldShowMatchOdds(match({ status: 'live' }), SETTINGS)).toBe(false);
    expect(shouldShowMatchOdds(match({ status: 'finished' }), SETTINGS)).toBe(false);
  });

  it('hides odds when there is no usable outcome price', () => {
    expect(
      shouldShowMatchOdds(
        match({ odds: { ...ODDS, home: null, draw: null, away: null } }),
        SETTINGS,
      ),
    ).toBe(false);
  });
});
