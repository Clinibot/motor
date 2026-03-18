import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendDailySummaryEmail } from '@/lib/resend';

// This route is called by a Supabase Edge Function cron every 24h.
// It's protected by a cron secret.
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Use service role key to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get all workspaces with daily_summary_enabled
  const { data: settings } = await supabase
    .from('alert_settings')
    .select('*')
    .eq('daily_summary_enabled', true)
    .not('alert_email', 'is', null);

  if (!settings || settings.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let sent = 0;

  for (const setting of settings) {
    try {
      // Get calls from last 24h for this workspace
      const { data: calls } = await supabase
        .from('calls')
        .select('call_cost, call_analysis')
        .eq('workspace_id', setting.workspace_id)
        .gte('created_at', since);

      const total = calls?.length ?? 0;
      const successful = calls?.filter(c => c.call_analysis?.call_successful).length ?? 0;
      const negative = calls?.filter(c => c.call_analysis?.user_sentiment === 'negative').length ?? 0;
      
      // Calculate transfer failures using basic heuristic if exact flag is not uniformly present
      const transferFailures = calls?.filter(c => {
         const analysis = c.call_analysis as Record<string, unknown> | null;
         return analysis && analysis.call_transfer_failed === true;
      }).length ?? 0;

      const successRate = total > 0 ? (successful / total) * 100 : 0;
      const negativeSentimentRate = total > 0 ? (negative / total) * 100 : 0;

      // Get workspace name
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('name')
        .eq('id', setting.workspace_id)
        .maybeSingle();

      // Get first agent name
      const { data: agent } = await supabase
        .from('agents')
        .select('name')
        .eq('workspace_id', setting.workspace_id)
        .limit(1)
        .maybeSingle();
      
      const agentName = agent?.name ?? 'Tu Agente';

      const period = new Date().toLocaleDateString('es-ES', {
        day: '2-digit', month: 'long', year: 'numeric'
      });

      let contextMsg = 'Todos los sistemas e indicadores base funcionan correctamente.';
      if (successRate < (setting.low_success_rate_threshold || 70)) {
        contextMsg = 'La tasa de éxito está por debajo de tu nivel esperado. Te sugiero revisar las transcripciones para identificar cuellos de botella.';
      } else if (negativeSentimentRate > (setting.high_negative_sentiment_threshold || 40)) {
        contextMsg = 'Me he dado cuenta de que el descontento de algunos usuarios ha superado el límite. Por favor revisa los últimos audios.';
      }

      await sendDailySummaryEmail(setting.alert_email!, {
        workspaceName: workspace?.name ?? 'Tu entorno',
        agentName: agentName,
        clientName: workspace?.name ?? 'Cliente',
        totalCalls: total,
        successRate,
        successThreshold: setting.low_success_rate_threshold || 70,
        negativeSentimentRate,
        sentimentThreshold: setting.high_negative_sentiment_threshold || 40,
        transferFailures,
        transferThreshold: 5, // Default hardcoded or fallback
        period,
        contextMessage: contextMsg,
        dashboardUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://app.netelip.com'}/dashboard`
      });

      sent++;
    } catch (e) {
      console.error(`Error sending daily summary to workspace ${setting.workspace_id}:`, e);
    }
  }

  return NextResponse.json({ sent });
}
