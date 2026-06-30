'use client';

import { useState } from 'react';
import type { Match, Team } from '@/lib/types';
import type { KnockoutLeaderboardRow, TeamSurvival } from '@/lib/knockout/knockoutSurvival';
import { nextMatchForTeam } from '@/lib/derive';
import TeamName from './TeamName';

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const STAGE_LABEL: Record<string, string> = {
  group: 'Group stage',
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-final',
  sf: 'Semi-final',
  final: 'Final',
  third_place: 'Third place',
};

// Tagline depends only on how many teams a player has left, so players level on the count
// always read the same — their rank is already shown by position and medal.
function flavourText(remaining: number, totalOwned: number): string {
  if (remaining === 0) return 'All knocked out 💀';
  if (remaining === totalOwned) return 'Full squad intact 🔥';
  if (remaining === 1) return 'Down to their last team 😬';
  switch (remaining) {
    case 5:
      return 'Barely a scratch 💪';
    case 4:
      return 'Strong and steady 🛡️';
    case 3:
      return 'Holding the line ⚔️';
    case 2:
      return 'Hanging tough 🤞';
    default:
      return 'Still in the fight 🥊';
  }
}

function survivalLine(survival: TeamSurvival, matches: Match[], teams: Team[]): string {
  if (survival.status === 'out') {
    return `Out · ${STAGE_LABEL[survival.eliminatedAtStage ?? 'group'] ?? 'Eliminated'}`;
  }
  if (survival.status === 'pending') return 'Awaiting qualification';

  const next = nextMatchForTeam(survival.team.id, matches);
  const stage = STAGE_LABEL[survival.currentStage ?? 'r32'] ?? 'In the knockouts';
  if (!next) return stage;
  const oppId = next.homeTeamId === survival.team.id ? next.awayTeamId : next.homeTeamId;
  const opp = teams.find((t) => t.id === oppId);
  return opp ? `${stage} · next vs ${opp.name}` : stage;
}

export default function KnockoutLeaderboardCard({
  row,
  teams,
  matches,
}: {
  row: KnockoutLeaderboardRow;
  teams: Team[];
  matches: Match[];
}) {
  const [open, setOpen] = useState(false);
  const isLeader = row.rank === 1 && row.remainingCount > 0;
  // Rank tiers share a medal: 1st → gold, 2nd → silver, 3rd → bronze, 4th+ → a "T{rank}" label.
  const positionLabel = MEDAL[row.rank] ?? `T${row.rank}`;

  return (
    <article
      className={`animate-slide-up overflow-hidden rounded-xl shadow-sm ${
        isLeader ? 'border-l-[3px] border-brand bg-gradient-to-r from-emerald-50 to-white' : 'bg-white'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <span className="w-8 shrink-0 text-center text-lg font-bold tabular-nums text-muted">
          {positionLabel}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">
            {row.player.name} <span className="text-muted">({row.player.displayCode})</span>
          </span>
          <span className="block text-xs italic text-muted">
            {flavourText(row.remainingCount, row.totalOwned)}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-xl font-bold tabular-nums text-brand-dark">
            {row.remainingCount}
            <span className="text-sm font-medium text-muted">/{row.totalOwned}</span>
          </span>
          <span className="block text-[11px] text-muted">left</span>
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
            {row.teams.map((survival) => {
              const out = survival.status === 'out';
              return (
                <li key={survival.team.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0">
                    <TeamName
                      team={survival.team}
                      className={out ? 'text-muted line-through' : 'font-medium text-ink'}
                    />
                    <span className="block text-[11px] text-muted">{survivalLine(survival, matches, teams)}</span>
                  </span>
                  <span
                    className={`shrink-0 text-xs font-semibold ${
                      survival.status === 'in'
                        ? 'text-emerald-600'
                        : survival.status === 'pending'
                          ? 'text-slate-400'
                          : 'text-red-500'
                    }`}
                  >
                    {survival.status === 'in' ? 'In' : survival.status === 'pending' ? '—' : 'Out'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
