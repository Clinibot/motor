import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createLocalClient } from '@/lib/supabase/server';
import Retell from 'retell-sdk';
import { buildRetellTools, buildPostCallAnalysis, injectToolInstructions } from '@/lib/retell/toolMapper';
import { enrichSipCredentials } from '@/lib/retell/sip-enrichment';
import { AgentPayload, TransferDestination, resolveVoiceId } from '@/lib/retell/types';
import { reportFactoryError } from '@/lib/alerts/alertNotifier';

export const dynamic = 'force-dynamic';

// When voiceId is a placeholder like 'custom-carolina', resolve the real
// workspace-scoped ID from Retell's voice list by matching the voice name.
async function resolveCustomVoiceId(retellClient: Retell, voiceId: string, voiceName?: string): Promise<string> {
    if (!voiceId.startsWith('custom-')) return voiceId;
    try {
        const voices = await retellClient.voice.list();
        const nameToMatch = voiceName || voiceId.replace('custom-', '');
        const match = voices.find(v =>
            v.voice_name?.toLowerCase().includes(nameToMatch.toLowerCase())
        );
        if (match?.voice_id) {
            console.log(`[resolveCustomVoiceId] ${voiceId} → ${match.voice_id} (${match.voice_name})`);
            return match.voice_id;
        }
        console.warn(`[resolveCustomVoiceId] No match for "${nameToMatch}" in workspace voices — using fallback`);
        return '11labs-Adrian';
    } catch (err) {
        console.warn('[resolveCustomVoiceId] Failed to fetch voice list:', err);
        return voiceId;
    }
}

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is required — do not fall back to anon key for admin operations.');
    }
    return createClient(supabaseUrl, supabaseServiceKey);
}



export async function POST(request: Request) {
    try {
        const payload: AgentPayload = await request.json();
        // Resolve absolute site URL early so buildRetellTools can use it for webhook URLs
        const _protocol = request.headers.get('x-forwarded-proto') || 'https';
        const _host = request.headers.get('host');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload as any).siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (_host ? `${_protocol}://${_host}` : 'https://lafabrica.netelip.com');

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

                const assignedIds = (usersWithWorkspaces || []).map((u: { workspace_id: string | null }) => u.workspace_id).filter((id): id is string => id !== null);

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
        await enrichSipCredentials(payload, supabaseAdmin);
        const retellTools = buildRetellTools(payload);
        const postCallAnalysis = buildPostCallAnalysis(payload);

        // 5. Build the final prompt: start from what the wizard sent, then inject tool instructions server-side.
        const basePrompt = payload.prompt || 'Eres un asistente amable.';
        const finalPrompt = injectToolInstructions(basePrompt, payload);

        console.log(`Prompt final para ${payload.agentName}. Length: ${finalPrompt.length}`);

        console.log(`Tools configured for ${payload.agentName}: ${retellTools.length}`, JSON.stringify(retellTools, null, 2));
        console.log(`Knowledge base configuration:`, payload.kbFiles?.length || 0, "files");

        // Usar el modelo directamente (gpt-4.1, gpt-5.1, gpt-5.2)
        const retellModel = payload.model || "gpt-4.1";

        // 6. Create the LLM Configuration in Retell (with tools + variables + injected prompt)
        const llmCreateParams: Record<string, unknown> = {
            model: retellModel,
            general_prompt: finalPrompt,
            begin_message: payload.beginMessage,
            model_temperature: payload.temperature,
            model_high_priority: payload.highPriority,
            start_speaker: payload.whoFirst || 'agent',
        };

        llmCreateParams.general_tools = retellTools.length > 0 ? retellTools : [];

        if (payload.kbFiles && payload.kbFiles.length > 0) {
            const kbIds = payload.kbFiles.map((f: { id?: string }) => f.id).filter(Boolean);
            if (kbIds.length > 0) {
                llmCreateParams.knowledge_base_ids = kbIds;
            }
        }

        const llmResponse = await retellClient.llm.create(llmCreateParams);

        // 6.5 Resolve voice ID: custom-* placeholders are looked up by name in the workspace voice list
        const finalVoiceId = await resolveCustomVoiceId(
            retellClient,
            resolveVoiceId(payload.voiceId),
            payload.voiceName
        );

        // 7. Create the Voice Agent in Retell
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        const host = request.headers.get('host');
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (host ? `${protocol}://${host}` : 'https://lafabrica.netelip.com');

        const buildAgentParams = (voiceId: string) => ({
            response_engine: { type: "retell-llm" as const, llm_id: llmResponse.llm_id },
            agent_name: payload.agentName || "New Agent",
            voice_id: voiceId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            language: (payload.language || "es-ES") as any,
            timezone: "Europe/Madrid",
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
            voice_speed: payload.voiceSpeed !== 1.0 ? payload.voiceSpeed : undefined,
            voice_temperature: payload.voiceTemperature !== 1.0 ? payload.voiceTemperature : undefined,
            volume: payload.volume,
            ambient_sound: (payload.enableAmbientSound && payload.ambientSound !== 'none' ? payload.ambientSound : undefined) as "call-center",
            ambient_sound_volume: payload.enableAmbientSound && payload.ambientSound !== 'none' ? payload.ambientSoundVolume : undefined,
            normalize_for_speech: payload.normalizeForSpeech,
            post_call_analysis_data: postCallAnalysis && postCallAnalysis.length > 0 ? postCallAnalysis : undefined,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data_storage_setting: "everything_except_pii" as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pii_config: { mode: "post_call" } as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            guardrail_config: { output_topics: ["harassment", "self_harm", "violence"], input_topics: ["platform_integrity_jailbreaking"] } as any
        });

        let agentResponse;
        try {
            agentResponse = await retellClient.agent.create(buildAgentParams(finalVoiceId));
        } catch (voiceError: unknown) {
            const voiceMsg = voiceError instanceof Error ? voiceError.message : String(voiceError);
            if (voiceMsg.includes('not found from voice')) {
                console.warn(`[agent/POST] Voice ${finalVoiceId} not found in workspace — retrying with fallback 11labs-Adrian`);
                agentResponse = await retellClient.agent.create(buildAgentParams('11labs-Adrian'));
            } else {
                throw voiceError;
            }
        }

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
                    // Strip SIP passwords (looked up securely at runtime via enrichSipCredentials)
                    transferDestinations: payload.transferDestinations?.map(d =>
                        Object.fromEntries(Object.entries(d as unknown as Record<string, unknown>).filter(([k]) => k !== 'sip_password'))
                    ),
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
        
        let errorMsg = error instanceof Error ? error.message : String(error);
        if (typeof error === 'object' && error !== null && 'response' in error) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const resp = (error as any).response;
                if (resp && typeof resp.text === 'function') {
                    const detail = await resp.text();
                    console.error("Retell API Error Detail:", detail);
                    errorMsg += ` - Detail: ${detail}`;
                }
            } catch (e) {
                console.warn("Could not parse Retell error detail", e);
            }
        }

        // Factory Error Alert
        await reportFactoryError('API /api/retell/agent (POST)', 
            errorMsg,
            { action: 'create_agent' }
        );

        return NextResponse.json(
            { success: false, error: errorMsg },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let payload: any = null;
    try {
        const supabaseAdmin = getSupabaseAdmin();
        payload = await request.json();
        // Resolve absolute site URL early so buildRetellTools can use it for webhook URLs
        const _pProtocol = request.headers.get('x-forwarded-proto') || 'https';
        const _pHost = request.headers.get('host');
        payload.siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (_pHost ? `${_pProtocol}://${_pHost}` : 'https://lafabrica.netelip.com');

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

        console.log("PATCH Payload received:", JSON.stringify(payload, null, 2));

        await enrichSipCredentials(payload, supabaseAdmin, payload.id);
        const retellTools = buildRetellTools(payload);
        const postCallAnalysis = buildPostCallAnalysis(payload);
        // Build the final prompt: start from what the wizard sent, then inject tool instructions server-side.
        const basePrompt = payload.prompt || 'Eres un asistente amable.';
        const finalPrompt = injectToolInstructions(basePrompt, payload);

        console.log(`Prompt final para PATCH ${payload.agentName}. Length: ${finalPrompt.length}`);

        console.log(`Tools mapped for PATCH (${payload.agentName}):`, JSON.stringify(retellTools, null, 2));

        const retellModel = payload.model || "gpt-4.1";

        const llmUpdateParams: Record<string, unknown> = {
            model: retellModel,
            general_prompt: finalPrompt,
            begin_message: payload.beginMessage,
            model_temperature: payload.temperature,
            model_high_priority: payload.highPriority,
            start_speaker: payload.whoFirst || 'agent',
        };

        if (retellTools.length > 0) {
            llmUpdateParams.general_tools = retellTools;
        } else {
            llmUpdateParams.general_tools = [];
        }

        if (payload.kbFiles && payload.kbFiles.length > 0) {
            const kbIds = payload.kbFiles.map((f: { id?: string }) => f.id).filter(Boolean);
            if (kbIds.length > 0) {
                llmUpdateParams.knowledge_base_ids = kbIds;
            }
        } else {
            llmUpdateParams.knowledge_base_ids = [];
        }

        let llmId = currentAgent.retell_llm_id;
        if (llmId) {
            console.log(`Updating LLM ${llmId}`);
            const updatedLlm = await retellClient.llm.update(llmId, llmUpdateParams);
            console.log("Retell LLM Update executed successfully for LLM:", updatedLlm.llm_id);
        } else {
            console.log("Creating new LLM because agent had no LLM ID assigned.");
            const createdLlm = await retellClient.llm.create(llmUpdateParams);
            llmId = createdLlm.llm_id;
        }

        const cleanVoiceId = await resolveCustomVoiceId(
            retellClient,
            resolveVoiceId(payload.voiceId || currentAgent?.configuration?.voiceId),
            payload.voiceName || currentAgent?.configuration?.voiceName
        );

        const retellAgentId = currentAgent.retell_agent_id;
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        const host = request.headers.get('host');
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (host ? `${protocol}://${host}` : 'https://lafabrica.netelip.com');

        if (retellAgentId) {
            const buildUpdateParams = (voiceId: string) => ({
                response_engine: { type: "retell-llm" as const, llm_id: llmId },
                agent_name: payload.agentName || "Updated Agent",
                voice_id: voiceId,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                language: (payload.language || "es-ES") as any,
                timezone: "Europe/Madrid",
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
                voice_speed: payload.voiceSpeed !== 1.0 ? payload.voiceSpeed : undefined,
                voice_temperature: payload.voiceTemperature !== 1.0 ? payload.voiceTemperature : undefined,
                volume: payload.volume,
                ambient_sound: (payload.enableAmbientSound && payload.ambientSound !== 'none' ? payload.ambientSound : undefined) as "call-center",
                ambient_sound_volume: payload.enableAmbientSound && payload.ambientSound !== 'none' ? payload.ambientSoundVolume : undefined,
                normalize_for_speech: payload.normalizeForSpeech,
                post_call_analysis_data: postCallAnalysis && postCallAnalysis.length > 0 ? postCallAnalysis : [],
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                data_storage_setting: "everything_except_pii" as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                pii_config: { mode: "post_call" } as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                guardrail_config: { output_topics: ["harassment", "self_harm", "violence"], input_topics: ["platform_integrity_jailbreaking"] } as any
            });

            try {
                await retellClient.agent.update(retellAgentId, buildUpdateParams(cleanVoiceId));
            } catch (voiceError: unknown) {
                const voiceMsg = voiceError instanceof Error ? voiceError.message : String(voiceError);
                if (voiceMsg.includes('not found from voice')) {
                    console.warn(`[agent/PATCH] Voice ${cleanVoiceId} not found in workspace — retrying with fallback 11labs-Adrian`);
                    await retellClient.agent.update(retellAgentId, buildUpdateParams('11labs-Adrian'));
                } else {
                    throw voiceError;
                }
            }
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
                    // Strip SIP passwords (looked up securely at runtime via enrichSipCredentials)
                    transferDestinations: (payload.transferDestinations as TransferDestination[] | undefined)?.map(d =>
                        Object.fromEntries(Object.entries(d as unknown as Record<string, unknown>).filter(([k]) => k !== 'sip_password'))
                    ),
                    _toolsMapped: retellTools.map(t => t.name || t.type),
                },
                updated_at: new Date().toISOString()
            })
            .eq('id', payload.id);

        // Sync inbound_webhook_url on any phone numbers assigned to this agent
        try {
            const { data: assignedNumbers } = await supabaseAdmin
                .from('phone_numbers')
                .select('phone_number')
                .eq('assigned_inbound_agent_id', payload.id);

            if (assignedNumbers && assignedNumbers.length > 0) {
                const parseBool = (v: unknown) => v === true || v === 'true';
                const needsWebhook = parseBool(payload.enableCalBooking) && !!payload.calApiKey && !!payload.calEventId;
                const webhookUrl = needsWebhook
                    ? `${siteUrl}/api/retell/webhook/inbound`
                    : null;

                console.log(`Syncing inbound webhook (${webhookUrl ?? 'none'}) on ${assignedNumbers.length} number(s)`);

                await Promise.all(
                    assignedNumbers.map((row: { phone_number: string }) =>
                        retellClient.phoneNumber.update(row.phone_number, {
                            inbound_webhook_url: webhookUrl,
                        })
                    )
                );
            }
        } catch (webhookSyncErr) {
            console.warn("Could not sync inbound webhook on phone numbers:", webhookSyncErr);
        }

        return NextResponse.json({ success: true, agent_id: retellAgentId, llm_id: llmId });
    } catch (error: unknown) {
        console.error("Error updating agent:", error);

        let errorMsg = error instanceof Error ? error.message : String(error);
        if (typeof error === 'object' && error !== null && 'response' in error) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const resp = (error as any).response;
                if (resp && typeof resp.text === 'function') {
                    const detail = await resp.text();
                    console.error("Retell API Error Detail (PATCH):", detail);
                    errorMsg += ` - Detail: ${detail}`;
                }
            } catch (e) {
                console.warn("Could not parse Retell error detail in PATCH", e);
            }
        }

        // Factory Error Alert
        await reportFactoryError('API /api/retell/agent (PATCH)', 
            errorMsg,
            { action: 'update_agent', id: payload?.id }
        );

        return NextResponse.json(
            { success: false, error: errorMsg },
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
