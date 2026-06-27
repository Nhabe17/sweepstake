'use client';

import { useMemo, useState } from 'react';
import { useSweepstake } from '@/hooks/useSweepstake';
import { useSelectedPlayer } from '@/hooks/useSelectedPlayer';
import { GROUP_LETTERS } from '@/lib/seed/teams';
import { filterMatches, type MatchFilter } from '@/lib/matches/filterMatches';
import PageHeader from '@/components/PageHeader';
import MatchCardResolved from '@/components/MatchCardResolved';
import { LoadingState, EmptyState } from '@/components/states';

const FILTERS: { key: MatchFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'mine', label: 'My teams' },
];

export default function MatchesPage() {
  const view = useSweepstake();
  const { teams, matches, players, settings, loading } = view;
  const [filter, setFilter] = useState<MatchFilter>('all');
  const [group, setGroup] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useSelectedPlayer();

  const myTeamIds = useMemo(
    () => new Set(teams.filter((t) => t.ownerPlayerId === selectedPlayer).map((t) => t.id)),
    [teams, selectedPlayer],
  );

  const filtered = useMemo(
    () => filterMatches(matches, { filter, group, myTeamIds }),
    [matches, filter, group, myTeamIds],
  );

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <PageHeader title="Matches" subtitle="Fixtures, live & results" />

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`min-h-9 shrink-0 rounded-full px-3 text-sm font-medium transition-colors ${
                filter === f.key ? 'bg-brand text-white' : 'bg-white text-muted hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-muted" htmlFor="group-filter">
          Group
        </label>
        <select
          id="group-filter"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="min-h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
        >
          <option value="">All</option>
          {GROUP_LETTERS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      {filter === 'mine' && !selectedPlayer ? (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm text-muted">Pick your player to filter to your teams:</p>
          <select
            value=""
            onChange={(e) => setSelectedPlayer(e.target.value || null)}
            className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm"
          >
            <option value="">Select player…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.displayCode})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {filtered.length ? (
        <div className="space-y-3">
          {filtered.map((m) => (
            <MatchCardResolved key={m.id} match={m} teamById={view.teamById} ownerOf={view.ownerOf} settings={settings} />
          ))}
        </div>
      ) : (
        <EmptyState title="No matches match this filter" />
      )}
    </div>
  );
}
