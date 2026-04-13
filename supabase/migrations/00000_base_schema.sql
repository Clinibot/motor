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
