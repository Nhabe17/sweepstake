'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSweepstake } from '@/hooks/useSweepstake';
import { store } from '@/lib/data';
import type { OverrideInput } from '@/lib/data/store';
import { getEffectiveScore } from '@/lib/calculations/effectiveResult';
import { dayTimeLabel } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import ResultOverrideForm from '@/components/ResultOverrideForm';
import TeamName from '@/components/TeamName';
import { LoadingState } from '@/components/states';

export default function AdminResultsPage() {
  const view = useSweepstake();
  const { matches, settings, loading } = view;
  const [editing, setEditing] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const term = search.toLowerCase();
    return matches
      .slice()
      .sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt))
      .filter((m) => {
        if (!term) return true;
        const h = view.teamById(m.homeTeamId)?.name.toLowerCase() ?? '';
        const a = view.teamById(m.awayTeamId)?.name.toLowerCase() ?? '';
        return h.includes(term) || a.includes(term);
      });
  }, [matches, search, view]);

  async function save(matchId: string, input: OverrideInput) {
    await store.setOverride(matchId, input);
    setEditing(null);
  }
  async function clear(matchId: string) {
    await store.clearOverride(matchId);
    setEditing(null);
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-muted">← Admin</Link>
      <PageHeader title="Result overrides" subtitle="Manually correct match results" />

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search team…"
        className="min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
      />

      <ul className="space-y-2">
        {list.map((m) => {
          const home = view.teamById(m.homeTeamId);
          const away = view.teamById(m.awayTeamId);
          const score = getEffectiveScore(m);
          if (editing === m.id) {
            return (
              <li key={m.id}>
                <ResultOverrideForm
                  match={m}
                  homeTeam={home}
                  awayTeam={away}
                  onSave={(input) => save(m.id, input)}
                  onClear={() => clear(m.id)}
                  onCancel={() => setEditing(null)}
                />
              </li>
            );
          }
          return (
            <li key={m.id} className="flex items-center justify-between gap-2 rounded-xl bg-white p-3 shadow-sm">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  <TeamName team={home} fallback="Home" /> {score ? `${score.homeScore}–${score.awayScore}` : 'vs'}{' '}
                  <TeamName team={away} fallback="Away" />
                  {m.hasManualOverride ? <span className="ml-2 text-[11px] text-amber-600">overridden</span> : null}
                </p>
                <p className="text-xs text-muted">
                  {m.groupLetter ? `Group ${m.groupLetter} · ` : ''}
                  {m.status} · {dayTimeLabel(m.kickoffAt)}
                </p>
              </div>
              <button
                onClick={() => setEditing(m.id)}
                className="min-h-9 shrink-0 rounded-lg bg-slate-100 px-3 text-sm font-medium"
              >
                Edit
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
