-- ============================================================================
-- MIGRATION: 20260826190000_driver_registration_rls.sql
-- PURPOSE: Enforce that drivers can only be registered if their target TODA is Active.
-- ============================================================================

-- Ensure drivers cannot be inserted or updated to belong to a TODA that is 'Pending Verification' or 'Suspended'.

CREATE OR REPLACE FUNCTION public.check_toda_is_active(target_toda_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status VARCHAR;
BEGIN
    SELECT account_status INTO v_status FROM public.toda WHERE id = target_toda_id;
    RETURN (v_status = 'Active');
END;
$$;

-- Note: We must drop any existing open driver insertion policy if we want to restrict it.
-- The previous migration `20260819121500_fix_security_and_rls.sql` might have added a permissive policy for TODA admins.
-- Let's update the RLS policies for `public.driver`.

-- Policy: TODA Admins can only insert drivers if their TODA is Active
DROP POLICY IF EXISTS "toda_admin_insert_driver" ON public.driver;
CREATE POLICY "toda_admin_insert_driver" 
    ON public.driver 
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        public.is_toda_admin() 
        AND toda_id = public.get_current_toda_admin_toda_id()
        AND public.check_toda_is_active(toda_id)
    );

-- Note: LGU Admins can do anything
DROP POLICY IF EXISTS "lgu_admin_all_driver" ON public.driver;
CREATE POLICY "lgu_admin_all_driver" 
    ON public.driver 
    FOR ALL 
    TO authenticated
    USING (public.is_lgu_admin())
    WITH CHECK (public.is_lgu_admin());

-- Policy: Drivers can insert themselves if the TODA is active (during driver app registration)
DROP POLICY IF EXISTS "driver_self_insert" ON public.driver;
CREATE POLICY "driver_self_insert" 
    ON public.driver 
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        auth_user_id = auth.uid()
        AND public.check_toda_is_active(toda_id)
    );
