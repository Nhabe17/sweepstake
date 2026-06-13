import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { FootballProvider } from './provider';

// football-data.org API status → our MatchStatus
// Full status list: SCHEDULED | TIMED | IN_PLAY | PAUSED | EXTRA_TIME | PENALTY_SHOOTOUT
//                  | FINISHED | SUSPENDED | POSTPONED | CANCELLED | AWARDED
function mapStatus(s: string): 'scheduled' | 'live' | 'finished' | 'postponed' {
  switch (s) {
    case 'FINISHED':
    case 'AWARDED': return 'finished';
    case 'IN_PLAY':
    case 'PAUSED':
    case 'EXTRA_TIME':
    case 'PENALTY_SHOOTOUT': return 'live';
    case 'POSTPONED':
    case 'SUSPENDED':
    case 'CANCELLED': return 'postponed';
    default: return 'scheduled'; // SCHEDULED, TIMED
  }
}

interface FdScore { home: number | null; away: number | null }
interface FdMatch {
  id: number;
  utcDate: string;          // ISO kickoff time — use to keep our DB dates accurate
  status: string;
  homeTeam: { tla: string | null };
  awayTeam: { tla: string | null };
  score: {
    duration: string;       // REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT
    fullTime: FdScore;      // reg + ET + PK goals combined (do NOT use for PK matches)
    regularTime: FdScore | null; // 90-min score (present when duration is ET or PK)
    extraTime: FdScore | null;   // goals scored only in ET period (present when duration is ET or PK)
    penalties: FdScore | null;   // shootout result (present when duration is PENALTY_SHOOTOUT)
  };
}

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

  // X-RequestsAvailable: remaining quota before being blocked (resets per X-RequestCounter-Reset secs)
  const requestsRemaining = res.headers.has('X-RequestsAvailable')
    ? Number(res.headers.get('X-RequestsAvailable'))
    : null;

  if (res.status === 429) {
    const resetIn = res.headers.get('X-RequestCounter-Reset') ?? '?';
    throw new Error(`Rate limited — quota resets in ${resetIn}s. Try again shortly.`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`football-data.org ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { matches: FdMatch[] };
  return { matches: data.matches, requestsRemaining };
}

// Implements FootballProvider against football-data.org (free tier, WC competition).
// Only syncMatchesToDatabase is meaningful here — fixture display uses the seed data.
export function createFootballDataProvider(): FootballProvider {
  const notImpl = (): never => { throw new Error('Not implemented — use syncMatchesToDatabase'); };

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

      // Build TLA (country code) → internal team id map
      const { data: teams, error: tErr } = await db.from('teams').select('id, country_code');
      if (tErr) throw new Error(tErr.message);
      const tlaToId = new Map<string, string>();
      for (const t of teams ?? []) {
        if (t.country_code) tlaToId.set((t.country_code as string).toUpperCase(), t.id as string);
      }

      // Build "homeTeamId|awayTeamId" → { id, hasOverride } map
      const { data: rows, error: mErr } = await db
        .from('matches')
        .select('id, home_team_id, away_team_id, has_manual_override');
      if (mErr) throw new Error(mErr.message);
      const pairToMatch = new Map<string, { id: string; hasOverride: boolean }>();
      for (const r of rows ?? []) {
        if (r.home_team_id && r.away_team_id) {
          pairToMatch.set(`${r.home_team_id}|${r.away_team_id}`, {
            id: r.id as string,
            hasOverride: Boolean(r.has_manual_override),
          });
        }
      }

      let updated = 0;
      let errMsg: string | null = null;

      let requestsRemaining: number | null = null;

      try {
        const fetched = await fetchApiMatches();
        requestsRemaining = fetched.requestsRemaining;

        for (const am of fetched.matches) {
          const homeId = am.homeTeam.tla ? tlaToId.get(am.homeTeam.tla.toUpperCase()) : undefined;
          const awayId = am.awayTeam.tla ? tlaToId.get(am.awayTeam.tla.toUpperCase()) : undefined;
          if (!homeId || !awayId) continue; // unknown team (TBD knockout slot or unrecognised TLA)

          // The real WC may assign different home/away than our seed's generic round-robin.
          // Try the direct pair first; fall back to the reversed pair and swap scores if found.
          let our = pairToMatch.get(`${homeId}|${awayId}`);
          let swapGoals = false;
          if (!our) {
            our = pairToMatch.get(`${awayId}|${homeId}`);
            swapGoals = true;
          }
          if (!our || our.hasOverride) continue;

          const mappedStatus = mapStatus(am.status);
          const patch: Record<string, unknown> = {
            external_id: String(am.id),
            status: mappedStatus,
            kickoff_at: am.utcDate, // keep kickoff times in sync with the real schedule
            updated_at: now,
          };

          // score.fullTime includes penalty-shootout goals in its tally for PK matches
          // (e.g. 1-1 draw, 6-5 on pens → fullTime shows 7-6). Use regularTime + extraTime
          // for the actual goals-scored display when the match was decided on penalties.
          const { duration, fullTime, regularTime, extraTime, penalties } = am.score;
          let goalHome: number | null = null;
          let goalAway: number | null = null;

          if (duration === 'PENALTY_SHOOTOUT') {
            goalHome = (regularTime?.home ?? 0) + (extraTime?.home ?? 0);
            goalAway = (regularTime?.away ?? 0) + (extraTime?.away ?? 0);
          } else if (fullTime?.home != null) {
            goalHome = fullTime.home;
            goalAway = fullTime.away;
          }

          if (swapGoals && goalHome != null) {
            [goalHome, goalAway] = [goalAway, goalHome];
          }

          if (goalHome != null) {
            patch.home_score = goalHome;
            patch.away_score = goalAway;
            patch.api_home_score = goalHome;
            patch.api_away_score = goalAway;
          } else if (mappedStatus === 'scheduled' || mappedStatus === 'postponed') {
            // Erase any fake seed scores — this match hasn't started yet
            patch.home_score = null;
            patch.away_score = null;
            patch.api_home_score = null;
            patch.api_away_score = null;
            patch.home_pens = null;
            patch.away_pens = null;
          }

          if (penalties?.home != null && penalties.away != null) {
            let hp: number = penalties.home;
            let ap: number = penalties.away;
            if (swapGoals) [hp, ap] = [ap, hp];
            patch.home_pens = hp;
            patch.away_pens = ap;
          }

          const { error } = await db.from('matches').update(patch).eq('id', our.id);
          if (!error) updated++;
        }
      } catch (err) {
        errMsg = err instanceof Error ? err.message : String(err);
      }

      const quotaNote = requestsRemaining != null ? ` · ${requestsRemaining} requests remaining` : '';
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
