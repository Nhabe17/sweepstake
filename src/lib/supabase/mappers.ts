import type { Match, Player, Team } from '@/lib/types';

// Snake_case DB rows <-> camelCase app types.

export function rowToPlayer(r: Record<string, unknown>): Player {
  return {
    id: r.id as string,
    name: r.name as string,
    displayCode: r.display_code as string,
    email: (r.email as string) ?? null,
    isAdmin: Boolean(r.is_admin),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export function playerToRow(p: Player): Record<string, unknown> {
  return {
    id: p.id,
    name: p.name,
    display_code: p.displayCode,
    email: p.email ?? null,
    is_admin: p.isAdmin,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

export function rowToTeam(r: Record<string, unknown>): Team {
  return {
    id: r.id as string,
    name: r.name as string,
    countryCode: (r.country_code as string) ?? null,
    groupLetter: r.group_letter as string,
    pot: (r.pot as number) ?? null,
    ownerPlayerId: (r.owner_player_id as string) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export function teamToRow(t: Team): Record<string, unknown> {
  return {
    id: t.id,
    name: t.name,
    country_code: t.countryCode ?? null,
    group_letter: t.groupLetter,
    pot: t.pot ?? null,
    owner_player_id: t.ownerPlayerId ?? null,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

export function rowToMatch(r: Record<string, unknown>): Match {
  const n = (v: unknown): number | null => (v == null ? null : (v as number));
  return {
    id: r.id as string,
    externalId: (r.external_id as string) ?? null,
    groupLetter: (r.group_letter as string) ?? null,
    stage: r.stage as Match['stage'],
    homeTeamId: r.home_team_id as string,
    awayTeamId: r.away_team_id as string,
    kickoffAt: r.kickoff_at as string,
    status: r.status as Match['status'],
    homeScore: n(r.home_score),
    awayScore: n(r.away_score),
    homePens: n(r.home_pens),
    awayPens: n(r.away_pens),
    apiHomeScore: n(r.api_home_score),
    apiAwayScore: n(r.api_away_score),
    overrideHomeScore: n(r.override_home_score),
    overrideAwayScore: n(r.override_away_score),
    overrideHomePens: n(r.override_home_pens),
    overrideAwayPens: n(r.override_away_pens),
    odds: (r.odds as Match['odds']) ?? null,
    hasManualOverride: Boolean(r.has_manual_override),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export function matchToRow(m: Match): Record<string, unknown> {
  return {
    id: m.id,
    external_id: m.externalId ?? null,
    group_letter: m.groupLetter ?? null,
    stage: m.stage,
    home_team_id: m.homeTeamId,
    away_team_id: m.awayTeamId,
    kickoff_at: m.kickoffAt,
    status: m.status,
    home_score: m.homeScore ?? null,
    away_score: m.awayScore ?? null,
    home_pens: m.homePens ?? null,
    away_pens: m.awayPens ?? null,
    api_home_score: m.apiHomeScore ?? null,
    api_away_score: m.apiAwayScore ?? null,
    override_home_score: m.overrideHomeScore ?? null,
    override_away_score: m.overrideAwayScore ?? null,
    override_home_pens: m.overrideHomePens ?? null,
    override_away_pens: m.overrideAwayPens ?? null,
    odds: m.odds ?? null,
    has_manual_override: m.hasManualOverride,
    created_at: m.createdAt,
    updated_at: m.updatedAt,
  };
}
