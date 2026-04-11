import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createLocalClient } from '@/lib/supabase/server';
import { importDefaultVoices } from '@/lib/retell/importDefaultVoices';

export const dynamic = 'force-dynamic';

async function requireAdmin(): Promise<NextResponse | null> {
    const supabase = await createLocalClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();
    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    return null;
}


export async function GET() {
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const supabaseAdmin = createSupabaseAdmin();
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
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const supabaseAdmin = createSupabaseAdmin();
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

        // Auto-import curated ElevenLabs voices into the new workspace (fire and forget)
        if (retell_api_key && newWorkspace) {
            importDefaultVoices(retell_api_key).catch(e => console.warn('[workspaces] import-defaults failed:', e));
        }

        return NextResponse.json({ success: true, workspace: newWorkspace });
    } catch (error: unknown) {
        console.error("Error creating workspace:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to create workspace" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const supabaseAdmin = createSupabaseAdmin();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: "Workspace ID is required" }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('workspaces')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Error deleting workspace:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to delete workspace" },
            { status: 500 }
        );
    }
}

export async function PATCH(req: Request) {
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const supabaseAdmin = createSupabaseAdmin();
        const { searchParams } = new URL(req.url);
        const queryId = searchParams.get('id');
        
        const body = await req.json();
        const { id: bodyId, name, retell_api_key } = body;
        
        const id = queryId || bodyId;

        if (!id) {
            return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
        }

        const updates: Record<string, string> = {};
        if (name) updates.name = name;
        if (retell_api_key) updates.retell_api_key = retell_api_key;

        const { error } = await supabaseAdmin
            .from('workspaces')
            .update(updates)
            .eq('id', id);

        if (error) throw error;

        // If API key was updated, re-import curated voices (fire and forget)
        if (retell_api_key) {
            importDefaultVoices(retell_api_key).catch(e => console.warn('[workspaces] import-defaults failed on PATCH:', e));
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Error updating workspace:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to update workspace" },
            { status: 500 }
        );
    }
}
