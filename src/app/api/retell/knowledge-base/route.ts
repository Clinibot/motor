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
                    return NextResponse.json({ success: false, error: "No hay workspaces disponibles." }, { status: 400 });
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
                { success: false, error: "Workspace no encontrado o sin Retell API Key." },
                { status: 400 }
            );
        }

        // Usar fetch directo a la API de Retell (evita incompatibilidades del SDK con Node.js en Vercel)
        const retellFormData = new FormData();
        const knowledgeBaseName = file.name.split('.').slice(0, -1).join('.') || file.name;
        retellFormData.append('knowledge_base_name', knowledgeBaseName);

        // Convertir File a Blob para asegurar compatibilidad
        const bytes = await file.arrayBuffer();
        const blob = new Blob([bytes], { type: file.type || 'application/octet-stream' });
        retellFormData.append('knowledge_base_files', blob, file.name);

        const retellResponse = await fetch('https://api.retellai.com/create-knowledge-base', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${workspace.retell_api_key}`,
            },
            body: retellFormData,
        });

        if (!retellResponse.ok) {
            const errorText = await retellResponse.text();
            let errorMessage = `Retell API error ${retellResponse.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorJson.error || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }
            console.error('Retell KB create error:', retellResponse.status, errorText);
            return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
        }

        const responseData = await retellResponse.json();

        return NextResponse.json({
            success: true,
            knowledge_base_id: responseData.knowledge_base_id,
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
