import { NextResponse } from 'next/server';
import { createClient as createLocalClient } from '@/lib/supabase/server';

/**
 * Shared admin guard for API routes.
 *
 * Usage:
 *   const authError = await requireAdmin();
 *   if (authError) return authError;
 *
 * Returns a NextResponse (401/403) if the request is not from an admin/superadmin.
 * Returns null if the check passes — the caller may proceed.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
    const supabase = await createLocalClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    return null;
}
