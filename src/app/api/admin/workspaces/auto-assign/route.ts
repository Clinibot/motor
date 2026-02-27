import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createLocalClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase environment variables are not configured.');
    }
    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST() {
    try {
        const supabase = await createLocalClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const supabaseAdmin = getSupabaseAdmin();

        // 1. Check if user already has a workspace
        const { data: userProfile, error: userError } = await supabaseAdmin
            .from('users')
            .select('workspace_id, role')
            .eq('id', userId)
            .single();

        if (userError) {
            return NextResponse.json({ success: false, error: "Error fetching user profile" }, { status: 500 });
        }

        // Allow superadmins to bypass or perhaps they don't need auto-assignment, but let's assign if null
        if (userProfile.workspace_id) {
            return NextResponse.json({ success: true, workspace_id: userProfile.workspace_id, message: "User already has a workspace" });
        }

        // 2. Find a free workspace. We need to find a workspace whose ID is NOT present in any user's workspace_id
        // Since Supabase might not support a simple "NOT IN" with another table easily in a single query from JS without RPC,
        // we can fetch all used workspace IDs first, then query for a workspace not in that list.

        const { data: usersWithWorkspaces, error: uwError } = await supabaseAdmin
            .from('users')
            .select('workspace_id')
            .not('workspace_id', 'is', null);

        if (uwError) {
            return NextResponse.json({ success: false, error: "Error checking assigned workspaces" }, { status: 500 });
        }

        const assignedWorkspaceIds = usersWithWorkspaces.map(u => u.workspace_id);

        // Fetch a free workspace
        let freeWorkspaceQuery = supabaseAdmin
            .from('workspaces')
            .select('id')
            .order('created_at', { ascending: true })
            .limit(1);

        if (assignedWorkspaceIds.length > 0) {
            freeWorkspaceQuery = freeWorkspaceQuery.not('id', 'in', `(${assignedWorkspaceIds.join(',')})`);
        }

        const { data: freeWorkspaces, error: fwError } = await freeWorkspaceQuery;

        if (fwError) {
            return NextResponse.json({ success: false, error: "Error fetching free workspaces" }, { status: 500 });
        }

        if (!freeWorkspaces || freeWorkspaces.length === 0) {
            return NextResponse.json({ success: false, error: "No free workspaces available. Please contact administrator." }, { status: 400 });
        }

        const selectedWorkspaceId = freeWorkspaces[0].id;

        // 3. Assign the workspace to the user
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({ workspace_id: selectedWorkspaceId })
            .eq('id', userId);

        if (updateError) {
            return NextResponse.json({ success: false, error: "Error assigning workspace to user" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            workspace_id: selectedWorkspaceId,
            message: "Workspace successfully assigned"
        });

    } catch (error: unknown) {
        console.error("Error in auto-assign workspace:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to auto-assign workspace" },
            { status: 500 }
        );
    }
}
