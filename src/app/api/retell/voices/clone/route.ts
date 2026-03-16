import { NextResponse } from 'next/server';
import Retell from 'retell-sdk';
import { createClient as createLocalClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for voice cloning

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase environment variables are not configured.');
    }
    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(req: Request) {
    console.log("[Clone] POST request received");
    try {
        const supabase = await createLocalClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            console.error("[Clone] Unauthorized: No session found");
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const voice_name = (formData.get('voice_name') as string || '').trim();
        const files = formData.getAll('files') as File[];

        console.log(`[Clone] Processing ${files.length} files for voice: ${voice_name}`);
        
        if (!voice_name || files.length === 0) {
            return NextResponse.json({ success: false, error: "Missing voice name or audio files" }, { status: 400 });
        }

        const userId = session.user.id;
        const supabaseAdmin = getSupabaseAdmin();

        const { data: userProfile } = await supabaseAdmin
            .from('users')
            .select('workspace_id')
            .eq('id', userId)
            .single();

        if (!userProfile?.workspace_id) {
            return NextResponse.json({ success: false, error: "No workspace assigned" }, { status: 400 });
        }

        const { data: workspace } = await supabaseAdmin
            .from('workspaces')
            .select('retell_api_key')
            .eq('id', userProfile.workspace_id)
            .single();

        if (!workspace?.retell_api_key) {
            return NextResponse.json({ success: false, error: "Workspace API Key not found" }, { status: 400 });
        }


        // Build FormData manually to ensure correct field naming ('files' instead of 'files[]')
        const retellFormData = new FormData();
        retellFormData.append('voice_name', voice_name);
        retellFormData.append('voice_provider', 'elevenlabs');
        
        console.log(`[Clone] Preparing FormData with ${files.length} files`);
        
        await Promise.all(
            files.map(async (file) => {
                const arrayBuffer = await file.arrayBuffer();
                const blob = new Blob([arrayBuffer], { type: file.type || 'audio/mpeg' });
                // Append with key 'files' as per Retell API requirements
                retellFormData.append('files', blob, file.name);
            })
        );

        console.log(`[Clone] Sending request to Retell API...`);
        
        const retellResponse = await fetch('https://api.retellai.com/clone-voice', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${workspace.retell_api_key}`,
            },
            body: retellFormData,
        });

        if (!retellResponse.ok) {
            const errorText = await retellResponse.text();
            console.error(`[Clone] Retell API error (${retellResponse.status}):`, errorText);
            
            let errorMessage = `API Error ${retellResponse.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorMessage;
            } catch (_e) {
                errorMessage = errorText || errorMessage;
            }
            
            return NextResponse.json({ success: false, error: errorMessage }, { status: retellResponse.status });
        }

        const voice = await retellResponse.json();
        console.log(`[Clone] Success! Created voice_id: ${voice.voice_id}`);
        
        return NextResponse.json({
            success: true,
            voice: voice
        });

    } catch (error: unknown) {
        console.error("CRITICAL ERROR during voice cloning:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to clone voice";
        
        // Ensure we ALWAYS return JSON
        return NextResponse.json({
            success: false,
            error: errorMessage,
            details: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}
