import { NextResponse, type NextRequest } from 'next/server';
import Retell from 'retell-sdk';
import { createClient as createLocalClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { buildRetellTools, detectCalToolLoss, parseBool as parseBoolTool } from '@/lib/retell/toolMapper';
import { enrichSipCredentials } from '@/lib/retell/sip-enrichment';

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
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

        const supabaseAdmin = createSupabaseAdmin();

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

        // Fetch agent configuration to check if Cal.com webhook is needed
        let needsInboundWebhook = false;
        if (localAgentId) {
            const { data: agentConfig } = await supabaseAdmin
                .from('agents')
                .select('configuration')
                .eq('id', localAgentId)
                .single();

            const cfg = agentConfig?.configuration;
            needsInboundWebhook = parseBoolTool(cfg?.enableCalBooking) && !!cfg?.calApiKey && !!cfg?.calEventId;
            console.log(`[assign] needsInboundWebhook=${needsInboundWebhook} — enableCalBooking=${cfg?.enableCalBooking} calApiKey=${!!cfg?.calApiKey} calEventId=${cfg?.calEventId}`);
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

        // Derive the base URL from env var (production) or fall back to the request origin (local/dev)
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
            || `${request.nextUrl.protocol}//${request.nextUrl.host}`;

        const webhookUrl = needsInboundWebhook
            ? `${siteUrl}/api/retell/webhook/inbound`
            : null; // null explicitly clears any previously set webhook

        console.log(`Inbound webhook URL to set: ${webhookUrl ?? '(none)'}`);

        await retellClient.phoneNumber.update(phone_number, {
            inbound_agent_id: retellAgentId,
            inbound_webhook_url: webhookUrl,
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
                    const agentCfg = agent.configuration;

                    // Only run if the agent actually has transfer enabled (that's the only reason to re-enrich tools here)
                    if (!parseBoolTool(agentCfg.enableTransfer)) {
                        console.log(`[assign] Agent ${localAgentId} has no transfer enabled — skipping tool refresh to avoid overwriting Retell tools.`);
                    } else {
                        const toolPayload = { ...agentCfg };
                        // Enriquecemos PASANDO el ID del agente para que encuentre el número recién asignado
                        await enrichSipCredentials(toolPayload, supabaseAdmin, localAgentId);
                        const updatedTools = buildRetellTools(toolPayload);

                        if (detectCalToolLoss(agentCfg, updatedTools)) {
                            console.error(`[assign] ABORTED tool refresh: agent had Cal.com but rebuilt tools are missing it. Config: enableCalBooking=${agentCfg.enableCalBooking} calApiKey=${!!agentCfg.calApiKey} calEventId=${agentCfg.calEventId}`);
                        } else {
                            await retellClient.llm.update(agent.retell_llm_id, {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                general_tools: updatedTools as any
                            });
                            console.log(`[assign] Tools refreshed for agent ${localAgentId}.`);
                        }
                    }
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
