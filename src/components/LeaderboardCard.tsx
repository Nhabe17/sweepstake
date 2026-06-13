'use client';

import { useState } from 'react';
import type { Match, Settings, Team } from '@/lib/types';
import type { LeaderboardRow } from '@/lib/calculations/sweepstakeLeaderboard';
import { STATUS_LABEL, nextMatchForTeam, teamStatusInGroup } from '@/lib/derive';

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const STATUS_CLS: Record<string, string> = {
  Qualified: 'text-emerald-600',
  Eliminated: 'text-red-500',
  Active: 'text-slate-500',
  'Not started': 'text-slate-400',
};

export default function LeaderboardCard({
  row,
  teams,
  matches,
  settings,
}: {
  row: LeaderboardRow;
  teams: Team[];
  matches: Match[];
  settings: Settings;
}) {
  const [open, setOpen] = useState(false);

  return (
    <article className="animate-slide-up overflow-hidden rounded-xl bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <span className="w-8 shrink-0 text-center text-lg font-bold tabular-nums text-muted">
          {MEDAL[row.rank] ?? `#${row.rank}`}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">
            {row.player.name} <span className="text-muted">({row.player.displayCode})</span>
          </span>
          <span className="block text-xs text-muted">
            W{row.wins} D{row.draws} L{row.losses} · GD{' '}
            {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-xl font-bold tabular-nums text-brand-dark">{row.points}</span>
          <span className="block text-[11px] text-muted">pts</span>
        </span>
        <span className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          <ul className="space-y-2">
            {row.teams
              .slice()
              .sort((a, b) => b.points - a.points)
              .map((bd) => {
                const status = teamStatusInGroup(bd.team, teams, matches, settings);
                const next = nextMatchForTeam(bd.team.id, matches);
                const nextOpp = next
                  ? teams.find(
                      (t) => t.id === (next.homeTeamId === bd.team.id ? next.awayTeamId : next.homeTeamId),
                    )
                  : null;
                return (
                  <li key={bd.team.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium text-ink">{bd.team.name}</span>
                      <span className="block text-[11px] text-muted">
                        <span className={STATUS_CLS[STATUS_LABEL[status]]}>{STATUS_LABEL[status]}</span>
                        {nextOpp ? ` · Next: vs ${nextOpp.name}` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 font-bold tabular-nums text-brand-dark">{bd.points} pts</span>
                  </li>
                );
              })}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
