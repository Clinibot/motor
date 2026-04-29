import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/**
 * Returns a Supabase client with the service role key (bypasses RLS).
 * Only call this from server-side code (API routes, Server Actions).
 */
export function createSupabaseAdmin() {
    const url = env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';
    return createClient(url, key);
}
