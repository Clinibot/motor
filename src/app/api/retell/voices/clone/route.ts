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

        const formData = await req.formData();
        const voice_name = (formData.get('voice_name') as string || '').trim();
        const files = formData.getAll('files') as File[];

        if (!voice_name || !files || files.length === 0) {
            return NextResponse.json({ success: false, error: "Missing voice name or audio files" }, { status: 400 });
        }

        const userId = session.user.id;
        const supabaseAdmin = getSupabaseAdmin();

        const { data: userProfile } = await supabaseAdmin
            .from('users')
            .select('workspace_id')
            .eq('id', userId)
            .single();

        if (!userProfile || !userProfile.workspace_id) {
            return NextResponse.json({ success: false, error: "No workspace assigned to user" }, { status: 400 });
        }

        const { data: workspace, error: wsError } = await supabaseAdmin
            .from('workspaces')
            .select('retell_api_key')
            .eq('id', userProfile.workspace_id)
            .single();

        if (wsError || !workspace || !workspace.retell_api_key) {
            return NextResponse.json({ success: false, error: "Workspace API Key not found" }, { status: 400 });
        }

        const retellClient = new Retell({ apiKey: workspace.retell_api_key });

        // Retell SDK clone method expects files
        const voice = await retellClient.voice.clone({
            voice_name,
            files: files,
            voice_provider: 'elevenlabs' // Default to ElevenLabs for cloning in this context
        });

        return NextResponse.json({
            success: true,
            voice: voice
        });

    } catch (error: unknown) {
        console.error("Error cloning voice in Retell:", error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to clone voice"
        }, { status: 500 });
    }
}
