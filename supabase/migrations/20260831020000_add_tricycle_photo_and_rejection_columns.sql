-- Migration: Add tricycle_photo_path, rejection details, and endorsement timestamps to public.driver and public.driver_verification tables
-- Description: Extends driver tables to support tricycle unit photo storage, TODA rejection reasons/comments, and workflow timestamp tracking.

ALTER TABLE public.driver
    ADD COLUMN IF NOT EXISTS tricycle_photo_path TEXT,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS rejection_comment TEXT,
    ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.toda_admin(admin_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS endorsed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS lgu_approved_at TIMESTAMPTZ;

ALTER TABLE public.driver_verification
    ADD COLUMN IF NOT EXISTS tricycle_photo_path TEXT,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS rejection_comment TEXT,
    ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.toda_admin(admin_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS endorsed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS lgu_approved_at TIMESTAMPTZ;
