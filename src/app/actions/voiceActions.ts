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
    try {
        const supabase = await createLocalClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            throw new Error("Unauthorized");
        }

        const voice_name = (formData.get('voice_name') as string || '').trim();
        const files = formData.getAll('files') as File[];

        console.log(`[Action Clone] Received ${files.length} files for voice: ${voice_name}`);
        files.forEach((f, i) => {
            console.log(`[Action Clone] File ${i}: name=${f.name}, size=${f.size} bytes, type=${f.type}`);
        });

        if (!voice_name || !files || files.length === 0) {
            throw new Error("Missing voice name or audio files");
        }

        const userId = session.user.id;
        const supabaseAdmin = getSupabaseAdmin();

        const { data: userProfile } = await supabaseAdmin
            .from('users')
            .select('workspace_id')
            .eq('id', userId)
            .single();

        if (!userProfile || !userProfile.workspace_id) {
            throw new Error("No workspace assigned to user");
        }

        const { data: workspace, error: wsError } = await supabaseAdmin
            .from('workspaces')
            .select('retell_api_key')
            .eq('id', userProfile.workspace_id)
            .single();

        if (wsError || !workspace || !workspace.retell_api_key) {
            throw new Error("Workspace API Key not found");
        }

        const retellClient = new Retell({ apiKey: workspace.retell_api_key });

        console.log(`[Action Clone] Calling Retell SDK clone...`);
        const voice = await retellClient.voice.clone({
            voice_name,
            files: files,
            voice_provider: 'elevenlabs'
        });
        console.log(`[Action Clone] Success:`, voice.voice_id);

        return {
            success: true,
            voice: {
                voice_id: voice.voice_id,
                voice_name: voice.voice_name
            }
        };

    } catch (error: unknown) {
        console.error("Error cloning voice in Server Action:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to clone voice"
        };
    }
}
