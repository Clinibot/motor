import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

/**
 * Checks and increments a rate-limit counter for `key`.
 *
 * Uses the `increment_rate_limit` Postgres RPC (fixed-window, atomic).
 *
 * Returns null   → request is allowed, caller should proceed.
 * Returns a 429 NextResponse → limit exceeded, caller should return it immediately.
 *
 * Requires the SQL function in:
 *   supabase/migrations/20260411_rate_limit.sql
 *
 * @param supabaseAdmin  Admin client (service role)
 * @param key            Unique string identifying the bucket, e.g. "agent:create:ws-123"
 * @param maxRequests    Maximum requests allowed within the window
 * @param windowSeconds  Window length in seconds
 * @param errorMsg       Human-readable message returned in the 429 body
 */
export async function checkRateLimit(
    supabaseAdmin: SupabaseAdmin,
    key: string,
    maxRequests: number,
    windowSeconds: number,
    errorMsg = 'Demasiadas solicitudes. Por favor espera un momento.',
): Promise<NextResponse | null> {
    const { data: allowed, error } = await supabaseAdmin
        .rpc('increment_rate_limit', {
            p_key: key,
            p_max: maxRequests,
            p_window_seconds: windowSeconds,
        });

    if (error) {
        // On DB error, fail open (allow the request) to avoid blocking legitimate traffic.
        console.error('[rateLimit] RPC error (failing open):', error);
        return null;
    }

    if (!allowed) {
        return NextResponse.json(
            { success: false, error: errorMsg },
            { status: 429 }
        );
    }

    return null;
}
