-- ─────────────────────────────────────────────────────────────────────────────
-- BASE SCHEMA — La Fábrica de Agentes
-- ─────────────────────────────────────────────────────────────────────────────
-- Run this FIRST on a blank Supabase project before all other migrations.
-- All subsequent migrations (20260411_*) assume these tables already exist.
--
-- Supabase Dashboard → SQL Editor → paste and run this file.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── workspaces ────────────────────────────────────────────────────────────────
-- One workspace per client. The admin creates workspaces and assigns Retell
-- API keys before users can register.
CREATE TABLE IF NOT EXISTS workspaces (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT,
    retell_api_key  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE workspaces TO service_role;

-- ── users (extends Supabase auth.users) ───────────────────────────────────────
-- Each user is linked to exactly one workspace (1 user = 1 workspace).
-- workspace_id is assigned atomically via assign_free_workspace RPC on signup.
CREATE TABLE IF NOT EXISTS users (
    id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id    UUID        REFERENCES workspaces(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users TO service_role;

-- ── agents ────────────────────────────────────────────────────────────────────
-- One row per voice agent. Stores both local config (wizard payload) and
-- the Retell identifiers returned after creation.
CREATE TABLE IF NOT EXISTS agents (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    retell_agent_id     TEXT,
    retell_llm_id       TEXT,
    configuration       JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agents_workspace_id_idx ON agents (workspace_id);
CREATE INDEX IF NOT EXISTS agents_retell_agent_id_idx ON agents (retell_agent_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agents TO service_role;

-- ── calls ─────────────────────────────────────────────────────────────────────
-- Persisted on every call_ended / call_analyzed webhook from Retell.
-- Upserted on retell_call_id to handle duplicate events gracefully.
CREATE TABLE IF NOT EXISTS calls (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id            UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    agent_id                UUID        REFERENCES agents(id) ON DELETE SET NULL,
    retell_agent_id         TEXT,
    retell_call_id          TEXT        UNIQUE,
    call_status             TEXT,
    transcript              JSONB,
    recording_url           TEXT,
    start_timestamp         BIGINT,
    end_timestamp           BIGINT,
    duration_ms             INTEGER,
    call_cost               NUMERIC(10, 4),
    disconnection_reason    TEXT,
    call_analysis           JSONB,
    raw_payload             JSONB,
    customer_number         TEXT,
    customer_name           TEXT,
    call_type               TEXT,
    cost_breakdown          JSONB,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS calls_workspace_id_idx ON calls (workspace_id);
CREATE INDEX IF NOT EXISTS calls_retell_call_id_idx ON calls (retell_call_id);
CREATE INDEX IF NOT EXISTS calls_created_at_idx ON calls (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE calls TO service_role;

-- ── phone_numbers ─────────────────────────────────────────────────────────────
-- SIP/PSTN numbers imported from Netelip. Linked to workspaces.
-- sip_password stored in plain text — needed at runtime for SIP credential enrichment.
CREATE TABLE IF NOT EXISTS phone_numbers (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id                UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    phone_number                TEXT        UNIQUE NOT NULL,
    nickname                    TEXT,
    country                     TEXT,
    status                      TEXT,
    termination_uri             TEXT,
    sip_username                TEXT,
    sip_password                TEXT,
    assigned_inbound_agent_id   UUID        REFERENCES agents(id) ON DELETE SET NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS phone_numbers_workspace_id_idx ON phone_numbers (workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE phone_numbers TO service_role;

-- ── webhook_logs ──────────────────────────────────────────────────────────────
-- Diagnostic log of all inbound Retell webhook events.
-- Cleaned up automatically after 30 days by cleanup_expired_records().
CREATE TABLE IF NOT EXISTS webhook_logs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID        REFERENCES workspaces(id) ON DELETE SET NULL,
    event_type      TEXT,
    payload         JSONB,
    headers         JSONB,
    error           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE webhook_logs TO service_role;
-- Migration: atomic workspace auto-assignment
--
-- Problem: the previous JS implementation read "free workspaces" and wrote
-- the assignment in separate queries. Two concurrent registrations could both
-- see the same workspace as free and both assign it → data leakage between tenants.
--
-- Solution: a single PL/pgSQL function that finds and locks the oldest free
-- workspace in one atomic transaction using FOR UPDATE SKIP LOCKED.
-- If another transaction is already assigning that workspace, it is SKIPPED
-- automatically and the next free one is used instead.
--
-- How to apply:
--   Supabase Dashboard → SQL Editor → paste and run this file.
--   Or: supabase db push (if using Supabase CLI with local dev).

CREATE OR REPLACE FUNCTION assign_free_workspace(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER   -- runs as the function owner, bypasses RLS (admin operation)
SET search_path = public
AS $$
DECLARE
    v_workspace_id uuid;
BEGIN
    -- Fast path: user already has a workspace, return it immediately.
    SELECT workspace_id
    INTO v_workspace_id
    FROM users
    WHERE id = p_user_id
      AND workspace_id IS NOT NULL;

    IF v_workspace_id IS NOT NULL THEN
        RETURN v_workspace_id;
    END IF;

    -- Atomically find and lock the oldest workspace that is not yet assigned
    -- to any user.
    --
    -- FOR UPDATE SKIP LOCKED: if another concurrent call is already assigning
    -- a workspace (and holds a row lock on it), this transaction skips that
    -- row and picks the next one. No two concurrent calls can ever select
    -- the same workspace.
    SELECT w.id
    INTO v_workspace_id
    FROM workspaces w
    WHERE NOT EXISTS (
        SELECT 1 FROM users u WHERE u.workspace_id = w.id
    )
    ORDER BY w.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_workspace_id IS NULL THEN
        -- No free workspace available; the caller should show an error.
        RAISE EXCEPTION 'NO_FREE_WORKSPACE';
    END IF;

    -- Assign the locked workspace to the user.
    UPDATE users
    SET workspace_id = v_workspace_id
    WHERE id = p_user_id;

    RETURN v_workspace_id;
END;
$$;

-- Allow the service role (used by the server) to call this function.
GRANT EXECUTE ON FUNCTION assign_free_workspace(uuid) TO service_role;
-- ─────────────────────────────────────────────────────────────────────────────
-- Cleanup function for ephemeral tables
-- ─────────────────────────────────────────────────────────────────────────────
-- Deletes expired rows from rate_limit_windows and idempotency_keys.
-- Called hourly by the Vercel cron at /api/cron/cleanup.
--
-- rate_limit_windows: keep only active windows (last hour).
-- idempotency_keys:   keep only keys younger than 1 hour (TTL is 60s in practice,
--                     but 1h gives a safe margin for retries).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cleanup_expired_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Remove rate limit windows that expired more than 1 hour ago
    DELETE FROM rate_limit_windows
    WHERE window_start < NOW() - INTERVAL '1 hour';

    -- Remove idempotency keys older than 1 hour
    DELETE FROM idempotency_keys
    WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_expired_records() TO service_role;
-- Migration: distributed idempotency keys for Cal.com booking/cancellation
--
-- Problem: the previous implementation used in-memory Maps for idempotency.
-- In a serverless environment (Vercel) each request may land on a different
-- cold-started instance with an empty map → Retell double-execution creates
-- duplicate bookings or cancellations in Cal.com.
--
-- Solution: persist idempotency keys in Postgres. The UNIQUE constraint on `key`
-- makes INSERT the atomic check: the second concurrent insert fails with a
-- unique violation (code 23505) and the caller treats it as a duplicate.
--
-- How to apply:
--   Supabase Dashboard → SQL Editor → paste and run this file.

CREATE TABLE IF NOT EXISTS idempotency_keys (
    key        TEXT        PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast TTL-based cleanup queries.
CREATE INDEX IF NOT EXISTS idempotency_keys_created_at_idx
    ON idempotency_keys (created_at);

-- Allow the service role to read/write this table.
GRANT SELECT, INSERT, DELETE ON TABLE idempotency_keys TO service_role;

-- Optional: enable RLS but allow service_role full access
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON idempotency_keys
    FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Migration: per-workspace / per-key rate limiting
--
-- Uses a fixed-window counter stored in Postgres.
-- The RPC is atomic (FOR UPDATE) so concurrent requests on different
-- Vercel instances never double-count or bypass the limit.
--
-- How to apply:
--   Supabase Dashboard → SQL Editor → paste and run this file.

CREATE TABLE IF NOT EXISTS rate_limit_windows (
    key          TEXT        PRIMARY KEY,
    count        INT         NOT NULL DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE rate_limit_windows TO service_role;

ALTER TABLE rate_limit_windows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON rate_limit_windows
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- increment_rate_limit(key, max_requests, window_seconds)
--
-- Atomically increments the counter for `key` within a fixed time window.
-- Returns TRUE  → request is allowed (counter was incremented).
-- Returns FALSE → limit exceeded (counter was NOT incremented).
--
-- When the current window has expired, it is reset automatically.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_rate_limit(
    p_key            TEXT,
    p_max            INT,
    p_window_seconds INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count        INT;
    v_window_start TIMESTAMPTZ;
    v_now          TIMESTAMPTZ := NOW();
BEGIN
    -- Lock the row for this key so concurrent calls are serialised.
    SELECT count, window_start
    INTO   v_count, v_window_start
    FROM   rate_limit_windows
    WHERE  key = p_key
    FOR UPDATE;

    IF NOT FOUND THEN
        -- First request ever for this key.
        INSERT INTO rate_limit_windows (key, count, window_start)
        VALUES (p_key, 1, v_now);
        RETURN TRUE;
    END IF;

    -- If the window has expired, reset it and allow the request.
    IF EXTRACT(EPOCH FROM (v_now - v_window_start)) > p_window_seconds THEN
        UPDATE rate_limit_windows
        SET    count = 1, window_start = v_now
        WHERE  key = p_key;
        RETURN TRUE;
    END IF;

    -- Within the window: check against the limit.
    IF v_count >= p_max THEN
        RETURN FALSE;  -- blocked
    END IF;

    UPDATE rate_limit_windows
    SET    count = count + 1
    WHERE  key = p_key;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_rate_limit(TEXT, INT, INT) TO service_role;

-- Periodic cleanup: remove windows older than 1 day.
-- Safe to run manually or from a cron; rows are recreated on demand.
-- DELETE FROM rate_limit_windows WHERE window_start < NOW() - INTERVAL '1 day';
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
-- ─────────────────────────────────────────────────────────────────────────────
-- webhook_logs: index + include in cleanup function
-- ─────────────────────────────────────────────────────────────────────────────
-- Without this index, cleanup and diagnostic queries on webhook_logs
-- (which can have millions of rows over time) require a full table scan.
-- CONCURRENTLY means no table lock during index creation — safe on live DB.
-- ─────────────────────────────────────────────────────────────────────────────

-- Note: CONCURRENTLY is omitted so this runs inside Supabase's transaction block.
-- On a table with millions of rows and heavy write traffic, prefer running
-- CREATE INDEX CONCURRENTLY via a direct psql connection outside a transaction.
CREATE INDEX IF NOT EXISTS webhook_logs_created_at_idx
    ON webhook_logs (created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Extend cleanup_expired_records() to also prune old webhook logs (30 days).
-- Uses CREATE OR REPLACE so running this migration is idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cleanup_expired_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Remove rate limit windows that expired more than 1 hour ago
    DELETE FROM rate_limit_windows
    WHERE window_start < NOW() - INTERVAL '1 hour';

    -- Remove idempotency keys older than 1 hour
    DELETE FROM idempotency_keys
    WHERE created_at < NOW() - INTERVAL '1 hour';

    -- Remove webhook logs older than 30 days
    -- Keeps the table bounded while preserving recent data for debugging
    DELETE FROM webhook_logs
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_expired_records() TO service_role;
