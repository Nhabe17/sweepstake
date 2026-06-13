'use client';

import { useState } from 'react';
import type { Player } from '@/lib/types';

export interface PlayerDraft {
  id?: string;
  name: string;
  displayCode: string;
  email: string;
  isAdmin: boolean;
}

export default function PlayerForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Player;
  onSave: (draft: PlayerDraft) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [displayCode, setDisplayCode] = useState(initial?.displayCode ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [isAdmin, setIsAdmin] = useState(initial?.isAdmin ?? false);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!name.trim()) return setError('Name is required.');
    const code = displayCode.trim();
    if (!code) return setError('Display code is required.');
    if (code.length > 3) return setError('Display code should be 1–3 characters.');
    setError(null);
    onSave({ id: initial?.id, name: name.trim(), displayCode: code, email: email.trim(), isAdmin });
  }

  return (
    <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
      <div className="grid grid-cols-[1fr_5rem] gap-2">
        <label className="block">
          <span className="text-xs font-medium text-muted">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 px-3"
            placeholder="Player name"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted">Code</span>
          <input
            value={displayCode}
            onChange={(e) => setDisplayCode(e.target.value)}
            maxLength={3}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-center uppercase"
            placeholder="Y"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-xs font-medium text-muted">Email (optional)</span>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 px-3"
          placeholder="name@example.com"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} className="h-4 w-4" />
        Admin
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          className="min-h-11 flex-1 rounded-lg bg-brand font-semibold text-white"
        >
          {initial ? 'Save' : 'Add player'}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} className="min-h-11 rounded-lg bg-slate-100 px-4 font-medium text-muted">
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}
