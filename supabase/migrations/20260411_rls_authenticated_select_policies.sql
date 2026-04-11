-- ─────────────────────────────────────────────────────────────────────────────
-- RLS SELECT policies for authenticated users
-- ─────────────────────────────────────────────────────────────────────────────
-- Context: 20260411_rls_data_tables.sql enabled RLS on core tables but only
-- blocked the anon role. The dashboard and several UI pages use createClient()
-- (browser Supabase client, role = authenticated), NOT createSupabaseAdmin().
-- Without these policies, authenticated users see zero rows in the UI.
--
-- Policy: each authenticated user can SELECT rows that belong to their workspace.
-- Workspace is resolved via the users table (1 user = 1 workspace).
-- INSERT / UPDATE / DELETE remains exclusively for the service_role (API routes).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "authenticated_workspace_select" ON agents
  FOR SELECT TO authenticated
  USING (workspace_id = (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "authenticated_workspace_select" ON calls
  FOR SELECT TO authenticated
  USING (workspace_id = (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "authenticated_workspace_select" ON phone_numbers
  FOR SELECT TO authenticated
  USING (workspace_id = (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "authenticated_workspace_select" ON alert_settings
  FOR SELECT TO authenticated
  USING (workspace_id = (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "authenticated_workspace_select" ON alert_notifications
  FOR SELECT TO authenticated
  USING (workspace_id = (SELECT workspace_id FROM users WHERE id = auth.uid()));
