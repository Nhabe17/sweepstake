import { describe, expect, it } from 'vitest';
import type { Team } from '@/lib/types';
import {
  matchOddsForTeams,
  parseTheOddsApiEvents,
  type TheOddsApiEvent,
} from './theOddsApiProvider';

const TS = '2026-06-15T20:00:00.000Z';

function team(name: string, countryCode: string): Pick<Team, 'name' | 'countryCode'> {
  return { name, countryCode };
}

function event(patch: Partial<TheOddsApiEvent> = {}): TheOddsApiEvent {
  return {
    id: 'evt-1',
    commence_time: TS,
    home_team: 'Mexico',
    away_team: 'Canada',
    bookmakers: [
      {
        title: 'Book A',
        last_update: '2026-06-14T10:00:00.000Z',
        markets: [
          {
            key: 'h2h',
            outcomes: [
              { name: 'Mexico', price: 2.1 },
              { name: 'Draw', price: 3.2 },
              { name: 'Canada', price: 3.6 },
            ],
          },
        ],
      },
    ],
    ...patch,
  };
}

describe('parseTheOddsApiEvents', () => {
  it('parses h2h odds and selects the best price per outcome', () => {
    const parsed = parseTheOddsApiEvents([
      event({
        bookmakers: [
          {
            title: 'Book A',
            last_update: '2026-06-14T10:00:00.000Z',
            markets: [
              {
                key: 'h2h',
                outcomes: [
                  { name: 'Mexico', price: 2.1 },
                  { name: 'Draw', price: 3.2 },
                  { name: 'Canada', price: 3.6 },
                ],
              },
            ],
          },
          {
            title: 'Book B',
            last_update: '2026-06-14T11:00:00.000Z',
            markets: [
              {
                key: 'h2h',
                outcomes: [
                  { name: 'Mexico', price: 2.2 },
                  { name: 'Draw', price: 3.1 },
                  { name: 'Canada', price: 3.8 },
                ],
              },
            ],
          },
        ],
      }),
    ]);

    expect(parsed[0].home).toMatchObject({ price: 2.2, bookmaker: 'Book B' });
    expect(parsed[0].draw).toMatchObject({ price: 3.2, bookmaker: 'Book A' });
    expect(parsed[0].away).toMatchObject({ price: 3.8, bookmaker: 'Book B' });
  });

  it('handles missing draw and unrelated bookmaker markets', () => {
    const parsed = parseTheOddsApiEvents([
      event({
        bookmakers: [
          {
            title: 'Book A',
            markets: [
              {
                key: 'totals',
                outcomes: [{ name: 'Over', price: 1.9 }],
              },
            ],
          },
          {
            title: 'Book B',
            markets: [
              {
                key: 'h2h',
                outcomes: [
                  { name: 'Mexico', price: 2 },
                  { name: 'Canada', price: 4 },
                ],
              },
            ],
          },
        ],
      }),
    ]);

    expect(parsed[0].home?.price).toBe(2);
    expect(parsed[0].draw).toBeNull();
    expect(parsed[0].away?.price).toBe(4);
  });
});

describe('matchOddsForTeams', () => {
  it('matches direct teams by kickoff proximity', () => {
    const [parsed] = parseTheOddsApiEvents([event()]);
    const odds = matchOddsForTeams(
      { kickoffAt: TS, homeTeam: team('Mexico', 'MEX'), awayTeam: team('Canada', 'CAN') },
      [parsed],
      '2026-06-14T12:00:00.000Z',
    );

    expect(odds?.home?.price).toBe(2.1);
    expect(odds?.away?.price).toBe(3.6);
  });

  it('matches reversed teams and swaps home/away odds', () => {
    const [parsed] = parseTheOddsApiEvents([event()]);
    const odds = matchOddsForTeams(
      { kickoffAt: TS, homeTeam: team('Canada', 'CAN'), awayTeam: team('Mexico', 'MEX') },
      [parsed],
      '2026-06-14T12:00:00.000Z',
    );

    expect(odds?.home?.price).toBe(3.6);
    expect(odds?.away?.price).toBe(2.1);
  });

  it('does not match outside the kickoff tolerance', () => {
    const [parsed] = parseTheOddsApiEvents([event()]);
    const odds = matchOddsForTeams(
      { kickoffAt: '2026-06-20T20:00:00.000Z', homeTeam: team('Mexico', 'MEX'), awayTeam: team('Canada', 'CAN') },
      [parsed],
      '2026-06-14T12:00:00.000Z',
    );

    expect(odds).toBeNull();
  });

  it('matches likely provider aliases', () => {
    const [parsed] = parseTheOddsApiEvents([
      event({
        id: 'evt-usa-kor',
        home_team: 'USA',
        away_team: 'South Korea',
        bookmakers: [
          {
            title: 'Book A',
            markets: [
              {
                key: 'h2h',
                outcomes: [
                  { name: 'USA', price: 1.7 },
                  { name: 'Draw', price: 3.4 },
                  { name: 'South Korea', price: 5.1 },
                ],
              },
            ],
          },
        ],
      }),
    ]);

    const odds = matchOddsForTeams(
      { kickoffAt: TS, homeTeam: team('United States', 'USA'), awayTeam: team('Korea Republic', 'KOR') },
      [parsed],
      '2026-06-14T12:00:00.000Z',
    );

    expect(odds?.home?.price).toBe(1.7);
    expect(odds?.away?.price).toBe(5.1);
  });

  it('matches Ivory Coast, DR Congo, and Cape Verde aliases', () => {
    const parsed = parseTheOddsApiEvents([
      event({
        id: 'evt-civ-cod',
        home_team: 'Ivory Coast',
        away_team: 'DR Congo',
        bookmakers: [
          {
            title: 'Book A',
            markets: [
              {
                key: 'h2h',
                outcomes: [
                  { name: 'Ivory Coast', price: 2.4 },
                  { name: 'Draw', price: 3 },
                  { name: 'DR Congo', price: 3.2 },
                ],
              },
            ],
          },
        ],
      }),
      event({
        id: 'evt-cpv-cze',
        home_team: 'Cape Verde',
        away_team: 'Czech Republic',
        bookmakers: [
          {
            title: 'Book A',
            markets: [
              {
                key: 'h2h',
                outcomes: [
                  { name: 'Cape Verde', price: 4.5 },
                  { name: 'Draw', price: 3.1 },
                  { name: 'Czech Republic', price: 1.9 },
                ],
              },
            ],
          },
        ],
      }),
    ]);

    const civCod = matchOddsForTeams(
      { kickoffAt: TS, homeTeam: team("Côte d'Ivoire", 'CIV'), awayTeam: team('Congo DR', 'COD') },
      parsed,
      '2026-06-14T12:00:00.000Z',
    );
    const cpvCze = matchOddsForTeams(
      { kickoffAt: TS, homeTeam: team('Cabo Verde', 'CPV'), awayTeam: team('Czechia', 'CZE') },
      parsed,
      '2026-06-14T12:00:00.000Z',
    );

    expect(civCod?.home?.price).toBe(2.4);
    expect(cpvCze?.eventId).toBe('evt-cpv-cze');
  });
});
