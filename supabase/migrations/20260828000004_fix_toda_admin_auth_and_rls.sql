-- ============================================================================
-- Migration: Fix TODA Admin Auth, Registration Insert RLS, and Auto-Confirmation
-- ============================================================================

-- 1. Ensure toda_acronym column exists on toda_admin
ALTER TABLE public.toda_admin 
ADD COLUMN IF NOT EXISTS toda_acronym VARCHAR(50);

-- 2. Update RLS policies on toda_admin to permit registration insertions & lookups
ALTER TABLE public.toda_admin ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "toda_admin_insert_policy" ON public.toda_admin;
DROP POLICY IF EXISTS "anon_insert_toda_admin" ON public.toda_admin;
CREATE POLICY "anon_insert_toda_admin" 
ON public.toda_admin FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "toda_admin_select_policy" ON public.toda_admin;
DROP POLICY IF EXISTS "public_select_toda_admin" ON public.toda_admin;
CREATE POLICY "public_select_toda_admin"
ON public.toda_admin FOR SELECT 
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "toda_admin_update_policy" ON public.toda_admin;
CREATE POLICY "toda_admin_update_policy"
ON public.toda_admin FOR UPDATE 
TO authenticated
USING (auth_user_id = auth.uid() OR public.is_lgu_admin());

-- 3. Auto-confirm synthetic emails in auth.users (@toda.sakay.internal)
CREATE OR REPLACE FUNCTION public.auto_confirm_synthetic_users()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email LIKE '%@toda.sakay.internal' OR NEW.email LIKE '%@driver.sakay.internal' OR NEW.email LIKE '%@sakay.internal' THEN
    NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, NOW());
    NEW.last_sign_in_at = COALESCE(NEW.last_sign_in_at, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_confirm_synthetic_users ON auth.users;
CREATE TRIGGER trg_auto_confirm_synthetic_users
BEFORE INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_confirm_synthetic_users();

-- 4. Auto-create/sync toda_admin record when a toda_admin auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_toda_admin_user()
RETURNS TRIGGER AS $$
DECLARE
  v_toda_id UUID;
  v_full_name TEXT;
  v_toda_acronym TEXT;
  v_contact TEXT;
BEGIN
  IF NEW.raw_user_meta_data->>'role' = 'toda_admin' THEN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'TODA Administrator');
    v_toda_acronym := NEW.raw_user_meta_data->>'toda_acronym';
    v_contact := NEW.raw_user_meta_data->>'contact_number';

    -- Parse toda_id if provided in metadata
    BEGIN
      v_toda_id := (NEW.raw_user_meta_data->>'toda_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_toda_id := NULL;
    END;

    -- If toda_id not in metadata, resolve by acronym
    IF v_toda_id IS NULL AND v_toda_acronym IS NOT NULL THEN
      SELECT toda_id INTO v_toda_id FROM public.toda WHERE toda_acronym = v_toda_acronym LIMIT 1;
    END IF;

    -- If toda found, upsert into public.toda_admin
    IF v_toda_id IS NOT NULL THEN
      INSERT INTO public.toda_admin (
        auth_user_id,
        toda_id,
        full_name,
        email,
        toda_acronym,
        contact_number,
        account_status
      ) VALUES (
        NEW.id,
        v_toda_id,
        v_full_name,
        NEW.email,
        v_toda_acronym,
        v_contact,
        'Active'
      )
      ON CONFLICT (auth_user_id) DO UPDATE 
      SET toda_id = EXCLUDED.toda_id,
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          toda_acronym = EXCLUDED.toda_acronym,
          contact_number = COALESCE(EXCLUDED.contact_number, public.toda_admin.contact_number);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_auth_user_created_toda_admin ON auth.users;
CREATE TRIGGER trg_on_auth_user_created_toda_admin
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_toda_admin_user();

-- 5. Immediately auto-confirm any existing unconfirmed synthetic auth users
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE (email LIKE '%@toda.sakay.internal' OR email LIKE '%@driver.sakay.internal' OR email LIKE '%@sakay.internal')
  AND email_confirmed_at IS NULL;
