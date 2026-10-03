-- Drop prior partial index (no shared-trip exception possible in a plain partial UNIQUE index)
DROP INDEX IF EXISTS idx_one_open_booking;

-- Create a PostgreSQL function that enforces the one-open-booking rule with shared-trip exception
CREATE OR REPLACE FUNCTION public.check_one_open_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_open_count INT;
  v_shared_primary_count INT;
BEGIN
  -- Only enforce on INSERT of non-NULL passenger_id
  IF NEW.passenger_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count open bookings for this passenger
  SELECT COUNT(*)
  INTO v_open_count
  FROM public.booking
  WHERE passenger_id = NEW.passenger_id
    AND booking_status IN ('Pending', 'Searching Driver', 'Assigned', 'Ongoing');

  IF v_open_count = 0 THEN
    RETURN NEW; -- No open bookings, allow
  END IF;

  -- Shared-trip exception: allow if the ONLY open booking is the primary side
  -- of a shared trip that is still in 'Searching Driver' awaiting a second passenger.
  -- (is_shared_trip = TRUE AND booking_type = 'Immediate' AND booking_status = 'Searching Driver'
  --  AND the new booking is also a shared trip — i.e., joining as a secondary passenger)
  SELECT COUNT(*)
  INTO v_shared_primary_count
  FROM public.booking
  WHERE passenger_id = NEW.passenger_id
    AND booking_status IN ('Pending', 'Searching Driver', 'Assigned', 'Ongoing')
    AND is_shared_trip = TRUE
    AND booking_status = 'Searching Driver'; -- still seeking a match

  -- If ALL open bookings are shared-primary-seeking AND the new booking is also shared, allow it
  IF v_shared_primary_count = v_open_count AND NEW.is_shared_trip = TRUE THEN
    RETURN NEW;
  END IF;

  -- Otherwise block
  RAISE EXCEPTION 'idx_one_open_booking: passenger already has an active booking'
    USING ERRCODE = '23505';
END;
$$;

DROP TRIGGER IF EXISTS trg_one_open_booking ON public.booking;
CREATE TRIGGER trg_one_open_booking
  BEFORE INSERT ON public.booking
  FOR EACH ROW
  EXECUTE FUNCTION public.check_one_open_booking();
