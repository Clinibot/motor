-- ─────────────────────────────────────────────────────────────────────────────
-- RLS on core data tables
-- ─────────────────────────────────────────────────────────────────────────────
-- Purpose: prevent direct access to tenant data using the public anon key.
--
-- All application code uses the service_role key (createSupabaseAdmin), which
-- bypasses RLS unconditionally — so enabling RLS here has zero effect on the
-- running app.
--
-- What this protects against:
--   • Someone using the NEXT_PUBLIC_SUPABASE_ANON_KEY directly against the
--     Supabase REST API to read or modify any tenant's agents / calls / numbers.
--   • Any future code that accidentally uses the user-session client for a data
--     query instead of the admin client.
--
-- No explicit policies are needed for service_role (it bypasses RLS).
-- The absence of an anon/authenticated policy means those roles are blocked
-- by default (Postgres deny-by-default when RLS is enabled).
-- ─────────────────────────────────────────────────────────────────────────────

-- Agents: core agent records (retell_agent_id, configuration, etc.)
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Calls: call history, transcripts, analysis data
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Phone numbers: SIP/PSTN numbers assigned to workspaces
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;

-- Alert settings: per-workspace alert thresholds
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;

-- Alert notifications: sent alert log
ALTER TABLE alert_notifications ENABLE ROW LEVEL SECURITY;
