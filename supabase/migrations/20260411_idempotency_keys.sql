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
