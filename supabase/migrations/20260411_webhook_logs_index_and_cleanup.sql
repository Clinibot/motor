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
