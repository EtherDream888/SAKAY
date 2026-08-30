-- Migration: Add dl_codes and mtop_expiry columns to public.driver and public.driver_verification tables
-- Description: Ensures full persistence for DL codes / restrictions and MTOP expiration dates.

ALTER TABLE public.driver
    ADD COLUMN IF NOT EXISTS dl_codes VARCHAR(50),
    ADD COLUMN IF NOT EXISTS mtop_expiry DATE;

ALTER TABLE public.driver_verification
    ADD COLUMN IF NOT EXISTS mtop_expiry DATE;
