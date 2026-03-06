import { NextResponse } from 'next/server';
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

export async function GET() {
    try {
        const supabaseAdmin = getSupabaseAdmin();

        // 1. Fetch all users with their workspace info
        const { data: users, error: userError } = await supabaseAdmin
            .from('users')
            .select(`
                id,
                full_name,
                email,
                workspace_id,
                workspaces (
                    id,
                    name
                )
            `)
            .order('created_at', { ascending: false });

        if (userError) throw userError;

        // 2. Fetch all calls to calculate duration
        const { data: calls, error: callError } = await supabaseAdmin
            .from('calls')
            .select('workspace_id, duration_ms');

        if (callError) throw callError;

        // 3. Fetch phone numbers (logic depends on how they are stored, 
        // usually in a phone_numbers table or similar, 
        // looking at previous context it seems they might be in 'agents' or a dedicated table)
        // I'll try to fetch from 'agents' first as it's a common pattern in this project
        const { data: agents, error: agentError } = await supabaseAdmin
            .from('agents')
            .select('workspace_id, configuration');

        if (agentError) throw agentError;

        // Process data
        const enhancedUsers = users?.map(user => {
            const workspaceId = user.workspace_id;

            // Calculate total minutes for this workspace
            const workspaceCalls = calls?.filter(c => c.workspace_id === workspaceId) || [];
            const totalMs = workspaceCalls.reduce((acc, call) => acc + (call.duration_ms || 0), 0);
            const totalMinutes = Math.floor(totalMs / 60000);

            // Extract phone numbers from agents configuration in this workspace
            const workspaceAgents = agents?.filter(a => a.workspace_id === workspaceId) || [];
            const phoneNumbers = Array.from(new Set(
                workspaceAgents
                    .map(a => a.configuration?.phoneNumber)
                    .filter(Boolean)
            ));

            // Handle workspaces being an object or an array depending on Supabase version/types
            const workspaceData = (user.workspaces as unknown as { name: string } | { name: string }[]) || null;
            const workspaceName = Array.isArray(workspaceData)
                ? (workspaceData[0]?.name || 'Sin Workspace')
                : (workspaceData?.name || 'Sin Workspace');

            return {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                workspace_name: workspaceName,
                workspace_id: user.workspace_id,
                phone_numbers: phoneNumbers,
                total_minutes: totalMinutes,
                calls_count: workspaceCalls.length
            };
        });

        return NextResponse.json({ success: true, users: enhancedUsers });
    } catch (error: unknown) {
        console.error("Error fetching admin users:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to fetch users" },
            { status: 500 }
        );
    }
}
