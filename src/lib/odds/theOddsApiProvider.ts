import type { MatchOdds, OddsPrice, Team } from '@/lib/types';

export const DEFAULT_ODDS_SPORT_KEY = 'soccer_fifa_world_cup';
export const DEFAULT_ODDS_REGION = 'uk';
export const DEFAULT_ODDS_MARKET = 'h2h';
export const DEFAULT_ODDS_FORMAT = 'decimal';
export const DEFAULT_KICKOFF_TOLERANCE_MS = 36 * 60 * 60 * 1000;

interface TheOddsApiOutcome {
  name: string;
  price: number;
}

interface TheOddsApiMarket {
  key: string;
  last_update?: string;
  outcomes?: TheOddsApiOutcome[];
}

interface TheOddsApiBookmaker {
  title: string;
  last_update?: string;
  markets?: TheOddsApiMarket[];
}

export interface TheOddsApiEvent {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: TheOddsApiBookmaker[];
}

export interface ParsedOddsEvent {
  eventId: string;
  commenceTime: string;
  homeTeam: string;
  awayTeam: string;
  home: OddsPrice | null;
  draw: OddsPrice | null;
  away: OddsPrice | null;
  providerLastUpdate: string | null;
}

export interface OddsFetchResult {
  events: ParsedOddsEvent[];
  requestsRemaining: number | null;
  requestsUsed: number | null;
}

export interface OddsMatchInput {
  kickoffAt: string;
  homeTeam: Pick<Team, 'name' | 'countryCode'>;
  awayTeam: Pick<Team, 'name' | 'countryCode'>;
}

interface OddsConfig {
  market?: string;
  region?: string;
  format?: string;
}

const TEAM_ALIASES_BY_CODE: Record<string, string[]> = {
  CIV: ["Cote d'Ivoire", 'Ivory Coast'],
  COD: ['Congo DR', 'DR Congo', 'Democratic Republic of Congo'],
  CPV: ['Cabo Verde', 'Cape Verde'],
  CUW: ['Curacao', 'Curaçao'],
  CZE: ['Czechia', 'Czech Republic'],
  KOR: ['Korea Republic', 'South Korea', 'Korea'],
  NED: ['Netherlands', 'Holland'],
  RSA: ['South Africa'],
  SUI: ['Switzerland'],
  TUR: ['Türkiye', 'Turkiye', 'Turkey'],
  USA: ['United States', 'USA', 'US', 'United States of America'],
};

export function parseTheOddsApiEvents(
  events: TheOddsApiEvent[],
  market = DEFAULT_ODDS_MARKET,
): ParsedOddsEvent[] {
  return events
    .map((event) => parseTheOddsApiEvent(event, market))
    .filter((event): event is ParsedOddsEvent => Boolean(event));
}

export function matchOddsForTeams(
  match: OddsMatchInput,
  events: ParsedOddsEvent[],
  syncedAt: string,
  options: OddsConfig = {},
): MatchOdds | null {
  const toleranceMs = DEFAULT_KICKOFF_TOLERANCE_MS;
  const candidates = events
    .map((event) => {
      const orientation = eventOrientation(event, match.homeTeam, match.awayTeam);
      if (!orientation) return null;

      const kickoffDelta = Math.abs(+new Date(event.commenceTime) - +new Date(match.kickoffAt));
      if (!Number.isFinite(kickoffDelta) || kickoffDelta > toleranceMs) return null;

      return { event, orientation, kickoffDelta };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .sort((a, b) => a.kickoffDelta - b.kickoffDelta);

  const best = candidates[0];
  if (!best) return null;

  return {
    provider: 'the-odds-api',
    eventId: best.event.eventId,
    market: options.market ?? DEFAULT_ODDS_MARKET,
    region: options.region ?? DEFAULT_ODDS_REGION,
    format: options.format ?? DEFAULT_ODDS_FORMAT,
    home: best.orientation === 'direct' ? best.event.home : best.event.away,
    draw: best.event.draw,
    away: best.orientation === 'direct' ? best.event.away : best.event.home,
    providerLastUpdate: best.event.providerLastUpdate,
    syncedAt,
  };
}

export async function fetchTheOddsApiEvents({
  apiKey,
  sportKey = DEFAULT_ODDS_SPORT_KEY,
  region = DEFAULT_ODDS_REGION,
  market = DEFAULT_ODDS_MARKET,
  format = DEFAULT_ODDS_FORMAT,
}: {
  apiKey: string;
  sportKey?: string;
  region?: string;
  market?: string;
  format?: string;
}): Promise<OddsFetchResult> {
  const params = new URLSearchParams({
    apiKey,
    regions: region,
    markets: market,
    oddsFormat: format,
    dateFormat: 'iso',
  });
  const res = await fetch(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds?${params}`, {
    cache: 'no-store',
  });

  const requestsRemaining = numberHeader(res, 'x-requests-remaining');
  const requestsUsed = numberHeader(res, 'x-requests-used');

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`the-odds-api ${res.status}: ${body}`);
  }

  const data = (await res.json()) as TheOddsApiEvent[];
  return {
    events: parseTheOddsApiEvents(data, market),
    requestsRemaining,
    requestsUsed,
  };
}

function parseTheOddsApiEvent(event: TheOddsApiEvent, marketKey: string): ParsedOddsEvent | null {
  const best = {
    home: null as OddsPrice | null,
    draw: null as OddsPrice | null,
    away: null as OddsPrice | null,
  };
  const updateTimes: string[] = [];

  for (const bookmaker of event.bookmakers ?? []) {
    const market = bookmaker.markets?.find((m) => m.key === marketKey);
    if (!market) continue;
    if (bookmaker.last_update) updateTimes.push(bookmaker.last_update);
    if (market.last_update) updateTimes.push(market.last_update);

    for (const outcome of market.outcomes ?? []) {
      if (typeof outcome.price !== 'number') continue;
      const update = market.last_update ?? bookmaker.last_update ?? null;
      const candidate: OddsPrice = {
        price: outcome.price,
        bookmaker: bookmaker.title,
        lastUpdate: update,
      };

      if (sameProviderTeam(outcome.name, event.home_team)) {
        best.home = betterPrice(best.home, candidate);
      } else if (sameProviderTeam(outcome.name, event.away_team)) {
        best.away = betterPrice(best.away, candidate);
      } else if (normalizeName(outcome.name) === 'draw') {
        best.draw = betterPrice(best.draw, candidate);
      }
    }
  }

  if (!best.home && !best.draw && !best.away) return null;

  return {
    eventId: event.id,
    commenceTime: event.commence_time,
    homeTeam: event.home_team,
    awayTeam: event.away_team,
    home: best.home,
    draw: best.draw,
    away: best.away,
    providerLastUpdate: latestIso(updateTimes),
  };
}

function eventOrientation(
  event: ParsedOddsEvent,
  homeTeam: Pick<Team, 'name' | 'countryCode'>,
  awayTeam: Pick<Team, 'name' | 'countryCode'>,
): 'direct' | 'reversed' | null {
  if (providerNameMatchesTeam(event.homeTeam, homeTeam) && providerNameMatchesTeam(event.awayTeam, awayTeam)) {
    return 'direct';
  }
  if (providerNameMatchesTeam(event.homeTeam, awayTeam) && providerNameMatchesTeam(event.awayTeam, homeTeam)) {
    return 'reversed';
  }
  return null;
}

function providerNameMatchesTeam(providerName: string, team: Pick<Team, 'name' | 'countryCode'>): boolean {
  return teamNameKeys(team).has(normalizeName(providerName));
}

function teamNameKeys(team: Pick<Team, 'name' | 'countryCode'>): Set<string> {
  const keys = new Set([normalizeName(team.name)]);
  const code = team.countryCode?.toUpperCase();
  if (code) {
    keys.add(normalizeName(code));
    for (const alias of TEAM_ALIASES_BY_CODE[code] ?? []) keys.add(normalizeName(alias));
  }
  return keys;
}

function sameProviderTeam(left: string, right: string): boolean {
  return normalizeName(left) === normalizeName(right);
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function betterPrice(current: OddsPrice | null, candidate: OddsPrice): OddsPrice {
  return !current || candidate.price > current.price ? candidate : current;
}

function latestIso(values: string[]): string | null {
  let latest: string | null = null;
  for (const value of values) {
    if (!latest || +new Date(value) > +new Date(latest)) latest = value;
  }
  return latest;
}

function numberHeader(res: Response, name: string): number | null {
  const value = res.headers.get(name);
  return value == null ? null : Number(value);
}
