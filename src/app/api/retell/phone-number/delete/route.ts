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

/**
 * Elimina un número de teléfono tanto de Retell AI como de nuestra base de datos.
 */
export async function POST(request: Request) {
    try {
        const payload = await request.json();
        const {
            number_id, // UUID en nuestra DB
            phone_number, // E.164
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

        // 2. Intentar eliminar en Retell
        console.log(`Deleting phone number ${phone_number} from Retell`);
        try {
            await retellClient.phoneNumber.delete(phone_number);
        } catch (retellErr: any) {
            // Si el número no existe en Retell, procedemos con el borrado local de todos modos
            console.warn(`Retell phone number delete warning for ${phone_number}:`, retellErr.message);
        }

        // 3. Eliminar de nuestra base de datos
        console.log(`Deleting phone number ${number_id} from local database`);
        const { error: dbError } = await supabaseAdmin
            .from('phone_numbers')
            .delete()
            .eq('id', number_id);

        if (dbError) {
            console.error("Error deleting from DB:", dbError);
            return NextResponse.json({
                success: false,
                error: `Local DB deletion failed: ${dbError.message}`
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "Phone number deleted successfully from Retell and local database",
            id: number_id
        });

    } catch (error: unknown) {
        console.error("Error in delete-phone-number route:", error);
        return NextResponse.json({
            success: false,
            error: (error as Error).message || "Internal Server Error"
        }, { status: 500 });
    }
}
