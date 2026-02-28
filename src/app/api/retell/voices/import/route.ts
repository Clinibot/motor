import { NextResponse } from 'next/server';
import Retell from 'retell-sdk';
import { createClient as createLocalClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase environment variables are not configured.');
    }
    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(req: Request) {
    try {
        const supabase = await createLocalClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { voice_name, provider_voice_id, public_user_id } = await req.json();

        if (!voice_name || !provider_voice_id) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        const userId = session.user.id;
        const supabaseAdmin = getSupabaseAdmin();

        // 1. Obtener el workspace_id del perfil del usuario
        const { data: userProfile } = await supabaseAdmin
            .from('users')
            .select('workspace_id')
            .eq('id', userId)
            .single();

        if (!userProfile || !userProfile.workspace_id) {
            return NextResponse.json({ success: false, error: "No workspace assigned to user" }, { status: 400 });
        }

        // 2. Obtener la Retell API Key de ese workspace
        const { data: workspace, error: wsError } = await supabaseAdmin
            .from('workspaces')
            .select('retell_api_key')
            .eq('id', userProfile.workspace_id)
            .single();

        if (wsError || !workspace || !workspace.retell_api_key) {
            return NextResponse.json({ success: false, error: "Workspace API Key not found" }, { status: 400 });
        }

        // 3. Registrar voz en Retell
        const retellClient = new Retell({ apiKey: workspace.retell_api_key });

        const voice = await retellClient.voice.addResource({
            voice_name,
            provider_voice_id,
            voice_provider: 'elevenlabs',
            public_user_id: public_user_id || undefined
        });

        return NextResponse.json({
            success: true,
            voice: voice
        });

    } catch (error: unknown) {
        console.error("Error importing voice to Retell:", error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to import voice"
        }, { status: 500 });
    }
}
