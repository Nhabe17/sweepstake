import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Settings } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { rowToMatch, rowToTeam } from '@/lib/supabase/mappers';
import { buildProjectedKnockoutBracket, knockoutSlotAnchors } from '@/lib/knockout/bracket';
import type { FootballProvider } from './provider';
import {
  buildFootballDataInsertRow,
  buildFootballDataUpdatePatch,
  existingRowFromDatabaseRow,
  resolveFootballDataSyncTarget,
  teamIdsForFootballDataMatch,
  type FdMatch,
} from './footballDataSync';

interface FetchResult {
  matches: FdMatch[];
  requestsRemaining: number | null; // X-RequestsAvailable
}

async function fetchApiMatches(): Promise<FetchResult> {
  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) throw new Error('FOOTBALL_API_KEY env var is not set');
  const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
    headers: { 'X-Auth-Token': apiKey },
    cache: 'no-store',
  });

  const requestsRemaining = res.headers.has('X-RequestsAvailable')
    ? Number(res.headers.get('X-RequestsAvailable'))
    : null;

  if (res.status === 429) {
    const resetIn = res.headers.get('X-RequestCounter-Reset') ?? '?';
    throw new Error(`Rate limited - quota resets in ${resetIn}s. Try again shortly.`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`football-data.org ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { matches: FdMatch[] };
  return { matches: data.matches, requestsRemaining };
}

// Implements FootballProvider against football-data.org (free tier, WC competition).
// Fixture display still uses seed/API rows from our database; this method syncs those rows.
export function createFootballDataProvider(): FootballProvider {
  const notImpl = (): never => {
    throw new Error('Not implemented - use syncMatchesToDatabase');
  };

  return {
    getFixtures: notImpl as unknown as FootballProvider['getFixtures'],
    getMatchesByDate: notImpl as unknown as FootballProvider['getMatchesByDate'],
    getMatchResults: notImpl as unknown as FootballProvider['getMatchResults'],

    async syncMatchesToDatabase() {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceKey) throw new Error('Supabase env vars not configured');

      const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const now = new Date().toISOString();

      const { data: teamRows, error: tErr } = await db.from('teams').select('*');
      if (tErr) throw new Error(tErr.message);
      const teams = (teamRows ?? []).map(rowToTeam);
      const tlaToId = new Map<string, string>();
      for (const team of teams) {
        if (team.countryCode) tlaToId.set(team.countryCode.toUpperCase(), team.id);
      }

      const { data: rows, error: mErr } = await db.from('matches').select('*');
      if (mErr) throw new Error(mErr.message);
      const existingMatches = (rows ?? []).map((row) => existingRowFromDatabaseRow(row));
      const matches = (rows ?? []).map(rowToMatch);

      const { data: settingsRow } = await db
        .from('settings')
        .select('value')
        .eq('key', 'app')
        .maybeSingle();
      const settings: Settings = { ...DEFAULT_SETTINGS, ...((settingsRow?.value as Settings) ?? {}) };

      // Known bracket slots (group qualifiers + winner progression from stored knockout rows)
      // let us place an incoming knockout fixture by its two teams. Built once per run, so a
      // round only becomes placeable after its feeder results land — a later sync picks it up.
      const knockoutSlots = knockoutSlotAnchors(buildProjectedKnockoutBracket(matches, teams, settings));

      let updated = 0;
      let errMsg: string | null = null;
      let requestsRemaining: number | null = null;

      try {
        const fetched = await fetchApiMatches();
        requestsRemaining = fetched.requestsRemaining;

        for (const apiMatch of fetched.matches) {
          const teamIds = teamIdsForFootballDataMatch(apiMatch, tlaToId);
          if (!teamIds) continue; // Unknown team/TBD slot from the provider.

          const target = resolveFootballDataSyncTarget(apiMatch, existingMatches, teamIds, knockoutSlots);
          if (!target) continue;

          if (target.action === 'insert') {
            const row = buildFootballDataInsertRow(apiMatch, target, teamIds, now);
            const { error } = await db.from('matches').insert(row);
            if (error) throw new Error(error.message);
            existingMatches.push(existingRowFromDatabaseRow(row));
            updated++;
          } else {
            const patch = buildFootballDataUpdatePatch(apiMatch, target, teamIds, now);
            const { error } = await db.from('matches').update(patch).eq('id', target.id);
            if (error) throw new Error(error.message);
            updated++;
          }
        }
      } catch (err) {
        errMsg = err instanceof Error ? err.message : String(err);
      }

      const quotaNote = requestsRemaining != null ? ` - ${requestsRemaining} requests remaining` : '';
      const logMessage = errMsg ?? `Updated ${updated} match${updated === 1 ? '' : 'es'}${quotaNote}`;

      await db.from('sync_logs').insert({
        id: crypto.randomUUID(),
        provider: 'football-data.org',
        sync_type: 'scores',
        status: errMsg ? 'error' : 'success',
        message: logMessage,
        created_at: now,
      });

      if (errMsg) throw new Error(errMsg);
      return { updated };
    },
  };
}

