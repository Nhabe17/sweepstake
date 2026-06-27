import type { Match, Settings } from '@/lib/types';

export function shouldShowMatchOdds(match: Match, settings: Settings): boolean {
  const odds = match.odds;
  return Boolean(
    settings.showOdds &&
      match.status === 'scheduled' &&
      odds &&
      (odds.home || odds.draw || odds.away),
  );
}
