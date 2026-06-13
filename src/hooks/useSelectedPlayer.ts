'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY = 'wc_selected_player';

/** Remembers which player profile the viewer picked (for "My Teams" / "My teams only"). */
export function useSelectedPlayer(): [string | null, (id: string | null) => void] {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    setId(localStorage.getItem(KEY));
  }, []);

  const update = useCallback((next: string | null) => {
    setId(next);
    if (next) localStorage.setItem(KEY, next);
    else localStorage.removeItem(KEY);
  }, []);

  return [id, update];
}
