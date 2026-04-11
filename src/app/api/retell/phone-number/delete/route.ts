import { NextResponse } from 'next/server';
import { createRetellClient } from '@/lib/retell/client';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { requireUserSession } from '@/lib/auth/requireUserSession';
import { checkRateLimit } from '@/lib/supabase/rateLimit';

export const dynamic = 'force-dynamic';


/**
 * Elimina un número de teléfono tanto de Retell AI como de nuestra base de datos.
 */
export async function POST(request: Request) {
    try {
        const payload = await request.json();
        const {
            number_id, // UUID en nuestra DB
            phone_number, // E.164
        } = payload;

        if (!phone_number || !number_id) {
            return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 });
        }

        const supabaseAdmin = createSupabaseAdmin();

        // Auth: workspace_id siempre desde la sesión, nunca desde el payload del cliente
        const auth = await requireUserSession(supabaseAdmin);
        if ('error' in auth) return auth.error;
        const { workspaceId } = auth;

        // Rate limit: 10 deletions per hour per workspace
        const rlDelete = await checkRateLimit(supabaseAdmin, `phone:delete:${workspaceId}`, 10, 3600,
            'Demasiados borrados de número en poco tiempo. Por favor espera un momento.');
        if (rlDelete) return rlDelete;

        // 1. Obtener API Key de Retell del workspace
        const { data: workspace, error: wsError } = await supabaseAdmin
            .from('workspaces')
            .select('retell_api_key')
            .eq('id', workspaceId)
            .single();

        if (wsError || !workspace?.retell_api_key) {
            return NextResponse.json({ success: false, error: "Workspace API Key not found" }, { status: 400 });
        }

        const retellClient = createRetellClient(workspace.retell_api_key);

        // 2. Intentar eliminar en Retell
        console.log(`Deleting phone number ${phone_number} from Retell`);
        try {
            await retellClient.phoneNumber.delete(phone_number);
        } catch (retellErr: unknown) {
            // Si el número no existe en Retell, procedemos con el borrado local de todos modos
            console.warn(`Retell phone number delete warning for ${phone_number}:`, (retellErr as Error).message || retellErr);
        }

        // 3. Eliminar de nuestra base de datos
        console.log(`Deleting phone number ${number_id} from local database`);
        // Filtramos también por workspace_id para que un number_id de otro workspace
        // no pueda eliminarse aunque se pase intencionadamente en el payload.
        const { error: dbError } = await supabaseAdmin
            .from('phone_numbers')
            .delete()
            .eq('id', number_id)
            .eq('workspace_id', workspaceId);

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
