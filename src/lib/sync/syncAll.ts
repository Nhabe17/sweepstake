import 'server-only';
import { createFootballDataProvider } from '@/lib/football/footballDataProvider';
import { syncOddsToDatabase, type OddsSyncResult } from '@/lib/odds/oddsSync';

export interface FullSyncResult {
  scoresUpdated: number;
  odds: OddsSyncResult;
}

export async function syncScoresAndOdds({ forceOdds = false }: { forceOdds?: boolean } = {}): Promise<FullSyncResult> {
  const provider = createFootballDataProvider();
  const { updated } = await provider.syncMatchesToDatabase();
  const odds = await syncOddsToDatabase({ force: forceOdds });
  return { scoresUpdated: updated, odds };
}

export function fullSyncMessage(result: FullSyncResult): string {
  const scoreText = `Updated ${result.scoresUpdated} match${result.scoresUpdated === 1 ? '' : 'es'}`;
  const oddsText = result.odds.skipped
    ? `Odds skipped: ${result.odds.message}`
    : result.odds.ok
      ? result.odds.message
      : `Odds failed: ${result.odds.message}`;
  return `${scoreText}. ${oddsText}`;
}
