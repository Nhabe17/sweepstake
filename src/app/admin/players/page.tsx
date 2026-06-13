'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSweepstake } from '@/hooks/useSweepstake';
import { store } from '@/lib/data';
import { generateId } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';
import PlayerForm, { type PlayerDraft } from '@/components/PlayerForm';
import { LoadingState } from '@/components/states';

export default function AdminPlayersPage() {
  const view = useSweepstake();
  const { players, teams, loading } = view;
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const dupCodes = useMemo(() => {
    const counts = new Map<string, number>();
    players.forEach((p) => counts.set(p.displayCode, (counts.get(p.displayCode) ?? 0) + 1));
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([c]) => c));
  }, [players]);

  function teamCount(playerId: string) {
    return teams.filter((t) => t.ownerPlayerId === playerId).length;
  }

  async function save(draft: PlayerDraft) {
    const now = new Date().toISOString();
    await store.savePlayer({
      id: draft.id ?? generateId('p'),
      name: draft.name,
      displayCode: draft.displayCode,
      email: draft.email || null,
      isAdmin: draft.isAdmin,
      createdAt: now,
      updatedAt: now,
    });
    setEditing(null);
    setAdding(false);
  }

  async function remove(playerId: string) {
    const count = teamCount(playerId);
    const msg = count
      ? `This player owns ${count} team(s). Deleting will unassign them. Continue?`
      : 'Delete this player?';
    if (confirm(msg)) await store.deletePlayer(playerId);
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-muted">← Admin</Link>
      <PageHeader title="Players" subtitle="Add & edit players and display codes" />

      {dupCodes.size ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          ⚠ Duplicate display code(s): {[...dupCodes].join(', ')}. Codes should be unique.
        </p>
      ) : null}

      <ul className="space-y-2">
        {players.map((p) =>
          editing === p.id ? (
            <li key={p.id}>
              <PlayerForm initial={p} onSave={save} onCancel={() => setEditing(null)} />
            </li>
          ) : (
            <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-white p-3 shadow-sm">
              <div className="min-w-0">
                <p className="font-semibold text-ink">
                  {p.name}{' '}
                  <span className={dupCodes.has(p.displayCode) ? 'text-amber-600' : 'text-muted'}>
                    ({p.displayCode})
                  </span>
                  {p.isAdmin ? <span className="ml-2 rounded bg-pitch/10 px-1.5 py-0.5 text-[11px] text-pitch">admin</span> : null}
                </p>
                <p className="text-xs text-muted">{teamCount(p.id)} teams</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => setEditing(p.id)} className="min-h-9 rounded-lg bg-slate-100 px-3 text-sm font-medium">
                  Edit
                </button>
                <button onClick={() => remove(p.id)} className="min-h-9 rounded-lg bg-red-50 px-3 text-sm font-medium text-red-600">
                  Delete
                </button>
              </div>
            </li>
          ),
        )}
      </ul>

      {adding ? (
        <PlayerForm onSave={save} onCancel={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="min-h-11 w-full rounded-lg border border-dashed border-slate-300 bg-white font-medium text-brand-dark"
        >
          + Add player
        </button>
      )}
    </div>
  );
}
