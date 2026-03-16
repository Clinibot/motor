import { NextResponse } from 'next/server';
import Retell from 'retell-sdk';
import { createClient as createLocalClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { buildRetellTools } from '@/lib/retell/toolMapper';
import { enrichSipCredentials } from '@/lib/retell/sip-enrichment';

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
        const {
            number_id, // UUID in our DB
            phone_number, // E.164 number
            agent_id, // UUID in our DB or 'none'
            workspace_id
        } = payload;

        if (!phone_number || !number_id || !workspace_id) {
            return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 });
        }

        const supabase = await createLocalClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const supabaseAdmin = getSupabaseAdmin();

        // 1. Resolver retell_agent_id (String) a partir del agent_id (UUID)
        let retellAgentId = null;
        const localAgentId = (agent_id === 'none' || !agent_id) ? null : agent_id;

        if (localAgentId) {
            const { data: agentData, error: agentError } = await supabaseAdmin
                .from('agents')
                .select('retell_agent_id')
                .eq('id', localAgentId)
                .single();

            if (agentError || !agentData) {
                return NextResponse.json({ success: false, error: "Agent not found in database" }, { status: 404 });
            }
            retellAgentId = agentData.retell_agent_id;
        }

        // 2. Obtener API Key de Retell del workspace
        const { data: workspace, error: wsError } = await supabaseAdmin
            .from('workspaces')
            .select('retell_api_key')
            .eq('id', workspace_id)
            .single();

        if (wsError || !workspace?.retell_api_key) {
            return NextResponse.json({ success: false, error: "Workspace API Key not found" }, { status: 400 });
        }

        const retellClient = new Retell({ apiKey: workspace.retell_api_key });

        // 3. Actualizar en Retell
        console.log(`Updating Retell phone number ${phone_number} with agent ${retellAgentId}`);

        await retellClient.phoneNumber.update(phone_number, {
            inbound_agent_id: retellAgentId
        });

        // 4. Actualizar en nuestra DB con el UUID local
        const { error: dbError } = await supabaseAdmin
            .from('phone_numbers')
            .update({ assigned_inbound_agent_id: localAgentId })
            .eq('id', number_id);

        if (dbError) {
            console.error("Error updating DB assignment:", dbError);
            return NextResponse.json({
                success: false,
                error: `Retell updated, but DB failed: ${dbError.message}`
            }, { status: 500 });
        }

        // 5. SI hay un agente asignado, actualizar sus herramientas para incluir las credenciales SIP de este número
        if (localAgentId && retellAgentId) {
            try {
                console.log(`Refrescando herramientas del agente ${localAgentId} con credenciales de ${phone_number}`);
                const { data: agent } = await supabaseAdmin
                    .from('agents')
                    .select('configuration, retell_llm_id')
                    .eq('id', localAgentId)
                    .single();

                if (agent && agent.configuration && agent.retell_llm_id) {
                    const payload = { ...agent.configuration };
                    // Enriquecemos PASANDO el ID del agente para que encuentre el número recién asignado
                    await enrichSipCredentials(payload, supabaseAdmin, localAgentId);
                    const updatedTools = buildRetellTools(payload);

                    await retellClient.llm.update(agent.retell_llm_id, {
                        general_tools: updatedTools as any[]
                    });
                    console.log("Herramientas del agente actualizadas con éxito tras asignación.");
                }
            } catch (updateErr) {
                console.warn("No se pudieron actualizar las herramientas del agente tras la asignación, pero el número se vinculó:", updateErr);
            }
        }

        return NextResponse.json({
            success: true,
            phone_number: phone_number,
            assigned_agent_id: localAgentId
        });

    } catch (error: unknown) {
        console.error("Error in assign-agent route:", error);
        return NextResponse.json({
            success: false,
            error: (error as Error).message || "Internal Server Error"
        }, { status: 500 });
    }
}
