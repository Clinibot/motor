import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET: Fetch Admin Alert Settings
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Auth validation handled in middleware or frontend for now, assuming the caller is an admin
    // In a real prod environment we should verify the JWT and admin role.
    
    // We fetch the first row since there is only one Super Admin logical configuration.
    // In multi-admin setups, it would be tied to `admin_id`.
    const { data, error } = await supabase
      .from('admin_alert_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
       console.error("DB Error", error);
       throw error;
    }

    // Default payload if row doesn't exist
    const settings = data || {
        emails: [],
        webhook_url: '',
        api_errors_enabled: false,
        transfer_failures_enabled: false,
        custom_functions_enabled: false,
        concurrency_enabled: false,
        db_errors_enabled: false,
        edge_errors_enabled: false,
        backend_errors_enabled: false,
    };

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching admin alert settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// POST: Save Admin Alert Settings
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Validate emails array to only have valid strings
    const validEmails = (payload.emails || []).filter((e: string) => e && e.includes('@'));

    const rowData = {
        emails: validEmails,
        webhook_url: payload.webhook_url || null,
        api_errors_enabled: !!payload.api_errors_enabled,
        transfer_failures_enabled: !!payload.transfer_failures_enabled,
        custom_functions_enabled: !!payload.custom_functions_enabled,
        concurrency_enabled: !!payload.concurrency_enabled,
        db_errors_enabled: !!payload.db_errors_enabled,
        edge_errors_enabled: !!payload.edge_errors_enabled,
        backend_errors_enabled: !!payload.backend_errors_enabled,
        updated_at: new Date().toISOString()
    };

    // Upsert logic: To keep it simple, we just update all rows (since it's a global config table).
    // Or we fetch the ID first and update, or Insert if there are none.
    
    const { data: existing } = await supabase.from('admin_alert_settings').select('id').limit(1).maybeSingle();
    
    if (existing?.id) {
       await supabase.from('admin_alert_settings').update(rowData).eq('id', existing.id);
    } else {
       await supabase.from('admin_alert_settings').insert([rowData]);
    }

    return NextResponse.json({ success: true, settings: rowData });
  } catch (error) {
    console.error('Error saving admin alert settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
  }
}
