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
