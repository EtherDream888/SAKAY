-- ============================================================================
-- Migration: 20261003000004_add_driver_session.sql
-- Batch 2: Single-active-session enforcement for drivers (Rule 29.1).
--
-- Adds a session_id UUID column to public.driver so the driver-pwa can write
-- a new UUID on each login and detect when a second device has taken over
-- the session (the stored UUID will no longer match the local copy).
-- ============================================================================

BEGIN;

ALTER TABLE public.driver
    ADD COLUMN IF NOT EXISTS session_id UUID;

COMMIT;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON public.driver TO authenticated, service_role;
