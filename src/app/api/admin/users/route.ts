import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export const dynamic = 'force-dynamic';


export async function GET() {
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const supabaseAdmin = createSupabaseAdmin();

        // Run all 3 independent queries in parallel
        const [
            { data: users, error: userError },
            { data: calls, error: callError },
            { data: phoneNumbersData, error: phoneError },
        ] = await Promise.all([
            supabaseAdmin
                .from('users')
                .select('id, full_name, email, workspace_id, workspaces(id, name)')
                .order('created_at', { ascending: false }),
            supabaseAdmin
                .from('calls')
                .select('workspace_id, duration_ms'),
            supabaseAdmin
                .from('phone_numbers')
                .select('phone_number, workspace_id'),
        ]);

        if (userError) throw userError;
        if (callError) throw callError;
        if (phoneError) throw phoneError;

        // Build lookup Maps once — O(n) — so each per-user lookup is O(1)
        const callStatsByWorkspace = new Map<string, { totalMs: number; count: number }>();
        for (const call of calls ?? []) {
            if (!call.workspace_id) continue;
            const existing = callStatsByWorkspace.get(call.workspace_id) ?? { totalMs: 0, count: 0 };
            callStatsByWorkspace.set(call.workspace_id, {
                totalMs: existing.totalMs + (call.duration_ms ?? 0),
                count: existing.count + 1,
            });
        }

        const phonesByWorkspace = new Map<string, Set<string>>();
        for (const p of phoneNumbersData ?? []) {
            if (!p.workspace_id || !p.phone_number) continue;
            const existing = phonesByWorkspace.get(p.workspace_id) ?? new Set<string>();
            existing.add(p.phone_number);
            phonesByWorkspace.set(p.workspace_id, existing);
        }

        const enhancedUsers = users?.map(user => {
            const workspaceId = user.workspace_id;
            const stats = callStatsByWorkspace.get(workspaceId) ?? { totalMs: 0, count: 0 };

            // Handle workspaces being an object or an array depending on Supabase version/types
            const workspaceData = (user.workspaces as unknown as { name: string } | { name: string }[]) || null;
            const workspaceName = Array.isArray(workspaceData)
                ? (workspaceData[0]?.name || 'Sin Workspace')
                : (workspaceData?.name || 'Sin Workspace');

            return {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                workspace_name: workspaceName,
                workspace_id: workspaceId,
                phone_numbers: Array.from(phonesByWorkspace.get(workspaceId) ?? []),
                total_minutes: Math.floor(stats.totalMs / 60000),
                calls_count: stats.count,
            };
        });

        return NextResponse.json({ success: true, users: enhancedUsers });
    } catch (error: unknown) {
        console.error("Error fetching admin users:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to fetch users" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 });
        }

        const supabaseAdmin = createSupabaseAdmin();

        // 1. Delete user from public.users (cascading might handle related tables depending on schema, 
        // but we ensure auth deletion specifically)
        const { error: deleteError } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', userId);

        if (deleteError) throw deleteError;

        // 2. Delete user from Auth (requires service role)
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        
        // We log but don't strictly fail if auth delete fails (e.g. user already gone from auth)
        if (authError) {
            console.warn("Auth deletion failed or user already deleted:", authError.message);
        }

        return NextResponse.json({ success: true, message: "User deleted successfully" });

    } catch (error: unknown) {
        console.error("Error deleting user:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to delete user" },
            { status: 500 }
        );
    }
}
