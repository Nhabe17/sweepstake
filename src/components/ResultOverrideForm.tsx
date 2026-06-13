'use client';

import { useState } from 'react';
import type { Match, MatchStatus, Team } from '@/lib/types';
import type { OverrideInput } from '@/lib/data/store';

const STATUSES: MatchStatus[] = ['scheduled', 'live', 'finished', 'postponed'];

function numOrNull(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

export default function ResultOverrideForm({
  match,
  homeTeam,
  awayTeam,
  onSave,
  onClear,
  onCancel,
}: {
  match: Match;
  homeTeam?: Team;
  awayTeam?: Team;
  onSave: (input: OverrideInput) => void;
  onClear: () => void;
  onCancel: () => void;
}) {
  const [home, setHome] = useState(String(match.overrideHomeScore ?? match.homeScore ?? ''));
  const [away, setAway] = useState(String(match.overrideAwayScore ?? match.awayScore ?? ''));
  const [homePens, setHomePens] = useState(String(match.overrideHomePens ?? match.homePens ?? ''));
  const [awayPens, setAwayPens] = useState(String(match.overrideAwayPens ?? match.awayPens ?? ''));
  const [status, setStatus] = useState<MatchStatus>(match.status);
  const [error, setError] = useState<string | null>(null);

  function save() {
    const h = numOrNull(home);
    const a = numOrNull(away);
    if (status === 'finished' && (h === null || a === null)) {
      return setError('A finished match needs both scores.');
    }
    setError(null);
    onSave({ homeScore: h, awayScore: a, homePens: numOrNull(homePens), awayPens: numOrNull(awayPens), status });
  }

  return (
    <div className="space-y-3 rounded-xl border border-brand/30 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <label className="text-sm">
          <span className="text-xs text-muted">{homeTeam?.name ?? 'Home'}</span>
          <input
            inputMode="numeric"
            value={home}
            onChange={(e) => setHome(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-center text-lg"
          />
        </label>
        <span className="pb-3 text-muted">–</span>
        <label className="text-sm">
          <span className="text-xs text-muted">{awayTeam?.name ?? 'Away'}</span>
          <input
            inputMode="numeric"
            value={away}
            onChange={(e) => setAway(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-center text-lg"
          />
        </label>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <input
          inputMode="numeric"
          value={homePens}
          onChange={(e) => setHomePens(e.target.value)}
          placeholder="pens"
          className="min-h-10 w-full rounded-lg border border-slate-200 px-3 text-center text-sm"
        />
        <span className="text-[11px] text-muted">pens</span>
        <input
          inputMode="numeric"
          value={awayPens}
          onChange={(e) => setAwayPens(e.target.value)}
          placeholder="pens"
          className="min-h-10 w-full rounded-lg border border-slate-200 px-3 text-center text-sm"
        />
      </div>

      <label className="block text-sm">
        <span className="text-xs text-muted">Status</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as MatchStatus)}
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button onClick={save} className="min-h-11 flex-1 rounded-lg bg-brand font-semibold text-white">
          Save override
        </button>
        {match.hasManualOverride ? (
          <button onClick={onClear} className="min-h-11 rounded-lg bg-amber-50 px-4 font-medium text-amber-700">
            Revert to API
          </button>
        ) : null}
        <button onClick={onCancel} className="min-h-11 rounded-lg bg-slate-100 px-4 font-medium text-muted">
          Cancel
        </button>
      </div>
    </div>
  );
}
