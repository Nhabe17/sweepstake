'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSweepstake } from '@/hooks/useSweepstake';
import { store } from '@/lib/data';
import { GROUP_LETTERS } from '@/lib/seed/teams';
import { canFairDraw, fairDraw, shuffle, simpleDraw, type Assignment } from '@/lib/draw';
import PageHeader from '@/components/PageHeader';
import AdminTeamAssignmentCard from '@/components/AdminTeamAssignmentCard';
import { LoadingState } from '@/components/states';

const LOCK_WARNING =
  'Team assignments are locked. Changing them may affect the sweepstake leaderboard. Continue?';

export default function AdminAssignPage() {
  const view = useSweepstake();
  const { players, teams, settings, loading } = view;
  const [group, setGroup] = useState('');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [search, setSearch] = useState('');

  const locked = settings.teamsLocked;
  const assignedCount = teams.filter((t) => t.ownerPlayerId).length;

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    players.forEach((p) => m.set(p.id, 0));
    teams.forEach((t) => {
      if (t.ownerPlayerId) m.set(t.ownerPlayerId, (m.get(t.ownerPlayerId) ?? 0) + 1);
    });
    return m;
  }, [players, teams]);

  const filtered = useMemo(
    () =>
      teams
        .filter((t) => (group ? t.groupLetter === group : true))
        .filter((t) => (unassignedOnly ? !t.ownerPlayerId : true))
        .filter((t) => (search ? t.name.toLowerCase().includes(search.toLowerCase()) : true))
        .sort((a, b) => a.groupLetter.localeCompare(b.groupLetter) || a.name.localeCompare(b.name)),
    [teams, group, unassignedOnly, search],
  );

  /** Block mutations while locked unless the admin confirms the warning. */
  function guard(): boolean {
    if (!locked) return true;
    return confirm(LOCK_WARNING);
  }

  async function changeOwner(teamId: string, playerId: string | null) {
    if (!guard()) {
      view.refresh(); // revert the select to stored value
      return;
    }
    await store.assignTeam(teamId, playerId);
  }

  async function applyAssignment(a: Assignment) {
    if (!guard()) return;
    await store.assignManyTeams(a);
  }

  async function assignUnassigned() {
    if (!guard()) return;
    const remaining = shuffle(teams.filter((t) => !t.ownerPlayerId));
    const live = new Map(counts);
    const a: Assignment = {};
    for (const team of remaining) {
      // Give to whichever player currently has the fewest teams.
      const target = players.slice().sort((x, y) => (live.get(x.id) ?? 0) - (live.get(y.id) ?? 0))[0];
      if (!target) break;
      a[team.id] = target.id;
      live.set(target.id, (live.get(target.id) ?? 0) + 1);
    }
    await store.assignManyTeams(a);
  }

  async function clearAll() {
    if (!guard()) return;
    if (confirm('Clear all team assignments?')) await store.clearAssignments();
  }

  async function toggleLock() {
    if (locked) {
      if (confirm('Unlock team assignments?')) await store.setSettings({ teamsLocked: false });
    } else {
      await store.setSettings({ teamsLocked: true });
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-muted">← Admin</Link>
      <PageHeader title="Team assignments" subtitle={`${assignedCount}/${teams.length} teams assigned`} />

      {locked ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">🔒 Assignments are locked.</p>
      ) : null}

      {/* Random draw controls */}
      <section className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Random draw</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => applyAssignment(fairDraw(teams, players))}
            disabled={!canFairDraw(teams, players)}
            className="min-h-11 rounded-lg bg-brand font-semibold text-white disabled:opacity-40"
            title={canFairDraw(teams, players) ? '' : 'Needs 8 players (one per pot of 8)'}
          >
            Fair draw (pots)
          </button>
          <button
            onClick={() => applyAssignment(simpleDraw(teams, players))}
            className="min-h-11 rounded-lg bg-brand font-semibold text-white"
          >
            Simple shuffle
          </button>
          <button onClick={assignUnassigned} className="min-h-11 rounded-lg bg-slate-100 font-medium text-ink">
            Fill unassigned
          </button>
          <button onClick={clearAll} className="min-h-11 rounded-lg bg-red-50 font-medium text-red-600">
            Clear all
          </button>
        </div>
        <button
          onClick={toggleLock}
          className={`min-h-11 w-full rounded-lg font-semibold ${
            locked ? 'bg-amber-100 text-amber-800' : 'bg-pitch text-white'
          }`}
        >
          {locked ? '🔓 Unlock assignments' : '🔒 Lock assignments'}
        </button>
      </section>

      {/* Per-player tally with warnings */}
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-ink">Per player</h2>
        <ul className="grid grid-cols-2 gap-1 text-sm">
          {players.map((p) => {
            const n = counts.get(p.id) ?? 0;
            return (
              <li key={p.id} className={n === 6 ? 'text-ink' : 'text-amber-600'}>
                {p.displayCode}: {n}/6 {n !== 6 ? '⚠' : '✓'}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search team…"
          className="min-h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm"
        />
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="min-h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm"
        >
          <option value="">All groups</option>
          {GROUP_LETTERS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-sm text-muted">
          <input type="checkbox" checked={unassignedOnly} onChange={(e) => setUnassignedOnly(e.target.checked)} />
          Unassigned
        </label>
      </div>

      <ul className="space-y-2">
        {filtered.map((t) => (
          <AdminTeamAssignmentCard key={t.id} team={t} players={players} onChange={(pid) => changeOwner(t.id, pid)} />
        ))}
      </ul>
    </div>
  );
}
