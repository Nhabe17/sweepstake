/**
 * Seed a Supabase project with the deterministic seed data.
 *
 * Prerequisites:
 *   1. Run supabase/schema.sql in your project first.
 *   2. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 *
 * Run:  npm run db:seed
 *
 * Idempotent: upserts by primary key, so re-running refreshes rows without duplicating.
 */
import { createClient } from '@supabase/supabase-js';
import { buildSeedData } from '../src/lib/seed';
import { matchToRow, playerToRow, teamToRow } from '../src/lib/supabase/mappers';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

async function main() {
  const db = createClient(url!, serviceKey!, { auth: { persistSession: false } });
  const seed = buildSeedData();

  console.log('Seeding players…');
  let res = await db.from('players').upsert(seed.players.map(playerToRow));
  if (res.error) throw res.error;

  console.log('Seeding teams…');
  res = await db.from('teams').upsert(seed.teams.map(teamToRow));
  if (res.error) throw res.error;

  console.log('Seeding matches…');
  res = await db.from('matches').upsert(seed.matches.map(matchToRow));
  if (res.error) throw res.error;

  console.log('Seeding settings…');
  res = await db
    .from('settings')
    .upsert({ id: 'app', key: 'app', value: seed.settings, updated_at: new Date().toISOString() });
  if (res.error) throw res.error;

  console.log(
    `Done: ${seed.players.length} players, ${seed.teams.length} teams, ${seed.matches.length} matches.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
