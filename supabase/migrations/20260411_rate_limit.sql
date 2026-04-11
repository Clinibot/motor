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
