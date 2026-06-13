import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

// Browser (anon) client — read-only access from the client. Writes are not permitted by
// RLS and must go through server actions.
let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserClient() {
  if (!cached) cached = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cached;
}
