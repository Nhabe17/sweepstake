import type { Match, Player, Settings, SweepstakeData } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { buildSeedData } from '@/lib/seed';
import { applySeedFixtureCorrections } from './seedCorrections';
import type { OverrideInput, SweepstakeStore } from './store';

const KEY = 'wc_sweepstake_v1';

function isClient(): boolean {
  return typeof window !== 'undefined';
}

function read(): SweepstakeData {
  if (!isClient()) return buildSeedData();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const seeded = buildSeedData();
      localStorage.setItem(KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as Partial<SweepstakeData>;
    const data = {
      players: parsed.players ?? [],
      teams: parsed.teams ?? [],
      matches: parsed.matches ?? [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
    const corrected = applySeedFixtureCorrections(data);
    if (corrected.changed) localStorage.setItem(KEY, JSON.stringify(corrected.data));
    return corrected.data;
  } catch {
    return buildSeedData();
  }
}

function write(data: SweepstakeData): void {
  if (!isClient()) return;
  localStorage.setItem(KEY, JSON.stringify(data));
  // Let same-tab listeners (hooks) know the data changed; the native `storage`
  // event only fires in other tabs.
  window.dispatchEvent(new Event('wc-sweepstake-change'));
}

function now(): string {
  return new Date().toISOString();
}

export const localStore: SweepstakeStore = {
  async getAll() {
    return read();
  },

  async savePlayer(player: Player) {
    const data = read();
    const idx = data.players.findIndex((p) => p.id === player.id);
    const stamped = { ...player, updatedAt: now() };
    if (idx >= 0) data.players[idx] = { ...data.players[idx], ...stamped };
    else data.players.push({ ...stamped, createdAt: now() });
    write(data);
  },

  async deletePlayer(playerId: string) {
    const data = read();
    data.players = data.players.filter((p) => p.id !== playerId);
    // Unassign any teams the deleted player owned.
    data.teams = data.teams.map((t) =>
      t.ownerPlayerId === playerId ? { ...t, ownerPlayerId: null, updatedAt: now() } : t,
    );
    write(data);
  },

  async assignTeam(teamId: string, ownerPlayerId: string | null) {
    const data = read();
    data.teams = data.teams.map((t) =>
      t.id === teamId ? { ...t, ownerPlayerId, updatedAt: now() } : t,
    );
    write(data);
  },

  async assignManyTeams(assignments: Record<string, string | null>) {
    const data = read();
    data.teams = data.teams.map((t) =>
      t.id in assignments ? { ...t, ownerPlayerId: assignments[t.id], updatedAt: now() } : t,
    );
    write(data);
  },

  async clearAssignments() {
    const data = read();
    data.teams = data.teams.map((t) => ({ ...t, ownerPlayerId: null, updatedAt: now() }));
    write(data);
  },

  async setOverride(matchId: string, input: OverrideInput) {
    const data = read();
    data.matches = data.matches.map((m): Match => {
      if (m.id !== matchId) return m;
      return {
        ...m,
        status: input.status,
        hasManualOverride: true,
        overrideHomeScore: input.homeScore,
        overrideAwayScore: input.awayScore,
        overrideHomePens: input.homePens ?? null,
        overrideAwayPens: input.awayPens ?? null,
        updatedAt: now(),
      };
    });
    write(data);
  },

  async clearOverride(matchId: string) {
    const data = read();
    data.matches = data.matches.map((m): Match => {
      if (m.id !== matchId) return m;
      return {
        ...m,
        hasManualOverride: false,
        overrideHomeScore: null,
        overrideAwayScore: null,
        overrideHomePens: null,
        overrideAwayPens: null,
        updatedAt: now(),
      };
    });
    write(data);
  },

  async setSettings(patch: Partial<Settings>) {
    const data = read();
    data.settings = { ...data.settings, ...patch };
    write(data);
  },

  async reset() {
    write(buildSeedData());
  },
};
