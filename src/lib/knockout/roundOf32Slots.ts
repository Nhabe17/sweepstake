export type GroupLetter =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L';

export type RoundOf32ParticipantSource =
  | { type: 'group_winner'; groupLetter: GroupLetter }
  | { type: 'group_runner_up'; groupLetter: GroupLetter }
  | { type: 'best_third'; allowedGroupLetters: readonly GroupLetter[] };

export interface RoundOf32SlotDefinition {
  stage: 'r32';
  bracketSlot: number;
  matchNumber: number;
  home: RoundOf32ParticipantSource;
  away: RoundOf32ParticipantSource;
}

export const ROUND_OF_32_SLOT_DEFINITIONS = [
  slot(1, 73, runnerUp('A'), runnerUp('B')),
  slot(2, 74, winner('E'), bestThird(['A', 'B', 'C', 'D', 'F'])),
  slot(3, 75, winner('F'), runnerUp('C')),
  slot(4, 76, winner('C'), runnerUp('F')),
  slot(5, 77, winner('I'), bestThird(['C', 'D', 'F', 'G', 'H'])),
  slot(6, 78, runnerUp('E'), runnerUp('I')),
  slot(7, 79, winner('A'), bestThird(['C', 'E', 'F', 'H', 'I'])),
  slot(8, 80, winner('L'), bestThird(['E', 'H', 'I', 'J', 'K'])),
  slot(9, 81, winner('D'), bestThird(['B', 'E', 'F', 'I', 'J'])),
  slot(10, 82, winner('G'), bestThird(['A', 'E', 'H', 'I', 'J'])),
  slot(11, 83, runnerUp('K'), runnerUp('L')),
  slot(12, 84, winner('H'), runnerUp('J')),
  slot(13, 85, winner('B'), bestThird(['E', 'F', 'G', 'I', 'J'])),
  slot(14, 86, winner('J'), runnerUp('H')),
  slot(15, 87, winner('K'), bestThird(['D', 'E', 'I', 'J', 'L'])),
  slot(16, 88, runnerUp('D'), runnerUp('G')),
] as const satisfies readonly RoundOf32SlotDefinition[];

export function getRoundOf32SlotDefinition(bracketSlot: number): RoundOf32SlotDefinition | null {
  if (!Number.isInteger(bracketSlot)) return null;
  return ROUND_OF_32_SLOT_DEFINITIONS.find((definition) => definition.bracketSlot === bracketSlot) ?? null;
}

export function roundOf32SourceLabel(source: RoundOf32ParticipantSource): string {
  switch (source.type) {
    case 'group_winner':
      return `Winner Group ${source.groupLetter}`;
    case 'group_runner_up':
      return `Runner-up Group ${source.groupLetter}`;
    case 'best_third':
      return `Best third ${source.allowedGroupLetters.join('/')}`;
  }
}

function slot(
  bracketSlot: number,
  matchNumber: number,
  home: RoundOf32ParticipantSource,
  away: RoundOf32ParticipantSource,
): RoundOf32SlotDefinition {
  return { stage: 'r32', bracketSlot, matchNumber, home, away };
}

function winner(groupLetter: GroupLetter): RoundOf32ParticipantSource {
  return { type: 'group_winner', groupLetter };
}

function runnerUp(groupLetter: GroupLetter): RoundOf32ParticipantSource {
  return { type: 'group_runner_up', groupLetter };
}

function bestThird(allowedGroupLetters: readonly GroupLetter[]): RoundOf32ParticipantSource {
  return { type: 'best_third', allowedGroupLetters };
}
