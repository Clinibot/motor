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
        const supabaseAdmin = getSupabaseAdmin();
        const payload = await request.json();

        // 1. Get the workspace ID from the request
        let workspaceId = payload.workspace_id;

        if (!workspaceId) {
            const { data: firstWorkspace } = await supabaseAdmin
                .from('workspaces')
                .select('id')
                .limit(1)
                .single();

            if (!firstWorkspace) {
                return NextResponse.json({ success: false, error: "No workspaces available." }, { status: 400 });
            }
            workspaceId = firstWorkspace.id;
        }

        // 2. Fetch the Retell API Key for this workspace
        const { data: workspace, error: wsError } = await supabaseAdmin
            .from('workspaces')
            .select('retell_api_key')
            .eq('id', workspaceId)
            .single();

        if (wsError || !workspace || !workspace.retell_api_key) {
            return NextResponse.json(
                { success: false, error: "Workspace not found or missing Retell API Key." },
                { status: 400 }
            );
        }

        // 3. Initialize Retell SDK dynamically with the tenant's API Key
        const retellClient = new Retell({
            apiKey: workspace.retell_api_key,
        });

        console.log("Creating agent via Retell AI for:", payload.agentName);

        // 4. Create the LLM Configuration in Retell
        const llmResponse = await retellClient.llm.create({
            model: payload.model || "gpt-4o",
            general_prompt: payload.prompt || "Eres un asistente amable.",
        });

        // 5. Create the Voice Agent in Retell (with webhook configured)
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fabrica-agentes.vercel.app';
        const agentResponse = await retellClient.agent.create({
            response_engine: { type: "retell-llm", llm_id: llmResponse.llm_id },
            agent_name: payload.agentName || "New Agent",
            voice_id: payload.voiceId || "11labs-Adrian",
            language: payload.language || "es-ES",
            responsiveness: payload.responsiveness || 1,
            enable_backchannel: payload.enableBackchannel || false,
            // Register our webhook so Retell sends call data after every call
            webhook_url: `${siteUrl}/api/retell/webhook`,
        });

        // 6. Store the new agent in Supabase
        const { error: insertError } = await supabaseAdmin
            .from('agents')
            .insert([{
                workspace_id: workspaceId,
                retell_agent_id: agentResponse.agent_id,
                retell_llm_id: llmResponse.llm_id,
                name: payload.agentName || "New Agent",
                type: payload.agentType || "Desconocido",
                configuration: payload,
                status: 'active'
            }]);

        if (insertError) {
            console.error("Error saving agent to DB:", insertError);
        }

        return NextResponse.json({
            success: true,
            agent_id: agentResponse.agent_id,
            message: "Agent created successfully"
        });

    } catch (error: unknown) {
        console.error("Error creating agent:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to create agent" },
            { status: 500 }
        );
    }
}
