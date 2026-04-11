import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createLocalClient } from '@/lib/supabase/server';
import { resolveUserWorkspace } from '@/lib/supabase/workspace';

export const dynamic = 'force-dynamic';


export async function POST() {
    try {
        const supabase = await createLocalClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const supabaseAdmin = createSupabaseAdmin();

        const result = await resolveUserWorkspace(supabaseAdmin, userId);
        if ('error' in result) {
            return NextResponse.json({ success: false, error: result.error }, { status: result.status });
        }

        return NextResponse.json({
            success: true,
            workspace_id: result.workspaceId,
            message: "Workspace successfully assigned",
        });

    } catch (error: unknown) {
        console.error("Error in auto-assign workspace:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to auto-assign workspace" },
            { status: 500 }
        );
    }
}
