import { describe, expect, it } from 'vitest';
import type { BracketParticipant } from './bracket';
import { projectedParticipantLabel, projectedParticipantTitle } from './participantLabels';

function participant(p: Partial<BracketParticipant> & Pick<BracketParticipant, 'source'>): BracketParticipant {
  return {
    teamId: 't-team',
    ...p,
  };
}

describe('projectedParticipantLabel', () => {
  it('labels projected group winners, runners-up, and best-third participants', () => {
    expect(projectedParticipantLabel(participant({ source: 'group_winner', sourceGroupLetter: 'A' }))).toBe(
      '1st A',
    );
    expect(projectedParticipantLabel(participant({ source: 'group_runner_up', sourceGroupLetter: 'D' }))).toBe(
      '2nd D',
    );
    expect(projectedParticipantLabel(participant({ source: 'best_third', sourceGroupLetter: 'J' }))).toBe(
      '3rd J',
    );
  });

  it('does not label real match or knockout-derived participants', () => {
    expect(projectedParticipantLabel(participant({ source: 'match' }))).toBeNull();
    expect(projectedParticipantLabel(participant({ source: 'winner' }))).toBeNull();
    expect(projectedParticipantLabel(participant({ source: 'loser' }))).toBeNull();
  });

  it('does not label unresolved TBD participants', () => {
    expect(projectedParticipantLabel(participant({ source: 'tbd', teamId: null }))).toBeNull();
  });

  it('provides descriptive titles for projected labels', () => {
    expect(projectedParticipantTitle(participant({ source: 'group_winner', sourceGroupLetter: 'A' }))).toBe(
      'Winner Group A',
    );
    expect(projectedParticipantTitle(participant({ source: 'group_runner_up', sourceGroupLetter: 'D' }))).toBe(
      'Runner-up Group D',
    );
    expect(projectedParticipantTitle(participant({ source: 'best_third', sourceGroupLetter: 'J' }))).toBe(
      'Best third Group J',
    );
    expect(projectedParticipantTitle(participant({ source: 'match' }))).toBeNull();
  });
});
