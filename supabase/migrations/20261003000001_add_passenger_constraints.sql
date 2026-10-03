-- Safely add columns if they don't already exist
ALTER TABLE public.passenger ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.passenger ADD COLUMN IF NOT EXISTS failed_otp_attempts INT DEFAULT 0;
ALTER TABLE public.passenger ADD COLUMN IF NOT EXISTS last_otp_failed_at TIMESTAMPTZ;

-- Safely recreate the unique constraint
ALTER TABLE public.passenger DROP CONSTRAINT IF EXISTS passenger_contact_number_unique;
ALTER TABLE public.passenger ADD CONSTRAINT passenger_contact_number_unique UNIQUE (contact_number);