import { type NextRequest, NextResponse } from 'next/server';
import { syncScoresAndOdds } from '@/lib/sync/syncAll';

// GET /api/sync?token=<SYNC_SECRET>
// Called by an external cron service (e.g. cron-job.org) to pull live scores from
// football-data.org and write them into the api_* columns in Supabase.
// Set SYNC_SECRET in your environment; the endpoint rejects requests without it.
export async function GET(req: NextRequest) {
  const secret = process.env.SYNC_SECRET;
  if (secret) {
    const token = req.nextUrl.searchParams.get('token');
    if (token !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await syncScoresAndOdds({ forceOdds: req.nextUrl.searchParams.get('force') === '1' });
    return NextResponse.json({ ok: true, updated: result.scoresUpdated, odds: result.odds });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
