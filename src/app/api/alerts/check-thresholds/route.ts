export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { sendThresholdAlertEmail } from '@/lib/resend';
import { reportFactoryError } from '@/lib/alerts/alertNotifier';
import { checkRateLimit } from '@/lib/supabase/rateLimit';

// Called internally from the Retell webhook after each call is stored.
// Protected by CRON_SECRET — only the server itself should call this.
export async function POST(req: NextRequest) {
  try {
    // Require the shared server secret so this endpoint is not publicly accessible
    const authHeader = req.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { workspace_id } = await req.json();
    if (!workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });

    const supabase = createSupabaseAdmin();

    // Rate limit: 1 threshold check per minute per workspace.
    // Prevents email storms when many calls finish simultaneously (e.g. outbound campaign).
    // Fire-and-forget callers (webhook/route.ts) silently absorb the 429.
    const rl = await checkRateLimit(supabase, `alert:check:${workspace_id}`, 1, 60);
    if (rl) return rl;

    // Get alert settings for this workspace
    const { data: settings } = await supabase
      .from('alert_settings')
      .select('*')
      .eq('workspace_id', workspace_id)
      .maybeSingle();

    if (!settings?.alert_email) return NextResponse.json({ checked: false, reason: 'no_settings' });

    // Get calls from last hour (rolling window for threshold checks)
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentCalls } = await supabase
      .from('calls')
      .select('call_cost, call_analysis')
      .eq('workspace_id', workspace_id)
      .gte('created_at', since);

    const total = recentCalls?.length ?? 0;
    if (total < 3) return NextResponse.json({ checked: false, reason: 'too_few_calls' }); // Need at least 3 calls for meaningful stats

    const successful = recentCalls?.filter(c => c.call_analysis?.call_successful).length ?? 0;
    const negative = recentCalls?.filter(c => c.call_analysis?.user_sentiment === 'negative').length ?? 0;

    const successRate = (successful / total) * 100;
    const negativeRate = (negative / total) * 100;

    // Get workspace name
    const { data: workspace } = await supabase
      .from('workspaces').select('name').eq('id', workspace_id).maybeSingle();
    const workspaceName = workspace?.name ?? 'Tu espacio de trabajo';

    // Also get today's total cost for the high-cost alert
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const { data: todayCalls } = await supabase
      .from('calls')
      .select('call_cost')
      .eq('workspace_id', workspace_id)
      .gte('created_at', today.toISOString());
    const todayCost = todayCalls?.reduce((sum, c) => sum + Number(c.call_cost || 0), 0) ?? 0;

    const alerts: Promise<unknown>[] = [];
    const notificationsToInsert: { workspace_id: string, alert_type: string, content: Record<string, unknown> }[] = [];

    if (settings.low_success_rate_enabled && successRate < settings.low_success_rate_threshold) {
      alerts.push(sendThresholdAlertEmail(settings.alert_email, {
        type: 'low_success_rate',
        currentValue: successRate,
        threshold: settings.low_success_rate_threshold,
        workspaceName,
      }));
      notificationsToInsert.push({ workspace_id, alert_type: 'low_success_rate', content: { currentValue: successRate, threshold: settings.low_success_rate_threshold, workspaceName } });
    }

    if (settings.high_negative_sentiment_enabled && negativeRate > settings.high_negative_sentiment_threshold) {
      alerts.push(sendThresholdAlertEmail(settings.alert_email, {
        type: 'high_negative_sentiment',
        currentValue: negativeRate,
        threshold: settings.high_negative_sentiment_threshold,
        workspaceName,
      }));
      notificationsToInsert.push({ workspace_id, alert_type: 'high_negative_sentiment', content: { currentValue: negativeRate, threshold: settings.high_negative_sentiment_threshold, workspaceName } });
    }

    if (settings.high_cost_enabled && todayCost > settings.high_cost_threshold) {
      alerts.push(sendThresholdAlertEmail(settings.alert_email, {
        type: 'high_cost',
        currentValue: todayCost,
        threshold: settings.high_cost_threshold,
        workspaceName,
      }));
      notificationsToInsert.push({ workspace_id, alert_type: 'high_cost', content: { currentValue: todayCost, threshold: settings.high_cost_threshold, workspaceName } });
    }

    if (notificationsToInsert.length > 0) {
      await supabase.from('alert_notifications').insert(notificationsToInsert);
    }

    await Promise.allSettled(alerts);
    return NextResponse.json({ checked: true, alertsSent: alerts.length });
  } catch (err) {
    console.error('[alerts/check-thresholds]', err);
    
    // Factory Error Alert
    await reportFactoryError('API /api/alerts/check-thresholds', 
        err instanceof Error ? err.message : String(err),
        { action: 'check_thresholds' }
    );

    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
