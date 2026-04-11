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
