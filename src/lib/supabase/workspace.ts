import { createSupabaseAdmin } from '@/lib/supabase/admin';

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type WorkspaceResult =
    | { workspaceId: string }
    | { workspaceId?: never; error: string; status: number };

/**
 * Returns the workspace_id for a user.
 * If the user already has one, returns it immediately.
 * Otherwise finds the oldest unassigned workspace, assigns it, and returns it.
 *
 * Uses the `assign_free_workspace` Postgres RPC which performs the entire
 * operation atomically with FOR UPDATE SKIP LOCKED, preventing the race
 * condition where two concurrent requests could be assigned the same workspace.
 *
 * Requires the SQL function in:
 *   supabase/migrations/20260411_assign_free_workspace_rpc.sql
 *
 * Only call from server-side code (API routes).
 */
export async function resolveUserWorkspace(
    supabaseAdmin: SupabaseAdmin,
    userId: string,
): Promise<WorkspaceResult> {
    const { data: workspaceId, error } = await supabaseAdmin
        .rpc('assign_free_workspace', { p_user_id: userId });

    if (error) {
        if (error.message?.includes('NO_FREE_WORKSPACE')) {
            return {
                error: 'No hay workspaces disponibles. Contacta con el administrador.',
                status: 400,
            };
        }
        console.error('[resolveUserWorkspace] RPC error:', error);
        return {
            error: 'Error al asignar workspace. Inténtalo de nuevo.',
            status: 500,
        };
    }

    return { workspaceId: workspaceId as string };
}
