import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/**
 * Returns a Supabase client with the service role key (bypasses RLS).
 * Only call this from server-side code (API routes, Server Actions).
 * env.ts validates that the required variables exist at module load time.
 */
export function createSupabaseAdmin() {
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}
