import type { Match, Player, Settings, Team } from '@/lib/types';
import { computeGroupTable } from '@/lib/calculations/groupStandings';
import { teamStatusInGroup } from '@/lib/derive';
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
      <div className="grid grid-cols-[1.5rem_1fr_1.75rem_1.75rem_1.75rem_2.25rem_2.5rem] items-center gap-x-1 border-b border-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <span>#</span>
        <span>Team</span>
        <span className="text-right">W</span>
        <span className="text-right">D</span>
        <span className="text-right">L</span>
        <span className="text-right">GD</span>
        <span className="text-right">Pts</span>
      </div>
      <ul>
        {rows.map((row) => {
          const status = teamStatusInGroup(row.team, teams, matches, settings);
          const eliminated = status === 'eliminated';
          return (
            <li key={row.team.id} className={`grid grid-cols-[1.5rem_1fr_1.75rem_1.75rem_1.75rem_2.25rem_2.5rem] items-center gap-x-1 border-b border-slate-50 px-3 py-2.5 last:border-0 ${eliminated ? 'opacity-50' : ''}`}>
              <span className="text-sm font-bold tabular-nums text-muted">{row.position}</span>
              <span className={`min-w-0 overflow-hidden font-medium ${eliminated ? 'text-muted line-through' : 'text-ink'}`}>
                <TeamNameWithOwner team={row.team} owner={ownerOf(row.team)} />
              </span>
              <span className="text-right text-sm tabular-nums text-ink">{row.wins}</span>
              <span className="text-right text-sm tabular-nums text-ink">{row.draws}</span>
              <span className="text-right text-sm tabular-nums text-ink">{row.losses}</span>
              <span className="text-right text-sm tabular-nums text-muted">
                {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
              </span>
              <span className="text-right text-sm font-bold tabular-nums text-ink">{row.points}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
