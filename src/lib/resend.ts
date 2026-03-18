import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL = 'Netelip Alertas <alertas@lafabrica.netelip.com>';

export interface DailySummaryData {
  workspaceName: string;
  totalCalls: number;
  successRate: number;
  negativeSentimentRate: number;
  totalCost: number;
  period: string;
}

export interface ThresholdAlertData {
  type: 'low_success_rate' | 'high_negative_sentiment' | 'high_cost';
  currentValue: number;
  threshold: number;
  workspaceName: string;
}

export async function sendDailySummaryEmail(to: string, data: DailySummaryData) {
  const successColor = data.successRate >= 70 ? '#16a34a' : '#dc2626';
  const sentimentColor = data.negativeSentimentRate <= 40 ? '#16a34a' : '#dc2626';

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `📊 Resumen diario de llamadas — ${data.period}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Resumen diario</title>
      </head>
      <body style="margin:0;padding:0;background:#f5f5f5;font-family:'Inter',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
          <tr><td align="center">
            <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
              <!-- HEADER -->
              <tr>
                <td style="background:linear-gradient(135deg,#267ab0 0%,#1e5a87 100%);padding:32px 40px;text-align:left;">
                  <div style="color:#fff;font-size:13px;font-weight:500;opacity:0.8;margin-bottom:6px;">netelip · Alertas inteligentes</div>
                  <div style="color:#fff;font-size:26px;font-weight:700;">Resumen de hoy</div>
                  <div style="color:#93c5fd;font-size:14px;margin-top:6px;">${data.period}</div>
                </td>
              </tr>
              <!-- BODY -->
              <tr><td style="padding:40px;">
                <p style="color:#4b5563;font-size:15px;margin:0 0 28px;">
                  Aquí tienes el resumen de actividad de <strong>${data.workspaceName}</strong> en las últimas 24 horas.
                </p>
                <!-- METRICS -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="48%" style="background:#f0f9ff;border-radius:12px;padding:20px;text-align:center;border:1px solid #bae6fd;">
                      <div style="font-size:36px;font-weight:700;color:#267ab0;">${data.totalCalls}</div>
                      <div style="font-size:13px;color:#6b7280;margin-top:4px;">📞 Total llamadas</div>
                    </td>
                    <td width="4%"></td>
                    <td width="48%" style="background:#f0fdf4;border-radius:12px;padding:20px;text-align:center;border:1px solid #bbf7d0;">
                      <div style="font-size:36px;font-weight:700;color:${successColor};">${data.successRate.toFixed(1)}%</div>
                      <div style="font-size:13px;color:#6b7280;margin-top:4px;">✅ Tasa de éxito</div>
                    </td>
                  </tr>
                  <tr><td colspan="3" style="height:12px;"></td></tr>
                  <tr>
                    <td width="48%" style="background:#fff7ed;border-radius:12px;padding:20px;text-align:center;border:1px solid #fed7aa;">
                      <div style="font-size:36px;font-weight:700;color:${sentimentColor};">${data.negativeSentimentRate.toFixed(1)}%</div>
                      <div style="font-size:13px;color:#6b7280;margin-top:4px;">😞 Sentimiento negativo</div>
                    </td>
                    <td width="4%"></td>
                    <td width="48%" style="background:#faf5ff;border-radius:12px;padding:20px;text-align:center;border:1px solid #e9d5ff;">
                      <div style="font-size:36px;font-weight:700;color:#7c3aed;">€${data.totalCost.toFixed(2)}</div>
                      <div style="font-size:13px;color:#6b7280;margin-top:4px;">💰 Coste total</div>
                    </td>
                  </tr>
                </table>
                <!-- CTA -->
                <div style="text-align:center;margin-top:36px;">
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" style="display:inline-block;background:#267ab0;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;">
                    Ver dashboard completo →
                  </a>
                </div>
              </td></tr>
              <!-- FOOTER -->
              <tr>
                <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
                  <p style="margin:0;color:#9ca3af;font-size:12px;">
                    Recibiste este email porque tienes activado el resumen diario en las alertas de netelip.<br>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings" style="color:#267ab0;">Gestionar alertas</a>
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
