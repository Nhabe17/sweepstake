'use client';

import { useRef } from 'react';
import type { Player, Team } from '@/lib/types';
import { getEffectiveScore } from '@/lib/calculations/effectiveResult';
import { dayLabel, timeLabel } from '@/lib/format';
import type { BracketParticipant, KnockoutBracket as KnockoutBracketModel, KnockoutSlot } from '@/lib/knockout/bracket';
import { projectedParticipantLabel, projectedParticipantTitle } from '@/lib/knockout/participantLabels';
import TeamNameWithOwner from './TeamNameWithOwner';

const STAGE_LABEL: Record<string, string> = {
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-finals',
  sf: 'Semi-finals',
  final: 'Final',
  third_place: 'Third place',
};

// Card height is 5.35rem and the R32 gap is 0.75rem (gap-3), giving a 6.10rem R32 pitch.
// Each deeper round doubles the pitch so its card centres on the pair below it:
//   gap = pitch - 5.35   and   pt = ((2^depth - 1) / 2) * 6.10  (centres the first card).
const ROUND_SPACING: Record<string, string> = {
  r32: 'gap-3 pt-0',
  r16: 'gap-[6.85rem] pt-[3.05rem]',
  qf: 'gap-[19.05rem] pt-[9.15rem]',
  sf: 'gap-[43.45rem] pt-[21.35rem]',
  final: 'pt-[45.75rem]',
};

export default function KnockoutBracket({
  bracket,
  teamById,
  ownerOf,
}: {
  bracket: KnockoutBracketModel;
  teamById: (id: string) => Team | undefined;
  ownerOf: (team: Team | null | undefined) => Player | null;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollByRound(direction: -1 | 1) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const firstRound = scroller.querySelector<HTMLElement>('[data-knockout-round]');
    const amount = firstRound ? firstRound.offsetWidth + 16 : 220;
    scroller.scrollBy({ left: amount * direction, behavior: 'smooth' });
  }

  return (
    <section className="relative">
      <div className="mb-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => scrollByRound(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-semibold text-muted shadow-sm transition-colors hover:text-ink"
          aria-label="Previous knockout rounds"
        >
          <span aria-hidden="true">&lsaquo;</span>
        </button>
        <button
          type="button"
          onClick={() => scrollByRound(1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-semibold text-muted shadow-sm transition-colors hover:text-ink"
          aria-label="Next knockout rounds"
        >
          <span aria-hidden="true">&rsaquo;</span>
        </button>
      </div>

      <div
        ref={scrollerRef}
        className="-mx-4 overflow-x-auto px-4 pb-4 [scrollbar-width:thin] snap-x snap-mandatory"
      >
        <div className="flex min-w-max items-start gap-4">
          {bracket.rounds.map((round, roundIndex) => (
            <div
              key={round.stage}
              data-knockout-round
              className="w-[11.75rem] shrink-0 snap-start sm:w-[12.75rem]"
            >
              <h2 className="mb-3 h-6 text-center text-xs font-bold text-ink">{STAGE_LABEL[round.stage]}</h2>
              <div className={`relative flex flex-col ${ROUND_SPACING[round.stage]}`}>
                {round.slots.map((slot) => (
                  <BracketSlotCard
                    key={`${slot.stage}-${slot.bracketSlot}`}
                    slot={slot}
                    showConnector={roundIndex < bracket.rounds.length - 1}
                    teamById={teamById}
                    ownerOf={ownerOf}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ThirdPlaceCard
        slot={bracket.thirdPlace}
        teamById={teamById}
        ownerOf={ownerOf}
      />
    </section>
  );
}

function BracketSlotCard({
  slot,
  showConnector,
  teamById,
  ownerOf,
}: {
  slot: KnockoutSlot;
  showConnector: boolean;
  teamById: (id: string) => Team | undefined;
  ownerOf: (team: Team | null | undefined) => Player | null;
}) {
  const match = slot.match;
  const score = match ? getEffectiveScore(match) : null;
  const showScore = Boolean(score && (match?.status === 'finished' || match?.status === 'live'));

  return (
    <article className="relative h-[5.35rem] rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
      {showConnector ? (
        <span
          aria-hidden="true"
          className="absolute left-full top-1/2 hidden h-px w-4 bg-slate-300 sm:block"
        />
      ) : null}

      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-muted">
        <span className="min-w-0 truncate">{match ? `${dayLabel(match.kickoffAt)}, ${timeLabel(match.kickoffAt)}` : 'TBD'}</span>
        {match ? <StatusPill status={match.status} /> : null}
      </div>

      <ParticipantRow
        participant={slot.home}
        teamById={teamById}
        ownerOf={ownerOf}
        score={showScore ? score!.homeScore : null}
      />
      <ParticipantRow
        participant={slot.away}
        teamById={teamById}
        ownerOf={ownerOf}
        score={showScore ? score!.awayScore : null}
      />

      {score && (score.homePens != null || score.awayPens != null) ? (
        <p className="mt-0.5 truncate text-center text-[10px] text-muted">
          Pens {score.homePens}-{score.awayPens}
        </p>
      ) : null}
    </article>
  );
}

function ParticipantRow({
  participant,
  teamById,
  ownerOf,
  score,
}: {
  participant: BracketParticipant;
  teamById: (id: string) => Team | undefined;
  ownerOf: (team: Team | null | undefined) => Player | null;
  score: number | null;
}) {
  const team = participant.teamId ? teamById(participant.teamId) : undefined;
  const owner = ownerOf(team);
  const projectionLabel = team ? projectedParticipantLabel(participant) : null;
  const projectionTitle = team ? projectedParticipantTitle(participant) : null;

  return (
    <div className="flex h-6 min-w-0 items-center gap-2">
      {team ? null : <ShieldPlaceholder />}
      <div className="min-w-0 flex-1 text-sm font-semibold text-ink">
        {team ? (
          <TeamNameWithOwner
            team={team}
            owner={owner}
            className="w-full"
            codeClassName="text-[11px]"
          />
        ) : (
          <span className="text-muted">TBD</span>
        )}
      </div>
      {projectionLabel ? (
        <span
          className="shrink-0 rounded-[3px] bg-slate-100 px-1 py-0.5 text-[10px] font-semibold leading-none text-muted"
          title={projectionTitle ?? undefined}
        >
          {projectionLabel}
        </span>
      ) : null}
      {score != null ? <span className="w-4 shrink-0 text-right text-sm font-bold tabular-nums text-ink">{score}</span> : null}
    </div>
  );
}

function ThirdPlaceCard({
  slot,
  teamById,
  ownerOf,
}: {
  slot: KnockoutSlot;
  teamById: (id: string) => Team | undefined;
  ownerOf: (team: Team | null | undefined) => Player | null;
}) {
  return (
    <div className="mt-4 max-w-[13rem]">
      <h2 className="mb-2 text-xs font-bold text-ink">{STAGE_LABEL.third_place}</h2>
      <BracketSlotCard
        slot={slot}
        showConnector={false}
        teamById={teamById}
        ownerOf={ownerOf}
      />
    </div>
  );
}

function StatusPill({ status }: { status: KnockoutSlot['match'] extends infer M ? M extends { status: infer S } ? S : never : never }) {
  if (status === 'live') {
    return <span className="rounded-full bg-red-100 px-1.5 py-0.5 font-semibold text-red-700">Live</span>;
  }
  if (status === 'finished') {
    return <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-700">FT</span>;
  }
  if (status === 'postponed') {
    return <span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-700">PPD</span>;
  }
  return <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">Soon</span>;
}

function ShieldPlaceholder() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 shrink-0 bg-slate-300 [clip-path:polygon(50%_0,88%_18%,82%_72%,50%_100%,18%_72%,12%_18%)]"
    />
  );
}
