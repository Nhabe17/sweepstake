'use client';

import { useMemo, useState } from 'react';
import type { Match, Settings, Team } from '@/lib/types';
import type { LeaderboardRow } from '@/lib/calculations/sweepstakeLeaderboard';
import { teamPointsInMatch } from '@/lib/calculations/effectiveResult';
import { STATUS_LABEL, nextMatchForTeam, teamStatusInGroup } from '@/lib/derive';
import TeamName from './TeamName';

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function flavourText(rank: number, total: number, isBottom: boolean, isUniquelyLast: boolean): string {
  if (rank === 1) return "Leading the pack 👑";
  if (rank === 2) return "Hot on their heels 👀";
  if (rank === 3) return "Still in the hunt 🎯";
  if (isUniquelyLast) return "Rock bottom 🪨";
  if (isBottom) return "Wooden spoon contenders 🥄";
  if (rank === total - 1) return "This is getting awkward 😬";
  if (rank <= Math.ceil(total / 2)) return "Dark horse 🐴";
  return "Hoping for upsets 🙏";
}

function computeForm(row: LeaderboardRow, matches: Match[], settings: Settings): ('W' | 'D' | 'L')[] {
  const teamIds = new Set(row.teams.map((bd) => bd.team.id));
  const results: { date: string; result: 'W' | 'D' | 'L' }[] = [];

  for (const match of matches) {
    if (match.status !== 'finished') continue;
    const ownedTeamId = teamIds.has(match.homeTeamId)
      ? match.homeTeamId
      : teamIds.has(match.awayTeamId)
        ? match.awayTeamId
        : null;
    if (!ownedTeamId) continue;
    const tp = teamPointsInMatch(match, ownedTeamId, settings);
    if (!tp) continue;
    results.push({ date: match.kickoffAt, result: tp.result });
  }

  return results
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 5)
    .reverse()
    .map((r) => r.result);
}

const STATUS_CLS: Record<string, string> = {
  Qualified: 'text-emerald-600',
  Eliminated: 'text-red-500',
  Active: 'text-slate-500',
  'Not started': 'text-slate-400',
};

const FORM_CLS: Record<'W' | 'D' | 'L', string> = {
  W: 'bg-emerald-500',
  D: 'bg-slate-400',
  L: 'bg-red-400',
};

export default function LeaderboardCard({
  row,
  teams,
  matches,
  settings,
  totalPlayers,
  lastPlacePoints,
  bottomCount,
}: {
  row: LeaderboardRow;
  teams: Team[];
  matches: Match[];
  settings: Settings;
  totalPlayers: number;
  lastPlacePoints: number;
  bottomCount: number;
}) {
  const [open, setOpen] = useState(false);
  const form = useMemo(() => computeForm(row, matches, settings), [row, matches, settings]);
  const isLeader = row.rank === 1;
  const isBottom = row.points === lastPlacePoints;
  const isUniquelyLast = row.rank === totalPlayers && bottomCount === 1;

  return (
    <article className={`animate-slide-up overflow-hidden rounded-xl shadow-sm ${isLeader ? 'border-l-[3px] border-brand bg-gradient-to-r from-emerald-50 to-white' : 'bg-white'}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <span className="w-8 shrink-0 text-center text-lg font-bold tabular-nums text-muted">
          {MEDAL[row.rank] ?? (isUniquelyLast ? '🥄' : `#${row.rank}`)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">
            {row.player.name} <span className="text-muted">({row.player.displayCode})</span>
          </span>
          <span className="block text-xs italic text-muted">
            {flavourText(row.rank, totalPlayers, isBottom, isUniquelyLast)}
          </span>
          {form.length > 0 && (
            <span className="mt-1 flex gap-1">
              {form.map((r, i) => (
                <span
                  key={i}
                  title={r === 'W' ? 'Win' : r === 'D' ? 'Draw' : 'Loss'}
                  className={`h-2 w-2 rounded-full ${FORM_CLS[r]}`}
                />
              ))}
            </span>
          )}
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-xl font-bold tabular-nums text-brand-dark">{row.points}</span>
          <span className="block text-[11px] text-muted">pts</span>
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
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
                      <TeamName team={bd.team} className="font-medium text-ink" />
                      <span className="block text-[11px] text-muted">
                        <span className={STATUS_CLS[STATUS_LABEL[status]]}>{STATUS_LABEL[status]}</span>
                        {nextOpp ? (
                          <>
                            {' - Next: vs '}
                            <TeamName team={nextOpp} />
                          </>
                        ) : null}
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
