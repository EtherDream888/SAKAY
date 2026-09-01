/**
 * SAKAY Shared Mock Dispatch Broker
 * Provides cross-app real-time pub/sub synchronization between Passenger PWA and Driver PWA
 * using BroadcastChannel with localStorage event fallback across localhost Vite ports.
 */

export interface MockDispatchBooking {
  booking_id: string;
  passenger_id: string;
  passenger_name: string;
  passenger_phone: string;
  driver_id?: string;
  driver_name?: string;
  driver_photo?: string;
  driver_phone?: string;
  franchise_no?: string;
  vehicle_plate?: string;
  toda_name?: string;
  toda_id?: string;
  booking_type: 'Immediate' | 'Scheduled';
  is_shared_trip: boolean;
  passenger_count: number;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  dropoff_address: string;
  dropoff_latitude: number;
  dropoff_longitude: number;
  estimated_distance_km: number;
  estimated_fare: number;
  actual_fare?: number;
  proportionate_fare?: number;
  paired_booking_count?: number;
  paired_passenger_name?: string;
  unmatched_preference?: 'proceed' | 'cancel';
  booking_status:
    | 'Searching Driver'
    | 'Driver Assigned'
    | 'Driver En Route'
    | 'Driver Arrived'
    | 'Trip Ongoing'
    | 'Completed'
    | 'Cancelled'
    | 'No Driver Found';
  driver_latitude?: number;
  driver_longitude?: number;
  eta_minutes?: number;
  created_at: string;
  updated_at: string;
}

export interface DriverAssignmentPayload {
  driver_id: string;
  driver_name: string;
  driver_phone: string;
  franchise_no: string;
  vehicle_plate: string;
  toda_name: string;
  driver_photo?: string;
}

const STORAGE_KEY = 'sakay_shared_mock_bookings';
const CHANNEL_NAME = 'sakay_mock_dispatch_channel';

// In-memory store initialized from localStorage
let inMemoryStore: Record<string, MockDispatchBooking> = {};

const loadStore = (): Record<string, MockDispatchBooking> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      inMemoryStore = JSON.parse(raw);
    }
  } catch {
    // fallback to in-memory
  }
  return inMemoryStore;
};

const saveStore = (store: Record<string, MockDispatchBooking>) => {
  inMemoryStore = store;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn('Could not write to localStorage:', err);
  }
};

// Cross-tab Broadcast Channel
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel not supported, using storage events:', e);
}

// Supabase Realtime Channel for Cross-Port & Cross-Device Sync
let supabaseDispatchChannel: any = null;

export const initSupabaseDispatch = (supabaseClient: any) => {
  if (!supabaseClient || supabaseDispatchChannel) return;

  try {
    const channel = supabaseClient.channel('sakay_live_dispatch', {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'dispatch_event' }, ({ payload }: { payload: MockDispatchBooking }) => {
        if (payload && payload.booking_id) {
          inMemoryStore[payload.booking_id] = payload;
          saveStore(inMemoryStore);
          emitToSubscribers(payload);
        }
      })
      .subscribe();

    supabaseDispatchChannel = channel;
  } catch (err) {
    console.warn('[mockDispatch] Failed to initialize Supabase Realtime channel:', err);
  }
};

type DispatchListener = (booking: MockDispatchBooking) => void;
const subscribers = new Set<DispatchListener>();

const emitToSubscribers = (booking: MockDispatchBooking) => {
  subscribers.forEach((fn) => {
    try {
      fn(booking);
    } catch (err) {
      console.error('Error notifying dispatch listener:', err);
    }
  });
};

// Listen to BroadcastChannel messages
if (broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    if (event.data && event.data.booking_id) {
      inMemoryStore[event.data.booking_id] = event.data;
      emitToSubscribers(event.data);
    }
  };
}

// Fallback: Listen to window storage events
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        inMemoryStore = parsed;
        const lastUpdated = Object.values(parsed).sort(
          (a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )[0] as MockDispatchBooking;

        if (lastUpdated) {
          emitToSubscribers(lastUpdated);
        }
      } catch (e) {
        // ignore JSON parse error
      }
    }
  });
}

/**
 * Broadcasts an updated booking record across the channel, Supabase, and storage
 */
const broadcastBooking = (booking: MockDispatchBooking) => {
  const store = loadStore();
  store[booking.booking_id] = booking;
  saveStore(store);

  emitToSubscribers(booking);

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(booking);
    } catch (e) {
      console.warn('BroadcastChannel postMessage error:', e);
    }
  }

  if (supabaseDispatchChannel) {
    try {
      supabaseDispatchChannel.send({
        type: 'broadcast',
        event: 'dispatch_event',
        payload: booking,
      });
    } catch (e) {
      console.warn('Supabase Realtime dispatch error:', e);
    }
  }
};

/**
 * Publishes a new passenger booking request to the broker
 */
export const publishBookingRequest = (booking: MockDispatchBooking) => {
  broadcastBooking(booking);
};

/**
 * Subscribes to dispatch events
 */
export const subscribeToDispatchEvents = (callback: DispatchListener): (() => void) => {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
};

/**
 * Driver accepts a booking
 */
export const acceptBookingByDriver = (
  bookingId: string,
  driver: DriverAssignmentPayload
): MockDispatchBooking | null => {
  const store = loadStore();
  const existing = store[bookingId];
  if (!existing) return null;

  const updated: MockDispatchBooking = {
    ...existing,
    driver_id: driver.driver_id,
    driver_name: driver.driver_name,
    driver_phone: driver.driver_phone,
    driver_photo: driver.driver_photo,
    franchise_no: driver.franchise_no,
    vehicle_plate: driver.vehicle_plate,
    toda_name: driver.toda_name,
    booking_status: 'Driver Assigned',
    eta_minutes: 4,
    updated_at: new Date().toISOString(),
  };

  broadcastBooking(updated);
  return updated;
};

/**
 * Driver declines a booking (triggers simulated queue re-routing)
 */
export const declineBookingByDriver = (
  bookingId: string,
  driverId: string,
  reason?: string
) => {
  console.log(`Driver ${driverId} declined booking ${bookingId}: ${reason}`);
  const store = loadStore();
  const existing = store[bookingId];
  if (!existing) return;

  // Auto re-routing simulation: After 2.5 seconds, re-publish as 'Searching Driver'
  setTimeout(() => {
    const reRouted: MockDispatchBooking = {
      ...existing,
      booking_status: 'Searching Driver',
      updated_at: new Date().toISOString(),
    };
    broadcastBooking(reRouted);
  }, 2500);
};

/**
 * Updates the current stage of an active trip
 */
export const updateTripStage = (
  bookingId: string,
  stage: MockDispatchBooking['booking_status'],
  etaMinutes?: number,
  extra?: Partial<MockDispatchBooking>
): MockDispatchBooking | null => {
  const store = loadStore();
  const existing = store[bookingId];
  if (!existing) return null;

  const updated: MockDispatchBooking = {
    ...existing,
    booking_status: stage,
    eta_minutes: etaMinutes !== undefined ? etaMinutes : existing.eta_minutes,
    ...extra,
    updated_at: new Date().toISOString(),
  };

  broadcastBooking(updated);
  return updated;
};

/**
 * Completes a booking upon passenger drop-off
 */
export const completeBookingByDriver = (
  bookingId: string,
  actualFare: number
): MockDispatchBooking | null => {
  const store = loadStore();
  const existing = store[bookingId];
  if (!existing) return null;

  const updated: MockDispatchBooking = {
    ...existing,
    booking_status: 'Completed',
    actual_fare: actualFare,
    updated_at: new Date().toISOString(),
  };

  broadcastBooking(updated);
  return updated;
};

/**
 * Gets a booking by ID
 */
export const getMockBookingById = (bookingId: string): MockDispatchBooking | null => {
  const store = loadStore();
  return store[bookingId] || null;
};

/**
 * Returns all active bookings
 */
export const getAllActiveBookings = (): MockDispatchBooking[] => {
  const store = loadStore();
  return Object.values(store);
};
