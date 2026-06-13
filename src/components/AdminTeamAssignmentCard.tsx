import type { Player, Team } from '@/lib/types';

export default function AdminTeamAssignmentCard({
  team,
  players,
  onChange,
}: {
  team: Team;
  players: Player[];
  onChange: (playerId: string | null) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm">
      <div className="min-w-0">
        <p className="font-medium text-ink">{team.name}</p>
        <p className="text-xs text-muted">
          Group {team.groupLetter}
          {team.pot ? ` · Pot ${team.pot}` : ''}
        </p>
      </div>
      <select
        value={team.ownerPlayerId ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="min-h-10 shrink-0 rounded-lg border border-slate-200 bg-white px-2 text-sm"
        aria-label={`Owner for ${team.name}`}
      >
        <option value="">— Unassigned</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.displayCode})
          </option>
        ))}
      </select>
    </li>
  );
}
