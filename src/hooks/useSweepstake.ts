'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { store } from '@/lib/data';
import { getBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import type { Player, SweepstakeData, Team } from '@/lib/types';

export interface SweepstakeView extends SweepstakeData {
  loading: boolean;
  refresh: () => void;
  playerById: (id: string | null | undefined) => Player | null;
  teamById: (id: string) => Team | undefined;
  ownerOf: (team: Team | null | undefined) => Player | null;
}

const EMPTY: SweepstakeData = {
  players: [],
  teams: [],
  matches: [],
  settings: {
    tournamentName: 'World Cup Sweepstake',
    teamsLocked: false,
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    showOdds: false,
    bonusesEnabled: false,
  },
};

const REALTIME_REFRESH_DEBOUNCE_MS = 500;
const FALLBACK_POLL_INTERVAL_MS = 2 * 60 * 1000;
const REALTIME_TABLES = ['matches', 'players', 'teams', 'settings'] as const;

/**
 * Loads sweepstake data on the client and keeps it fresh: it re-reads after local
 * store events, tab focus, and Supabase Realtime notifications when shared data is enabled.
 */
export function useSweepstake(): SweepstakeView {
  const [data, setData] = useState<SweepstakeData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(false);
  const refreshSeqRef = useRef(0);

  const refresh = useCallback(() => {
    const seq = ++refreshSeqRef.current;
    void store
      .getAll()
      .then((d) => {
        if (!mountedRef.current || seq !== refreshSeqRef.current) return;
        setData(d);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!mountedRef.current || seq !== refreshSeqRef.current) return;
        console.error('Failed to refresh sweepstake data', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let fallbackPollTimer: ReturnType<typeof setInterval> | null = null;

    const debouncedRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        refresh();
      }, REALTIME_REFRESH_DEBOUNCE_MS);
    };

    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    const onChange = () => refresh();
    const onFocus = () => refresh();
    const onVisibilityChange = () => refreshIfVisible();

    window.addEventListener('wc-sweepstake-change', onChange);
    window.addEventListener('storage', onChange);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    const supabase = isSupabaseConfigured ? getBrowserClient() : null;
    const channel = supabase
      ? REALTIME_TABLES.reduce(
          (ch, table) => ch.on('postgres_changes', { event: '*', schema: 'public', table }, debouncedRefresh),
          supabase.channel('wc-sweepstake-refresh'),
        ).subscribe()
      : null;

    if (isSupabaseConfigured) {
      fallbackPollTimer = setInterval(refreshIfVisible, FALLBACK_POLL_INTERVAL_MS);
    }

    return () => {
      mountedRef.current = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      if (fallbackPollTimer) clearInterval(fallbackPollTimer);
      if (channel) void supabase?.removeChannel(channel);
      window.removeEventListener('wc-sweepstake-change', onChange);
      window.removeEventListener('storage', onChange);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refresh]);

  const playerMap = useMemo(() => new Map(data.players.map((p) => [p.id, p])), [data.players]);
  const teamMap = useMemo(() => new Map(data.teams.map((t) => [t.id, t])), [data.teams]);

  return {
    ...data,
    loading,
    refresh,
    playerById: (id) => (id ? playerMap.get(id) ?? null : null),
    teamById: (id) => teamMap.get(id),
    ownerOf: (team) => (team?.ownerPlayerId ? playerMap.get(team.ownerPlayerId) ?? null : null),
  };
}
