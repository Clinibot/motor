import { NextResponse } from 'next/server';
import Retell from 'retell-sdk';
import { createClient as createLocalClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/supabase/rateLimit';

export const dynamic = 'force-dynamic';


export async function GET() {
    try {
        const supabase = await createLocalClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const supabaseAdmin = createSupabaseAdmin();

        // 1. Obtener el workspace_id del perfil del usuario
        const { data: userProfile } = await supabaseAdmin
            .from('users')
            .select('workspace_id')
            .eq('id', userId)
            .single();

        if (!userProfile || !userProfile.workspace_id) {
            return NextResponse.json({ success: false, error: "No workspace assigned to user" }, { status: 400 });
        }

        // Rate limit: 60 voice list requests per minute per workspace
        const rlVoices = await checkRateLimit(supabaseAdmin, `voices:list:${userProfile.workspace_id}`, 60, 60,
            'Demasiadas consultas de voces. Por favor espera un momento.');
        if (rlVoices) return rlVoices;

        // 2. Obtener la Retell API Key de ese workspace
        const { data: workspace, error: wsError } = await supabaseAdmin
            .from('workspaces')
            .select('retell_api_key')
            .eq('id', userProfile.workspace_id)
            .single();

        if (wsError || !workspace || !workspace.retell_api_key) {
            return NextResponse.json({ success: false, error: "Workspace API Key not found" }, { status: 400 });
        }

        // 3. Consultar voces a Retell
        const retellClient = new Retell({ apiKey: workspace.retell_api_key });
        const voices = await retellClient.voice.list();

        return NextResponse.json({
            success: true,
            voices: voices
        });

    } catch (error: unknown) {
        console.error("Error fetching voices from Retell:", error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch voices"
        }, { status: 500 });
    }
}
