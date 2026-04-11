import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createLocalClient } from '@/lib/supabase/server';
import { resolveUserWorkspace } from '@/lib/supabase/workspace';

export const dynamic = 'force-dynamic';


export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        let workspaceId = formData.get('workspace_id') as string | null;

        if (!file) {
            return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
        }

        // 20 MB limit — Retell's own KB API rejects larger files anyway
        const MAX_FILE_SIZE = 20 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, error: `El fichero supera el límite de 20 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).` },
                { status: 400 }
            );
        }

        const supabase = await createLocalClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized. Please log in first." }, { status: 401 });
        }

        const userId = session.user.id;
        const supabaseAdmin = createSupabaseAdmin();

        if (!workspaceId) {
            const wsResult = await resolveUserWorkspace(supabaseAdmin, userId);
            if ('error' in wsResult) {
                return NextResponse.json({ success: false, error: wsResult.error }, { status: wsResult.status });
            }
            workspaceId = wsResult.workspaceId;
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

        // Sanitizar el nombre para Retell (máx 40 chars, sin caracteres especiales, espacios -> _)
        let knowledgeBaseName = file.name.split('.').slice(0, -1).join('.') || file.name;
        knowledgeBaseName = knowledgeBaseName
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
            .replace(/[^a-zA-Z0-9\s-_]/g, '') // Quitar caracteres especiales
            .trim()
            .replace(/\s+/g, '_') // Espacios a guiones bajos
            .substring(0, 40); // Límite de 40 caracteres

        const retellFormData = new FormData();
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
            retell_name: knowledgeBaseName,
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
