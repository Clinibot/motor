import { createSupabaseAdmin } from '@/lib/supabase/admin';

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

// How often to run passive cleanup of stale keys (every N calls).
// Keeps the table from growing unbounded without a dedicated cron.
const CLEANUP_EVERY_N_CALLS = 50;
let callCounter = 0;

/**
 * Attempts to claim an idempotency key in Supabase.
 *
 * Returns 'new'       — key was fresh; caller should proceed with the operation.
 * Returns 'duplicate' — key already existed within TTL; caller should return
 *                       a cached "already done" response.
 *
 * How it works:
 *   1. Delete the key if it expired (allows retry after TTL).
 *   2. INSERT the key. If the INSERT succeeds → new request.
 *      If it fails with unique violation (23505) → duplicate within TTL.
 *
 * The unique constraint on `idempotency_keys.key` makes step 2 atomic:
 * two concurrent requests for the same key can never both succeed.
 *
 * Requires the table in:
 *   supabase/migrations/20260411_idempotency_keys.sql
 */
export async function claimIdempotencyKey(
    supabaseAdmin: SupabaseAdmin,
    key: string,
    ttlMs: number,
): Promise<'new' | 'duplicate'> {
    const cutoff = new Date(Date.now() - ttlMs).toISOString();

    // 1. Delete the key only if it is already expired.
    //    A fresh key from a concurrent request will NOT be deleted here
    //    (its created_at is after the cutoff), so that request's INSERT still wins.
    await supabaseAdmin
        .from('idempotency_keys')
        .delete()
        .eq('key', key)
        .lt('created_at', cutoff);

    // 2. Try to insert atomically. A unique violation means the key is live.
    const { error } = await supabaseAdmin
        .from('idempotency_keys')
        .insert({ key });

    if (error) {
        // 23505 = unique_violation → duplicate within TTL
        if (error.code === '23505') return 'duplicate';
        // Any other DB error: log and treat conservatively as 'new'
        // (better to let the operation through than to silently block it)
        console.error('[idempotency] Unexpected error checking key:', error);
        return 'new';
    }

    // Passive cleanup: occasionally remove all keys older than 1 hour
    // to prevent unbounded table growth.
    callCounter++;
    if (callCounter % CLEANUP_EVERY_N_CALLS === 0) {
        const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
        void supabaseAdmin
            .from('idempotency_keys')
            .delete()
            .lt('created_at', oneHourAgo);
    }

    return 'new';
}

/**
 * Releases an idempotency key (e.g. when the protected operation fails and
 * the caller wants to allow an immediate retry instead of waiting for TTL).
 */
export async function releaseIdempotencyKey(
    supabaseAdmin: SupabaseAdmin,
    key: string,
): Promise<void> {
    await supabaseAdmin
        .from('idempotency_keys')
        .delete()
        .eq('key', key);
}
