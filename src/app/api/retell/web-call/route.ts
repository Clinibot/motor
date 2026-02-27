import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Retell from 'retell-sdk';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase environment variables are not configured.');
    }
    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        const { agent_id, workspace_id } = payload;

        if (!agent_id || !workspace_id) {
            return NextResponse.json({ success: false, error: "Missing agent_id or workspace_id" }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();

        // 1. Fetch the Retell API Key for this workspace
        const { data: workspace, error: wsError } = await supabaseAdmin
            .from('workspaces')
            .select('retell_api_key')
            .eq('id', workspace_id)
            .single();

        if (wsError || !workspace || !workspace.retell_api_key) {
            return NextResponse.json(
                { success: false, error: "Workspace not found or missing Retell API Key." },
                { status: 400 }
            );
        }

        // 2. Initialize Retell SDK
        const retellClient = new Retell({
            apiKey: workspace.retell_api_key,
        });

        // 3. Register the web call to get an access token
        const callResponse = await retellClient.call.createWebCall({
            agent_id: agent_id
        });

        return NextResponse.json({
            success: true,
            access_token: callResponse.access_token
        });

    } catch (error: unknown) {
        console.error("Error creating web call:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to register web call" },
            { status: 500 }
        );
    }
}
