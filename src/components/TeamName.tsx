import type { Team } from '@/lib/types';
import TeamFlag from './TeamFlag';

export default function TeamName({
  team,
  fallback = '-',
  className = '',
  nameClassName = '',
}: {
  team: Pick<Team, 'name' | 'countryCode'> | null | undefined;
  fallback?: string;
  className?: string;
  nameClassName?: string;
}) {
  if (!team) return <span className={className}>{fallback}</span>;

  return (
    <span className={`inline-flex max-w-full min-w-0 items-center gap-1.5 align-baseline ${className}`}>
      <TeamFlag countryCode={team.countryCode} />
      <span className={`min-w-0 ${nameClassName}`}>{team.name}</span>
    </span>
  );
}
