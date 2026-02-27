import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase environment variables are not configured.');
    }
    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET() {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const [{ data: workspaces, error }, { data: users, error: userError }] = await Promise.all([
            supabaseAdmin.from('workspaces').select('*').order('created_at', { ascending: false }),
            supabaseAdmin.from('users').select('id, workspace_id').not('workspace_id', 'is', null)
        ]);

        if (error) throw error;
        if (userError) throw userError;

        // Map workspaces to include user assignment info
        const enhancedWorkspaces = workspaces?.map(ws => {
            const assignedUsers = users?.filter(u => u.workspace_id === ws.id) || [];
            return {
                ...ws,
                users_count: assignedUsers.length,
                is_free: assignedUsers.length === 0
            };
        });

        return NextResponse.json({ success: true, workspaces: enhancedWorkspaces });
    } catch (error: unknown) {
        console.error("Error fetching workspaces:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to fetch workspaces" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await req.json();
        const { name, retell_api_key } = body;

        if (!name) {
            return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
        }

        const { data: newWorkspace, error } = await supabaseAdmin
            .from('workspaces')
            .insert([{ name, retell_api_key }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, workspace: newWorkspace });
    } catch (error: unknown) {
        console.error("Error creating workspace:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to create workspace" },
            { status: 500 }
        );
    }
}
