-- The one-open-booking rule is now enforced by trg_one_open_booking trigger
-- Drop any old partial indexes that may have been created previously
DROP INDEX IF EXISTS uniq_passenger_open_booking;
DROP INDEX IF EXISTS idx_one_open_booking;