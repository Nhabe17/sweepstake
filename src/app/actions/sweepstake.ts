'use server';

import type { Player, Settings } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { getServiceClient } from '@/lib/supabase/server';
import { matchToRow, playerToRow, teamToRow } from '@/lib/supabase/mappers';
import { buildSeedData } from '@/lib/seed';
import { SEEDED_FIXTURE_CORRECTIONS } from '@/lib/data/seedCorrections';
import type { OverrideInput } from '@/lib/data/store';

const SETTINGS_KEY = 'app';

function nowIso() {
  return new Date().toISOString();
}

export async function savePlayerAction(player: Player): Promise<void> {
  const db = getServiceClient();
  const { error } = await db.from('players').upsert(playerToRow({ ...player, updatedAt: nowIso() }));
  if (error) throw new Error(error.message);
}

export async function deletePlayerAction(playerId: string): Promise<void> {
  const db = getServiceClient();
  // owner_player_id is ON DELETE SET NULL, so teams get unassigned automatically.
  const { error } = await db.from('players').delete().eq('id', playerId);
  if (error) throw new Error(error.message);
}

export async function assignTeamAction(teamId: string, ownerPlayerId: string | null): Promise<void> {
  const db = getServiceClient();
  const { error } = await db
    .from('teams')
    .update({ owner_player_id: ownerPlayerId, updated_at: nowIso() })
    .eq('id', teamId);
  if (error) throw new Error(error.message);
}

export async function assignManyTeamsAction(assignments: Record<string, string | null>): Promise<void> {
  const db = getServiceClient();
  for (const [teamId, ownerPlayerId] of Object.entries(assignments)) {
    const { error } = await db
      .from('teams')
      .update({ owner_player_id: ownerPlayerId, updated_at: nowIso() })
      .eq('id', teamId);
    if (error) throw new Error(error.message);
  }
}

export async function clearAssignmentsAction(): Promise<void> {
  const db = getServiceClient();
  const { error } = await db
    .from('teams')
    .update({ owner_player_id: null, updated_at: nowIso() })
    .not('id', 'is', null);
  if (error) throw new Error(error.message);
}

export async function setOverrideAction(matchId: string, input: OverrideInput): Promise<void> {
  const db = getServiceClient();
  const { error } = await db
    .from('matches')
    .update({
      status: input.status,
      has_manual_override: true,
      override_home_score: input.homeScore,
      override_away_score: input.awayScore,
      override_home_pens: input.homePens ?? null,
      override_away_pens: input.awayPens ?? null,
      updated_at: nowIso(),
    })
    .eq('id', matchId);
  if (error) throw new Error(error.message);
}

export async function clearOverrideAction(matchId: string): Promise<void> {
  const db = getServiceClient();
  const { error } = await db
    .from('matches')
    .update({
      has_manual_override: false,
      override_home_score: null,
      override_away_score: null,
      override_home_pens: null,
      override_away_pens: null,
      updated_at: nowIso(),
    })
    .eq('id', matchId);
  if (error) throw new Error(error.message);
}

export async function setSettingsAction(patch: Partial<Settings>): Promise<void> {
  const db = getServiceClient();
  const { data } = await db.from('settings').select('value').eq('key', SETTINGS_KEY).maybeSingle();
  const current = { ...DEFAULT_SETTINGS, ...((data?.value as Settings) ?? {}) };
  const merged = { ...current, ...patch };
  const { error } = await db
    .from('settings')
    .upsert({ id: SETTINGS_KEY, key: SETTINGS_KEY, value: merged, updated_at: nowIso() });
  if (error) throw new Error(error.message);
}

/**
 * Repair known bad seed fixture rows without touching manual overrides or rows that
 * have been linked to a real football API match.
 */
export async function applySeedFixtureCorrectionsAction(): Promise<void> {
  const db = getServiceClient();
  const updatedAt = nowIso();
  for (const [matchId, correction] of Object.entries(SEEDED_FIXTURE_CORRECTIONS)) {
    const { error } = await db
      .from('matches')
      .update({
        kickoff_at: correction.kickoffAt,
        status: correction.status,
        home_score: correction.homeScore,
        away_score: correction.awayScore,
        home_pens: correction.homePens,
        away_pens: correction.awayPens,
        api_home_score: correction.apiHomeScore,
        api_away_score: correction.apiAwayScore,
        updated_at: updatedAt,
      })
      .eq('id', matchId)
      .eq('has_manual_override', false)
      .is('external_id', null);
    if (error) throw new Error(error.message);
  }

  const { error } = await db
    .from('matches')
    .update({
      status: 'scheduled',
      home_score: null,
      away_score: null,
      home_pens: null,
      away_pens: null,
      api_home_score: null,
      api_away_score: null,
      updated_at: updatedAt,
    })
    .eq('status', 'live')
    .eq('home_score', 1)
    .eq('away_score', 0)
    .eq('api_home_score', 1)
    .eq('api_away_score', 0)
    .eq('has_manual_override', false)
    .is('external_id', null);
  if (error) throw new Error(error.message);
}

/** Wipe and re-seed all tables from the deterministic seed snapshot. */
export async function resetAction(): Promise<void> {
  const db = getServiceClient();
  const seed = buildSeedData();
  // Order matters for FKs: matches → teams → players on delete; insert in reverse.
  await db.from('matches').delete().not('id', 'is', null);
  await db.from('teams').delete().not('id', 'is', null);
  await db.from('players').delete().not('id', 'is', null);

  const p = await db.from('players').insert(seed.players.map(playerToRow));
  if (p.error) throw new Error(p.error.message);
  const t = await db.from('teams').insert(seed.teams.map(teamToRow));
  if (t.error) throw new Error(t.error.message);
  const m = await db.from('matches').insert(seed.matches.map(matchToRow));
  if (m.error) throw new Error(m.error.message);
  await db
    .from('settings')
    .upsert({ id: SETTINGS_KEY, key: SETTINGS_KEY, value: seed.settings, updated_at: nowIso() });
}
