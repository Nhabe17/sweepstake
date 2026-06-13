import type { Settings, SweepstakeData } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { getBrowserClient } from '@/lib/supabase/client';
import { rowToMatch, rowToPlayer, rowToTeam } from '@/lib/supabase/mappers';
import {
  applySeedFixtureCorrectionsAction,
  assignManyTeamsAction,
  assignTeamAction,
  clearAssignmentsAction,
  clearOverrideAction,
  deletePlayerAction,
  resetAction,
  savePlayerAction,
  setOverrideAction,
  setSettingsAction,
} from '@/app/actions/sweepstake';
import { dataNeedsSeedFixtureCorrections } from './seedCorrections';
import type { OverrideInput, SweepstakeStore } from './store';

// Notify same-tab listeners (the useSweepstake hook) to re-read after a write, mirroring
// the localStore behaviour so the UI updates regardless of backend.
function notifyChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('wc-sweepstake-change'));
}

async function fetchAll(): Promise<SweepstakeData> {
  const db = getBrowserClient();
  const [players, teams, matches, settings] = await Promise.all([
    db.from('players').select('*'),
    db.from('teams').select('*'),
    db.from('matches').select('*'),
    db.from('settings').select('value').eq('key', 'app').maybeSingle(),
  ]);

  return {
    players: (players.data ?? []).map(rowToPlayer),
    teams: (teams.data ?? []).map(rowToTeam),
    matches: (matches.data ?? []).map(rowToMatch),
    settings: { ...DEFAULT_SETTINGS, ...((settings.data?.value as Settings) ?? {}) },
  };
}

async function readAll(): Promise<SweepstakeData> {
  const data = await fetchAll();
  if (!dataNeedsSeedFixtureCorrections(data)) return data;
  await applySeedFixtureCorrectionsAction();
  return fetchAll();
}

export const supabaseStore: SweepstakeStore = {
  getAll: readAll,

  async savePlayer(player) {
    await savePlayerAction(player);
    notifyChange();
  },
  async deletePlayer(playerId) {
    await deletePlayerAction(playerId);
    notifyChange();
  },
  async assignTeam(teamId, ownerPlayerId) {
    await assignTeamAction(teamId, ownerPlayerId);
    notifyChange();
  },
  async assignManyTeams(assignments) {
    await assignManyTeamsAction(assignments);
    notifyChange();
  },
  async clearAssignments() {
    await clearAssignmentsAction();
    notifyChange();
  },
  async setOverride(matchId: string, input: OverrideInput) {
    await setOverrideAction(matchId, input);
    notifyChange();
  },
  async clearOverride(matchId: string) {
    await clearOverrideAction(matchId);
    notifyChange();
  },
  async setSettings(patch) {
    await setSettingsAction(patch);
    notifyChange();
  },
  async reset() {
    await resetAction();
    notifyChange();
  },
};
