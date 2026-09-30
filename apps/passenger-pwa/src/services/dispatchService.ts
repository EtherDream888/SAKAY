import { supabase } from './supabaseClient';
import { getDistanceKm } from '@sakay/shared';

// Wait utility
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const activeDispatches = new Set<string>();

/**
 * Dispatch Engine based on Fast Tiered Allocation Logic
 * Orchestrated by Passenger PWA
 */
export const startDispatch = async (bookingId: string) => {
  if (!bookingId) return;

  if (activeDispatches.has(bookingId)) {
    console.log(`[dispatchService] Dispatch already actively running for booking: ${bookingId}`);
    return;
  }
  activeDispatches.add(bookingId);

  console.log(`[dispatchService] Starting Fast Tiered Dispatch for booking: ${bookingId}`);
  let isDispatchActive = true;

  try {
    // Sync booking with DB
    const { data: dbBooking, error: bErr } = await supabase.from('booking').select('*').eq('booking_id', bookingId).single();
    if (bErr || !dbBooking) {
      console.warn('[dispatchService] Booking not found in database:', bErr);
      return;
    }

    if (dbBooking.booking_status !== 'Pending' && dbBooking.booking_status !== 'Searching Driver') {
      console.log(`[dispatchService] Booking ${bookingId} is already in status '${dbBooking.booking_status}'. No dispatch needed.`);
      return;
    }

    const pickupLat = Number(dbBooking.pickup_latitude) || 13.4117;
    const pickupLng = Number(dbBooking.pickup_longitude) || 121.1803;

    // Helper to calculate distance with safe coordinate fallback
    const getDriverDistance = (driver: any): number => {
      const dLat = Number(driver.current_latitude) || 13.4117;
      const dLng = Number(driver.current_longitude) || 121.1803;
      return getDistanceKm(pickupLat, pickupLng, dLat, dLng);
    };

    // 1. Priority TODA Identification
    const { data: todas } = await supabase
      .from('toda')
      .select('toda_id, terminal_latitude, terminal_longitude, account_status')
      .eq('account_status', 'Active');

    let priorityTodaId: string | null = null;
    let closestTodaDistance = Infinity;

    if (todas && todas.length > 0) {
      for (const toda of todas) {
        if (toda.terminal_latitude && toda.terminal_longitude) {
          const dist = getDistanceKm(
            pickupLat,
            pickupLng,
            Number(toda.terminal_latitude),
            Number(toda.terminal_longitude)
          );
          if (dist < closestTodaDistance) {
            closestTodaDistance = dist;
            priorityTodaId = toda.toda_id;
          }
        }
      }
    }

    // Helper to send offers to a ranked list of drivers
    const sendSequentialOffers = async (drivers: any[]): Promise<boolean> => {
      for (let i = 0; i < drivers.length; i++) {
        const driver = drivers[i];
        
        // Check if booking is still Pending
        const { data: checkBooking } = await supabase
          .from('booking')
          .select('booking_status')
          .eq('booking_id', bookingId)
          .single();

        if (checkBooking?.booking_status !== 'Pending' && checkBooking?.booking_status !== 'Searching Driver') {
          console.log('[dispatchService] Booking no longer pending. Halting dispatch.');
          isDispatchActive = false;
          return true; // Someone accepted or cancelled
        }

        console.log(`[dispatchService] Offering to driver ${driver.driver_id} (${driver.full_name || 'Driver'}, Rank ${i + 1})`);
        
        // Insert dispatch attempt
        const { data: attempt, error: attemptError } = await supabase
          .from('dispatch_attempt')
          .insert([{
            booking_id: bookingId,
            driver_id: driver.driver_id,
            dispatch_method: 'Sequential Tiered',
            driver_rank: i + 1,
            response_status: 'Pending'
          }])
          .select()
          .single();

        if (attemptError) {
          console.error('[dispatchService] Failed to create attempt:', attemptError);
          continue;
        }

        // Wait up to 15 seconds for driver response
        let waited = 0;
        let accepted = false;
        let attemptStatus = 'Pending';

        while (waited < 15) {
          await delay(1000);
          waited += 1;

          // Check attempt response status
          const { data: currentAttempt } = await supabase
            .from('dispatch_attempt')
            .select('response_status')
            .eq('attempt_id', attempt.attempt_id)
            .single();

          if (currentAttempt) {
            attemptStatus = currentAttempt.response_status;
            if (attemptStatus === 'Accepted') {
              console.log(`[dispatchService] Driver ${driver.driver_id} accepted via attempt.`);
              accepted = true;
              isDispatchActive = false;
              break;
            } else if (attemptStatus === 'Declined' || attemptStatus === 'Expired') {
              console.log(`[dispatchService] Driver ${driver.driver_id} ${attemptStatus.toLowerCase()}.`);
              break;
            }
          }

          // Concurrently check if booking itself was accepted or cancelled
          const { data: currentBooking } = await supabase
            .from('booking')
            .select('booking_status')
            .eq('booking_id', bookingId)
            .single();

          if (
            currentBooking?.booking_status === 'Accepted' ||
            currentBooking?.booking_status === 'In Transit' ||
            currentBooking?.booking_status === 'Driver Assigned' ||
            currentBooking?.booking_status === 'Trip Ongoing'
          ) {
            console.log(`[dispatchService] Booking ${bookingId} was accepted!`);
            accepted = true;
            isDispatchActive = false;
            break;
          }

          if (currentBooking?.booking_status === 'Cancelled') {
            console.log(`[dispatchService] Booking ${bookingId} was cancelled by passenger.`);
            isDispatchActive = false;
            return false;
          }
        }

        if (accepted) return true;

        if (attemptStatus === 'Pending') {
          // Timeout, mark as Declined
          await supabase.from('dispatch_attempt').update({ response_status: 'Declined' }).eq('attempt_id', attempt.attempt_id);
          console.log(`[dispatchService] Driver ${driver.driver_id} timed out.`);
        }
      }
      return false;
    };

    // Pre-fetch available verified drivers
    const { data: onlineDrivers } = await supabase
      .from('driver')
      .select('*')
      .eq('availability_status', 'Available')
      .eq('account_status', 'Verified');

    // --- TIER 1: Priority TODA (<= 1.5km) OR Any Driver within Immediate Vicinity (<= 0.8km) ---
    console.log('[dispatchService] Executing Tier 1');
    if (onlineDrivers && onlineDrivers.length > 0) {
      const eligibleTier1 = onlineDrivers.filter(d => {
        const dist = getDriverDistance(d);
        const isPriorityToda = priorityTodaId && d.toda_id === priorityTodaId && dist <= 1.5;
        const isImmediateVicinity = dist <= 0.8;
        return isPriorityToda || isImmediateVicinity;
      });

      eligibleTier1.sort((a, b) => getDriverDistance(a) - getDriverDistance(b));

      if (eligibleTier1.length > 0) {
        console.log(`[dispatchService] Tier 1 found ${eligibleTier1.length} driver(s)`);
        const success = await sendSequentialOffers(eligibleTier1);
        if (success) return;
      }
    }

    if (!isDispatchActive) return;

    // --- TIER 2: Any TODA within 2.5 km ---
    console.log('[dispatchService] Executing Tier 2');
    if (onlineDrivers && onlineDrivers.length > 0) {
      const { data: pastAttempts } = await supabase.from('dispatch_attempt').select('driver_id').eq('booking_id', bookingId);
      const pastDriverIds = new Set(pastAttempts?.map(a => a.driver_id) || []);

      const eligibleTier2 = onlineDrivers.filter(d => {
        if (pastDriverIds.has(d.driver_id)) return false;
        return getDriverDistance(d) <= 2.5;
      });

      eligibleTier2.sort((a, b) => getDriverDistance(a) - getDriverDistance(b));

      if (eligibleTier2.length > 0) {
        console.log(`[dispatchService] Tier 2 found ${eligibleTier2.length} driver(s)`);
        const success = await sendSequentialOffers(eligibleTier2);
        if (success) return;
      }
    }

    if (!isDispatchActive) return;

    // --- TIER 3: Dynamic Live Search (3.5km to 12.0km) ---
    console.log('[dispatchService] Executing Tier 3 (Dynamic Live Search)');
    const radii = [3.5, 5.0, 7.5, 12.0];
    
    for (const radius of radii) {
      if (!isDispatchActive) break;

      const { data: pastAttempts } = await supabase.from('dispatch_attempt').select('driver_id').eq('booking_id', bookingId);
      const pastDriverIds = new Set(pastAttempts?.map(a => a.driver_id) || []);

      const { data: currentDrivers } = await supabase
        .from('driver')
        .select('*')
        .eq('availability_status', 'Available')
        .eq('account_status', 'Verified');

      if (currentDrivers && currentDrivers.length > 0) {
        const eligibleTier3 = currentDrivers.filter(d => {
          if (pastDriverIds.has(d.driver_id)) return false;
          return getDriverDistance(d) <= radius;
        });

        eligibleTier3.sort((a, b) => getDriverDistance(a) - getDriverDistance(b));

        if (eligibleTier3.length > 0) {
          console.log(`[dispatchService] Tier 3 (${radius}km) found ${eligibleTier3.length} driver(s)`);
          const success = await sendSequentialOffers(eligibleTier3);
          if (success) return;
        }
      }
    }

    // --- FALLBACK: Offer to Any Remaining Available Verified Driver ---
    if (isDispatchActive) {
      console.log('[dispatchService] Fallback: Checking any available verified driver...');
      const { data: allAvailable } = await supabase
        .from('driver')
        .select('*')
        .eq('availability_status', 'Available')
        .eq('account_status', 'Verified');

      if (allAvailable && allAvailable.length > 0) {
        const { data: pastAttempts } = await supabase.from('dispatch_attempt').select('driver_id').eq('booking_id', bookingId);
        const pastDriverIds = new Set(pastAttempts?.map(a => a.driver_id) || []);
        const remaining = allAvailable.filter(d => !pastDriverIds.has(d.driver_id));
        remaining.sort((a, b) => getDriverDistance(a) - getDriverDistance(b));

        if (remaining.length > 0) {
          console.log(`[dispatchService] Offering to ${remaining.length} fallback online driver(s)`);
          const success = await sendSequentialOffers(remaining);
          if (success) return;
        }
      }
    }

    if (isDispatchActive) {
      const { data: finalCheck } = await supabase.from('booking').select('booking_status').eq('booking_id', bookingId).single();
      if (finalCheck?.booking_status === 'Pending' || finalCheck?.booking_status === 'Searching Driver') {
        console.log('[dispatchService] Exhausted all tiers. No driver found.');
        await supabase.from('booking').update({ booking_status: 'No Driver Found' }).eq('booking_id', bookingId);
      }
    }

  } catch (err) {
    console.error('[dispatchService] Dispatch error:', err);
  } finally {
    activeDispatches.delete(bookingId);
  }
};
