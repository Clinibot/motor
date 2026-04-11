import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { reportFactoryError } from '@/lib/alerts/alertNotifier';
import { verifyRetellWebhook } from '@/lib/retell/webhookAuth';

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
    let supabaseAdmin: ReturnType<typeof createSupabaseAdmin> | null = null;
    try { supabaseAdmin = createSupabaseAdmin(); } catch { console.error('Webhook: Supabase env vars missing'); }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let payload: Record<string, any> = {};
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Supabase configuration error' }, { status: 500 });
        }

        const rawBody = await request.text();

        // ── Step 1: early parse to extract agent_id (needed before verification) ──
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let prelimPayload: Record<string, any> = {};
        try {
            prelimPayload = JSON.parse(rawBody);
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const earlyCallData = prelimPayload.call;
        if (!earlyCallData?.agent_id) {
            return NextResponse.json({ error: 'Missing agent_id in payload' }, { status: 400 });
        }

        const retellAgentId: string = earlyCallData.agent_id;

        // ── Step 2: look up agent + workspace API key for signature verification ──
        const { data: agentRecord } = await supabaseAdmin
            .from('agents')
            .select('id, workspace_id')
            .eq('retell_agent_id', retellAgentId)
            .single();

        if (!agentRecord) {
            // Unknown agent — can't verify. Log and return 200 so Retell doesn't retry.
            console.warn(`Webhook received for unknown retell_agent_id: ${retellAgentId}`);
            await supabaseAdmin.from('webhook_logs').insert([{
                event_type: 'error_agent_not_found',
                error: `Agent ${retellAgentId} not found in agents table`,
                payload: prelimPayload,
            }]);
            return NextResponse.json({ received: true, warning: 'Agent not found in DB' });
        }

        const { data: workspace } = await supabaseAdmin
            .from('workspaces')
            .select('retell_api_key')
            .eq('id', agentRecord.workspace_id)
            .single();

        // ── Step 3: verify signature using workspace's Retell API key ─────────
        const valid = await verifyRetellWebhook(
            rawBody,
            request.headers.get('x-retell-signature'),
            workspace?.retell_api_key
        );
        if (!valid) {
            console.warn('[webhook] Invalid signature — request rejected');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        payload = prelimPayload;

        // ── Logging ───────────────────────────────────────────────────────────
        const headers: Record<string, string> = {};
        request.headers.forEach((value, key) => { headers[key] = value; });
        await supabaseAdmin.from('webhook_logs').insert([{
            event_type: payload.event || 'untyped',
            payload: payload,
            headers: headers,
        }]);

        // Retell sends different event types. We care about 'call_ended' and 'call_analyzed'
        const eventType: string = payload.event;
        const callData = payload.call;

        if (!callData || !callData.agent_id) {
            return NextResponse.json({ error: 'Missing agent_id in payload' }, { status: 400 });
        }

        console.log(`Webhook triggered for Retell Agent: ${retellAgentId}, Event: ${eventType}`);

        // agentRecord and workspaceId already resolved above — no second DB lookup needed
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
        // Use Object.keys check to avoid {} (empty object) being truthy and masking real data
        const analysisData = callData.call_analysis || {};
        const rawCv = analysisData.custom_variables;
        const rawCad = analysisData.custom_analysis_data;
        const incomingCustomVars = (rawCv && Object.keys(rawCv).length > 0)
            ? rawCv
            : (rawCad || {});

        // Preserve existing custom_variables if this event brings none (guards against
        // call_ended arriving late after call_analyzed and wiping extraction data)
        const existingCustomVars = existingCall?.call_analysis?.custom_variables || existingCall?.call_analysis?.custom_analysis_data || {};
        const customVars: Record<string, unknown> = Object.keys(incomingCustomVars).length > 0
            ? { ...incomingCustomVars }
            : { ...existingCustomVars };

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

        const existingAnalysis = existingCall?.call_analysis || {};
        const mergedAnalysis = (callData.call_analysis && Object.keys(callData.call_analysis).length > 0)
            ? { ...existingAnalysis, ...callData.call_analysis, custom_variables: customVars }
            : existingAnalysis;

        const callRecord = {
            id: existingCall?.id,
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
            call_analysis: mergedAnalysis,
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

            await reportFactoryError('Webhook [call_event]',
                `Error persistiendo llamada ${callData.call_id}: ${upsertError.message}`,
                { workspace_id: workspaceId, event: eventType }
            );

            await supabaseAdmin.from('webhook_logs').insert([{
                event_type: 'error_db_upsert',
                error: JSON.stringify(upsertError),
                payload: payload,
            }]);
            return NextResponse.json({ error: 'DB error' }, { status: 500 });
        }

        console.log(`✅ Webhook [${eventType}] saved for workspace ${workspaceId}, call ${callData.call_id}`);

        // Fire threshold alert check after a fully analyzed call (non-blocking)
        if (eventType === 'call_analyzed') {
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
            fetch(`${baseUrl}/api/alerts/check-thresholds`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(process.env.CRON_SECRET ? { 'Authorization': `Bearer ${process.env.CRON_SECRET}` } : {}),
                },
                body: JSON.stringify({ workspace_id: workspaceId }),
            }).catch(err => console.warn('[alerts] Threshold check fire-and-forget error:', err));
        }

        return NextResponse.json({ received: true });

    } catch (error: unknown) {
        console.error('Webhook error:', error);

        await reportFactoryError('Webhook Catch-All',
            error instanceof Error ? error.message : String(error),
            { event: payload.event, call_id: payload.call?.call_id }
        );

        if (supabaseAdmin) {
            await supabaseAdmin.from('webhook_logs').insert([{
                event_type: 'error_catch',
                error: error instanceof Error ? error.message : 'Unknown error',
                payload: payload,
            }]);
        }
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
