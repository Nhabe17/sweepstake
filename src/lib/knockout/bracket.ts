import type { Match, Settings, Stage, Team } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { getEffectiveScore, getOutcome } from '@/lib/calculations/effectiveResult';
import { computeGroupQualifications, type GroupQualification } from './groupQualification';
import {
  ROUND_OF_32_SLOT_DEFINITIONS,
  type GroupLetter,
  type RoundOf32ParticipantSource,
} from './roundOf32Slots';
import { computeThirdPlaceRanking, type ThirdPlaceRankingRow } from './thirdPlaceRanking';
import type { ResolvedKnockoutSlot } from '@/lib/football/footballDataSync';

export type KnockoutStage = Exclude<Stage, 'group'>;
export type MainKnockoutStage = Exclude<KnockoutStage, 'third_place'>;

export const MAIN_KNOCKOUT_STAGES = ['r32', 'r16', 'qf', 'sf', 'final'] as const satisfies readonly MainKnockoutStage[];

export const KNOCKOUT_SLOT_COUNTS = {
  r32: 16,
  r16: 8,
  qf: 4,
  sf: 2,
  final: 1,
  third_place: 1,
} satisfies Record<KnockoutStage, number>;

export type BracketParticipantSource =
  | 'match'
  | 'winner'
  | 'loser'
  | 'tbd'
  | 'group_winner'
  | 'group_runner_up'
  | 'best_third';

export interface BracketParticipant {
  teamId: string | null;
  source: BracketParticipantSource;
  sourceStage?: KnockoutStage;
  sourceSlot?: number;
  sourceMatchId?: string;
  sourceGroupLetter?: string;
  sourceAllowedGroupLetters?: readonly string[];
}

export interface KnockoutSlot {
  stage: KnockoutStage;
  bracketSlot: number;
  match: Match | null;
  home: BracketParticipant;
  away: BracketParticipant;
}

export interface KnockoutRound {
  stage: MainKnockoutStage;
  slots: KnockoutSlot[];
}

export interface KnockoutBracket {
  rounds: KnockoutRound[];
  thirdPlace: KnockoutSlot;
}

const PREVIOUS_STAGE = {
  r32: null,
  r16: 'r32',
  qf: 'r16',
  sf: 'qf',
  final: 'sf',
} satisfies Record<MainKnockoutStage, MainKnockoutStage | null>;

// Official 2026 bracket tree. bracketSlot equals the FIFA match-number offset (R32 slot k =
// match 72+k, R16 slot k = 88+k, QF 96+k, SF 100+k, final = 104). For each knockout slot,
// the two previous-stage slots whose winners feed it — e.g. R16 match 89 = W(74) vs W(77),
// i.e. R32 slots 2 and 5. The official bracket interleaves, so feeders are NOT slots k*2-1/k*2.
const KNOCKOUT_FEEDERS: Record<Exclude<MainKnockoutStage, 'r32'>, Record<number, readonly [number, number]>> = {
  r16: { 1: [2, 5], 2: [1, 3], 3: [4, 6], 4: [7, 8], 5: [11, 12], 6: [9, 10], 7: [14, 16], 8: [13, 15] },
  qf: { 1: [1, 2], 2: [5, 6], 3: [3, 4], 4: [7, 8] },
  sf: { 1: [1, 2], 2: [3, 4] },
  final: { 1: [1, 2] },
};

// Top-to-bottom display order per round, derived from an in-order traversal of the feeder
// tree above, so each round's slots sit adjacent to their feeders — a clean, non-crossing
// bracket whose vertical centring (see KnockoutBracket ROUND_SPACING) lines up correctly.
const STAGE_DISPLAY_ORDER = {
  r32: [2, 5, 1, 3, 11, 12, 9, 10, 4, 6, 7, 8, 14, 16, 13, 15],
  r16: [1, 2, 5, 6, 3, 4, 7, 8],
  qf: [1, 2, 3, 4],
  sf: [1, 2],
  final: [1],
} satisfies Record<MainKnockoutStage, readonly number[]>;

export function buildKnockoutBracket(matches: Match[]): KnockoutBracket {
  const matchBySlot = mapMatchesBySlot(matches);

  const rounds = MAIN_KNOCKOUT_STAGES.map((stage): KnockoutRound => {
    const slots = STAGE_DISPLAY_ORDER[stage].map((bracketSlot) => buildSlot(stage, bracketSlot, matchBySlot));
    return { stage, slots };
  });

  return {
    rounds,
    thirdPlace: buildThirdPlaceSlot(matchBySlot),
  };
}

export function buildProjectedKnockoutBracket(
  matches: Match[],
  teams: Team[],
  settings: Settings = DEFAULT_SETTINGS,
): KnockoutBracket {
  const bracket = buildKnockoutBracket(matches);
  const projectedRoundOf32 = buildRoundOf32ProjectedParticipants(teams, matches, settings);

  return {
    ...bracket,
    rounds: bracket.rounds.map((round) => {
      if (round.stage !== 'r32') return round;
      return {
        ...round,
        slots: round.slots.map((slot) => {
          if (slot.match) return slot;
          const projection = projectedRoundOf32.get(slot.bracketSlot);
          return projection ? { ...slot, ...projection } : slot;
        }),
      };
    }),
  };
}

/**
 * Deterministic "anchor" teams per knockout slot (group winners/runners-up, and progressed
 * winners/losers in later rounds). Best-third sides are excluded because their slot is not
 * modelled, so a best-third fixture is placed by its fixed opponent's anchor instead. The
 * football-data sync uses these to map an incoming knockout fixture to its bracket slot.
 */
export function knockoutSlotAnchors(bracket: KnockoutBracket): ResolvedKnockoutSlot[] {
  const slots = [...bracket.rounds.flatMap((round) => round.slots), bracket.thirdPlace];
  return slots.map((slot) => ({
    stage: slot.stage,
    bracketSlot: slot.bracketSlot,
    anchorTeamIds: [slot.home, slot.away]
      .filter((participant) => participant.teamId && participant.source !== 'best_third')
      .map((participant) => participant.teamId as string),
  }));
}

export function winnerTeamId(match: Match | null): string | null {
  if (!match || match.status !== 'finished') return null;
  const score = getEffectiveScore(match);
  if (!score) return null;
  const outcome = getOutcome(score);
  if (outcome === 'draw') return null;
  return outcome === 'home' ? match.homeTeamId : match.awayTeamId;
}

function buildRoundOf32ProjectedParticipants(
  teams: Team[],
  matches: Match[],
  settings: Settings,
): Map<number, Pick<KnockoutSlot, 'home' | 'away'>> {
  const qualificationByGroup = new Map<string, GroupQualification>(
    computeGroupQualifications(teams, matches, settings).map((qualification) => [
      qualification.groupLetter,
      qualification,
    ]),
  );
  const thirdPlaceRanking = computeThirdPlaceRanking(teams, matches, settings);

  return new Map(
    ROUND_OF_32_SLOT_DEFINITIONS.map((definition) => [
      definition.bracketSlot,
      {
        home: projectedParticipant(definition.home, qualificationByGroup, thirdPlaceRanking),
        away: projectedParticipant(definition.away, qualificationByGroup, thirdPlaceRanking),
      },
    ]),
  );
}

function projectedParticipant(
  source: RoundOf32ParticipantSource,
  qualificationByGroup: Map<string, GroupQualification>,
  thirdPlaceRanking: ThirdPlaceRankingRow[],
): BracketParticipant {
  if (source.type === 'group_winner') {
    const qualification = qualificationByGroup.get(source.groupLetter);
    return qualification?.complete && qualification.winnerTeamId
      ? groupParticipant(qualification.winnerTeamId, 'group_winner', source.groupLetter)
      : tbdParticipant();
  }

  if (source.type === 'group_runner_up') {
    const qualification = qualificationByGroup.get(source.groupLetter);
    return qualification?.complete && qualification.runnerUpTeamId
      ? groupParticipant(qualification.runnerUpTeamId, 'group_runner_up', source.groupLetter)
      : tbdParticipant();
  }

  const resolvedThirdPlace = resolveBestThirdParticipant(source.allowedGroupLetters, thirdPlaceRanking);
  return resolvedThirdPlace
    ? {
        teamId: resolvedThirdPlace.teamId,
        source: 'best_third',
        sourceGroupLetter: resolvedThirdPlace.groupLetter,
        sourceAllowedGroupLetters: source.allowedGroupLetters,
      }
    : tbdParticipant();
}

function resolveBestThirdParticipant(
  allowedGroupLetters: readonly GroupLetter[],
  thirdPlaceRanking: ThirdPlaceRankingRow[],
): ThirdPlaceRankingRow | null {
  if (thirdPlaceRanking.length === 0) return null;

  const allowed = new Set<string>(allowedGroupLetters);
  const allowedRows = thirdPlaceRanking.filter((row) => allowed.has(row.groupLetter));
  const qualifiedRows = allowedRows.filter((row) => row.qualifiedState === 'qualified');
  const hasUnresolvedCandidate = allowedRows.some((row) => row.qualifiedState === 'unresolved');

  return qualifiedRows.length === 1 && !hasUnresolvedCandidate ? qualifiedRows[0] : null;
}

export function loserTeamId(match: Match | null): string | null {
  if (!match || match.status !== 'finished') return null;
  const score = getEffectiveScore(match);
  if (!score) return null;
  const outcome = getOutcome(score);
  if (outcome === 'draw') return null;
  return outcome === 'home' ? match.awayTeamId : match.homeTeamId;
}

function mapMatchesBySlot(matches: Match[]): Map<string, Match> {
  const mapped = new Map<string, Match>();
  for (const match of matches) {
    if (!isKnockoutStage(match.stage) || match.bracketSlot == null) continue;
    if (!isValidSlot(match.stage, match.bracketSlot)) continue;
    const key = slotKey(match.stage, match.bracketSlot);
    if (!mapped.has(key)) mapped.set(key, match);
  }
  return mapped;
}

function buildSlot(stage: MainKnockoutStage, bracketSlot: number, matchBySlot: Map<string, Match>): KnockoutSlot {
  const match = matchBySlot.get(slotKey(stage, bracketSlot)) ?? null;
  if (match) {
    return {
      stage,
      bracketSlot,
      match,
      home: matchParticipant(match.homeTeamId, stage, bracketSlot, match.id),
      away: matchParticipant(match.awayTeamId, stage, bracketSlot, match.id),
    };
  }

  const previousStage = PREVIOUS_STAGE[stage];
  if (!previousStage) {
    return {
      stage,
      bracketSlot,
      match: null,
      home: tbdParticipant(),
      away: tbdParticipant(),
    };
  }

  // `previousStage` is set ⇒ stage is not 'r32', so a feeder entry always exists.
  const [homeSourceSlot, awaySourceSlot] = KNOCKOUT_FEEDERS[stage as Exclude<MainKnockoutStage, 'r32'>][bracketSlot];
  return {
    stage,
    bracketSlot,
    match: null,
    home: winnerParticipant(previousStage, homeSourceSlot, matchBySlot),
    away: winnerParticipant(previousStage, awaySourceSlot, matchBySlot),
  };
}

function buildThirdPlaceSlot(matchBySlot: Map<string, Match>): KnockoutSlot {
  const stage = 'third_place';
  const bracketSlot = 1;
  const match = matchBySlot.get(slotKey(stage, bracketSlot)) ?? null;
  if (match) {
    return {
      stage,
      bracketSlot,
      match,
      home: matchParticipant(match.homeTeamId, stage, bracketSlot, match.id),
      away: matchParticipant(match.awayTeamId, stage, bracketSlot, match.id),
    };
  }

  return {
    stage,
    bracketSlot,
    match: null,
    home: loserParticipant('sf', 1, matchBySlot),
    away: loserParticipant('sf', 2, matchBySlot),
  };
}

function matchParticipant(
  teamId: string,
  sourceStage: KnockoutStage,
  sourceSlot: number,
  sourceMatchId: string,
): BracketParticipant {
  return { teamId, source: 'match', sourceStage, sourceSlot, sourceMatchId };
}

function groupParticipant(
  teamId: string,
  source: Extract<BracketParticipantSource, 'group_winner' | 'group_runner_up'>,
  sourceGroupLetter: string,
): BracketParticipant {
  return { teamId, source, sourceGroupLetter };
}

function winnerParticipant(
  sourceStage: MainKnockoutStage,
  sourceSlot: number,
  matchBySlot: Map<string, Match>,
): BracketParticipant {
  const sourceMatch = matchBySlot.get(slotKey(sourceStage, sourceSlot)) ?? null;
  return {
    teamId: winnerTeamId(sourceMatch),
    source: 'winner',
    sourceStage,
    sourceSlot,
    sourceMatchId: sourceMatch?.id,
  };
}

function loserParticipant(
  sourceStage: MainKnockoutStage,
  sourceSlot: number,
  matchBySlot: Map<string, Match>,
): BracketParticipant {
  const sourceMatch = matchBySlot.get(slotKey(sourceStage, sourceSlot)) ?? null;
  return {
    teamId: loserTeamId(sourceMatch),
    source: 'loser',
    sourceStage,
    sourceSlot,
    sourceMatchId: sourceMatch?.id,
  };
}

function tbdParticipant(): BracketParticipant {
  return { teamId: null, source: 'tbd' };
}

function isKnockoutStage(stage: Stage): stage is KnockoutStage {
  return stage !== 'group';
}

function isValidSlot(stage: KnockoutStage, bracketSlot: number): boolean {
  return Number.isInteger(bracketSlot) && bracketSlot >= 1 && bracketSlot <= KNOCKOUT_SLOT_COUNTS[stage];
}

function slotKey(stage: KnockoutStage, bracketSlot: number): string {
  return `${stage}:${bracketSlot}`;
}
