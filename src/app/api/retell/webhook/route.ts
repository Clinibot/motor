import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Retell signs each webhook with a header we can optionally verify
// For production, validate: Authorization: Bearer <RETELL_API_KEY>
// Since each workspace has a different key, we use a shared webhook secret if configured,
// or trust the payload agent_id to look up the workspace securely.

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Webhook ERROR: Supabase environment variables are missing');
        return null;
    }
    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
    const supabaseAdmin = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let payload: Record<string, any> = {};
    try {
        payload = await request.json();

        // --- LOGGING PARA DEPURACIÓN ---
        if (supabaseAdmin) {
            const headers: Record<string, string> = {};
            request.headers.forEach((value, key) => { headers[key] = value; });

            await supabaseAdmin.from('webhook_logs').insert([{
                event_type: payload.event || 'untyped',
                payload: payload,
                headers: headers
            }]);
        }
        // -------------------------------

        // Retell sends different event types. We care about 'call_ended' and 'call_analyzed'
        const eventType: string = payload.event;
        const callData = payload.call;

        if (!callData || !callData.agent_id) {
            return NextResponse.json({ error: 'Missing agent_id in payload' }, { status: 400 });
        }

        const retellAgentId: string = callData.agent_id;
        console.log(`Webhook triggered for Retell Agent: ${retellAgentId}, Event: ${eventType}`);

        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Supabase configuration error' }, { status: 500 });
        }

        // Find the workspace and our internal agent record from the Retell agent ID
        const { data: agentRecord } = await supabaseAdmin
            .from('agents')
            .select('id, workspace_id')
            .eq('retell_agent_id', retellAgentId)
            .single();

        if (!agentRecord) {
            // Agent not found in our system — log it but return 200 so Retell doesn't retry
            console.warn(`Webhook received for unknown retell_agent_id: ${retellAgentId}`);
            if (supabaseAdmin) {
                await supabaseAdmin.from('webhook_logs').insert([{
                    event_type: 'error_agent_not_found',
                    error: `Agent ${retellAgentId} not found in agents table`,
                    payload: payload
                }]);
            }
            return NextResponse.json({ received: true, warning: 'Agent not found in DB' });
        }

        const workspaceId: string = agentRecord.workspace_id;
        const internalAgentId: string = agentRecord.id;

        // Calculate duration
        const durationMs = callData.end_timestamp && callData.start_timestamp
            ? callData.end_timestamp - callData.start_timestamp
            : null;

        // 1. Fetch existing call data to avoid overwriting enriched info
        const { data: existingCall } = await supabaseAdmin
            .from('calls')
            .select('*')
            .eq('retell_call_id', callData.call_id)
            .single();

        // 2. Build the call record, merging with existing data if present
        const direction = callData.direction;
        const fromNumber = callData.from_number;
        const toNumber = callData.to_number;
        
        let detectedCustomerNumber = existingCall?.customer_number;
        if (callData.call_type === 'web_call') {
            detectedCustomerNumber = 'Web Call';
        } else if (direction === 'outbound') {
            detectedCustomerNumber = toNumber || fromNumber;
        } else if (direction === 'inbound') {
            detectedCustomerNumber = fromNumber || toNumber;
        } else {
            detectedCustomerNumber = fromNumber || toNumber || 'Unknown';
        }

        // Handle analysis data normalization
        const analysisData = callData.call_analysis || {};
        const customVars = { ...(analysisData.custom_variables || analysisData.custom_analysis_data || {}) };
        
        // Patch common phone variables if they are missing or invalid (like '0')
        const phoneKeyPatterns = ['telefono', 'phone', 'numero', 'movil', 'cell'];
        Object.keys(customVars).forEach(key => {
            const val = customVars[key];
            const normalizedKey = key.toLowerCase();
            const isPhoneKey = phoneKeyPatterns.some(pattern => normalizedKey.includes(pattern));
            
            if (isPhoneKey && (val === '0' || val === 0 || !val || val === 'unknown')) {
                customVars[key] = detectedCustomerNumber;
            }
        });
        
        const callRecord = {
            id: existingCall?.id, // Keep same ID if exists
            workspace_id: workspaceId,
            agent_id: internalAgentId,
            retell_agent_id: retellAgentId,
            retell_call_id: callData.call_id,
            call_status: callData.call_status || eventType,
            transcript: callData.transcript || existingCall?.transcript || null,
            recording_url: callData.recording_url || existingCall?.recording_url || null,
            start_timestamp: callData.start_timestamp || existingCall?.start_timestamp || null,
            end_timestamp: callData.end_timestamp || existingCall?.end_timestamp || null,
            duration_ms: durationMs || existingCall?.duration_ms || null,
            call_cost: callData.call_cost?.combined_cost ? (callData.call_cost.combined_cost / 100) : (existingCall?.call_cost || null),
            disconnection_reason: callData.disconnection_reason || existingCall?.disconnection_reason || null,
            call_analysis: (callData.call_analysis && Object.keys(callData.call_analysis).length > 0)
                ? { ...callData.call_analysis, custom_variables: customVars } // Ensure custom_variables is present
                : (existingCall?.call_analysis || {}),
            raw_payload: payload,
            customer_number: detectedCustomerNumber,
            customer_name: customVars.nombre || customVars.name || customVars.nombre_cliente || customVars.cliente_nombre || customVars.NOMBRE || existingCall?.customer_name || null,
            call_type: callData.call_type || existingCall?.call_type || (fromNumber || toNumber ? 'phone_call' : 'web_call'),
            cost_breakdown: (callData.call_cost && Object.keys(callData.call_cost).length > 0)
                ? callData.call_cost
                : (existingCall?.cost_breakdown || null),
        };

        // 3. Upsert to handle both call_ended and call_analyzed events for the same call
        const { error: upsertError } = await supabaseAdmin
            .from('calls')
            .upsert(callRecord, { onConflict: 'retell_call_id' });

        if (upsertError) {
            console.error('Error saving call to DB:', upsertError);
            if (supabaseAdmin) {
                await supabaseAdmin.from('webhook_logs').insert([{
                    event_type: 'error_db_upsert',
                    error: JSON.stringify(upsertError),
                    payload: payload
                }]);
            }
            return NextResponse.json({ error: 'DB error' }, { status: 500 });
        }

        console.log(`✅ Webhook [${eventType}] saved for workspace ${workspaceId}, call ${callData.call_id}`);
        return NextResponse.json({ received: true });

    } catch (error: unknown) {
        console.error('Webhook error:', error);
        if (supabaseAdmin) {
            await supabaseAdmin.from('webhook_logs').insert([{
                event_type: 'error_catch',
                error: error instanceof Error ? error.message : 'Unknown error',
                payload: payload
            }]);
        }
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
