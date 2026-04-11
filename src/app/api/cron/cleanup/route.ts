import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/cleanup
 * Deletes expired rows from rate_limit_windows and idempotency_keys.
 * Called hourly by Vercel Cron (vercel.json).
 * Protected by CRON_SECRET — Vercel sends it automatically via crons.Authorization header.
 */
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabaseAdmin = createSupabaseAdmin();
        const { error } = await supabaseAdmin.rpc('cleanup_expired_records');

        if (error) {
            console.error('[cron/cleanup] RPC error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        console.log('[cron/cleanup] Expired records cleaned up successfully');
        return NextResponse.json({ success: true });

    } catch (err: unknown) {
        console.error('[cron/cleanup] Unexpected error:', err);
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
