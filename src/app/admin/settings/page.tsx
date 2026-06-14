'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSweepstake } from '@/hooks/useSweepstake';
import { store } from '@/lib/data';
import PageHeader from '@/components/PageHeader';
import { LoadingState } from '@/components/states';

export default function AdminSettingsPage() {
  const view = useSweepstake();
  const { settings, loading } = view;
  const [name, setName] = useState('');
  const [win, setWin] = useState(3);
  const [draw, setDraw] = useState(1);
  const [loss, setLoss] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (loading) return;
    setName(settings.tournamentName);
    setWin(settings.pointsWin);
    setDraw(settings.pointsDraw);
    setLoss(settings.pointsLoss);
  }, [loading, settings]);

  async function save() {
    await store.setSettings({
      tournamentName: name.trim() || 'World Cup Sweepstake',
      pointsWin: win,
      pointsDraw: draw,
      pointsLoss: loss,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function toggle(key: 'showOdds' | 'bonusesEnabled', value: boolean) {
    await store.setSettings({ [key]: value });
  }

  async function reset() {
    if (confirm('Reset ALL data (players, teams, assignments, results) back to the seed?')) {
      await store.reset();
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-muted">← Admin</Link>
      <PageHeader title="Settings" subtitle="Tournament name & scoring" />

      <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <label className="block">
          <span className="text-xs font-medium text-muted">Tournament name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 px-3"
          />
        </label>

        <div>
          <p className="text-xs font-medium text-muted">Scoring (points per match)</p>
          <div className="mt-1 grid grid-cols-3 gap-2">
            <ScoreInput label="Win" value={win} onChange={setWin} />
            <ScoreInput label="Draw" value={draw} onChange={setDraw} />
            <ScoreInput label="Loss" value={loss} onChange={setLoss} />
          </div>
          <p className="mt-1 text-[11px] text-muted">
            A penalty-shootout win counts as a win. Group + knockout matches both score.
          </p>
        </div>

        <button onClick={save} className="min-h-11 w-full rounded-lg bg-brand font-semibold text-white">
          {saved ? 'Saved ✓' : 'Save settings'}
        </button>
      </section>

      <section className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
        <Toggle
          label="Show betting odds"
          hint="Shows cached 1X2 odds when ODDS_API_KEY sync is configured."
          checked={settings.showOdds}
          onChange={(v) => toggle('showOdds', v)}
        />
        <Toggle
          label="Progression bonuses"
          hint="Reserved for future bonus scoring (off by default)."
          checked={settings.bonusesEnabled}
          onChange={(v) => toggle('bonusesEnabled', v)}
        />
      </section>

      <button onClick={reset} className="min-h-11 w-full rounded-lg bg-red-50 font-medium text-red-600">
        Reset all data to seed
      </button>
    </div>
  );
}

function ScoreInput({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block text-center">
      <span className="text-[11px] text-muted">{label}</span>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
        className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 px-2 text-center text-lg"
      />
    </label>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-3">
      <span>
        <span className="text-sm font-medium text-ink">{label}</span>
        {hint ? <span className="block text-[11px] text-muted">{hint}</span> : null}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5" />
    </label>
  );
}
