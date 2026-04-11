export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
}

export async function GET() {
  try {
    const supabase = await getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users').select('workspace_id').eq('id', session.user.id).single();
    if (!profile?.workspace_id) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

    const { data } = await supabase
      .from('alert_settings')
      .select('*')
      .eq('workspace_id', profile.workspace_id)
      .maybeSingle();

    return NextResponse.json({ settings: data });
  } catch (err) {
    console.error('[alerts/settings GET]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users').select('workspace_id').eq('id', session.user.id).single();
    if (!profile?.workspace_id) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

    const body = await req.json();

    const { error } = await supabase
      .from('alert_settings')
      .upsert({
        workspace_id: profile.workspace_id,
        alert_email: body.alert_email,
        daily_summary_enabled: body.daily_summary_enabled ?? false,
        low_success_rate_enabled: body.low_success_rate_enabled ?? false,
        low_success_rate_threshold: body.low_success_rate_threshold ?? 70,
        high_negative_sentiment_enabled: body.high_negative_sentiment_enabled ?? false,
        high_negative_sentiment_threshold: body.high_negative_sentiment_threshold ?? 40,
        high_cost_enabled: body.high_cost_enabled ?? false,
        high_cost_threshold: body.high_cost_threshold ?? 5,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[alerts/settings POST]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
