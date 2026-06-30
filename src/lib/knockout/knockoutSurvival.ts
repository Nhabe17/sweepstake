import type { Match, Player, Settings, Stage, Team } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { computeGroupQualifications, type GroupQualification } from './groupQualification';
import { computeThirdPlaceRanking, type ThirdPlaceQualifiedState } from './thirdPlaceRanking';
import { loserTeamId } from './bracket';

export type SurvivalStatus = 'in' | 'out' | 'pending';

/**
 * Progression order for the main knockout bracket. The third-place match is a consolation
 * fixture and is deliberately excluded — losing a semi-final eliminates a team regardless of
 * the third-place play-off, so only group → final stages count toward survival.
 */
const MAIN_BRACKET_ORDER = {
  group: 0,
  r32: 1,
  r16: 2,
  qf: 3,
  sf: 4,
  final: 5,
} satisfies Partial<Record<Stage, number>>;

type MainBracketStage = keyof typeof MAIN_BRACKET_ORDER;

function stageRank(stage: Stage | undefined): number {
  return stage && stage in MAIN_BRACKET_ORDER ? MAIN_BRACKET_ORDER[stage as MainBracketStage] : 0;
}

export interface TeamSurvival {
  team: Team;
  status: SurvivalStatus;
  /** Stage at which an `out` team was knocked out (`group` for a group-stage exit). */
  eliminatedAtStage?: Stage;
  /** Deepest main-bracket stage an `in` team has reached. */
  currentStage?: Stage;
}

export interface KnockoutLeaderboardRow {
  player: Player;
  rank: number;
  remainingCount: number;
  totalOwned: number;
  /** Owned teams, ordered: surviving first (deepest round first), then pending, then out. */
  teams: TeamSurvival[];
}

/**
 * Per-team survival across the whole tournament. A team is:
 *  - `out` if its group is complete and it didn't qualify, or it lost a main-bracket match
 *    (a penalty-shootout loss counts — see `loserTeamId`);
 *  - `pending` while its group is unresolved or its best-third qualification is undecided;
 *  - `in` otherwise (including the eventual champion).
 */
export function computeTeamSurvival(
  teams: Team[],
  matches: Match[],
  settings: Settings = DEFAULT_SETTINGS,
): Map<string, TeamSurvival> {
  const qualByGroup = new Map<string, GroupQualification>(
    computeGroupQualifications(teams, matches, settings).map((q) => [q.groupLetter, q]),
  );
  const thirdStateByTeam = new Map<string, ThirdPlaceQualifiedState>(
    computeThirdPlaceRanking(teams, matches, settings).map((row) => [row.teamId, row.qualifiedState]),
  );

  // Walk the knockout matches once: record the stage of each loss and the deepest stage each
  // team has appeared in (used for the survivor's "current round" and the player tiebreak).
  const eliminatedAt = new Map<string, Stage>();
  const deepestStage = new Map<string, Stage>();
  for (const match of matches) {
    if (match.stage === 'group' || match.stage === 'third_place') continue;
    for (const teamId of [match.homeTeamId, match.awayTeamId]) {
      if (stageRank(match.stage) > stageRank(deepestStage.get(teamId))) {
        deepestStage.set(teamId, match.stage);
      }
    }
    if (match.status !== 'finished') continue;
    const loser = loserTeamId(match);
    if (loser) eliminatedAt.set(loser, match.stage);
  }

  const result = new Map<string, TeamSurvival>();
  for (const team of teams) {
    result.set(
      team.id,
      resolveTeamSurvival(team, qualByGroup.get(team.groupLetter), thirdStateByTeam, eliminatedAt, deepestStage),
    );
  }
  return result;
}

function resolveTeamSurvival(
  team: Team,
  qual: GroupQualification | undefined,
  thirdStateByTeam: Map<string, ThirdPlaceQualifiedState>,
  eliminatedAt: Map<string, Stage>,
  deepestStage: Map<string, Stage>,
): TeamSurvival {
  if (!qual || !qual.complete) return { team, status: 'pending' };

  const fromGroup = resolveGroupQualification(team, qual, thirdStateByTeam);
  if (fromGroup === 'out') return { team, status: 'out', eliminatedAtStage: 'group' };
  if (fromGroup === 'pending') return { team, status: 'pending' };

  const lostAt = eliminatedAt.get(team.id);
  if (lostAt) return { team, status: 'out', eliminatedAtStage: lostAt };

  return { team, status: 'in', currentStage: deepestStage.get(team.id) ?? 'r32' };
}

function resolveGroupQualification(
  team: Team,
  qual: GroupQualification,
  thirdStateByTeam: Map<string, ThirdPlaceQualifiedState>,
): SurvivalStatus {
  if (team.id === qual.winnerTeamId || team.id === qual.runnerUpTeamId) return 'in';
  if (team.id === qual.thirdPlaceTeamId) {
    const state = thirdStateByTeam.get(team.id);
    if (state === 'qualified') return 'in';
    if (state === 'eliminated') return 'out';
    return 'pending'; // unresolved, or the cross-group ranking isn't computable yet
  }
  return 'out'; // finished 4th or lower
}

/**
 * Knockout leaderboard: players ranked by surviving owned teams.
 * Sort: remaining count → furthest round reached by a surviving team → player name.
 */
export function computeKnockoutLeaderboard(
  players: Player[],
  teams: Team[],
  matches: Match[],
  settings: Settings = DEFAULT_SETTINGS,
): KnockoutLeaderboardRow[] {
  const survival = computeTeamSurvival(teams, matches, settings);

  const rows: KnockoutLeaderboardRow[] = players.map((player) => {
    const teamSurvivals = teams
      .filter((t) => t.ownerPlayerId === player.id)
      .map((t) => survival.get(t.id)!)
      .sort(compareTeamSurvival);
    return {
      player,
      rank: 0,
      remainingCount: teamSurvivals.filter((s) => s.status === 'in').length,
      totalOwned: teamSurvivals.length,
      teams: teamSurvivals,
    };
  });

  rows.sort(
    (a, b) =>
      b.remainingCount - a.remainingCount ||
      furthestProgress(b) - furthestProgress(a) ||
      a.player.name.localeCompare(b.player.name),
  );
  // Dense ranking by remaining count only: each distinct count is the next rank tier, so the
  // groups read 1, 1, 1, 1, 2, 3, 4 — players level on count share a tier (and its medal).
  // Furthest-round progress still orders the list within a tier but never splits it.
  let rank = 0;
  let previousCount = Number.POSITIVE_INFINITY;
  for (const row of rows) {
    if (row.remainingCount !== previousCount) {
      rank += 1;
      previousCount = row.remainingCount;
    }
    row.rank = rank;
  }
  return rows;
}

const STATUS_SORT: Record<SurvivalStatus, number> = { in: 0, pending: 1, out: 2 };

function compareTeamSurvival(a: TeamSurvival, b: TeamSurvival): number {
  return (
    STATUS_SORT[a.status] - STATUS_SORT[b.status] ||
    survivalStageRank(b) - survivalStageRank(a) ||
    a.team.name.localeCompare(b.team.name)
  );
}

function survivalStageRank(s: TeamSurvival): number {
  return stageRank(s.status === 'in' ? s.currentStage : s.eliminatedAtStage);
}

function furthestProgress(row: KnockoutLeaderboardRow): number {
  return row.teams.reduce((max, t) => (t.status === 'in' ? Math.max(max, stageRank(t.currentStage)) : max), 0);
}
