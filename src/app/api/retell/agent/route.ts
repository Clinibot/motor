import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createLocalClient } from '@/lib/supabase/server';
import type Retell from 'retell-sdk';
import { createRetellClient } from '@/lib/retell/client';
import { requireUserSession } from '@/lib/auth/requireUserSession';
import { buildRetellTools, buildPostCallAnalysis, injectToolInstructions } from '@/lib/retell/toolMapper';
import { enrichSipCredentials } from '@/lib/retell/sip-enrichment';
import { AgentPayload, resolveVoiceId } from '@/lib/retell/types';
import { resolveUserWorkspace } from '@/lib/supabase/workspace';
import { reportFactoryError } from '@/lib/alerts/alertNotifier';
import { checkRateLimit } from '@/lib/supabase/rateLimit';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Agent create/update involves multiple Retell API calls

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


// Shared builder for both create (POST) and update (PATCH) Retell agent params.
// Only three things differ between the two: llmId, agentName fallback, and the
// empty fallback for post_call_analysis_data (undefined vs []).
function buildRetellAgentParams(
    voiceId: string,
    llmId: string,
    agentName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: AgentPayload & Record<string, any>,
    postCallAnalysis: ReturnType<typeof buildPostCallAnalysis>,
    siteUrl: string,
    emptyAnalysisFallback: undefined | [] = undefined,
) {
    return {
        response_engine: { type: 'retell-llm' as const, llm_id: llmId },
        agent_name: agentName,
        voice_id: voiceId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        language: (payload.language || 'es-ES') as any,
        timezone: 'Europe/Madrid',
        responsiveness: payload.responsiveness || 1,
        interruption_sensitivity: payload.interruptionSensitivity !== undefined ? payload.interruptionSensitivity : 1,
        enable_backchannel: payload.enableBackchannel || false,
        backchannel_frequency: payload.backchannelFrequency,
        backchannel_words: payload.backchannelWords?.length ? payload.backchannelWords : undefined,
        webhook_url: `${siteUrl}/api/retell/webhook`,
        max_call_duration_ms: payload.maxCallDurationMs || 600000,
        begin_message_delay_ms: payload.beginMessageDelayMs || 200,
        end_call_after_silence_ms: payload.endCallAfterSilenceMs || 59000,
        reminder_trigger_ms: payload.reminderTriggerMs || 30000,
        ring_duration_ms: payload.ringDurationMs || 30000,
        voice_speed: !voiceId.startsWith('openai-') ? payload.voiceSpeed : undefined,
        voice_temperature: !voiceId.startsWith('openai-') ? payload.voiceTemperature : undefined,
        // Wizard stores 0–1; Retell API accepts 0–2. Multiply by 2 to convert.
        volume: payload.volume !== undefined ? payload.volume * 2 : undefined,
        ambient_sound: (payload.enableAmbientSound && payload.ambientSound !== 'none' ? payload.ambientSound : undefined) as 'call-center',
        ambient_sound_volume: payload.enableAmbientSound && payload.ambientSound !== 'none' && payload.ambientSoundVolume !== undefined
            ? payload.ambientSoundVolume * 2
            : undefined,
        normalize_for_speech: payload.normalizeForSpeech,
        post_call_analysis_data: postCallAnalysis.length > 0 ? postCallAnalysis : emptyAnalysisFallback,
        post_call_analysis_model: 'gemini-3.0-flash' as const,
        stt_mode: 'accurate' as const,
        denoising_mode: 'noise-cancellation' as const,
        boosted_keywords: payload.boostedKeywords?.length ? payload.boostedKeywords : undefined,
        // OpenAI voices (e.g. Catalan) don't support cartesia-Nico as fallback.
        // Send [] explicitly (not undefined) so Retell clears any previously set fallback on PATCH.
        fallback_voice_ids: !voiceId.startsWith('openai-') ? ['cartesia-Nico'] : [],
        enable_llm_turbo_mode: true,
        allow_user_dtmf: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data_storage_setting: 'everything_except_pii' as any,
        data_storage_retention_days: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pii_config: { mode: 'post_call' } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        guardrail_config: { output_topics: ['harassment', 'self_harm', 'sexual_exploitation', 'violence', 'defense_and_national_security', 'illicit_and_harmful_activity', 'gambling', 'regulated_professional_advice', 'child_safety_and_exploitation'], input_topics: ['platform_integrity_jailbreaking'] } as any,
    };
}

export async function POST(request: Request) {
    try {
        const payload: AgentPayload = await request.json();
        // Resolve absolute site URL early so buildRetellTools can use it for webhook URLs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload as any).siteUrl = env.NEXT_PUBLIC_SITE_URL;

        if (!payload.agentName?.trim()) {
            return NextResponse.json({ success: false, error: "Agent name is required." }, { status: 400 });
        }

        const supabase = await createLocalClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized. Please log in first." }, { status: 401 });
        }

        const userId = user.id;
        const supabaseAdmin = createSupabaseAdmin();

        // 1. Always resolve workspace from DB — never trust payload.workspace_id
        //    (prevents a user from passing another workspace's ID in the request body)
        const wsResult = await resolveUserWorkspace(supabaseAdmin, userId);
        if ('error' in wsResult) {
            return NextResponse.json({ success: false, error: wsResult.error }, { status: wsResult.status });
        }
        const workspaceId = wsResult.workspaceId;

        // Rate limit: 20 agent creations per hour per workspace
        const rlCreate = await checkRateLimit(supabaseAdmin, `agent:create:${workspaceId}`, 20, 3600,
            'Límite de creación de agentes alcanzado. Espera un momento antes de continuar.');
        if (rlCreate) return rlCreate;

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
        const retellClient = createRetellClient(workspace.retell_api_key);

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
            start_speaker: 'agent',
        };

        llmCreateParams.general_tools = retellTools.length > 0 ? retellTools : [];

        if (payload.kbFiles && payload.kbFiles.length > 0) {
            const kbIds = payload.kbFiles.map((f) => f.id).filter(Boolean);
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
        const siteUrl = env.NEXT_PUBLIC_SITE_URL;

        const buildAgentParams = (voiceId: string) => buildRetellAgentParams(
            voiceId,
            llmResponse.llm_id,
            payload.agentName || 'New Agent',
            payload,
            postCallAnalysis,
            siteUrl,
            undefined,
        );

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

        // 8. Publish the agent so the initial version is available
        let published = false;
        let publishWarning: string | undefined;
        try {
            await retellClient.agent.publish(agentResponse.agent_id);
            published = true;
            console.log(`[agent/POST] Agent ${agentResponse.agent_id} published successfully.`);
        } catch (publishError) {
            if (publishError instanceof SyntaxError) {
                published = true;
                console.log(`[agent/POST] Agent ${agentResponse.agent_id} published (empty response body — ok).`);
            } else {
                publishWarning = publishError instanceof Error ? publishError.message : String(publishError);
                console.warn(`[agent/POST] Failed to publish agent ${agentResponse.agent_id}:`, publishError);
            }
        }

        // 9. Store the new agent in Supabase (including tools config)
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
            // Rollback: delete the Retell resources so state stays consistent
            console.warn(`[agent/POST] Rolling back Retell agent ${agentResponse.agent_id} and LLM ${llmResponse.llm_id}`);
            try { await retellClient.agent.delete(agentResponse.agent_id); } catch (e) { console.error('[agent/POST] Rollback agent.delete failed:', e); }
            try { await retellClient.llm.delete(llmResponse.llm_id); } catch (e) { console.error('[agent/POST] Rollback llm.delete failed:', e); }
            return NextResponse.json(
                { success: false, error: `Agent created in Retell but could not be saved to database: ${insertError.message}. Changes have been rolled back.` },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            agent_id: agentResponse.agent_id,
            llm_id: llmResponse.llm_id,
            tools_count: retellTools.length,
            published,
            ...(publishWarning && { publish_warning: publishWarning }),
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
    let payload: AgentPayload | null = null;
    try {
        const supabaseAdmin = createSupabaseAdmin();
        payload = (await request.json()) as AgentPayload;
        // Resolve absolute site URL early so buildRetellTools can use it for webhook URLs
        payload.siteUrl = env.NEXT_PUBLIC_SITE_URL;

        if (!payload.id) {
            return NextResponse.json({ success: false, error: "Entity ID is required for PATCH." }, { status: 400 });
        }

        // Auth: verify session and get the authenticated user's workspace
        const auth = await requireUserSession(supabaseAdmin);
        if ('error' in auth) return auth.error;

        // Get existing agent
        const { data: currentAgent, error: fetchError } = await supabaseAdmin
            .from('agents')
            .select('*')
            .eq('id', payload.id)
            .single();

        if (fetchError || !currentAgent) {
            return NextResponse.json({ success: false, error: "Agent not found" }, { status: 404 });
        }

        // Workspace isolation: prevent a user from modifying another tenant's agent
        if (currentAgent.workspace_id !== auth.workspaceId) {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        const workspaceId = currentAgent.workspace_id;

        // Rate limit: 20 agent updates per hour per workspace
        const rlUpdate = await checkRateLimit(supabaseAdmin, `agent:update:${workspaceId}`, 20, 3600,
            'Límite de actualizaciones de agente alcanzado. Espera un momento antes de continuar.');
        if (rlUpdate) return rlUpdate;

        const { data: workspace } = await supabaseAdmin
            .from('workspaces')
            .select('retell_api_key')
            .eq('id', workspaceId)
            .single();

        if (!workspace || !workspace.retell_api_key) {
            return NextResponse.json({ success: false, error: "Workspace not found or missing API Key" }, { status: 400 });
        }

        const retellClient = createRetellClient(workspace.retell_api_key);

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
            start_speaker: 'agent',
        };

        if (retellTools.length > 0) {
            llmUpdateParams.general_tools = retellTools;
        } else {
            llmUpdateParams.general_tools = [];
        }

        if (payload.kbFiles && payload.kbFiles.length > 0) {
            const kbIds = payload.kbFiles.map((f) => f.id).filter(Boolean);
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
        const siteUrl = env.NEXT_PUBLIC_SITE_URL;

        if (retellAgentId) {
            const buildUpdateParams = (voiceId: string) => buildRetellAgentParams(
                voiceId,
                llmId,
                payload!.agentName || 'Updated Agent',
                payload!,
                postCallAnalysis,
                siteUrl,
                [],
            );

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

        // Publish the updated agent so the new version is available
        let published = false;
        let publishWarning: string | undefined;
        if (retellAgentId) {
            try {
                await retellClient.agent.publish(retellAgentId);
                published = true;
                console.log(`[agent/PATCH] Agent ${retellAgentId} published after update.`);
            } catch (publishError) {
                // The Retell SDK throws SyntaxError when the publish endpoint returns an
                // empty body (204 No Content). The publish succeeded — the SDK just can't
                // parse the empty response. Treat it as success and don't log a warning.
                if (publishError instanceof SyntaxError) {
                    published = true;
                    console.log(`[agent/PATCH] Agent ${retellAgentId} published (empty response body — ok).`);
                } else {
                    publishWarning = publishError instanceof Error ? publishError.message : String(publishError);
                    console.warn(`[agent/PATCH] Failed to publish agent ${retellAgentId}:`, publishError);
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
                    transferDestinations: payload.transferDestinations?.map(d =>
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
                            inbound_agent_id: retellAgentId,   // re-pins to latest version on every update
                            inbound_webhook_url: webhookUrl,
                            transport: 'UDP',                  // always force UDP (Netelip requirement)
                        })
                    )
                );
            }
        } catch (webhookSyncErr) {
            console.warn("Could not sync inbound webhook on phone numbers:", webhookSyncErr);
        }

        return NextResponse.json({
            success: true,
            agent_id: retellAgentId,
            llm_id: llmId,
            published,
            ...(publishWarning && { publish_warning: publishWarning }),
        });
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
        const supabaseAdmin = createSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const agentId = searchParams.get('id');

        if (!agentId) {
            return NextResponse.json({ success: false, error: "Agent ID required" }, { status: 400 });
        }

        // Auth: verify session and get the authenticated user's workspace
        const auth = await requireUserSession(supabaseAdmin);
        if ('error' in auth) return auth.error;

        // Get agent to find retell_agent_id
        const { data: agent } = await supabaseAdmin
            .from('agents')
            .select('*')
            .eq('id', agentId)
            .single();

        if (!agent) {
            return NextResponse.json({ success: false, error: "Agent not found" }, { status: 404 });
        }

        // Workspace isolation: prevent a user from deleting another tenant's agent
        if (agent.workspace_id !== auth.workspaceId) {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        const { data: workspace } = await supabaseAdmin
            .from('workspaces')
            .select('retell_api_key')
            .eq('id', agent.workspace_id)
            .single();

        if (workspace?.retell_api_key && agent.retell_agent_id) {
            const retellClient = createRetellClient(workspace.retell_api_key);
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
