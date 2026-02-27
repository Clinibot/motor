import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createLocalClient } from '@/lib/supabase/server';
import Retell from 'retell-sdk';
import { buildRetellTools, buildPostCallAnalysis, injectToolInstructions } from '../../../../lib/retell/toolMapper';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase environment variables are not configured.');
    }
    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: Request) {
    try {
        const payload = await request.json();

        const supabase = await createLocalClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized. Please log in first." }, { status: 401 });
        }

        const userId = session.user.id;
        const supabaseAdmin = getSupabaseAdmin();

        // 1. Get the workspace ID from the user's profile
        let workspaceId = payload.workspace_id;

        if (!workspaceId) {
            const { data: userProfile } = await supabaseAdmin
                .from('users')
                .select('workspace_id')
                .eq('id', userId)
                .single();

            if (!userProfile || !userProfile.workspace_id) {
                // Intentar auto-asignar un workspace libre
                const { data: usersWithWorkspaces } = await supabaseAdmin
                    .from('users')
                    .select('workspace_id')
                    .not('workspace_id', 'is', null);

                const assignedIds = (usersWithWorkspaces || []).map((u: { workspace_id: string }) => u.workspace_id);

                let freeWorkspaceQuery = supabaseAdmin
                    .from('workspaces')
                    .select('id')
                    .order('created_at', { ascending: true })
                    .limit(1);

                if (assignedIds.length > 0) {
                    freeWorkspaceQuery = freeWorkspaceQuery.not('id', 'in', assignedIds);
                }

                const { data: freeWorkspaces } = await freeWorkspaceQuery;

                if (!freeWorkspaces || freeWorkspaces.length === 0) {
                    return NextResponse.json({ success: false, error: "No hay workspaces disponibles. Contacta con el administrador." }, { status: 400 });
                }

                const newWorkspaceId = freeWorkspaces[0].id;
                await supabaseAdmin
                    .from('users')
                    .update({ workspace_id: newWorkspaceId })
                    .eq('id', userId);

                workspaceId = newWorkspaceId;
            } else {
                workspaceId = userProfile.workspace_id;
            }
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

        // 4. Map Step 7 tools to Retell format
        const retellTools = buildRetellTools(payload);
        const postCallAnalysis = buildPostCallAnalysis(payload);

        // 5. Inject tool instructions into the base prompt
        const finalPrompt = injectToolInstructions(
            payload.prompt || 'Eres un asistente amable.',
            payload
        );

        console.log(`Tools configured for ${payload.agentName}: ${retellTools.length}`, JSON.stringify(retellTools, null, 2));

        // Usar el modelo directamente (gpt-4.1, gpt-5.1, gpt-5.2)
        const retellModel = payload.model || "gpt-4.1";

        // 6. Create the LLM Configuration in Retell (with tools + variables + injected prompt)
        const llmCreateParams: Parameters<typeof retellClient.llm.create>[0] = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            model: retellModel as any,
            general_prompt: finalPrompt,
            begin_message: payload.beginMessage
        };

        if (retellTools.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (llmCreateParams as any).tools = retellTools;
        }

        if (payload.kbFiles && payload.kbFiles.length > 0) {
            const kbIds = payload.kbFiles.map((f: { id?: string }) => f.id).filter(Boolean);
            if (kbIds.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (llmCreateParams as any).knowledge_base_ids = kbIds;
            }
        }

        const llmResponse = await retellClient.llm.create(llmCreateParams);

        // 6.5 Verify and Alias Voice ID
        let finalVoiceId = payload.voiceId || "11labs-Adrian";

        // Mapear voces Cartesia (placeholders UI) a voces OpenAI disponibles en Retell
        const cartesiaMapping: Record<string, string> = {
            'cartesia-Elena': 'openai-Shimmer',
            'cartesia-Isabel': 'openai-Shimmer',
            'cartesia-Manuel': 'openai-Fable',
        };

        if (cartesiaMapping[finalVoiceId]) {
            finalVoiceId = cartesiaMapping[finalVoiceId];
        }

        // ELIMINAR VOZ CAROLINA Y FORZAR ADRIÁN SI SE DETECTA
        if (finalVoiceId === '11labs-UOIqAnmS11Reiei1Ytkc' || (finalVoiceId.includes('11labs-') && finalVoiceId !== '11labs-Adrian')) {
            console.log("Forzando fallback de voz a 11labs-Adrian (Voz Carolina o desconocida detectada)");
            finalVoiceId = '11labs-Adrian';
        }

        // 7. Create the Voice Agent in Retell
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fabrica-agentes.vercel.app';
        const agentResponse = await retellClient.agent.create({
            response_engine: { type: "retell-llm", llm_id: llmResponse.llm_id },
            agent_name: payload.agentName || "New Agent",
            voice_id: finalVoiceId,
            language: payload.language || "es-ES",
            responsiveness: payload.responsiveness || 1,
            interruption_sensitivity: payload.interruptionSensitivity !== undefined ? payload.interruptionSensitivity : 1,
            enable_backchannel: payload.enableBackchannel || false,
            backchannel_frequency: payload.backchannelFrequency,
            backchannel_words: payload.backchannelWords?.length ? payload.backchannelWords : undefined,
            webhook_url: `${siteUrl}/api/retell/webhook`,
            max_call_duration_ms: payload.maxCallDurationMs || 600000,
            begin_message_delay_ms: payload.beginMessageDelayMs || 200,
            end_call_after_silence_ms: payload.endCallAfterSilenceMs || 59000,
            ring_duration_ms: payload.ringDurationMs || 30000,
            voice_speed: payload.voiceSpeed,
            voice_temperature: payload.voiceTemperature,
            volume: payload.volume,
            ambient_sound: payload.enableAmbientSound && payload.ambientSound !== 'none' ? payload.ambientSound : undefined,
            ambient_sound_volume: payload.enableAmbientSound && payload.ambientSound !== 'none' ? payload.ambientSoundVolume : undefined,
            normalize_for_speech: payload.normalizeForSpeech,
            post_call_analysis_data: postCallAnalysis && postCallAnalysis.length > 0 ? postCallAnalysis : undefined
        });

        // 8. Store the new agent in Supabase (including tools config)
        const { error: insertError } = await supabaseAdmin
            .from('agents')
            .insert([{
                workspace_id: workspaceId,
                retell_agent_id: agentResponse.agent_id,
                retell_llm_id: llmResponse.llm_id,
                name: payload.agentName || "New Agent",
                type: payload.agentType || "Desconocido",
                configuration: {
                    ...payload,
                    _toolsMapped: retellTools.map(t => t.name || t.type),
                },
                status: 'active'
            }]);

        if (insertError) {
            console.error("Error saving agent to DB:", insertError);
        }

        return NextResponse.json({
            success: true,
            agent_id: agentResponse.agent_id,
            llm_id: llmResponse.llm_id,
            tools_count: retellTools.length,
            message: `Agent created successfully with ${retellTools.length} tool(s).`
        });

    } catch (error: unknown) {
        console.error("Error creating agent:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to create agent" },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const payload = await request.json();

        if (!payload.id) {
            return NextResponse.json({ success: false, error: "Entity ID is required for PATCH." }, { status: 400 });
        }

        // Get existing agent
        const { data: currentAgent, error: fetchError } = await supabaseAdmin
            .from('agents')
            .select('*')
            .eq('id', payload.id)
            .single();

        if (fetchError || !currentAgent) {
            return NextResponse.json({ success: false, error: "Agent not found" }, { status: 404 });
        }

        const workspaceId = currentAgent.workspace_id;

        const { data: workspace } = await supabaseAdmin
            .from('workspaces')
            .select('retell_api_key')
            .eq('id', workspaceId)
            .single();

        if (!workspace || !workspace.retell_api_key) {
            return NextResponse.json({ success: false, error: "Workspace not found or missing API Key" }, { status: 400 });
        }

        const retellClient = new Retell({ apiKey: workspace.retell_api_key });

        console.log("Updating agent via Retell AI for:", payload.agentName);

        const retellTools = buildRetellTools(payload);
        const postCallAnalysis = buildPostCallAnalysis(payload);
        const finalPrompt = injectToolInstructions(payload.prompt || 'Eres un asistente amable.', payload);

        const retellModel = payload.model || "gpt-4.1";

        const llmUpdateParams: Parameters<typeof retellClient.llm.update>[1] = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            model: retellModel as any,
            general_prompt: finalPrompt,
            begin_message: payload.beginMessage,
        };

        if (retellTools.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (llmUpdateParams as any).tools = retellTools;
        } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (llmUpdateParams as any).tools = []; // clear tools if empty
        }

        if (payload.kbFiles && payload.kbFiles.length > 0) {
            const kbIds = payload.kbFiles.map((f: { id?: string }) => f.id).filter(Boolean);
            if (kbIds.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (llmUpdateParams as any).knowledge_base_ids = kbIds;
            }
        } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (llmUpdateParams as any).knowledge_base_ids = [];
        }

        let llmId = currentAgent.retell_llm_id;
        if (llmId) {
            await retellClient.llm.update(llmId, llmUpdateParams);
        } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const createdLlm = await retellClient.llm.create(llmUpdateParams as any);
            llmId = createdLlm.llm_id;
        }

        const finalVoiceId = payload.voiceId || currentAgent?.configuration?.voiceId || "11labs-Adrian";

        // ELIMINAR VOZ CAROLINA Y FORZAR ADRIÁN SI SE DETECTA EN EDICIÓN
        let cleanVoiceId = finalVoiceId;
        if (cleanVoiceId === '11labs-UOIqAnmS11Reiei1Ytkc' || (cleanVoiceId.includes('11labs-') && cleanVoiceId !== '11labs-Adrian')) {
            console.log("Forzando fallback de voz en edición a 11labs-Adrian");
            cleanVoiceId = '11labs-Adrian';
        }

        const retellAgentId = currentAgent.retell_agent_id;
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fabrica-agentes.vercel.app';

        if (retellAgentId) {
            await retellClient.agent.update(retellAgentId, {
                response_engine: { type: "retell-llm", llm_id: llmId },
                agent_name: payload.agentName || "Updated Agent",
                voice_id: cleanVoiceId,
                language: payload.language || "es-ES",
                responsiveness: payload.responsiveness || 1,
                interruption_sensitivity: payload.interruptionSensitivity !== undefined ? payload.interruptionSensitivity : 1,
                enable_backchannel: payload.enableBackchannel || false,
                backchannel_frequency: payload.backchannelFrequency,
                backchannel_words: payload.backchannelWords?.length ? payload.backchannelWords : undefined,
                webhook_url: `${siteUrl}/api/retell/webhook`,
                max_call_duration_ms: payload.maxCallDurationMs || 600000,
                begin_message_delay_ms: payload.beginMessageDelayMs || 200,
                end_call_after_silence_ms: payload.endCallAfterSilenceMs || 59000,
                ring_duration_ms: payload.ringDurationMs || 30000,
                voice_speed: payload.voiceSpeed,
                voice_temperature: payload.voiceTemperature,
                volume: payload.volume,
                ambient_sound: payload.enableAmbientSound && payload.ambientSound !== 'none' ? payload.ambientSound : undefined,
                ambient_sound_volume: payload.enableAmbientSound && payload.ambientSound !== 'none' ? payload.ambientSoundVolume : undefined,
                normalize_for_speech: payload.normalizeForSpeech,
                post_call_analysis_data: postCallAnalysis && postCallAnalysis.length > 0 ? postCallAnalysis : []
            });
        }

        // Update Supabase
        await supabaseAdmin
            .from('agents')
            .update({
                name: payload.agentName || "Updated Agent",
                type: payload.agentType || "Desconocido",
                retell_llm_id: llmId,
                configuration: {
                    ...payload,
                    _toolsMapped: retellTools.map(t => t.name || t.type),
                },
                updated_at: new Date().toISOString()
            })
            .eq('id', payload.id);

        return NextResponse.json({ success: true, agent_id: retellAgentId, llm_id: llmId });
    } catch (error: unknown) {
        console.error("Error updating agent:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to update agent" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const agentId = searchParams.get('id');

        if (!agentId) {
            return NextResponse.json({ success: false, error: "Agent ID required" }, { status: 400 });
        }

        // Get agent to find retell_agent_id
        const { data: agent } = await supabaseAdmin
            .from('agents')
            .select('*')
            .eq('id', agentId)
            .single();

        if (!agent) {
            return NextResponse.json({ success: false, error: "Agent not found" }, { status: 404 });
        }

        const { data: workspace } = await supabaseAdmin
            .from('workspaces')
            .select('retell_api_key')
            .eq('id', agent.workspace_id)
            .single();

        if (workspace?.retell_api_key && agent.retell_agent_id) {
            const retellClient = new Retell({ apiKey: workspace.retell_api_key });
            try {
                await retellClient.agent.delete(agent.retell_agent_id);
            } catch (e) {
                console.warn("Failed to delete Agent from Retell:", e);
            }
            if (agent.retell_llm_id) {
                try {
                    await retellClient.llm.delete(agent.retell_llm_id);
                } catch (e) {
                    console.warn("Failed to delete LLM from Retell:", e);
                }
            }
        }

        await supabaseAdmin.from('agents').delete().eq('id', agentId);

        return NextResponse.json({ success: true, message: "Agent deleted successfully" });
    } catch (error: unknown) {
        console.error("Error deleting agent:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to delete agent" },
            { status: 500 }
        );
    }
}
