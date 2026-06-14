import 'server-only';
import type { Settings, Team } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { getServiceClient } from '@/lib/supabase/server';
import {
  DEFAULT_ODDS_FORMAT,
  DEFAULT_ODDS_MARKET,
  DEFAULT_ODDS_REGION,
  DEFAULT_ODDS_SPORT_KEY,
  fetchTheOddsApiEvents,
  matchOddsForTeams,
} from './theOddsApiProvider';

const PROVIDER = 'the-odds-api';
const SYNC_TYPE = 'odds';
const MIN_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

export interface OddsSyncResult {
  ok: boolean;
  updated: number;
  skipped: boolean;
  message: string;
  requestsRemaining: number | null;
}

export async function syncOddsToDatabase({ force = false }: { force?: boolean } = {}): Promise<OddsSyncResult> {
  const db = getServiceClient();
  const now = new Date().toISOString();

  try {
    const settings = await readSettings();
    if (!settings.showOdds) return skipped('Show betting odds is disabled');

    const apiKey = process.env.ODDS_API_KEY;
    if (!apiKey) return skipped('ODDS_API_KEY is not set');

    if (!force) {
      const lastSyncAt = await getLastSuccessfulOddsSyncAt();
      if (lastSyncAt && Date.now() - +new Date(lastSyncAt) < MIN_SYNC_INTERVAL_MS) {
        return skipped(`Odds synced recently at ${lastSyncAt}`);
      }
    }

    const sportKey = process.env.ODDS_SPORT_KEY || DEFAULT_ODDS_SPORT_KEY;
    const region = process.env.ODDS_REGION || DEFAULT_ODDS_REGION;
    const market = process.env.ODDS_MARKET || DEFAULT_ODDS_MARKET;
    const format = process.env.ODDS_FORMAT || DEFAULT_ODDS_FORMAT;

    const [{ data: teams, error: teamsError }, { data: matches, error: matchesError }, fetched] = await Promise.all([
      db.from('teams').select('id, name, country_code'),
      db
        .from('matches')
        .select('id, home_team_id, away_team_id, kickoff_at')
        .eq('status', 'scheduled'),
      fetchTheOddsApiEvents({ apiKey, sportKey, region, market, format }),
    ]);
    if (teamsError) throw new Error(teamsError.message);
    if (matchesError) throw new Error(matchesError.message);

    const teamById = new Map<string, Pick<Team, 'name' | 'countryCode'>>();
    for (const team of teams ?? []) {
      teamById.set(team.id as string, {
        name: team.name as string,
        countryCode: (team.country_code as string) ?? null,
      });
    }

    let updated = 0;
    for (const match of matches ?? []) {
      const homeTeam = teamById.get(match.home_team_id as string);
      const awayTeam = teamById.get(match.away_team_id as string);
      if (!homeTeam || !awayTeam) continue;

      const odds = matchOddsForTeams(
        {
          kickoffAt: match.kickoff_at as string,
          homeTeam,
          awayTeam,
        },
        fetched.events,
        now,
        { market, region, format },
      );
      if (!odds) continue;

      const { error } = await db
        .from('matches')
        .update({ odds, updated_at: now })
        .eq('id', match.id as string);
      if (error) throw new Error(error.message);
      updated++;
    }

    const quotaNote =
      fetched.requestsRemaining != null ? ` - ${fetched.requestsRemaining} odds requests remaining` : '';
    const message = `Updated odds for ${updated} match${updated === 1 ? '' : 'es'}${quotaNote}`;
    await logOddsSync('success', message, now);
    return {
      ok: true,
      updated,
      skipped: false,
      message,
      requestsRemaining: fetched.requestsRemaining,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logOddsSync('error', message, now).catch(() => {});
    return {
      ok: false,
      updated: 0,
      skipped: false,
      message,
      requestsRemaining: null,
    };
  }
}

async function readSettings(): Promise<Settings> {
  const db = getServiceClient();
  const { data, error } = await db.from('settings').select('value').eq('key', 'app').maybeSingle();
  if (error) throw new Error(error.message);
  return { ...DEFAULT_SETTINGS, ...((data?.value as Settings) ?? {}) };
}

async function getLastSuccessfulOddsSyncAt(): Promise<string | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .from('sync_logs')
    .select('created_at')
    .eq('provider', PROVIDER)
    .eq('sync_type', SYNC_TYPE)
    .eq('status', 'success')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.created_at as string) ?? null;
}

async function logOddsSync(status: 'success' | 'error', message: string, createdAt: string): Promise<void> {
  const db = getServiceClient();
  await db.from('sync_logs').insert({
    id: crypto.randomUUID(),
    provider: PROVIDER,
    sync_type: SYNC_TYPE,
    status,
    message,
    created_at: createdAt,
  });
}

function skipped(message: string): OddsSyncResult {
  return {
    ok: true,
    updated: 0,
    skipped: true,
    message,
    requestsRemaining: null,
  };
}
