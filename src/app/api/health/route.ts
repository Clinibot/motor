import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    const checks: Record<string, 'ok' | 'missing' | 'error'> = {};

    // ── Env vars ──────────────────────────────────────────────────────────────
    checks.supabase_url    = process.env.NEXT_PUBLIC_SUPABASE_URL    ? 'ok' : 'missing';
    checks.supabase_key    = process.env.SUPABASE_SERVICE_ROLE_KEY   ? 'ok' : 'missing';
    checks.retell_secret   = process.env.RETELL_WEBHOOK_SECRET       ? 'ok' : 'missing';
    checks.openai_key      = process.env.OPENAI_API_KEY              ? 'ok' : 'missing';
    checks.site_url        = process.env.NEXT_PUBLIC_SITE_URL        ? 'ok' : 'missing';

    // ── Supabase connectivity ─────────────────────────────────────────────────
    try {
        const admin = createSupabaseAdmin();
        const { error } = await admin.from('workspaces').select('id').limit(1);
        checks.supabase_ping = error ? 'error' : 'ok';
    } catch {
        checks.supabase_ping = 'error';
    }

    const degraded = Object.values(checks).some(v => v !== 'ok');
    return NextResponse.json(
        { status: degraded ? 'degraded' : 'ok', checks },
        { status: degraded ? 503 : 200 }
    );
}
