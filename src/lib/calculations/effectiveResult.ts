import type { Match, Settings } from '@/lib/types';

export type Outcome = 'home' | 'away' | 'draw';

export interface EffectiveScore {
  homeScore: number;
  awayScore: number;
  homePens: number | null;
  awayPens: number | null;
  /** True when the result came from a manual admin override rather than the live/API score. */
  fromOverride: boolean;
}

/**
 * Resolve the score that "counts" for a match.
 * Precedence: manual override → live/regular score → API score.
 * Returns null when no usable score exists yet.
 */
export function getEffectiveScore(match: Match): EffectiveScore | null {
  if (match.hasManualOverride && match.overrideHomeScore != null && match.overrideAwayScore != null) {
    return {
      homeScore: match.overrideHomeScore,
      awayScore: match.overrideAwayScore,
      homePens: match.overrideHomePens ?? null,
      awayPens: match.overrideAwayPens ?? null,
      fromOverride: true,
    };
  }
  if (match.homeScore != null && match.awayScore != null) {
    return {
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      homePens: match.homePens ?? null,
      awayPens: match.awayPens ?? null,
      fromOverride: false,
    };
  }
  if (match.apiHomeScore != null && match.apiAwayScore != null) {
    return {
      homeScore: match.apiHomeScore,
      awayScore: match.apiAwayScore,
      homePens: null,
      awayPens: null,
      fromOverride: false,
    };
  }
  return null;
}

/** Whether a match should contribute points (only finished matches do). */
export function isScored(match: Match): boolean {
  return match.status === 'finished' && getEffectiveScore(match) !== null;
}

/**
 * Outcome from the home team's perspective. A level score decided by a penalty
 * shootout counts as a win for the shootout winner; otherwise it's a draw.
 */
export function getOutcome(score: EffectiveScore): Outcome {
  if (score.homeScore > score.awayScore) return 'home';
  if (score.awayScore > score.homeScore) return 'away';
  if (score.homePens != null && score.awayPens != null && score.homePens !== score.awayPens) {
    return score.homePens > score.awayPens ? 'home' : 'away';
  }
  return 'draw';
}

export interface TeamMatchPoints {
  points: number;
  result: 'W' | 'D' | 'L';
  goalsFor: number;
  goalsAgainst: number;
}

/**
 * Sweepstake points and goals for one team in one match.
 * Returns null if the team isn't in the match or the match isn't scored yet.
 * Scoring is per-team: when two owned teams meet, call this once for each side.
 */
export function teamPointsInMatch(
  match: Match,
  teamId: string,
  settings: Settings,
): TeamMatchPoints | null {
  if (!isScored(match)) return null;
  if (match.homeTeamId !== teamId && match.awayTeamId !== teamId) return null;
  const score = getEffectiveScore(match)!;
  const outcome = getOutcome(score);
  const isHome = match.homeTeamId === teamId;
  const goalsFor = isHome ? score.homeScore : score.awayScore;
  const goalsAgainst = isHome ? score.awayScore : score.homeScore;

  let result: 'W' | 'D' | 'L';
  if (outcome === 'draw') result = 'D';
  else if ((outcome === 'home') === isHome) result = 'W';
  else result = 'L';

  const points =
    result === 'W' ? settings.pointsWin : result === 'D' ? settings.pointsDraw : settings.pointsLoss;

  return { points, result, goalsFor, goalsAgainst };
}
