'use client';

import { useMemo, useState } from 'react';
import { useSweepstake } from '@/hooks/useSweepstake';
import { GROUP_LETTERS } from '@/lib/seed/teams';
import PageHeader from '@/components/PageHeader';
import GroupTable from '@/components/GroupTable';
import MatchCardResolved from '@/components/MatchCardResolved';
import { LoadingState } from '@/components/states';

export default function GroupsPage() {
  const view = useSweepstake();
  const { teams, matches, settings, loading } = view;
  const [group, setGroup] = useState<string>('A');

  const groupMatches = useMemo(
    () =>
      matches
        .filter((m) => m.stage === 'group' && m.groupLetter === group)
        .sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt)),
    [matches, group],
  );

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <PageHeader title="Groups" subtitle="Official group stage tables" />

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          {GROUP_LETTERS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroup(g)}
              className={`min-h-10 min-w-10 shrink-0 rounded-lg px-3 text-sm font-semibold transition-colors ${
                g === group ? 'bg-brand text-white' : 'bg-white text-muted hover:text-ink'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <h2 className="text-lg font-bold text-ink">Group {group}</h2>
      <GroupTable groupLetter={group} teams={teams} matches={matches} settings={settings} ownerOf={view.ownerOf} />

      <h3 className="pt-2 text-sm font-semibold uppercase tracking-wide text-muted">Fixtures &amp; results</h3>
      <div className="space-y-3">
        {groupMatches.map((m) => (
          <MatchCardResolved key={m.id} match={m} teamById={view.teamById} ownerOf={view.ownerOf} settings={settings} />
        ))}
      </div>
    </div>
  );
}
