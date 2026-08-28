-- ============================================================================
-- SAKAY Database Migration: TODA Table Refinements
-- 1. Remove obsolete registration_number, certificate_number, and certificate_expiry
-- 2. Rename account_status to toda_status
-- Migration: 20260828000003_toda_table_refinements.sql
-- ============================================================================

-- 1. Drop deprecated columns from public.toda
ALTER TABLE public.toda 
DROP COLUMN IF EXISTS registration_number CASCADE,
DROP COLUMN IF EXISTS certificate_number CASCADE,
DROP COLUMN IF EXISTS certificate_expiry CASCADE;

-- 2. Rename account_status to toda_status on public.toda
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'toda' 
      AND column_name = 'account_status'
  ) THEN
    ALTER TABLE public.toda RENAME COLUMN account_status TO toda_status;
  END IF;
END $$;

-- 3. Update default value & constraint if applicable
ALTER TABLE public.toda 
ALTER COLUMN toda_status SET DEFAULT 'Pending Verification';

-- 4. Update public read policy for toda
DROP POLICY IF EXISTS "Public authenticated can view active toda names" ON public.toda;
DROP POLICY IF EXISTS "public_view_active_toda" ON public.toda;
CREATE POLICY "public_view_active_toda" 
ON public.toda FOR SELECT 
TO public, anon, authenticated 
USING (toda_status = 'Active' OR toda_status = 'Pending Verification');
