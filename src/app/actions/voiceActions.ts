"use server";

import Retell from 'retell-sdk';
import { createClient as createLocalClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase environment variables are not configured.');
    }
    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function cloneVoiceAction(formData: FormData) {
    console.log("[Action] Iniciando cloneVoiceAction...");
    

    try {
        const supabase = await createLocalClient();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
            console.error("[Action] No session found:", sessionError);
            return { success: false, error: "No autorizado o sesión expirada" };
        }

        const voice_name = (formData.get('voice_name') as string || '').trim();
        const files = formData.getAll('files') as File[];

        console.log(`[Action] Files: ${files.length}, Name: ${voice_name}`);

        if (!voice_name || !files || files.length === 0) {
            return { success: false, error: "Falta el nombre o los archivos de audio" };
        }

        const userId = session.user.id;
        const supabaseAdmin = getSupabaseAdmin();

        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('users')
            .select('workspace_id')
            .eq('id', userId)
            .single();

        if (profileError || !userProfile?.workspace_id) {
            console.error("[Action] Error perfil:", profileError);
            return { success: false, error: "No se encontró el workspace del usuario" };
        }

        const { data: workspace, error: wsError } = await supabaseAdmin
            .from('workspaces')
            .select('retell_api_key')
            .eq('id', userProfile.workspace_id)
            .single();

        if (wsError || !workspace?.retell_api_key) {
            console.error("[Action] Error API Key:", wsError);
            return { success: false, error: "No se encontró la API Key de Retell" };
        }

        console.log(`[Action] Llamando a Retell SDK para clonación...`);
        const retellClient = new Retell({ apiKey: workspace.retell_api_key });

        const voice = await retellClient.voice.clone({
            voice_name,
            files: files,
            voice_provider: 'elevenlabs'
        });

        if (!voice || !voice.voice_id) {
            console.error("[Action] Retell devolvió un objeto vacío o inválido");
            return { success: false, error: "Retell no pudo crear la voz (respuesta vacía)" };
        }

        console.log(`[Action] Clonación exitosa:`, voice.voice_id);

        return {
            success: true,
            voice: {
                voice_id: voice.voice_id,
                voice_name: voice.voice_name
            }
        };

    } catch (error: unknown) {
        console.error("[Action] Error CRÍTICO:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Fallo inesperado al clonar voz"
        };
    }
}
