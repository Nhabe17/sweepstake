'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSweepstake } from '@/hooks/useSweepstake';
import { computeLeaderboard } from '@/lib/calculations/sweepstakeLeaderboard';
import { teamPointsInMatch } from '@/lib/calculations/effectiveResult';
import { isToday } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import MatchCardResolved from '@/components/MatchCardResolved';
import Confetti from '@/components/Confetti';
import { LoadingState, EmptyState } from '@/components/states';

export default function HomePage() {
  const view = useSweepstake();
  const { players, teams, matches, settings, loading } = view;

  const leaderboard = useMemo(
    () => computeLeaderboard(players, teams, matches, settings),
    [players, teams, matches, settings],
  );

  const today = useMemo(() => matches.filter((m) => isToday(m.kickoffAt)), [matches]);
  const upcoming = useMemo(
    () =>
      matches
        .filter((m) => m.status === 'scheduled' && !isToday(m.kickoffAt))
        .sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt))
        .slice(0, 3),
    [matches],
  );
  const latest = useMemo(
    () =>
      matches
        .filter((m) => m.status === 'finished')
        .sort((a, b) => +new Date(b.kickoffAt) - +new Date(a.kickoffAt))
        .slice(0, 3),
    [matches],
  );

  if (loading) return <LoadingState />;

  const leader = leaderboard[0];

  return (
    <div className="space-y-6">
      <PageHeader title={settings.tournamentName} subtitle="Family & friends — who's winning?" />

      {leader ? (
        <section className="relative rounded-xl bg-gradient-to-br from-pitch to-pitch-dark p-5 text-white shadow-sm">
          <Confetti />
          <p className="text-xs uppercase tracking-wide text-white/70">Current leader</p>
          <p className="mt-1 text-2xl font-bold">
            🥇 {leader.player.name} <span className="text-white/70">({leader.player.displayCode})</span>
          </p>
          <p className="text-white/80">{leader.points} pts</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {leaderboard.slice(0, 3).map((r) => (
              <span key={r.player.id} className="rounded-full bg-white/15 px-3 py-1 text-sm">
                #{r.rank} {r.player.displayCode} · {r.points}
              </span>
            ))}
          </div>
          <Link href="/leaderboard" className="mt-4 inline-block text-sm font-medium text-white underline">
            Full leaderboard →
          </Link>
        </section>
      ) : null}

      <Section title="Today's matches">
        {today.length ? (
          <div className="space-y-3">
            {today.map((m) => (
              <MatchCardResolved key={m.id} match={m} teamById={view.teamById} ownerOf={view.ownerOf} settings={settings} />
            ))}
          </div>
        ) : (
          <EmptyState title="No matches today" hint="Check the Matches tab for upcoming fixtures." />
        )}
      </Section>

      <Section title="Latest results">
        {latest.length ? (
          <div className="space-y-3">
            {latest.map((m) => (
              <MatchCardResolved key={m.id} match={m} teamById={view.teamById} ownerOf={view.ownerOf} settings={settings} />
            ))}
          </div>
        ) : (
          <EmptyState title="No results yet" />
        )}
      </Section>

      <Section title="Upcoming">
        {upcoming.length ? (
          <div className="space-y-3">
            {upcoming.map((m) => (
              <MatchCardResolved key={m.id} match={m} teamById={view.teamById} ownerOf={view.ownerOf} settings={settings} />
            ))}
          </div>
        ) : (
          <EmptyState title="Nothing scheduled" />
        )}
      </Section>

      <div className="pt-2 text-center">
        <Link href="/admin" className="text-xs text-slate-400 transition-colors hover:text-muted">
          ⚙ Admin
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {children}
    </section>
  );
}
