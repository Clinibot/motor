import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL = 'Netelip Alertas <alertas@lafabrica.netelip.com>';

export interface DailySummaryData {
  workspaceName: string;
  agentName: string;
  clientName: string;
  totalCalls: number;
  successRate: number;
  successThreshold: number;
  negativeSentimentRate: number;
  sentimentThreshold: number;
  transferFailures: number;
  transferThreshold: number;
  period: string;
  contextMessage: string;
  dashboardUrl: string;
}

export interface ThresholdAlertData {
  type: 'low_success_rate' | 'high_negative_sentiment' | 'high_cost';
  currentValue: number;
  threshold: number;
  workspaceName: string;
}

export async function sendDailySummaryEmail(to: string, data: DailySummaryData) {
  const isOkSuccess = data.successRate >= data.successThreshold;
  const isOkSentiment = data.negativeSentimentRate <= data.sentimentThreshold;
  const isOkTransfers = data.transferFailures <= data.transferThreshold;

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Tu agente está trabajando — ${data.agentName}`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tu agente esta trabajando - ${data.agentName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; background: #f8f9fa; padding: 20px; }
        .email-container { max-width: 700px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%); padding: 40px 30px; text-align: center; position: relative; overflow: hidden; }
        .header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at 30% 20%, rgba(0,141,203,0.2) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(0,255,136,0.1) 0%, transparent 50%); animation: headerPulse 4s ease-in-out infinite alternate; }
        @keyframes headerPulse { 0% { opacity: 0.5; } 100% { opacity: 1; } }
        .logo { position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 20px; }
        .logo-text { font-size: 3.5rem; font-weight: 200; letter-spacing: -2px; color: #ffffff; text-shadow: 0 2px 10px rgba(0,141,203,0.3); }
        .logo-waves { display: flex; gap: 2px; align-items: center; }
        .wave { width: 2px; background: #ffffff; border-radius: 1px; animation: waveAnimation 1.5s ease-in-out infinite alternate; }
        .w1 { height: 8px;  animation-delay: 0s; } .w2 { height: 16px; animation-delay: 0.2s; } .w3 { height: 12px; animation-delay: 0.4s; } .w4 { height: 20px; animation-delay: 0.6s; } .w5 { height: 14px; animation-delay: 0.8s; } .w6 { height: 10px; animation-delay: 1s; }
        @keyframes waveAnimation { 0% { transform: scaleY(0.6); opacity: 0.7; } 100% { transform: scaleY(1); opacity: 1; } }
        .header-badge { position: relative; z-index: 2; display: inline-block; background: rgba(0,141,203,0.2); border: 1px solid rgba(0,141,203,0.5); color: #60c8f0; font-size: 0.75rem; font-weight: 700; padding: 5px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 14px; }
        .header-title { position: relative; z-index: 2; font-size: 1.8rem; font-weight: 600; color: #ffffff; margin-bottom: 10px; }
        .header-subtitle { position: relative; z-index: 2; font-size: 1rem; color: rgba(255,255,255,0.65); font-weight: 300; }
        .content { padding: 40px 30px; }
        .elio-intro { background: linear-gradient(135deg, #fff9e6 0%, #fff3cc 100%); border-left: 4px solid #ffb700; border-radius: 10px; padding: 25px; margin-bottom: 30px; }
        .elio-intro p { font-size: 1rem; color: #555; line-height: 1.8; margin-bottom: 10px; }
        .elio-intro p:last-child { margin-bottom: 0; }
        .elio-intro .greeting { font-size: 1.1rem; font-weight: 700; color: #1a1a1a; margin-bottom: 14px; }
        .elio-sign { font-size: 1rem; font-weight: 600; color: #1a1a1a; margin-top: 16px; }
        .elio-sign span { color: #008dcb; }
        .meta-bar { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 28px; }
        .meta-chip { display: flex; align-items: center; gap: 6px; background: #f1f3f5; border-radius: 8px; padding: 7px 14px; font-size: 0.85rem; color: #555; }
        .meta-chip strong { color: #1a1a1a; }
        .section-title { font-size: 1.1rem; font-weight: 700; color: #1a1a1a; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
        .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 30px; }
        .metric-card { background: #f8f9fa; border-radius: 12px; padding: 22px 20px; border: 1.5px solid #e9ecef; position: relative; overflow: hidden; }
        .metric-card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; border-radius: 2px 0 0 2px; }
        .metric-ok::before { background: #00cc70; } .metric-warning::before { background: #ffb700; } .metric-alert::before { background: #ff4444; } .metric-neutral::before { background: #008dcb; }
        .metric-label { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #999; margin-bottom: 8px; }
        .metric-value { font-size: 2rem; font-weight: 800; line-height: 1; margin-bottom: 6px; color: #1a1a1a; }
        .metric-ok .metric-value { color: #00aa5e; } .metric-warning .metric-value { color: #cc8800; } .metric-alert .metric-value { color: #cc2222; } .metric-neutral .metric-value { color: #008dcb; }
        .metric-desc { font-size: 0.82rem; color: #888; line-height: 1.4; }
        .metric-threshold { display: inline-block; margin-top: 8px; font-size: 0.75rem; font-weight: 600; padding: 3px 10px; border-radius: 10px; background: rgba(0,0,0,0.05); color: #666; }
        .context-section { background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%); border-left: 4px solid #008dcb; border-radius: 10px; padding: 25px; margin-bottom: 30px; }
        .context-section p { font-size: 0.95rem; color: #555; line-height: 1.8; margin-bottom: 8px; }
        .context-section p:last-child { margin-bottom: 0; }
        .context-section strong { color: #1a1a1a; }
        .cta-section { text-align: center; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; padding: 30px; margin-bottom: 10px; }
        .cta-section p { color: #666; font-size: 0.95rem; margin-bottom: 20px; line-height: 1.6; }
        .cta-button { display: inline-block; background: linear-gradient(45deg, #008dcb, #00c8ff); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 0.95rem; padding: 14px 32px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px; }
        .footer { background: #1a1a1a; color: rgba(255,255,255,0.7); padding: 30px; text-align: center; font-size: 0.9rem; }
        .footer-links { margin-bottom: 16px; }
        .footer-links a { color: #008dcb; text-decoration: none; margin: 0 15px; }
        @media (max-width: 600px) { .email-container { border-radius: 0; } .header { padding: 30px 20px; } .logo-text { font-size: 2.5rem; } .content { padding: 30px 20px; } .metrics-grid { grid-template-columns: 1fr; } .meta-bar { flex-direction: column; } }
    </style>
</head>
<body>
<div class="email-container">
    <div class="header">
        <div class="logo">
            <span class="logo-text">${data.agentName.toLowerCase()}</span>
            <div class="logo-waves">
                <div class="wave w1"></div><div class="wave w2"></div><div class="wave w3"></div>
                <div class="wave w4"></div><div class="wave w5"></div><div class="wave w6"></div>
            </div>
        </div>
        <div class="header-badge">Resumen de actividad</div>
        <h1 class="header-title">Tu agente al día</h1>
        <p class="header-subtitle">Fábrica de Agentes IA</p>
    </div>
    <div class="content">
        <div class="elio-intro">
            <p class="greeting">¡Hola, ${data.clientName}!</p>
            <p>He estado revisando cómo ha ido tu agente en el último período y quería contarte cómo está el asunto. Todo queda registrado para que puedas tomar decisiones con información real.</p>
            <p>Aquí tienes el resumen de lo más importante.</p>
            <p class="elio-sign">Un abrazo,<br><span>${data.agentName.toUpperCase()}</span> — Tu agente de IA</p>
        </div>
        <div class="meta-bar">
            <div class="meta-chip"><span><strong>Período:</strong> ${data.period}</span></div>
            <div class="meta-chip"><span><strong>Agente:</strong> ${data.agentName}</span></div>
        </div>
        <div class="section-title">Lo que ha pasado</div>
        <div class="metrics-grid">
            <div class="metric-card metric-neutral">
                <div class="metric-label">Llamadas recibidas</div>
                <div class="metric-value">${data.totalCalls}</div>
                <div class="metric-desc">Total de llamadas gestionadas por tu agente en este período.</div>
            </div>
            <div class="metric-card ${isOkSuccess ? 'metric-ok' : 'metric-alert'}">
                <div class="metric-label">Llamadas resueltas</div>
                <div class="metric-value">${data.successRate.toFixed(1)}%</div>
                <div class="metric-desc">De cada 100 llamadas, tu agente resolvió correctamente esta cantidad.</div>
                <span class="metric-threshold">Umbral mínimo: ${data.successThreshold}%</span>
            </div>
            <div class="metric-card ${isOkSentiment ? 'metric-ok' : 'metric-warning'}">
                <div class="metric-label">Llamadas con incidencia</div>
                <div class="metric-value">${data.negativeSentimentRate.toFixed(1)}%</div>
                <div class="metric-desc">Porcentaje de llamadas donde el cliente no quedó del todo satisfecho.</div>
                <span class="metric-threshold">Umbral máximo: ${data.sentimentThreshold}%</span>
            </div>
            <div class="metric-card ${isOkTransfers ? 'metric-ok' : 'metric-alert'}">
                <div class="metric-label">Transferencias fallidas</div>
                <div class="metric-value">${data.transferFailures}</div>
                <div class="metric-desc">Número de veces que el agente no pudo transferir la llamada correctamente.</div>
                <span class="metric-threshold">Umbral máximo: ${data.transferThreshold}</span>
            </div>
        </div>
        <div class="context-section">
            <p><strong>¿Qué significa esto?</strong></p>
            <p>${data.contextMessage.replace(/\\n/g, '<br/>')}</p>
            <p>Si ves algo que no cuadra o tienes dudas sobre algún dato, entra en tu panel y échale un vistazo. Estoy aquí para que saques el máximo partido a tu agente.</p>
        </div>
        <div class="cta-section">
            <h3 style="font-size:1.1rem; font-weight:700; color:#1a1a1a; margin-bottom:10px;">Ver el detalle completo</h3>
            <p>Accede a tu panel en la Fábrica de Agentes IA para consultar el historial completo de actividad de tu agente.</p>
            <a href="${data.dashboardUrl}" class="cta-button">Abrir mi panel</a>
        </div>
    </div>
    <div class="footer">
        <div class="footer-links"><a href="https://netelip.com">netelip.com</a></div>
        <p>Fábrica de Agentes IA · Powered by netelip</p>
    </div>
</div>
</body>
</html>
    `,
  });
}

export async function sendThresholdAlertEmail(to: string, data: ThresholdAlertData) {
  const alertConfig = {
    low_success_rate: {
      emoji: '⚠️',
      title: 'Tasa de éxito baja',
      description: `La tasa de éxito de tus llamadas ha bajado al <strong>${data.currentValue.toFixed(1)}%</strong>, por debajo del umbral configurado de <strong>${data.threshold}%</strong>.`,
      suggestion: 'Puede indicar que el agente no está respondiendo correctamente. Te recomendamos revisar las últimas conversaciones.',
      color: '#dc2626',
      bg: '#fef2f2',
      border: '#fecaca',
    },
    high_negative_sentiment: {
      emoji: '😟',
      title: 'Sentimiento negativo elevado',
      description: `El <strong>${data.currentValue.toFixed(1)}%</strong> de tus llamadas recientes tienen sentimiento negativo, superando el umbral de <strong>${data.threshold}%</strong>.`,
      suggestion: 'Esto puede indicar que los usuarios están frustrados. Revisa el tono y las respuestas de tu agente.',
      color: '#d97706',
      bg: '#fffbeb',
      border: '#fde68a',
    },
    high_cost: {
      emoji: '💸',
      title: 'Coste elevado detectado',
      description: `El coste acumulado hoy ha alcanzado <strong>€${data.currentValue.toFixed(2)}</strong>, superando tu umbral de <strong>€${data.threshold}</strong>.`,
      suggestion: 'Revisa si hay un volumen de llamadas inusualmente alto o llamadas de larga duración.',
      color: '#7c3aed',
      bg: '#faf5ff',
      border: '#e9d5ff',
    },
  };

  const cfg = alertConfig[data.type];

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${cfg.emoji} Alerta: ${cfg.title} — ${data.workspaceName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#f5f5f5;font-family:'Inter',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
          <tr><td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
              <tr>
                <td style="background:linear-gradient(135deg,#267ab0,#1e5a87);padding:28px 36px;">
                  <div style="color:#fff;font-size:13px;opacity:0.8;margin-bottom:4px;">netelip · Alertas</div>
                  <div style="color:#fff;font-size:22px;font-weight:700;">${cfg.emoji} ${cfg.title}</div>
                </td>
              </tr>
              <tr><td style="padding:32px 36px;">
                <div style="background:${cfg.bg};border:1px solid ${cfg.border};border-radius:12px;padding:20px;margin-bottom:24px;">
                  <p style="margin:0;color:#1a1a1a;font-size:15px;line-height:1.6;">${cfg.description}</p>
                </div>
                <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 28px;">💡 ${cfg.suggestion}</p>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" style="display:inline-block;background:#267ab0;color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:14px;font-weight:600;">
                  Ir al dashboard →
                </a>
              </td></tr>
              <tr>
                <td style="background:#f9fafb;padding:16px 36px;border-top:1px solid #e5e7eb;text-align:center;">
                  <p style="margin:0;color:#9ca3af;font-size:12px;">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings" style="color:#267ab0;">Ajustar umbrales de alerta</a>
                  </p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  });
}
