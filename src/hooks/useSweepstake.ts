'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { store } from '@/lib/data';
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

/**
 * Loads sweepstake data on the client and keeps it fresh: it re-reads whenever the
 * store changes in this tab (custom event) or another tab (native `storage` event).
 */
export function useSweepstake(): SweepstakeView {
  const [data, setData] = useState<SweepstakeData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    store.getAll().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener('wc-sweepstake-change', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('wc-sweepstake-change', onChange);
      window.removeEventListener('storage', onChange);
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
