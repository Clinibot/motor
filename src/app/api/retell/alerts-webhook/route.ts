import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) return null;
    return createClient(supabaseUrl, supabaseServiceKey);
}

function verifySignature(payload: string, apiKey: string, signature: string | null): boolean {
    if (!signature) return false;
    try {
        const expectedSignature = crypto.createHmac('sha256', apiKey).update(payload).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch {
        return false;
    }
}

export async function POST(request: NextRequest) {
    const supabaseAdmin = getSupabaseAdmin();
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

        // 2. Verify Payload Signature
        const isValid = verifySignature(rawBody, workspace.retell_api_key, signature);
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
            
            // Send Emails
            if (emails.length > 0 && process.env.RESEND_API_KEY) {
                const resend = new Resend(process.env.RESEND_API_KEY);
                const htmlContent = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f3f4f6; border-radius: 8px;">
                        <h2 style="color: #dc2626; margin-top: 0;">ALERTA CRÍTICA: ${alertLabel}</h2>
                        <p style="color: #374151;">Se ha disparado una alerta en la infraestructura de Retell para uno de tus clientes.</p>
                        
                        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
                            <p style="margin: 0 0 10px 0;"><strong>Cliente (Workspace):</strong> ${workspaceName}</p>
                            <p style="margin: 0 0 10px 0;"><strong>Regla Detonada:</strong> ${alert.name}</p>
                            <p style="margin: 0 0 10px 0;"><strong>Métrica:</strong> ${alert.metric_type}</p>
                            <p style="margin: 0 0 10px 0;"><strong>Valor Actual:</strong> <span style="color: #dc2626; font-weight: bold;">${alert.current_value}</span></p>
                            <p style="margin: 0;"><strong>Umbral Configurado:</strong> ${alert.threshold_value}</p>
                        </div>
                        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 30px;">
                            ID Incidente: ${alert.alert_incident_id}<br/>
                            Reportado el: ${new Date().toISOString()}
                        </p>
                    </div>
                `;

                for (const email of emails) {
                    await resend.emails.send({
                        from: 'Alertas Sistema <onboarding@resend.dev>',
                        to: email,
                        subject: `[CRÍTICO] ${alertLabel} - ${workspaceName}`,
                        html: htmlContent
                    });
                }
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
