import type { MatchStatus, Stage } from '@/lib/types';

export interface FdScore {
  home: number | null;
  away: number | null;
}

export interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  // The provider does not expose a global match number (FIFA's 73-104 scheme); only the
  // round is given via `stage`. We locate the bracket slot by team membership instead.
  stage?: string | null;
  homeTeam: { tla: string | null };
  awayTeam: { tla: string | null };
  score: {
    duration: string;
    fullTime: FdScore;
    regularTime: FdScore | null;
    extraTime: FdScore | null;
    penalties: FdScore | null;
  };
}

export interface ExistingMatchRow {
  id: string;
  externalId: string | null;
  stage: Stage;
  bracketSlot: number | null;
  homeTeamId: string;
  awayTeamId: string;
  kickoffAt: string;
  hasManualOverride: boolean;
}

export interface MatchTeamIds {
  homeId: string;
  awayId: string;
}

export type KnockoutStage = Exclude<Stage, 'group'>;

/**
 * A knockout bracket slot identified by its deterministic "anchor" teams: group winners /
 * runners-up (Round of 32) or progressed winners/losers (later rounds). Best-third
 * participants are deliberately excluded — their slot allocation (FIFA Annex C) is not
 * modelled, so a best-third fixture is placed via its fixed opponent's anchor instead.
 * Each anchor team belongs to exactly one slot per stage, so a fixture sharing any anchor
 * uniquely identifies its slot; the actual opponent is then taken from the provider fixture.
 */
export interface ResolvedKnockoutSlot {
  stage: KnockoutStage;
  bracketSlot: number;
  anchorTeamIds: readonly string[];
}

export interface MatchSyncTarget {
  action: 'insert' | 'update';
  id: string;
  row: ExistingMatchRow | null;
  stage: Stage;
  bracketSlot: number | null;
  swapGoals: boolean;
  updateTeams: boolean;
}

export function mapFootballDataStatus(status: string): MatchStatus {
  switch (status.toUpperCase()) {
    case 'FINISHED':
    case 'AWARDED':
      return 'finished';
    case 'IN_PLAY':
    case 'PAUSED':
    case 'EXTRA_TIME':
    case 'PENALTY_SHOOTOUT':
      return 'live';
    case 'POSTPONED':
    case 'SUSPENDED':
    case 'CANCELLED':
      return 'postponed';
    default:
      return 'scheduled';
  }
}

export function mapFootballDataStage(stage: string | null | undefined): Stage | null {
  switch (stage?.toUpperCase()) {
    case 'GROUP_STAGE':
    case 'REGULAR_SEASON':
      return 'group';
    case 'LAST_32':
    case 'ROUND_OF_32':
      return 'r32';
    case 'LAST_16':
    case 'ROUND_OF_16':
      return 'r16';
    case 'QUARTER_FINALS':
    case 'QUARTER_FINAL':
      return 'qf';
    case 'SEMI_FINALS':
    case 'SEMI_FINAL':
      return 'sf';
    case 'THIRD_PLACE':
      return 'third_place';
    case 'FINAL':
      return 'final';
    default:
      return null;
  }
}

export function teamIdsForFootballDataMatch(
  match: FdMatch,
  tlaToId: Map<string, string>,
): MatchTeamIds | null {
  const homeTla = match.homeTeam.tla?.toUpperCase();
  const awayTla = match.awayTeam.tla?.toUpperCase();
  const homeId = homeTla ? tlaToId.get(homeTla) : undefined;
  const awayId = awayTla ? tlaToId.get(awayTla) : undefined;
  return homeId && awayId ? { homeId, awayId } : null;
}

export function resolveFootballDataSyncTarget(
  match: FdMatch,
  existingRows: ExistingMatchRow[],
  teamIds: MatchTeamIds,
  knockoutSlots: readonly ResolvedKnockoutSlot[] = [],
): MatchSyncTarget | null {
  const externalId = String(match.id);
  const byExternalId = existingRows.find((row) => row.externalId === externalId);
  if (byExternalId) return updateTarget(byExternalId, teamIds);

  const providerStage = mapFootballDataStage(match.stage);
  if (providerStage && providerStage !== 'group') {
    return resolveKnockoutTarget(providerStage, existingRows, teamIds, knockoutSlots);
  }

  // Only reconcile group fixtures here; an unrecognised stage is left alone rather than guessed.
  if (providerStage !== 'group') return null;

  const groupTarget = bestGroupPairMatch(existingRows, teamIds, match.utcDate);
  return groupTarget ? updateTarget(groupTarget, teamIds) : null;
}

function resolveKnockoutTarget(
  stage: KnockoutStage,
  existingRows: ExistingMatchRow[],
  teamIds: MatchTeamIds,
  knockoutSlots: readonly ResolvedKnockoutSlot[],
): MatchSyncTarget | null {
  // Identify the slot by any anchor team it shares with this fixture (a group winner/runner-up
  // for R32, or a progressed team for later rounds). Anchors are unique per stage, so this
  // never misplaces a fixture; a round with no known anchor yet is safely skipped and picked
  // up by a later sync once its feeder results are stored.
  const slot = knockoutSlots.find(
    (candidate) =>
      candidate.stage === stage &&
      (candidate.anchorTeamIds.includes(teamIds.homeId) || candidate.anchorTeamIds.includes(teamIds.awayId)),
  );
  if (!slot) return null;

  const bySlot = existingRows.find((row) => row.stage === slot.stage && row.bracketSlot === slot.bracketSlot);
  if (bySlot) return updateTarget(bySlot, teamIds);

  return {
    action: 'insert',
    id: knockoutMatchId(slot),
    row: null,
    stage: slot.stage,
    bracketSlot: slot.bracketSlot,
    swapGoals: false,
    updateTeams: true,
  };
}

export function buildFootballDataUpdatePatch(
  match: FdMatch,
  target: MatchSyncTarget,
  teamIds: MatchTeamIds,
  now: string,
): Record<string, unknown> {
  const mappedStatus = mapFootballDataStatus(match.status);
  const patch: Record<string, unknown> = {
    external_id: String(match.id),
    status: mappedStatus,
    kickoff_at: match.utcDate,
    updated_at: now,
    ...scorePatch(match, mappedStatus, target.swapGoals),
  };

  if (target.stage !== 'group') {
    patch.stage = target.stage;
    patch.bracket_slot = target.bracketSlot;
    patch.group_letter = null;
  }

  if (target.updateTeams) {
    patch.home_team_id = teamIds.homeId;
    patch.away_team_id = teamIds.awayId;
  }

  return patch;
}

export function buildFootballDataInsertRow(
  match: FdMatch,
  target: MatchSyncTarget,
  teamIds: MatchTeamIds,
  now: string,
): Record<string, unknown> {
  const mappedStatus = mapFootballDataStatus(match.status);
  return {
    id: target.id,
    external_id: String(match.id),
    group_letter: null,
    stage: target.stage,
    bracket_slot: target.bracketSlot,
    home_team_id: teamIds.homeId,
    away_team_id: teamIds.awayId,
    kickoff_at: match.utcDate,
    status: mappedStatus,
    ...scorePatch(match, mappedStatus, false),
    override_home_score: null,
    override_away_score: null,
    override_home_pens: null,
    override_away_pens: null,
    odds: null,
    has_manual_override: false,
    created_at: now,
    updated_at: now,
  };
}

export function existingRowFromDatabaseRow(row: Record<string, unknown>): ExistingMatchRow {
  return {
    id: row.id as string,
    externalId: (row.external_id as string) ?? null,
    stage: row.stage as Stage,
    bracketSlot: row.bracket_slot == null ? null : (row.bracket_slot as number),
    homeTeamId: row.home_team_id as string,
    awayTeamId: row.away_team_id as string,
    kickoffAt: row.kickoff_at as string,
    hasManualOverride: Boolean(row.has_manual_override),
  };
}

function updateTarget(row: ExistingMatchRow, teamIds: MatchTeamIds): MatchSyncTarget | null {
  if (row.hasManualOverride) return null;
  const orientation = rowOrientation(row, teamIds);
  return {
    action: 'update',
    id: row.id,
    row,
    stage: row.stage,
    bracketSlot: row.bracketSlot,
    swapGoals: orientation === 'reversed',
    updateTeams: orientation === 'different',
  };
}

function rowOrientation(row: ExistingMatchRow, teamIds: MatchTeamIds): 'direct' | 'reversed' | 'different' {
  if (row.homeTeamId === teamIds.homeId && row.awayTeamId === teamIds.awayId) return 'direct';
  if (row.homeTeamId === teamIds.awayId && row.awayTeamId === teamIds.homeId) return 'reversed';
  return 'different';
}

function bestGroupPairMatch(
  rows: ExistingMatchRow[],
  teamIds: MatchTeamIds,
  kickoffAt: string,
): ExistingMatchRow | null {
  // Two teams meet exactly once in the group stage, so the team pair uniquely identifies the
  // fixture — match on that regardless of kickoff (seed times are placeholders the sync corrects).
  const candidates = rows.filter(
    (row) => row.stage === 'group' && !row.hasManualOverride && rowHasSameTeams(row, teamIds),
  );
  if (candidates.length <= 1) return candidates[0] ?? null;

  // Defensive only: if duplicate same-pair rows somehow exist, prefer the closest kickoff.
  const kickoffMs = +new Date(kickoffAt);
  return candidates
    .map((row) => ({ row, delta: Math.abs(+new Date(row.kickoffAt) - kickoffMs) }))
    .sort((a, b) => a.delta - b.delta)[0].row;
}

function rowHasSameTeams(row: ExistingMatchRow, teamIds: MatchTeamIds): boolean {
  return (
    (row.homeTeamId === teamIds.homeId && row.awayTeamId === teamIds.awayId) ||
    (row.homeTeamId === teamIds.awayId && row.awayTeamId === teamIds.homeId)
  );
}

function scorePatch(match: FdMatch, mappedStatus: MatchStatus, swapGoals: boolean): Record<string, unknown> {
  const { duration, fullTime, regularTime, extraTime, penalties } = match.score;
  let goalHome: number | null = null;
  let goalAway: number | null = null;

  if (duration === 'PENALTY_SHOOTOUT') {
    goalHome = (regularTime?.home ?? 0) + (extraTime?.home ?? 0);
    goalAway = (regularTime?.away ?? 0) + (extraTime?.away ?? 0);
  } else if (fullTime?.home != null && fullTime.away != null) {
    goalHome = fullTime.home;
    goalAway = fullTime.away;
  }

  if (swapGoals && goalHome != null && goalAway != null) {
    [goalHome, goalAway] = [goalAway, goalHome];
  }

  const patch: Record<string, unknown> = {};
  if (goalHome != null && goalAway != null) {
    patch.home_score = goalHome;
    patch.away_score = goalAway;
    patch.api_home_score = goalHome;
    patch.api_away_score = goalAway;
  } else if (mappedStatus === 'scheduled' || mappedStatus === 'postponed') {
    patch.home_score = null;
    patch.away_score = null;
    patch.api_home_score = null;
    patch.api_away_score = null;
  }

  if (penalties?.home != null && penalties.away != null) {
    let homePens = penalties.home;
    let awayPens = penalties.away;
    if (swapGoals) [homePens, awayPens] = [awayPens, homePens];
    patch.home_pens = homePens;
    patch.away_pens = awayPens;
  } else {
    patch.home_pens = null;
    patch.away_pens = null;
  }

  return patch;
}

function knockoutMatchId(slot: { stage: KnockoutStage; bracketSlot: number }): string {
  return `m-${slot.stage}-${slot.bracketSlot}`;
}
