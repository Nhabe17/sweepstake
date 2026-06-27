'use client';

import { useMemo } from 'react';
import KnockoutBracket from '@/components/KnockoutBracket';
import PageHeader from '@/components/PageHeader';
import { LoadingState } from '@/components/states';
import { useSweepstake } from '@/hooks/useSweepstake';
import { buildProjectedKnockoutBracket } from '@/lib/knockout/bracket';

export default function KnockoutPage() {
  const view = useSweepstake();
  const { matches, settings, teams, loading } = view;

  const bracket = useMemo(
    () => buildProjectedKnockoutBracket(matches, teams, settings),
    [matches, settings, teams],
  );

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <PageHeader title="Knockout" />
      <KnockoutBracket
        bracket={bracket}
        ownerOf={view.ownerOf}
        teamById={view.teamById}
      />
    </div>
  );
}
