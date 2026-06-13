import type { Player, Settings } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';

export interface OwnerDelta {
  playerId: string;
  code: string;
  delta: number;
}

export interface MatchImpact {
  homeWin: OwnerDelta[];
  draw: OwnerDelta[];
  awayWin: OwnerDelta[];
}

function aggregate(entries: Array<{ owner: Player | null; delta: number }>): OwnerDelta[] {
  const byPlayer = new Map<string, OwnerDelta>();
  for (const { owner, delta } of entries) {
    if (!owner) continue;
    const existing = byPlayer.get(owner.id);
    if (existing) existing.delta += delta;
    else byPlayer.set(owner.id, { playerId: owner.id, code: owner.displayCode, delta });
  }
  // Drop owners who'd gain nothing in this scenario (e.g. the loser at 0 pts).
  return [...byPlayer.values()].filter((d) => d.delta !== 0);
}

/**
 * "What each owner would earn" under each result of an upcoming match.
 * Deltas are aggregated per owner, so if one player owns both teams their
 * draw scenario correctly shows the combined points.
 */
export function computeMatchImpact(
  homeOwner: Player | null,
  awayOwner: Player | null,
  settings: Settings = DEFAULT_SETTINGS,
): MatchImpact {
  const { pointsWin: w, pointsDraw: d, pointsLoss: l } = settings;
  return {
    homeWin: aggregate([
      { owner: homeOwner, delta: w },
      { owner: awayOwner, delta: l },
    ]),
    draw: aggregate([
      { owner: homeOwner, delta: d },
      { owner: awayOwner, delta: d },
    ]),
    awayWin: aggregate([
      { owner: homeOwner, delta: l },
      { owner: awayOwner, delta: w },
    ]),
  };
}
