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
            number_id, // UUID in our DB
            phone_number, // E.164 number
            retell_agent_id, // Agent ID from Retell (can be null/none)
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

        // 2. Actualizar en Retell
        const agentId = (retell_agent_id === 'none' || !retell_agent_id) ? null : retell_agent_id;

        console.log(`Updating Retell phone number ${phone_number} with agent ${agentId}`);

        await retellClient.phoneNumber.update(phone_number, {
            inbound_agent_id: agentId
        });

        // 3. Actualizar en nuestra DB
        const { error: dbError } = await supabaseAdmin
            .from('phone_numbers')
            .update({ assigned_inbound_agent_id: agentId })
            .eq('id', number_id);

        if (dbError) {
            console.error("Error updating DB assignment:", dbError);
            // Aunque falle la DB, el cambio en Retell ya se hizo
            return NextResponse.json({
                success: false,
                error: `Retell updated, but DB failed: ${dbError.message}`
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            phone_number: phone_number,
            assigned_agent_id: agentId
        });

    } catch (error: unknown) {
        console.error("Error in assign-agent route:", error);
        return NextResponse.json({
            success: false,
            error: (error as Error).message || "Internal Server Error"
        }, { status: 500 });
    }
}
