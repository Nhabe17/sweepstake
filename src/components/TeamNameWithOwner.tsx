import type { Player, Team } from '@/lib/types';
import TeamFlag from './TeamFlag';

// Renders e.g. "Mexico (Y)", or "Mexico (-)" when the team has no owner.
export default function TeamNameWithOwner({
  team,
  owner,
  className = '',
  codeClassName = '',
}: {
  team: Pick<Team, 'name' | 'countryCode'> | null | undefined;
  owner: Pick<Player, 'displayCode'> | null | undefined;
  className?: string;
  codeClassName?: string;
}) {
  if (!team) return <span className={className}>&mdash;</span>;

  return (
    <span className={`inline-flex max-w-full min-w-0 items-center gap-1.5 align-baseline ${className}`}>
      <TeamFlag countryCode={team.countryCode} />
      <span className="min-w-0 truncate">{team.name}</span>
      <span className={`shrink-0 text-muted ${codeClassName}`}>({owner?.displayCode ?? '-'})</span>
    </span>
  );
}
