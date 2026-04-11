import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { sendElioAlertEmail } from '@/lib/alerts/alertNotifier';
import { verifyRetellWebhook } from '@/lib/retell/webhookAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    let supabaseAdmin: ReturnType<typeof createSupabaseAdmin> | null = null;
    try { supabaseAdmin = createSupabaseAdmin(); } catch { /* handled in the null check below */ }
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Supabase config missing' }, { status: 500 });
    }

    try {
        const rawBody = await request.text();
        const signature = request.headers.get('x-retell-signature');
        const workspaceId = request.nextUrl.searchParams.get('workspace_id');

        if (!workspaceId) {
            return NextResponse.json({ error: 'Missing workspace_id parameter' }, { status: 400 });
        }

        // 1. Fetch workspace API Key
        const { data: workspace } = await supabaseAdmin
            .from('workspaces')
            .select('name, retell_api_key')
            .eq('id', workspaceId)
            .single();

        if (!workspace || !workspace.retell_api_key) {
            return NextResponse.json({ error: 'Workspace not found or API key missing' }, { status: 404 });
        }

        // 2. Verify Payload Signature using the SDK (v={timestamp},d={hex} format)
        const isValid = await verifyRetellWebhook(rawBody, signature, workspace.retell_api_key);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid Retell signature' }, { status: 401 });
        }

        const payload = JSON.parse(rawBody);
        const { event, alert } = payload;

        if (event !== 'alert_triggered' || !alert) {
            // Ignore other events
            return new NextResponse(null, { status: 204 });
        }

        // 3. Fetch Global Admin Settings
        const { data: adminSettings } = await supabaseAdmin
            .from('admin_alert_settings')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (!adminSettings) {
            return new NextResponse(null, { status: 204 }); // No admin config set
        }

        // 4. Map Metric Type to Admin Setting Constraints
        let shouldAlert = false;
        let alertLabel = '';
        switch (alert.metric_type) {
            case 'api_error':
            case 'api_errors':
                shouldAlert = adminSettings.api_errors_enabled;
                alertLabel = 'Error de API (Integración)';
                break;
            case 'transfer_failed':
            case 'call_transfer_failed':
                shouldAlert = adminSettings.transfer_failures_enabled;
                alertLabel = 'Fallo al Transferir Llamada';
                break;
            case 'function_failed':
            case 'custom_function_failed':
                shouldAlert = adminSettings.custom_functions_enabled;
                alertLabel = 'Fallo en Función Personalizada';
                break;
            case 'call_count':
            case 'concurrency':
                shouldAlert = adminSettings.concurrency_enabled;
                alertLabel = 'Pico de Concurrencia (Call Count)';
                break;
            default:
                // For unknown metrics, we default to sending it if there are severe anomalies or just ignore.
                shouldAlert = true; 
                alertLabel = `Alerta de Sistema: ${alert.name}`;
                break;
        }

        if (shouldAlert) {
            const workspaceName = workspace.name || 'Desconocido';
            const emails: string[] = adminSettings.emails || [];
            
            // Send Emails via the new Premium Elio Notifier
            if (emails.length > 0 && process.env.RESEND_API_KEY) {
                await sendElioAlertEmail(emails, {
                    agentName: 'ELIO', // Supervisor name
                    clientName: 'Equipo de Soporte',
                    workspaceName: workspaceName,
                    alerts: [{
                        type: alert.metric_type.includes('api') ? 'api' : 
                              alert.metric_type.includes('transfer') ? 'transfer' : 
                              alert.metric_type.includes('function') ? 'function' : 'concurrency',
                        label: alertLabel,
                        level: alert.metric_type.includes('concurrency') ? 'Info' : (alert.metric_type.includes('api') || alert.metric_type.includes('transfer') ? 'Crítico' : 'Advertencia'),
                        description: alert.name || 'Alerta disparada desde Retell AI',
                        value: alert.current_value,
                        threshold: alert.threshold_value,
                        client: workspaceName
                    }]
                });
            }

            // Send to Webhook Configured by Admin
            if (adminSettings.webhook_url) {
                try {
                    await fetch(adminSettings.webhook_url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            platform_event: "alert_forwarded",
                            workspace_name: workspaceName,
                            workspace_id: workspaceId,
                            original_payload: payload
                        })
                    });
                } catch (webhookErr) {
                    console.error("Failed to forward alert to admin webhook", webhookErr);
                }
            }
        }

        return new NextResponse(null, { status: 204 });

    } catch (err) {
        console.error("Alerts Webhook Error:", err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
