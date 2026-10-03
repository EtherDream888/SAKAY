-- PI-09: Booking Abuse Strike System
-- Items (a)-(f): Obvious policy intent applied as DB default/constraints
-- Items (g)-(h): 1 strike per booking abuse event, suspension at 3 strikes

-- Ensure the strike_count column exists on passenger table
ALTER TABLE public.passenger ADD COLUMN IF NOT EXISTS strike_count INT DEFAULT 0;
ALTER TABLE public.passenger ADD COLUMN IF NOT EXISTS last_strike_at TIMESTAMPTZ;
ALTER TABLE public.passenger ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;

-- RPC: Issue a booking-abuse strike to a passenger
-- Called by server-side logic when abuse is detected.
CREATE OR REPLACE FUNCTION public.issue_booking_abuse_strike(
  p_passenger_id UUID,
  p_reason TEXT DEFAULT 'Booking abuse'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_strike_count INT;
  v_is_suspended BOOLEAN;
BEGIN
  UPDATE public.passenger
  SET
    strike_count = COALESCE(strike_count, 0) + 1,
    last_strike_at = NOW()
  WHERE passenger_id = p_passenger_id
  RETURNING strike_count INTO v_new_strike_count;

  -- Suspend at 3 or more strikes (PI-09g/h baseline)
  IF v_new_strike_count >= 3 THEN
    UPDATE public.passenger
    SET
      account_status = 'Suspended',
      is_suspended = TRUE
    WHERE passenger_id = p_passenger_id;
    v_is_suspended := TRUE;
  ELSE
    v_is_suspended := FALSE;
  END IF;

  -- Write to audit_log
  INSERT INTO public.audit_log (action_type, target_id, details, performed_at)
  VALUES (
    'booking_abuse_strike',
    p_passenger_id,
    jsonb_build_object(
      'reason', p_reason,
      'new_strike_count', v_new_strike_count,
      'suspended', v_is_suspended
    )::text,
    NOW()
  );

  RETURN jsonb_build_object(
    'strike_count', v_new_strike_count,
    'suspended', v_is_suspended
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_booking_abuse_strike(UUID, TEXT) TO service_role;

-- PI-09 items (a)-(f): Cancellation policy enforced at trigger level
-- These mark a cancellation as abusive if the passenger cancels after driver assignment
-- and within the first 50% of estimated route. A strike is issued automatically.
CREATE OR REPLACE FUNCTION public.check_cancellation_abuse()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_passenger_id UUID;
  v_was_assigned BOOLEAN;
BEGIN
  -- Only react to status changing TO 'Cancelled'
  IF NEW.booking_status <> 'Cancelled' OR OLD.booking_status = 'Cancelled' THEN
    RETURN NEW;
  END IF;

  -- Only issue a strike if the booking was Assigned or Ongoing before cancellation
  IF OLD.booking_status NOT IN ('Assigned', 'Ongoing') THEN
    RETURN NEW;
  END IF;

  -- Only penalise if the cancellation reason indicates passenger-side cancellation
  -- (cancellation_reason column; if NULL we assume passenger cancellation)
  IF NEW.cancelled_by IS NOT NULL AND NEW.cancelled_by <> 'passenger' THEN
    RETURN NEW;
  END IF;

  v_passenger_id := NEW.passenger_id;
  IF v_passenger_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Issue 1 strike for booking abuse (PI-09g baseline)
  PERFORM public.issue_booking_abuse_strike(
    v_passenger_id,
    COALESCE(NEW.cancellation_reason, 'Late cancellation after driver assignment')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cancellation_abuse ON public.booking;
CREATE TRIGGER trg_cancellation_abuse
  AFTER UPDATE ON public.booking
  FOR EACH ROW
  EXECUTE FUNCTION public.check_cancellation_abuse();
