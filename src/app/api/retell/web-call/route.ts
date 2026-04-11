import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createLocalClient } from '@/lib/supabase/server';
import Retell from 'retell-sdk';

export const dynamic = 'force-dynamic';


export async function POST(request: Request) {
    try {
        // 1. Require an authenticated session
        const supabase = await createLocalClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized. Please log in first.' }, { status: 401 });
        }

        const payload = await request.json();
        const { agent_id } = payload;

        if (!agent_id) {
            return NextResponse.json({ success: false, error: 'Missing agent_id' }, { status: 400 });
        }

        const supabaseAdmin = createSupabaseAdmin();

        // 2. Resolve the workspace for the authenticated user
        const { data: userProfile } = await supabaseAdmin
            .from('users')
            .select('workspace_id')
            .eq('id', session.user.id)
            .single();

        if (!userProfile?.workspace_id) {
            return NextResponse.json({ success: false, error: 'User has no workspace assigned.' }, { status: 400 });
        }

        const workspaceId = userProfile.workspace_id as string;

        // 3. Verify the requested agent belongs to the caller's workspace
        //    (prevents cross-tenant call creation)
        const { data: agent, error: agentError } = await supabaseAdmin
            .from('agents')
            .select('retell_agent_id')
            .eq('retell_agent_id', agent_id)
            .eq('workspace_id', workspaceId)
            .single();

        if (agentError || !agent) {
            return NextResponse.json(
                { success: false, error: 'Agent not found or does not belong to your workspace.' },
                { status: 403 }
            );
        }

        // 4. Fetch the Retell API Key for this workspace
        const { data: workspace, error: wsError } = await supabaseAdmin
            .from('workspaces')
            .select('retell_api_key')
            .eq('id', workspaceId)
            .single();

        if (wsError || !workspace || !workspace.retell_api_key) {
            return NextResponse.json(
                { success: false, error: 'Workspace not found or missing Retell API Key.' },
                { status: 400 }
            );
        }

        // 5. Register the web call to get an access token
        const retellClient = new Retell({ apiKey: workspace.retell_api_key });
        const callResponse = await retellClient.call.createWebCall({ agent_id });

        return NextResponse.json({
            success: true,
            access_token: callResponse.access_token,
        });

    } catch (error: unknown) {
        console.error('Error creating web call:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to register web call' },
            { status: 500 }
        );
    }
}
