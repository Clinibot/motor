import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createLocalClient } from '@/lib/supabase/server';
import Retell from 'retell-sdk';
import { buildRetellTools, injectToolInstructions } from '@/lib/retell/toolMapper';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase environment variables are not configured.');
    }
    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST() {
    try {
        const supabase = await createLocalClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const supabaseAdmin = getSupabaseAdmin();
        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('workspace_id')
            .eq('id', session.user.id)
            .single();

        if (!profile?.workspace_id) {
            return NextResponse.json({ success: false, error: "No workspace found" }, { status: 400 });
        }

        const { data: workspace } = await supabaseAdmin
            .from('workspaces')
            .select('retell_api_key')
            .eq('id', profile.workspace_id)
            .single();

        if (!workspace?.retell_api_key) {
            return NextResponse.json({ success: false, error: "Missing Retell API Key" }, { status: 400 });
        }

        const retellClient = new Retell({ apiKey: workspace.retell_api_key });
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
                const config = agent.configuration || {};
                const retellTools = buildRetellTools(config);
                const finalPrompt = injectToolInstructions(config.prompt || 'Eres un asistente amable.', config);

                const llmUpdateParams: Record<string, any> = {
                    general_prompt: finalPrompt,
                };

                // Maintain tools and KB if they exist
                if (retellTools.length > 0) {
                    llmUpdateParams.general_tools = retellTools;
                }

                if (config.kbFiles && config.kbFiles.length > 0) {
                    const kbIds = config.kbFiles.map((f: any) => f.id).filter(Boolean);
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
            } catch (err: any) {
                console.error(`Error syncing agent ${agent.id}:`, err);
                errors.push({ id: agent.id, error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            updated: updatedCount,
            errors: errors.length > 0 ? errors : undefined,
            message: `Successfully synced ${updatedCount} agents.`
        });

    } catch (error: any) {
        console.error("Critical error in sync-agents:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
