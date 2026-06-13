import type { Match, Player, Settings, Team } from '@/lib/types';
import { computeGroupTable } from '@/lib/calculations/groupStandings';
import TeamNameWithOwner from './TeamNameWithOwner';

export default function GroupTable({
  groupLetter,
  teams,
  matches,
  settings,
  ownerOf,
}: {
  groupLetter: string;
  teams: Team[];
  matches: Match[];
  settings: Settings;
  ownerOf: (team: Team | null | undefined) => Player | null;
}) {
  const rows = computeGroupTable(groupLetter, teams, matches, settings);

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="grid grid-cols-[1.5rem_1fr_2rem] items-center gap-2 border-b border-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <span>#</span>
        <span>Team</span>
        <span className="text-right">Pts</span>
      </div>
      <ul>
        {rows.map((row) => (
          <li key={row.team.id} className="border-b border-slate-50 px-3 py-2 last:border-0">
            <div className="grid grid-cols-[1.5rem_1fr_2rem] items-center gap-2">
              <span className="text-sm font-bold tabular-nums text-muted">{row.position}</span>
              <span className="font-medium text-ink">
                <TeamNameWithOwner team={row.team} owner={ownerOf(row.team)} />
              </span>
              <span className="text-right text-sm font-bold tabular-nums text-ink">{row.points}</span>
            </div>
            <p className="mt-0.5 pl-[1.9rem] text-[11px] tabular-nums text-muted">
              P{row.played} W{row.wins} D{row.draws} L{row.losses} · GD{' '}
              {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
