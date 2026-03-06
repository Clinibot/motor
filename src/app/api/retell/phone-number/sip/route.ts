import { NextResponse } from 'next/server';
import Retell from 'retell-sdk';
import { createClient as createLocalClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

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
            outbound_transport,
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
                transport: ((outbound_transport || 'TCP').toUpperCase()) as 'TCP' | 'UDP' | 'TLS'
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
                .insert({
                    clinic_id: clinicId,
                    phone_number: retellResponse.phone_number,
                    nickname: nickname || phone_number,
                    country: 'Spain', // Valor requerido por constraint
                    status: 'active'
                });

            if (dbError) {
                console.error("Error persisting phone number to DB:", dbError);
                // Si ya existe en nuestra DB, no es un error crítico si es duplicado
                // Pero si es otro error, queremos saberlo.
                if (dbError.code !== '23505') {
                    throw new Error(`Error saving to DB: ${dbError.message}`);
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
