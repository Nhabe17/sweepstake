'use server';

import { createFootballDataProvider } from '@/lib/football/footballDataProvider';
import { getServiceClient } from '@/lib/supabase/server';

export interface SyncResult {
  ok: boolean;
  updated: number;
  message: string;
}

export async function syncScoresAction(): Promise<SyncResult> {
  try {
    const provider = createFootballDataProvider();
    const { updated } = await provider.syncMatchesToDatabase();
    return { ok: true, updated, message: `Updated ${updated} match${updated === 1 ? '' : 'es'}` };
  } catch (err) {
    return { ok: false, updated: 0, message: err instanceof Error ? err.message : String(err) };
  }
}

export interface SyncLog {
  id: string;
  status: string;
  message: string;
  createdAt: string;
}

export async function getLastSyncAction(): Promise<SyncLog | null> {
  try {
    const db = getServiceClient();
    const { data } = await db
      .from('sync_logs')
      .select('id, status, message, created_at')
      .eq('provider', 'football-data.org')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id as string,
      status: data.status as string,
      message: data.message as string,
      createdAt: data.created_at as string,
    };
  } catch {
    return null;
  }
}
