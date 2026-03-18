import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'Elio - Supervisor de la Fábrica <alertas@lafabrica.netelip.com>';

export interface AlertData {
  agentName: string;
  clientName: string;
  workspaceName: string;
  alerts: {
    type: 'api' | 'transfer' | 'function' | 'concurrency' | 'factory';
    label: string;
    level: 'Crítico' | 'Advertencia' | 'Info';
    description: string;
    value: string | number;
    threshold: string | number;
    client: string;
  }[];
}

export async function sendElioAlertEmail(to: string[], data: AlertData) {
  const reportDate = new Date().toLocaleDateString('es-ES');
  const reportTime = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  // Use the first alert's level to set the subject prefix
  const highestLevel = data.alerts.some(a => a.level === 'Crítico') ? 'CRÍTICO' : 
                       data.alerts.some(a => a.level === 'Advertencia') ? 'ADVERTENCIA' : 'INFO';

  const subject = `[${highestLevel}] Alertas del sistema - ${data.agentName || data.workspaceName}`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>⚠️ Alertas del sistema - ${data.agentName || 'ELIO'}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; background: #f8f9fa; padding: 20px; }
        .email-container { max-width: 700px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%); padding: 40px 30px; text-align: center; position: relative; overflow: hidden; }
        .header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at 30% 20%, rgba(0,141,203,0.2) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(255,80,80,0.12) 0%, transparent 50%); }
        .logo { position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 20px; }
        .logo-text { font-size: 3.5rem; font-weight: 200; letter-spacing: -2px; color: #ffffff; text-shadow: 0 2px 10px rgba(0,141,203,0.3); text-transform: lowercase; }
        .logo-waves { display: flex; gap: 2px; align-items: center; }
        .wave { width: 2px; background: #ffffff; border-radius: 1px; }
        .w1 { height: 8px; } .w2 { height: 16px; } .w3 { height: 12px; } .w4 { height: 20px; } .w5 { height: 14px; } .w6 { height: 10px; }
        .header-badge { position: relative; z-index: 2; display: inline-block; background: rgba(255,80,80,0.2); border: 1px solid rgba(255,80,80,0.5); color: #ff8080; font-size: 0.75rem; font-weight: 700; padding: 5px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 14px; }
        .header-title { position: relative; z-index: 2; font-size: 1.8rem; font-weight: 600; color: #ffffff; margin-bottom: 10px; }
        .header-subtitle { position: relative; z-index: 2; font-size: 1rem; color: rgba(255,255,255,0.65); font-weight: 300; }
        .content { padding: 40px 30px; }
        .elio-intro { background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%); border-left: 4px solid #008dcb; border-radius: 10px; padding: 25px; margin-bottom: 30px; }
        .elio-intro p { font-size: 1rem; color: #555; line-height: 1.8; margin-bottom: 10px; }
        .elio-intro .greeting { font-size: 1.1rem; font-weight: 700; color: #1a1a1a; margin-bottom: 14px; }
        .elio-sign { font-size: 1rem; font-weight: 600; color: #1a1a1a; margin-top: 16px; }
        .elio-sign span { color: #008dcb; }
        .meta-bar { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 28px; }
        .meta-chip { display: flex; align-items: center; gap: 6px; background: #f1f3f5; border-radius: 8px; padding: 7px 14px; font-size: 0.85rem; color: #555; }
        .meta-chip strong { color: #1a1a1a; }
        .section-title { font-size: 1.1rem; font-weight: 700; color: #1a1a1a; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .alerts-list { display: flex; flex-direction: column; gap: 14px; margin-bottom: 30px; }
        .alert-card { border-radius: 10px; padding: 18px 20px; border: 1.5px solid transparent; position: relative; overflow: hidden; }
        .alert-critico { background: #fff5f5; border-color: #ffb3b3; }
        .alert-advertencia { background: #fffdf0; border-color: #ffe066; }
        .alert-info { background: #f0f8ff; border-color: #99d6f5; }
        .alert-header-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
        .alert-name { font-size: 1rem; font-weight: 700; color: #1a1a1a; }
        .alert-type { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 3px 10px; border-radius: 12px; }
        .alert-critico .alert-type { color: #cc0000; background: #ffe0e0; }
        .alert-advertencia .alert-type { color: #996600; background: #fff3cc; }
        .alert-info .alert-type { color: #005f8a; background: #d0edfa; }
        .alert-description { font-size: 0.9rem; color: #666; margin-bottom: 10px; line-height: 1.5; }
        .alert-metrics { display: flex; gap: 20px; flex-wrap: wrap; }
        .alert-metric { display: flex; flex-direction: column; gap: 2px; }
        .alert-metric-label { font-size: 0.75rem; color: #999; text-transform: uppercase; letter-spacing: 0.5px; }
        .alert-value { font-size: 1rem; font-weight: 700; }
        .alert-threshold { font-size: 0.85rem; color: #888; font-weight: 500; }
        .alert-client { font-size: 0.85rem; color: #444; font-weight: 600; }
        .actions-section { background: linear-gradient(135deg, #f8f9fa 0%, #f0f0f0 100%); border-left: 4px solid #1a1a1a; border-radius: 10px; padding: 25px; margin-bottom: 30px; }
        .actions-list { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
        .actions-list li { display: flex; align-items: flex-start; gap: 10px; font-size: 0.95rem; color: #444; line-height: 1.5; }
        .action-num { background: #1a1a1a; color: #fff; font-size: 0.72rem; font-weight: 700; min-width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
        .footer { background: #1a1a1a; color: rgba(255,255,255,0.7); padding: 30px; text-align: center; font-size: 0.9rem; }
        .footer-links { margin-bottom: 16px; }
        .footer-links a { color: #008dcb; text-decoration: none; margin: 0 15px; }
        @media (max-width: 600px) { .email-container { border-radius: 0; } .header { padding: 30px 20px; } .logo-text { font-size: 2.5rem; } .content { padding: 30px 20px; } .meta-bar { flex-direction: column; } .alert-metrics { flex-direction: column; gap: 8px; } }
    </style>
</head>
<body>
<div class="email-container">
    <div class="header">
        <div class="logo">
            <span class="logo-text">${(data.agentName || 'elio').toLowerCase()}</span>
            <div class="logo-waves">
                <div class="wave w1"></div><div class="wave w2"></div><div class="wave w3"></div>
                <div class="wave w4"></div><div class="wave w5"></div><div class="wave w6"></div>
            </div>
        </div>
        <div class="header-badge">Sistema de alertas</div>
        <h1 class="header-title">Resumen de alertas activas</h1>
        <p class="header-subtitle">Fábrica de Agentes IA</p>
    </div>

    <div class="content">
        <div class="elio-intro">
            <p class="greeting">¡Hola, equipo de soporte!</p>
            <p>He detectado alertas activas en la Fábrica de Agentes IA que requieren vuestra atención. Os las resumo para que podáis actuar antes de que el cliente se vea afectado.</p>
            <p class="elio-sign">Un saludo,<br><span>${(data.agentName || 'ELIO').toUpperCase()}</span> — Supervisor de la Fábrica</p>
        </div>

        <div class="meta-bar">
            <div class="meta-chip"><span><strong>Fecha:</strong> ${reportDate}</span></div>
            <div class="meta-chip"><span><strong>Hora:</strong> ${reportTime}</span></div>
            <div class="meta-chip"><span><strong>Workspace:</strong> ${data.workspaceName}</span></div>
        </div>

        <div class="section-title">Alertas detectadas</div>
        <div class="alerts-list">
            ${data.alerts.map(alert => `
            <div class="alert-card ${alert.level === 'Crítico' ? 'alert-critico' : alert.level === 'Advertencia' ? 'alert-advertencia' : 'alert-info'}">
                <div class="alert-header-row">
                    <span class="alert-name">${alert.label}</span>
                    <span class="alert-type">${alert.level}</span>
                </div>
                <p class="alert-description">${alert.description}</p>
                <div class="alert-metrics">
                    <div class="alert-metric">
                        <span class="alert-metric-label">Valor detectado</span>
                        <span class="alert-value">${alert.value}</span>
                    </div>
                    <div class="alert-metric">
                        <span class="alert-metric-label">Umbral</span>
                        <span class="alert-threshold">${alert.threshold}</span>
                    </div>
                    <div class="alert-metric">
                        <span class="alert-metric-label">Afectado</span>
                        <span class="alert-client">${alert.client}</span>
                    </div>
                </div>
            </div>
            `).join('')}
        </div>

        <div class="actions-section">
            <div class="section-title" style="margin-bottom:0;">Acciones recomendadas</div>
            <ul class="actions-list">
                <li><span class="action-num">1</span><span>Revisar los <strong>errores</strong> reportados en el panel de administración.</span></li>
                <li><span class="action-num">2</span><span>Verificar si el fallo es persistente o un pico puntual.</span></li>
                <li><span class="action-num">3</span><span>Notificar al cliente afectado si la incidencia es crítica.</span></li>
            </ul>
        </div>
    </div>

    <div class="footer">
        <div class="footer-links">
            <a href="https://lafabrica.netelip.com">lafabrica.netelip.com</a>
            <a href="https://netelip.com">netelip.com</a>
        </div>
        <p>Fábrica de Agentes IA · Powered by netelip</p>
    </div>
</div>
</body>
</html>
  `;

  const results = [];
  for (const email of to) {
    const res = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html
    });
    results.push(res);
  }
  return results;
}

export async function sendFactoryErrorAlert(to: string[], origin: string, error: string, context?: any) {
    return sendElioAlertEmail(to, {
        agentName: 'ELIO',
        clientName: 'Soporte',
        workspaceName: 'INFRAESTRUCTURA',
        alerts: [{
            type: 'factory',
            label: 'Error Técnico de la Fábrica',
            level: 'Crítico',
            description: `Se ha detectado un fallo interno en ${origin}.`,
            value: error,
            threshold: 'N/A',
            client: context ? JSON.stringify(context) : 'Backend Factory'
        }]
    });
}

/**
 * Checks if factory errors are enabled in global admin settings
 * and dispatches an Elio-style alert if they are.
 */
export async function reportFactoryError(origin: string, error: string, context?: any) {
    try {
        const { data: settings } = await supabase
            .from('admin_alert_settings')
            .select('*')
            .limit(1)
            .maybeSingle();

        const shouldAlert = 
            (origin.toLowerCase().includes('db') || origin.toLowerCase().includes('supabase')) ? settings?.db_errors_enabled :
            (origin.toLowerCase().includes('edge') || origin.toLowerCase().includes('webhook')) ? settings?.edge_errors_enabled :
            settings?.backend_errors_enabled;

        if (shouldAlert && settings?.emails?.length > 0) {
            console.log(`[ALERT] Dispatching Factory Error from ${origin}: ${error}`);
            return await sendFactoryErrorAlert(settings.emails, origin, error, context);
        }
        
        console.log(`[ALERT] Factory Error from ${origin} suppressed (disabled or no emails).`);
    } catch (err) {
        console.error("Critical failure in alert system:", err);
    }
}
