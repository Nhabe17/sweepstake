import type { Match, SweepstakeData } from '@/lib/types';

type MatchCorrection = Pick<
  Match,
  | 'kickoffAt'
  | 'status'
  | 'homeScore'
  | 'awayScore'
  | 'homePens'
  | 'awayPens'
  | 'apiHomeScore'
  | 'apiAwayScore'
>;

const BLANK_SCHEDULED_RESULT = {
  status: 'scheduled',
  homeScore: null,
  awayScore: null,
  homePens: null,
  awayPens: null,
  apiHomeScore: null,
  apiAwayScore: null,
} satisfies Omit<MatchCorrection, 'kickoffAt'>;

export const SEEDED_FIXTURE_CORRECTIONS: Record<string, MatchCorrection> = {
  'm-H-md1-ESP-CPV': blankScheduledMatch('2026-06-15T16:00:00.000Z'),
  'm-H-md1-KSA-URU': blankScheduledMatch('2026-06-15T22:00:00.000Z'),
  'm-H-md2-ESP-KSA': blankScheduledMatch('2026-06-21T16:00:00.000Z'),
  'm-H-md2-URU-CPV': blankScheduledMatch('2026-06-21T22:00:00.000Z'),
  'm-H-md3-URU-ESP': blankScheduledMatch('2026-06-27T00:00:00.000Z'),
  'm-H-md3-CPV-KSA': blankScheduledMatch('2026-06-27T00:00:00.000Z'),
};

function blankScheduledMatch(kickoffAt: string): MatchCorrection {
  return {
    kickoffAt,
    ...BLANK_SCHEDULED_RESULT,
  };
}

export function isLegacyFakeLiveSeedMatch(match: Match): boolean {
  return (
    match.status === 'live' &&
    match.homeScore === 1 &&
    match.awayScore === 0 &&
    match.apiHomeScore === 1 &&
    match.apiAwayScore === 0
  );
}

export function needsSeedFixtureCorrection(match: Match): boolean {
  if (match.hasManualOverride || match.externalId) return false;
  const correction = SEEDED_FIXTURE_CORRECTIONS[match.id];
  if (!correction) return isLegacyFakeLiveSeedMatch(match);
  return (
    match.kickoffAt !== correction.kickoffAt ||
    match.status !== correction.status ||
    match.homeScore !== correction.homeScore ||
    match.awayScore !== correction.awayScore ||
    match.homePens !== correction.homePens ||
    match.awayPens !== correction.awayPens ||
    match.apiHomeScore !== correction.apiHomeScore ||
    match.apiAwayScore !== correction.apiAwayScore
  );
}

export function dataNeedsSeedFixtureCorrections(data: SweepstakeData): boolean {
  return data.matches.some(needsSeedFixtureCorrection);
}

export function applySeedFixtureCorrections(
  data: SweepstakeData,
  updatedAt = new Date().toISOString(),
): { data: SweepstakeData; changed: boolean } {
  let changed = false;
  const matches = data.matches.map((match) => {
    if (!needsSeedFixtureCorrection(match)) return match;
    changed = true;
    const correction = SEEDED_FIXTURE_CORRECTIONS[match.id];
    return {
      ...match,
      ...(correction ? { kickoffAt: correction.kickoffAt } : {}),
      ...BLANK_SCHEDULED_RESULT,
      updatedAt,
    };
  });

  return changed ? { data: { ...data, matches }, changed } : { data, changed: false };
}
