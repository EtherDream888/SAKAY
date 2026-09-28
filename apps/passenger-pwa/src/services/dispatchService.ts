import { supabase } from './supabaseClient';
import { getDistanceKm } from '@sakay/shared';

// Wait utility
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Dispatch Engine based on Tiered Allocation Logic
 * Orchestrated by Passenger PWA
 */
export const startDispatch = async (bookingId: string) => {
  console.log(`[dispatchService] Starting Tiered Dispatch for booking: ${bookingId}`);
  let isDispatchActive = true;

  try {
    // Sync booking with DB if not found or ensure we fetch from DB to get the latest status
    const { data: dbBooking } = await supabase.from('booking').select('*').eq('booking_id', bookingId).single();
    if (!dbBooking) throw new Error('Booking not found in database');

    const pickupLat = Number(dbBooking.pickup_latitude);
    const pickupLng = Number(dbBooking.pickup_longitude);

    // 1. Priority TODA Identification
    // Find nearest active TODA terminal
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
    const sendSequentialOffers = async (drivers: any[]) => {
      for (let i = 0; i < drivers.length; i++) {
        const driver = drivers[i];
        
        // Check if booking is still Pending
        const { data: checkBooking } = await supabase.from('booking').select('booking_status').eq('booking_id', bookingId).single();
        if (checkBooking?.booking_status !== 'Pending' && checkBooking?.booking_status !== 'Searching Driver') {
          console.log('[dispatchService] Booking no longer pending. Halting dispatch.');
          isDispatchActive = false;
          return true; // Someone accepted or cancelled
        }

        console.log(`[dispatchService] Offering to driver ${driver.driver_id} (Rank ${i + 1})`);
        
        // Insert dispatch attempt
        const { data: attempt, error: attemptError } = await supabase.from('dispatch_attempt').insert([{
          booking_id: bookingId,
          driver_id: driver.driver_id,
          dispatch_method: 'Sequential Tiered',
          driver_rank: i + 1,
          response_status: 'Pending'
        }]).select().single();

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

          // Poll attempt status (using polling here for simplicity in a background loop, though realtime is possible)
          const { data: currentAttempt } = await supabase
            .from('dispatch_attempt')
            .select('response_status')
            .eq('attempt_id', attempt.attempt_id)
            .single();

          if (currentAttempt) {
            attemptStatus = currentAttempt.response_status;
            if (attemptStatus === 'Accepted') {
              console.log(`[dispatchService] Driver ${driver.driver_id} accepted.`);
              accepted = true;
              isDispatchActive = false;
              break;
            } else if (attemptStatus === 'Declined') {
              console.log(`[dispatchService] Driver ${driver.driver_id} declined.`);
              break;
            }
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

    // --- TIER 1: Priority TODA + 600m ---
    console.log('[dispatchService] Executing Tier 1');
    if (priorityTodaId) {
      const { data: tier1Drivers } = await supabase
        .from('driver')
        .select('*')
        .eq('availability_status', 'Available')
        .in('account_status', ['Active', 'Verified'])
        .eq('toda_id', priorityTodaId);
        
      if (tier1Drivers) {
        // Filter by 600m
        const eligibleTier1 = tier1Drivers.filter(d => {
          if (!d.current_latitude || !d.current_longitude) return false;
          const dist = getDistanceKm(pickupLat, pickupLng, Number(d.current_latitude), Number(d.current_longitude));
          return dist <= 0.6;
        });

        // Rank by ETA (approximated by distance for now)
        eligibleTier1.sort((a, b) => {
          const distA = getDistanceKm(pickupLat, pickupLng, Number(a.current_latitude), Number(a.current_longitude));
          const distB = getDistanceKm(pickupLat, pickupLng, Number(b.current_latitude), Number(b.current_longitude));
          return distA - distB;
        });

        if (eligibleTier1.length > 0) {
          const success = await sendSequentialOffers(eligibleTier1);
          if (success) return;
        }
      }
    }

    if (!isDispatchActive) return;

    // --- TIER 2: Any TODA + 2km ---
    console.log('[dispatchService] Executing Tier 2');
    const { data: tier2Drivers } = await supabase
      .from('driver')
      .select('*')
      .eq('availability_status', 'Available')
      .in('account_status', ['Active', 'Verified']);
      
    if (tier2Drivers) {
      const { data: pastAttempts } = await supabase.from('dispatch_attempt').select('driver_id').eq('booking_id', bookingId);
      const pastDriverIds = new Set(pastAttempts?.map(a => a.driver_id) || []);

      const eligibleTier2 = tier2Drivers.filter(d => {
        if (pastDriverIds.has(d.driver_id)) return false; // Don't offer again
        if (!d.current_latitude || !d.current_longitude) return false;
        const dist = getDistanceKm(pickupLat, pickupLng, Number(d.current_latitude), Number(d.current_longitude));
        return dist <= 2.0;
      });

      eligibleTier2.sort((a, b) => {
        const distA = getDistanceKm(pickupLat, pickupLng, Number(a.current_latitude), Number(a.current_longitude));
        const distB = getDistanceKm(pickupLat, pickupLng, Number(b.current_latitude), Number(b.current_longitude));
        return distA - distB;
      });

      if (eligibleTier2.length > 0) {
        const success = await sendSequentialOffers(eligibleTier2);
        if (success) return;
      }
    }

    if (!isDispatchActive) return;

    // --- TIER 3: Dynamic Live Search (2.0km to 3.5km) ---
    console.log('[dispatchService] Executing Tier 3 (Dynamic Live Search)');
    const radii = [2.5, 3.0, 3.5];
    
    for (const radius of radii) {
      if (!isDispatchActive) break;
      console.log(`[dispatchService] Searching radius: ${radius}km`);

      const { data: tier3Drivers } = await supabase
        .from('driver')
        .select('*')
        .eq('availability_status', 'Available')
        .in('account_status', ['Active', 'Verified']);

      if (tier3Drivers) {
        const { data: pastAttempts } = await supabase.from('dispatch_attempt').select('driver_id').eq('booking_id', bookingId);
        const pastDriverIds = new Set(pastAttempts?.map(a => a.driver_id) || []);

        const eligibleTier3 = tier3Drivers.filter(d => {
          if (pastDriverIds.has(d.driver_id)) return false;
          if (!d.current_latitude || !d.current_longitude) return false;
          const dist = getDistanceKm(pickupLat, pickupLng, Number(d.current_latitude), Number(d.current_longitude));
          return dist <= radius;
        });

        eligibleTier3.sort((a, b) => {
          const distA = getDistanceKm(pickupLat, pickupLng, Number(a.current_latitude), Number(a.current_longitude));
          const distB = getDistanceKm(pickupLat, pickupLng, Number(b.current_latitude), Number(b.current_longitude));
          return distA - distB;
        });

        if (eligibleTier3.length > 0) {
          const success = await sendSequentialOffers(eligibleTier3);
          if (success) return;
        }
      }

      // Wait 30 seconds before expanding radius further
      if (isDispatchActive && radius < 3.5) {
        let waited = 0;
        while (waited < 30) {
          const { data: checkBooking } = await supabase.from('booking').select('booking_status').eq('booking_id', bookingId).single();
          if (checkBooking?.booking_status !== 'Pending' && checkBooking?.booking_status !== 'Searching Driver') {
            isDispatchActive = false;
            return;
          }
          await delay(1000);
          waited += 1;
        }
      }
    }

    if (isDispatchActive) {
      console.log('[dispatchService] Exhausted all tiers. No driver found.');
      await supabase.from('booking').update({ booking_status: 'No Driver Found' }).eq('booking_id', bookingId);
    }

  } catch (err) {
    console.error('[dispatchService] Dispatch error:', err);
  }
};
