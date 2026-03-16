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

        const retellClient = new Retell({ apiKey: workspace.retell_api_key });

        // IMPORTANT: Convert Files to Buffers to avoid SDK issues with Blob/File objects in Node environment
        const processedFiles = await Promise.all(
            files.map(async (file) => {
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                // Return a structure that is guaranteed to be compatible
                return buffer; 
            })
        );

        console.log(`[Clone] Calling Retell SDK with ${processedFiles.length} buffers`);
        
        const voice = await retellClient.voice.clone({
            voice_name,
            files: processedFiles as any, // Cast as any to bypass potential SDK type mismatches with direct buffers
            voice_provider: 'elevenlabs'
        });

        console.log(`[Clone] Success! Created voice_id: ${voice.voice_id}`);
        
        return NextResponse.json({
            success: true,
            voice: voice
        });

    } catch (error: unknown) {
        console.error("CRITICAL ERROR during voice cloning:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to clone voice";
        
        // Ensure we ALWAYS return JSON, even if it's an error
        return new Response(JSON.stringify({
            success: false,
            error: errorMessage,
            details: error instanceof Error ? error.stack : undefined
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
