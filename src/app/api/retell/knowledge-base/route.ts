import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createLocalClient } from '@/lib/supabase/server';
import Retell from 'retell-sdk';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase environment variables are not configured.');
    }
    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        let workspaceId = formData.get('workspace_id') as string | null;

        if (!file) {
            return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
        }

        const supabase = await createLocalClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized. Please log in first." }, { status: 401 });
        }

        const userId = session.user.id;
        const supabaseAdmin = getSupabaseAdmin();

        if (!workspaceId) {
            const { data: userProfile } = await supabaseAdmin
                .from('users')
                .select('workspace_id')
                .eq('id', userId)
                .single();

            if (!userProfile || !userProfile.workspace_id) {
                // Intentar auto-asignar un workspace libre
                const { data: usersWithWorkspaces } = await supabaseAdmin
                    .from('users')
                    .select('workspace_id')
                    .not('workspace_id', 'is', null);

                const assignedIds = (usersWithWorkspaces || []).map((u: { workspace_id: string }) => u.workspace_id);

                let freeWorkspaceQuery = supabaseAdmin
                    .from('workspaces')
                    .select('id')
                    .order('created_at', { ascending: true })
                    .limit(1);

                if (assignedIds.length > 0) {
                    freeWorkspaceQuery = freeWorkspaceQuery.not('id', 'in', `(${assignedIds.join(',')})`);
                }

                const { data: freeWorkspaces } = await freeWorkspaceQuery;

                if (!freeWorkspaces || freeWorkspaces.length === 0) {
                    return NextResponse.json({ success: false, error: "No hay workspaces disponibles. Contacta con el administrador." }, { status: 400 });
                }

                const newWorkspaceId = freeWorkspaces[0].id;
                await supabaseAdmin
                    .from('users')
                    .update({ workspace_id: newWorkspaceId })
                    .eq('id', userId);

                workspaceId = newWorkspaceId;
            } else {
                workspaceId = userProfile.workspace_id;
            }
        }

        const { data: workspace, error: wsError } = await supabaseAdmin
            .from('workspaces')
            .select('retell_api_key')
            .eq('id', workspaceId)
            .single();

        if (wsError || !workspace || !workspace.retell_api_key) {
            return NextResponse.json(
                { success: false, error: "Workspace not found or missing Retell API Key." },
                { status: 400 }
            );
        }

        const retellClient = new Retell({
            apiKey: workspace.retell_api_key,
        });

        // Retell accepts a Fetch Flow File object, which Node's File object loosely matches.
        const response = await retellClient.knowledgeBase.create({
            knowledge_base_name: file.name,
            knowledge_base_files: [file]
        });

        return NextResponse.json({
            success: true,
            knowledge_base_id: response.knowledge_base_id,
            name: file.name,
            size: (file.size / 1024).toFixed(1) + " KB",
            type: file.name.split('.').pop() || 'unknown'
        });

    } catch (error: unknown) {
        console.error("Error uploading knowledge base file:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to upload knowledge base" },
            { status: 500 }
        );
    }
}
