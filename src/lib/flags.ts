const FOOTBALL_TO_ISO_ALPHA2: Record<string, string> = {
  ALG: 'DZ',
  ARG: 'AR',
  AUS: 'AU',
  AUT: 'AT',
  BEL: 'BE',
  BIH: 'BA',
  BRA: 'BR',
  CAN: 'CA',
  CIV: 'CI',
  COD: 'CD',
  COL: 'CO',
  CPV: 'CV',
  CRO: 'HR',
  CUW: 'CW',
  CZE: 'CZ',
  ECU: 'EC',
  EGY: 'EG',
  ESP: 'ES',
  FRA: 'FR',
  GER: 'DE',
  GHA: 'GH',
  HAI: 'HT',
  IRN: 'IR',
  IRQ: 'IQ',
  JOR: 'JO',
  JPN: 'JP',
  KOR: 'KR',
  KSA: 'SA',
  MAR: 'MA',
  MEX: 'MX',
  NED: 'NL',
  NOR: 'NO',
  NZL: 'NZ',
  PAN: 'PA',
  PAR: 'PY',
  POR: 'PT',
  QAT: 'QA',
  RSA: 'ZA',
  SEN: 'SN',
  SUI: 'CH',
  SWE: 'SE',
  TUN: 'TN',
  TUR: 'TR',
  URU: 'UY',
  USA: 'US',
  UZB: 'UZ',
};

const SUBDIVISION_TAGS: Record<string, string> = {
  ENG: 'gbeng',
  SCO: 'gbsct',
};

const SUPPORTED_ISO_ALPHA2 = new Set(Object.values(FOOTBALL_TO_ISO_ALPHA2));

export function countryCodeToFlag(countryCode: string | null | undefined): string | null {
  const code = countryCode?.trim().toUpperCase();
  if (!code) return null;

  const subdivisionTag = SUBDIVISION_TAGS[code];
  if (subdivisionTag) return subdivisionFlag(subdivisionTag);

  const alpha2 = code.length === 2 ? code : FOOTBALL_TO_ISO_ALPHA2[code];
  if (!alpha2 || !SUPPORTED_ISO_ALPHA2.has(alpha2)) return null;

  return alpha2Flag(alpha2);
}

function alpha2Flag(alpha2: string): string {
  const first = alpha2.codePointAt(0)! - 65 + 0x1f1e6;
  const second = alpha2.codePointAt(1)! - 65 + 0x1f1e6;
  return String.fromCodePoint(first, second);
}

function subdivisionFlag(tag: string): string {
  return String.fromCodePoint(
    0x1f3f4,
    ...Array.from(tag.toLowerCase()).map((char) => 0xe0000 + char.codePointAt(0)!),
    0xe007f,
  );
}
