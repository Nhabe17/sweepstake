import type { ReactNode } from 'react';
import type { Match, Player, Settings, Team } from '@/lib/types';
import { getEffectiveScore, teamPointsInMatch } from '@/lib/calculations/effectiveResult';
import { dayTimeLabel } from '@/lib/format';
import TeamName from './TeamName';
import TeamNameWithOwner from './TeamNameWithOwner';

const STAGE_LABEL: Record<Match['stage'], string> = {
  group: 'Group',
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-final',
  sf: 'Semi-final',
  final: 'Final',
  third_place: 'Third place',
};

function StatusBadge({ status }: { status: Match['status'] }) {
  const map: Record<Match['status'], { label: string; cls: string }> = {
    scheduled: { label: 'Upcoming', cls: 'bg-slate-100 text-slate-600' },
    live: { label: 'Live', cls: 'bg-red-100 text-red-700' },
    finished: { label: 'Full time', cls: 'bg-emerald-100 text-emerald-700' },
    postponed: { label: 'Postponed', cls: 'bg-amber-100 text-amber-700' },
  };
  const { label, cls } = map[status];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

export default function MatchCard({
  match,
  homeTeam,
  awayTeam,
  homeOwner,
  awayOwner,
  settings,
}: {
  match: Match;
  homeTeam?: Team;
  awayTeam?: Team;
  homeOwner: Player | null;
  awayOwner: Player | null;
  settings: Settings;
}) {
  const score = getEffectiveScore(match);
  const showScore = (match.status === 'finished' || match.status === 'live') && score;
  const groupLabel = match.groupLetter
    ? `${STAGE_LABEL[match.stage]} ${match.groupLetter}`
    : STAGE_LABEL[match.stage];

  return (
    <article className="animate-slide-up rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span className="font-medium">{groupLabel}</span>
        <StatusBadge status={match.status} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 font-semibold text-ink">
          <TeamNameWithOwner team={homeTeam} owner={homeOwner} />
        </div>
        {showScore ? (
          <div className="shrink-0 text-lg font-bold tabular-nums text-ink">
            {score!.homeScore}-{score!.awayScore}
          </div>
        ) : (
          <div className="shrink-0 text-xs text-muted">vs</div>
        )}
        <div className="min-w-0 flex-1 text-right font-semibold text-ink">
          <TeamNameWithOwner team={awayTeam} owner={awayOwner} />
        </div>
      </div>

      {score && (score.homePens != null || score.awayPens != null) ? (
        <p className="mt-1 text-center text-[11px] text-muted">
          Penalties {score.homePens}-{score.awayPens}
        </p>
      ) : null}

      {match.status !== 'finished' ? (
        <p className="mt-2 text-center text-xs text-muted">{dayTimeLabel(match.kickoffAt)}</p>
      ) : null}

      <PointsSummary
        match={match}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        homeOwner={homeOwner}
        awayOwner={awayOwner}
        settings={settings}
      />
      <BettingOddsSummary
        match={match}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        settings={settings}
      />
    </article>
  );
}

function PointsSummary({
  match,
  homeTeam,
  awayTeam,
  homeOwner,
  awayOwner,
  settings,
}: {
  match: Match;
  homeTeam?: Team;
  awayTeam?: Team;
  homeOwner: Player | null;
  awayOwner: Player | null;
  settings: Settings;
}) {
  if (match.status !== 'finished') return null;

  const hp = homeTeam ? teamPointsInMatch(match, homeTeam.id, settings) : null;
  const ap = awayTeam ? teamPointsInMatch(match, awayTeam.id, settings) : null;

  return (
    <div className="mt-3 border-t border-slate-100 pt-2 text-xs">
      <p className="mb-1 font-medium text-muted">Points</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {homeOwner && hp ? (
          <span>
            {homeOwner.name} <strong className="text-brand-dark">+{hp.points}</strong>
          </span>
        ) : null}
        {awayOwner && ap ? (
          <span>
            {awayOwner.name} <strong className="text-brand-dark">+{ap.points}</strong>
          </span>
        ) : null}
      </div>
    </div>
  );
}

function BettingOddsSummary({
  match,
  homeTeam,
  awayTeam,
  settings,
}: {
  match: Match;
  homeTeam?: Team;
  awayTeam?: Team;
  settings: Settings;
}) {
  const odds = match.odds;
  if (!settings.showOdds || match.status !== 'scheduled' || !odds) return null;
  if (!odds.home && !odds.draw && !odds.away) return null;

  return (
    <div className="mt-3 border-t border-slate-100 pt-2 text-xs">
      <p className="mb-1 font-medium text-muted">Betting odds</p>
      <div className="grid grid-cols-3 gap-2">
        <OddsCell label={<TeamName team={homeTeam} fallback="Home" />} price={odds.home?.price} />
        <OddsCell label="Draw" price={odds.draw?.price} />
        <OddsCell label={<TeamName team={awayTeam} fallback="Away" />} price={odds.away?.price} />
      </div>
      <p className="mt-1 text-[11px] text-muted">
        Best {odds.region.toUpperCase()} odds &middot; updated {oddsUpdatedLabel(odds.providerLastUpdate ?? odds.syncedAt)}
      </p>
    </div>
  );
}

function OddsCell({ label, price }: { label: ReactNode; price?: number }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] text-muted">{label}</p>
      <p className="font-bold tabular-nums text-ink">{price == null ? '-' : price.toFixed(2)}</p>
    </div>
  );
}

function oddsUpdatedLabel(value: string): string {
  return new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
