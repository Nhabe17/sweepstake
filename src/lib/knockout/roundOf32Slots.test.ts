import { describe, expect, it } from 'vitest';
import {
  ROUND_OF_32_SLOT_DEFINITIONS,
  getRoundOf32SlotDefinition,
  roundOf32SourceLabel,
} from './roundOf32Slots';

describe('ROUND_OF_32_SLOT_DEFINITIONS', () => {
  it('defines every Round of 32 slot with two participant sources', () => {
    expect(ROUND_OF_32_SLOT_DEFINITIONS).toHaveLength(16);
    expect(ROUND_OF_32_SLOT_DEFINITIONS.map((definition) => definition.bracketSlot)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    ]);
    expect(ROUND_OF_32_SLOT_DEFINITIONS.map((definition) => definition.matchNumber)).toEqual([
      73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88,
    ]);

    for (const definition of ROUND_OF_32_SLOT_DEFINITIONS) {
      expect(definition.stage).toBe('r32');
      expect(definition.home).toBeDefined();
      expect(definition.away).toBeDefined();
    }
  });

  it('returns fixed winner and runner-up sources for known slots', () => {
    expect(getRoundOf32SlotDefinition(1)).toMatchObject({
      bracketSlot: 1,
      matchNumber: 73,
      home: { type: 'group_runner_up', groupLetter: 'A' },
      away: { type: 'group_runner_up', groupLetter: 'B' },
    });
    expect(getRoundOf32SlotDefinition(3)).toMatchObject({
      bracketSlot: 3,
      home: { type: 'group_winner', groupLetter: 'F' },
      away: { type: 'group_runner_up', groupLetter: 'C' },
    });
    expect(getRoundOf32SlotDefinition(16)).toMatchObject({
      bracketSlot: 16,
      home: { type: 'group_runner_up', groupLetter: 'D' },
      away: { type: 'group_runner_up', groupLetter: 'G' },
    });
  });

  it('exposes allowed group sets for third-place sources without selecting a team', () => {
    const slot2 = getRoundOf32SlotDefinition(2);
    const slot9 = getRoundOf32SlotDefinition(9);

    expect(slot2?.away).toEqual({
      type: 'best_third',
      allowedGroupLetters: ['A', 'B', 'C', 'D', 'F'],
    });
    expect(slot9?.away).toEqual({
      type: 'best_third',
      allowedGroupLetters: ['B', 'E', 'F', 'I', 'J'],
    });
  });

  it('returns null for invalid slot lookups', () => {
    expect(getRoundOf32SlotDefinition(0)).toBeNull();
    expect(getRoundOf32SlotDefinition(17)).toBeNull();
    expect(getRoundOf32SlotDefinition(1.5)).toBeNull();
  });

  it('formats concise source labels', () => {
    expect(roundOf32SourceLabel({ type: 'group_winner', groupLetter: 'A' })).toBe('Winner Group A');
    expect(roundOf32SourceLabel({ type: 'group_runner_up', groupLetter: 'D' })).toBe('Runner-up Group D');
    expect(roundOf32SourceLabel({ type: 'best_third', allowedGroupLetters: ['C', 'E', 'F'] })).toBe(
      'Best third C/E/F',
    );
  });
});
