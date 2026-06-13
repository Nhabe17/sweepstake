import type { SweepstakeStore } from './store';
import { localStore } from './localStore';
import { supabaseStore } from './supabaseStore';
import { isSupabaseConfigured } from '@/lib/supabase/env';

// Picks the data backend. With Supabase env vars present the app uses shared cloud data;
// otherwise it falls back to localStorage seed data, so it always runs with zero config.
export function getStore(): SweepstakeStore {
  return isSupabaseConfigured ? supabaseStore : localStore;
}

export const store = getStore();
export type { SweepstakeStore } from './store';
