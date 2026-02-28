require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('calls').select('id, created_at, call_status, agent_id, retell_agent_id, workspace_id, duration_ms, transcript').order('created_at', { ascending: false }).limit(5);
  console.log(JSON.stringify(data, null, 2));
}

check();
