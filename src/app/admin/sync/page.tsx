'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { syncScoresAction, getLastSyncAction, type SyncLog } from '@/app/actions/sync';

export default function AdminSyncPage() {
  const [lastSync, setLastSync] = useState<SyncLog | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    getLastSyncAction().then(setLastSync);
  }, []);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    const res = await syncScoresAction();
    setResult(res);
    setSyncing(false);
    getLastSyncAction().then(setLastSync);
  }

  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-muted">← Admin</Link>
      <PageHeader title="Live scores" subtitle="Pull real match results from football-data.org" />

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="min-h-10 w-full rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>

        {result && (
          <p className={`text-sm font-medium ${result.ok ? 'text-emerald-700' : 'text-red-600'}`}>
            {result.ok ? '✓' : '✗'} {result.message}
          </p>
        )}

        {lastSync ? (
          <p className="text-xs text-muted">
            Last sync:{' '}
            {new Date(lastSync.createdAt).toLocaleString(undefined, {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}{' '}
            —{' '}
            <span className={lastSync.status === 'success' ? 'text-emerald-600' : 'text-red-500'}>
              {lastSync.status}
            </span>{' '}
            · {lastSync.message}
          </p>
        ) : (
          <p className="text-xs text-muted">No syncs recorded yet.</p>
        )}
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
        <p className="text-sm font-semibold text-ink">Setup (free automatic sync)</p>
        <ol className="space-y-2 text-sm text-muted list-decimal list-inside">
          <li>
            Register for a free API key at{' '}
            <strong className="text-ink">football-data.org</strong>
          </li>
          <li>
            Add these to your Vercel environment variables (or <code>.env.local</code>):
            <pre className="mt-1 rounded bg-slate-100 p-2 text-xs text-ink whitespace-pre-wrap">
{`FOOTBALL_API_KEY=your_key_here
SYNC_SECRET=a_random_secret_string`}
            </pre>
          </li>
          <li>
            Sign up at <strong className="text-ink">cron-job.org</strong> (free) and create a
            cron job to call:
            <pre className="mt-1 rounded bg-slate-100 p-2 text-xs text-ink break-all">
              https://your-app.vercel.app/api/sync?token=your_sync_secret
            </pre>
            Set frequency to every 15–30 minutes on match days.
          </li>
          <li>
            Use <strong className="text-ink">Sync now</strong> above for an immediate update any
            time.
          </li>
        </ol>
        <p className="text-xs text-muted">
          Only non-overridden matches are updated. Manual result overrides always take precedence.
        </p>
      </div>
    </div>
  );
}
