import { describe, expect, it } from 'vitest';
import { countryCodeToFlag } from './flags';
import { SEED_TEAMS } from './seed/teams';

function regional(alpha2: string): number[] {
  return Array.from(alpha2).map((char) => char.codePointAt(0)! - 65 + 0x1f1e6);
}

function subdivision(tag: string): number[] {
  return [0x1f3f4, ...Array.from(tag).map((char) => 0xe0000 + char.codePointAt(0)!), 0xe007f];
}

function codePoints(value: string | null): number[] {
  return value ? Array.from(value).map((char) => char.codePointAt(0)!) : [];
}

describe('countryCodeToFlag', () => {
  it('maps football country codes to regional-indicator flags', () => {
    expect(codePoints(countryCodeToFlag('USA'))).toEqual(regional('US'));
    expect(codePoints(countryCodeToFlag('BRA'))).toEqual(regional('BR'));
    expect(codePoints(countryCodeToFlag('RSA'))).toEqual(regional('ZA'));
    expect(codePoints(countryCodeToFlag('KOR'))).toEqual(regional('KR'));
  });

  it('maps England and Scotland to subdivision flags', () => {
    expect(codePoints(countryCodeToFlag('ENG'))).toEqual(subdivision('gbeng'));
    expect(codePoints(countryCodeToFlag('SCO'))).toEqual(subdivision('gbsct'));
  });

  it('accepts direct ISO alpha-2 codes', () => {
    expect(codePoints(countryCodeToFlag('mx'))).toEqual(regional('MX'));
  });

  it('returns null for missing or unknown codes', () => {
    expect(countryCodeToFlag('')).toBeNull();
    expect(countryCodeToFlag(null)).toBeNull();
    expect(countryCodeToFlag(undefined)).toBeNull();
    expect(countryCodeToFlag('???')).toBeNull();
    expect(countryCodeToFlag('XX')).toBeNull();
  });

  it('covers every seeded team', () => {
    for (const team of SEED_TEAMS) {
      expect(countryCodeToFlag(team.countryCode), team.name).toBeTruthy();
    }
  });
});
