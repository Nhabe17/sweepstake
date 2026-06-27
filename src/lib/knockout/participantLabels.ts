import type { BracketParticipant } from './bracket';

export function projectedParticipantLabel(participant: BracketParticipant): string | null {
  switch (participant.source) {
    case 'group_winner':
      return participant.sourceGroupLetter ? `1st ${participant.sourceGroupLetter}` : null;
    case 'group_runner_up':
      return participant.sourceGroupLetter ? `2nd ${participant.sourceGroupLetter}` : null;
    case 'best_third':
      return participant.sourceGroupLetter ? `3rd ${participant.sourceGroupLetter}` : '3rd?';
    default:
      return null;
  }
}

export function projectedParticipantTitle(participant: BracketParticipant): string | null {
  switch (participant.source) {
    case 'group_winner':
      return participant.sourceGroupLetter ? `Winner Group ${participant.sourceGroupLetter}` : null;
    case 'group_runner_up':
      return participant.sourceGroupLetter ? `Runner-up Group ${participant.sourceGroupLetter}` : null;
    case 'best_third':
      return participant.sourceGroupLetter ? `Best third Group ${participant.sourceGroupLetter}` : 'Best third place';
    default:
      return null;
  }
}
