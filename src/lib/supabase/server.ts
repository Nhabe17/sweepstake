import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './env';

// Server-only client using the service-role key. NEVER import this into client code —
// the `server-only` guard above will turn that into a build error. The service-role key
// bypasses RLS, so this is how admin mutations are written.
export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false } });
}
