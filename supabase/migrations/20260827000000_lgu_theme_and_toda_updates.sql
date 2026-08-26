-- ============================================================================
-- SAKAY Migration: LGU Theme & TODA Application Schema Updates
-- Migration File: 20260827000000_lgu_theme_and_toda_updates.sql
-- ============================================================================

-- 1. Add theme_color column to public.lgu_admin for persisting primary accent color
ALTER TABLE public.lgu_admin
ADD COLUMN IF NOT EXISTS theme_color VARCHAR(30) DEFAULT '#FF6B00';

-- 2. Ensure document columns exist on public.toda
ALTER TABLE public.toda
ADD COLUMN IF NOT EXISTS barangay_clearance_url TEXT,
ADD COLUMN IF NOT EXISTS accredited_drivers_url TEXT;

-- 3. Policy to allow LGU admins to update theme_color on lgu_admin table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'lgu_admin' AND policyname = 'LGU admins can update own profile'
    ) THEN
        CREATE POLICY "LGU admins can update own profile"
        ON public.lgu_admin FOR UPDATE TO authenticated
        USING (auth_user_id = auth.uid())
        WITH CHECK (auth_user_id = auth.uid());
    END IF;
END $$;
