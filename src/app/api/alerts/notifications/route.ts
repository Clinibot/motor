import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: notifications, error } = await supabase
      .from('alert_notifications')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    
    return NextResponse.json({ notifications: notifications || [] });
  } catch (err) {
    console.error('[GET /api/alerts/notifications]', err);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
