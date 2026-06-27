import type { Match } from '@/lib/types';
import { isToday } from '@/lib/format';

export type MatchFilter = 'all' | 'today' | 'upcoming' | 'completed' | 'mine';

export interface MatchFilterOptions {
  filter: MatchFilter;
  group: string;
  myTeamIds: Set<string>;
  now?: Date;
}

export function filterMatches(matches: Match[], options: MatchFilterOptions): Match[] {
  const { filter, group, myTeamIds, now } = options;
  return matches
    .filter((match) => {
      if (group && match.groupLetter !== group) return false;
      if (filter === 'today') return isToday(match.kickoffAt, now);
      if (filter === 'upcoming') return match.status === 'scheduled' || match.status === 'live';
      if (filter === 'completed') return match.status === 'finished';
      if (filter === 'mine') return myTeamIds.has(match.homeTeamId) || myTeamIds.has(match.awayTeamId);
      return true;
    })
    .sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt));
}
