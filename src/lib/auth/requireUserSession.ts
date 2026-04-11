import { NextResponse } from 'next/server';
import { createClient as createLocalClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type UserSession = {
    userId: string;
    workspaceId: string;
};

/**
 * Verifies the request has a valid session and returns the authenticated user's
 * workspace_id from the database — never from the client payload.
 *
 * Usage:
 *   const auth = await requireUserSession(supabaseAdmin);
 *   if ('error' in auth) return auth.error;
 *   const { userId, workspaceId } = auth;
 *
 * Returns `{ error: NextResponse }` on 401/400, or `UserSession` on success.
 */
export async function requireUserSession(
    supabaseAdmin: SupabaseAdmin,
): Promise<{ error: NextResponse } | UserSession> {
    const supabase = await createLocalClient();
    // getUser() verifies the session token with the Supabase server on every call.
    // getSession() only reads from the cookie without server-side validation — vulnerable
    // to replayed or tampered session cookies.
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return {
            error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
        };
    }

    const { data: profile } = await supabaseAdmin
        .from('users')
        .select('workspace_id')
        .eq('id', user.id)
        .single();

    if (!profile?.workspace_id) {
        return {
            error: NextResponse.json({ success: false, error: 'No workspace assigned' }, { status: 400 }),
        };
    }

    return { userId: user.id, workspaceId: profile.workspace_id };
}
