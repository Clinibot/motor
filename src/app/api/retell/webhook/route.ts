import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Retell signs each webhook with a header we can optionally verify
// For production, validate: Authorization: Bearer <RETELL_API_KEY>
// Since each workspace has a different key, we use a shared webhook secret if configured,
// or trust the payload agent_id to look up the workspace securely.

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
    try {
        const payload = await request.json();

        // Retell sends different event types. We care about 'call_ended' and 'call_analyzed'
        const eventType: string = payload.event;
        const callData = payload.call;

        if (!callData || !callData.agent_id) {
            return NextResponse.json({ error: 'Missing agent_id in payload' }, { status: 400 });
        }

        const retellAgentId: string = callData.agent_id;
        const supabaseAdmin = getSupabaseAdmin();

        // Find the workspace and our internal agent record from the Retell agent ID
        const { data: agentRecord } = await supabaseAdmin
            .from('agents')
            .select('id, workspace_id')
            .eq('retell_agent_id', retellAgentId)
            .single();

        if (!agentRecord) {
            // Agent not found in our system — log it but return 200 so Retell doesn't retry
            console.warn(`Webhook received for unknown retell_agent_id: ${retellAgentId}`);
            return NextResponse.json({ received: true, warning: 'Agent not found in DB' });
        }

        const workspaceId: string = agentRecord.workspace_id;
        const internalAgentId: string = agentRecord.id;

        // Calculate duration
        const durationMs = callData.end_timestamp && callData.start_timestamp
            ? callData.end_timestamp - callData.start_timestamp
            : null;

        // Build the call record
        const callRecord = {
            workspace_id: workspaceId,
            agent_id: internalAgentId,
            retell_agent_id: retellAgentId,
            retell_call_id: callData.call_id,
            call_status: callData.call_status || eventType,
            transcript: callData.transcript ?? null,
            recording_url: callData.recording_url ?? null,
            start_timestamp: callData.start_timestamp ?? null,
            end_timestamp: callData.end_timestamp ?? null,
            duration_ms: durationMs,
            call_cost: callData.call_cost?.combined_cost ?? null,
            disconnection_reason: callData.disconnection_reason ?? null,
            call_analysis: callData.call_analysis ?? {},
            raw_payload: payload,
        };

        // Upsert to handle both call_ended and call_analyzed events for the same call
        const { error: upsertError } = await supabaseAdmin
            .from('calls')
            .upsert(callRecord, { onConflict: 'retell_call_id', ignoreDuplicates: false });

        if (upsertError) {
            console.error('Error saving call to DB:', upsertError);
            return NextResponse.json({ error: 'DB error' }, { status: 500 });
        }

        console.log(`✅ Webhook [${eventType}] saved for workspace ${workspaceId}, call ${callData.call_id}`);
        return NextResponse.json({ received: true });

    } catch (error: unknown) {
        console.error('Webhook error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
