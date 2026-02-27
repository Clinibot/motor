import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Retell from 'retell-sdk';

// Initialize Supabase Admin to bypass RLS and read API Keys safely
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
    try {
        const payload = await request.json();

        // 1. Get the workspace ID from the request or session
        // For now, since Auth is not fully implemented, we expect it in the payload
        // Alternatively we can fetch a default workspace for testing:
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
        // We map the Wizard Payload to Retell's expected format
        const llmResponse = await retellClient.llm.create({
            model: payload.model || "gpt-4o",
            general_prompt: payload.prompt || "Eres un asistente amable.",
            // In a real scenario we map tools, state machines, etc here based on payload
        });

        // 5. Create the Voice Agent in Retell
        const agentResponse = await retellClient.agent.create({
            llm_websocket_url: llmResponse.llm_websocket_url,
            agent_name: payload.agentName || "New Agent",
            voice_id: payload.voiceId || "11labs-Adrian",
            language: payload.language || "es-ES",
            responsiveness: payload.responsiveness || 1,
            interruption_sensitivity: payload.interruptionSensitivity || 1,
            enable_backchannel: payload.enableBackchannel || false,
            // mapping other fields...
        });

        // 6. Store the new agent in our Supabase database under the workspace
        const { error: insertError } = await supabaseAdmin
            .from('agents')
            .insert([{
                workspace_id: workspaceId,
                retell_agent_id: agentResponse.agent_id,
                retell_llm_id: llmResponse.llm_id,
                name: payload.agentName || "New Agent",
                type: payload.agentType || "Desconocido",
                configuration: payload, // Store the entire wizard state backup
                status: 'active'
            }]);

        if (insertError) {
            console.error("Error saving to db:", insertError);
            // We still return success but maybe log a warning
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
