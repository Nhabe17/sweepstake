import { describe, expect, it } from 'vitest';
import type { Match } from '@/lib/types';
import { filterMatches } from './filterMatches';

function match(p: Partial<Match> & Pick<Match, 'id' | 'homeTeamId' | 'awayTeamId'>): Match {
  return {
    externalId: null,
    groupLetter: 'A',
    stage: 'group',
    bracketSlot: null,
    kickoffAt: '2026-06-11T16:00:00.000Z',
    status: 'scheduled',
    homeScore: null,
    awayScore: null,
    homePens: null,
    awayPens: null,
    apiHomeScore: null,
    apiAwayScore: null,
    overrideHomeScore: null,
    overrideAwayScore: null,
    overrideHomePens: null,
    overrideAwayPens: null,
    hasManualOverride: false,
    createdAt: '',
    updatedAt: '',
    ...p,
  };
}

describe('filterMatches', () => {
  const groupMatch = match({
    id: 'm-group',
    homeTeamId: 't-a',
    awayTeamId: 't-b',
    groupLetter: 'A',
    stage: 'group',
    kickoffAt: '2026-06-11T16:00:00.000Z',
  });
  const scheduledKnockout = match({
    id: 'm-r32',
    homeTeamId: 't-c',
    awayTeamId: 't-d',
    groupLetter: null,
    stage: 'r32',
    bracketSlot: 1,
    kickoffAt: '2026-06-29T02:00:00.000Z',
    status: 'scheduled',
  });
  const liveKnockout = match({
    id: 'm-r16',
    homeTeamId: 't-e',
    awayTeamId: 't-f',
    groupLetter: null,
    stage: 'r16',
    bracketSlot: 1,
    kickoffAt: '2026-07-05T02:00:00.000Z',
    status: 'live',
  });
  const finishedKnockout = match({
    id: 'm-final',
    homeTeamId: 't-g',
    awayTeamId: 't-h',
    groupLetter: null,
    stage: 'final',
    bracketSlot: 1,
    kickoffAt: '2026-07-19T18:00:00.000Z',
    status: 'finished',
    homeScore: 2,
    awayScore: 1,
  });

  const matches = [finishedKnockout, scheduledKnockout, groupMatch, liveKnockout];

  it('includes knockout fixtures in the all filter', () => {
    expect(filterMatches(matches, { filter: 'all', group: '', myTeamIds: new Set() }).map((m) => m.id)).toEqual([
      'm-group',
      'm-r32',
      'm-r16',
      'm-final',
    ]);
  });

  it('includes scheduled and live knockout fixtures in upcoming', () => {
    expect(filterMatches(matches, { filter: 'upcoming', group: '', myTeamIds: new Set() }).map((m) => m.id)).toEqual([
      'm-group',
      'm-r32',
      'm-r16',
    ]);
  });

  it('includes finished knockout fixtures in completed', () => {
    expect(filterMatches(matches, { filter: 'completed', group: '', myTeamIds: new Set() }).map((m) => m.id)).toEqual([
      'm-final',
    ]);
  });

  it('includes knockout fixtures involving my teams', () => {
    expect(filterMatches(matches, { filter: 'mine', group: '', myTeamIds: new Set(['t-e']) }).map((m) => m.id)).toEqual([
      'm-r16',
    ]);
  });

  it('keeps group filtering scoped to group-stage fixtures', () => {
    expect(filterMatches(matches, { filter: 'all', group: 'A', myTeamIds: new Set() }).map((m) => m.id)).toEqual([
      'm-group',
    ]);
  });
});
