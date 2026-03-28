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
            phone_number,
            termination_uri,
            sip_trunk_username,
            sip_trunk_password,
            nickname,
            workspace_id
        } = payload;

        if (!phone_number || !termination_uri) {
            return NextResponse.json({ success: false, error: "Phone number and Termination URI are required." }, { status: 400 });
        }

        const supabase = await createLocalClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const supabaseAdmin = getSupabaseAdmin();

        // 1. Obtener API Key de Retell del workspace
        const { data: workspace, error: wsError } = await supabaseAdmin
            .from('workspaces')
            .select('retell_api_key')
            .eq('id', workspace_id)
            .single();

        if (wsError || !workspace?.retell_api_key) {
            return NextResponse.json({ success: false, error: "Workspace API Key not found" }, { status: 400 });
        }

        const retellClient = new Retell({ apiKey: workspace.retell_api_key });

        // 2. Registrar número SIP en Retell
        // Para números SIP (SIP Trunking), se usa .import() con la configuración del trunk
        console.log("Importing SIP Number in Retell:", phone_number);

        const importPayload = {
            phone_number: phone_number,
            termination_uri: termination_uri,
            nickname: nickname || phone_number,
            sip_outbound_trunk_config: {
                termination_uri: termination_uri,
                auth_username: sip_trunk_username || undefined,
                auth_password: sip_trunk_password || undefined,
                transport: 'UDP' // Forzado a UDP por requerimiento técnico (Netelip)
            }
        };

        let retellResponse;
        try {
            retellResponse = await retellClient.phoneNumber.import(importPayload);
        } catch (error: unknown) {
            // Si el número ya está importado en Retell (Error 409 o similar), intentamos recuperarlo
            const retellError = error as { status?: number; message?: string };
            if (retellError.status === 409 || (retellError.message && retellError.message.includes("already exists"))) {
                console.log("Number already exists in Retell, fetching existing one:", phone_number);
                retellResponse = await retellClient.phoneNumber.retrieve(phone_number);
            } else {
                throw error;
            }
        }

        // 3. Persistir en nuestra base de datos (Supabase)
        // Buscamos o creamos una clínica para este workspace si no existe
        let clinicId = null;

        // Intentar obtener una clínica existente para este usuario
        const { data: existingClinic } = await supabaseAdmin
            .from('clinics')
            .select('id')
            .eq('user_id', session.user.id)
            .limit(1)
            .maybeSingle();

        if (existingClinic) {
            clinicId = existingClinic.id;
        } else {
            // Crear una clínica básica si no existe
            const { data: newClinic, error: clinicError } = await supabaseAdmin
                .from('clinics')
                .insert({
                    user_id: session.user.id,
                    name: nickname || 'Mi Clínica',
                })
                .select('id')
                .single();

            if (clinicError) {
                console.error("Error creating clinic:", clinicError);
            } else {
                clinicId = newClinic.id;
            }
        }

        if (clinicId) {
            const { error: dbError } = await supabaseAdmin
                .from('phone_numbers')
                .upsert({
                    clinic_id: clinicId,
                    phone_number: retellResponse.phone_number,
                    nickname: nickname || phone_number,
                    country: 'Spain', // Valor requerido por constraint
                    status: 'active',
                    sip_username: sip_trunk_username || null,
                    sip_password: sip_trunk_password || null,
                    updated_at: new Date().toISOString()
                }, { 
                    onConflict: 'phone_number' 
                });

            if (dbError) {
                console.error("Error persisting phone number to DB:", dbError);
                throw new Error(`Error saving to DB: ${dbError.message}`);
            }

            // 4. Si el número ya tiene un agente asignado, actualizar sus herramientas con las nuevas credenciales
            const { data: phoneWithAgent } = await supabaseAdmin
                .from('phone_numbers')
                .select('assigned_inbound_agent_id')
                .eq('phone_number', retellResponse.phone_number)
                .maybeSingle();

            if (phoneWithAgent?.assigned_inbound_agent_id) {
                try {
                    console.log(`Refrescando herramientas del agente ${phoneWithAgent.assigned_inbound_agent_id} tras actualización de credenciales SIP.`);
                    const { data: agent } = await supabaseAdmin
                        .from('agents')
                        .select('configuration, retell_llm_id')
                        .eq('id', phoneWithAgent.assigned_inbound_agent_id)
                        .single();

                    if (agent && agent.configuration && agent.retell_llm_id) {
                        const agentPayload = { ...agent.configuration };
                        await enrichSipCredentials(agentPayload, supabaseAdmin, phoneWithAgent.assigned_inbound_agent_id);
                        const updatedTools = buildRetellTools(agentPayload);

                        await retellClient.llm.update(agent.retell_llm_id, {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            general_tools: updatedTools as any
                        });
                        console.log("Herramientas del agente actualizadas con éxito.");
                    }
                } catch (updateErr) {
                    console.warn("Fallo al refrescar herramientas del agente vinculado tras cambio de SIP:", updateErr);
                }
            }
        } else {
            throw new Error("No se pudo asociar a una clínica (clinic_id is null)");
        }

        return NextResponse.json({
            success: true,
            phone_number: retellResponse.phone_number,
            retell_response: retellResponse
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to register SIP number";
        console.error("Error registering SIP number:", error);
        return NextResponse.json({
            success: false,
            error: errorMessage
        }, { status: 500 });
    }
}
