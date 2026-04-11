import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createLocalClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell/client';
import { buildRetellTools, injectToolInstructions } from '@/lib/retell/toolMapper';
import { enrichSipCredentials } from '@/lib/retell/sip-enrichment';
import { checkRateLimit } from '@/lib/supabase/rateLimit';

export const dynamic = 'force-dynamic';


export async function POST() {
    try {
        const supabase = await createLocalClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const supabaseAdmin = createSupabaseAdmin();
        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('workspace_id')
            .eq('id', session.user.id)
            .single();

        if (!profile?.workspace_id) {
            return NextResponse.json({ success: false, error: "No workspace found" }, { status: 400 });
        }

        // Rate limit: 5 syncs per hour per workspace (operation calls Retell API for every agent)
        const rl = await checkRateLimit(supabaseAdmin, `sync:agents:${profile.workspace_id}`, 5, 3600,
            'Demasiadas sincronizaciones en poco tiempo. Por favor espera unos minutos.');
        if (rl) return rl;

        const { data: workspace } = await supabaseAdmin
            .from('workspaces')
            .select('retell_api_key')
            .eq('id', profile.workspace_id)
            .single();

        if (!workspace?.retell_api_key) {
            return NextResponse.json({ success: false, error: "Missing Retell API Key" }, { status: 400 });
        }

        const retellClient = createRetellClient(workspace.retell_api_key);
        const { data: agents } = await supabaseAdmin
            .from('agents')
            .select('*')
            .eq('workspace_id', profile.workspace_id);

        if (!agents || agents.length === 0) {
            return NextResponse.json({ success: true, updated: 0, message: "No agents to sync" });
        }

        let updatedCount = 0;
        const errors = [];

        for (const agent of agents) {
            try {
                // 1. Fetch current LLM state from Retell to preserve manual instructions
                let manualInstructions = "";
                if (agent.retell_llm_id) {
                    try {
                        const currentLlm = await retellClient.llm.retrieve(agent.retell_llm_id);
                        const currentPrompt = currentLlm.general_prompt || "";
                        const delimiter = "### INSTRUCCIONES MANUALES ###";
                        if (currentPrompt.includes(delimiter)) {
                            manualInstructions = "\n\n" + delimiter + currentPrompt.split(delimiter)[1];
                        }
                    } catch (e) {
                        console.error(`Could not retrieve LLM ${agent.retell_llm_id} for agent ${agent.id}`, e);
                    }
                }

                const config = agent.configuration || {};
                // Enriquecer con credenciales SIP del número asignado
                await enrichSipCredentials(config, supabaseAdmin, agent.id);
                
                const retellTools = buildRetellTools(config);
                let finalPrompt = injectToolInstructions(config.prompt || 'Eres un asistente amable.', config);

                // 2. Append preserved manual instructions
                if (manualInstructions) {
                    finalPrompt += manualInstructions;
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const llmUpdateParams: any = {
                    general_prompt: finalPrompt,
                };

                // Maintain tools and KB if they exist
                if (retellTools.length > 0) {
                    llmUpdateParams.general_tools = retellTools;
                }

                if (config.kbFiles && config.kbFiles.length > 0) {
                    const kbIds = config.kbFiles.map((f: { id: string }) => f.id).filter(Boolean);
                    if (kbIds.length > 0) {
                        llmUpdateParams.knowledge_base_ids = kbIds;
                    }
                }

                if (agent.retell_llm_id) {
                    await retellClient.llm.update(agent.retell_llm_id, llmUpdateParams);
                }

                // Update Supabase configuration to reflect the new structure (it will be injected on next load too)
                await supabaseAdmin
                    .from('agents')
                    .update({
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', agent.id);

                updatedCount++;
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                console.error(`Error syncing agent ${agent.id}:`, err);
                errors.push({ id: agent.id, error: message });
            }
        }

        return NextResponse.json({
            success: true,
            updated: updatedCount,
            errors: errors.length > 0 ? errors : undefined,
            message: `Successfully synced ${updatedCount} agents.`
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Critical error in sync-agents:", error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
