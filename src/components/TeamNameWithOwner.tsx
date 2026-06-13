import type { Player, Team } from '@/lib/types';

// Renders e.g. "Mexico (Y)", or "Mexico (-)" when the team has no owner.
export default function TeamNameWithOwner({
  team,
  owner,
  className = '',
  codeClassName = '',
}: {
  team: Pick<Team, 'name'> | null | undefined;
  owner: Pick<Player, 'displayCode'> | null | undefined;
  className?: string;
  codeClassName?: string;
}) {
  if (!team) return <span className={className}>—</span>;
  return (
    <span className={className}>
      {team.name}{' '}
      <span className={`text-muted ${codeClassName}`}>({owner?.displayCode ?? '-'})</span>
    </span>
  );
}
