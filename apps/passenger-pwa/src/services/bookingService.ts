/**
 * SAKAY Passenger Mock Booking Service Layer
 * Replaces direct Supabase booking table calls with an in-memory/session-persisted reactive store.
 */

import { publishBookingRequest } from '@sakay/shared';

export interface BookingRecord {
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

export interface CreateBookingPayload {
  passenger_id?: string;
  passenger_name?: string;
  passenger_phone?: string;
  booking_type?: 'Immediate' | 'Scheduled';
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
}

// In-memory + sessionStorage store
const STORAGE_KEY = 'sakay_active_bookings';

const loadBookings = (): Record<string, BookingRecord> => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveBookings = (store: Record<string, BookingRecord>) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn('Failed to persist bookings to sessionStorage:', err);
  }
};

const listeners = new Map<string, Set<(booking: BookingRecord) => void>>();

const notifyBookingListeners = (booking: BookingRecord) => {
  const set = listeners.get(booking.booking_id);
  if (set) {
    set.forEach((cb) => {
      try {
        cb(booking);
      } catch (e) {
        console.error('Error notifying booking subscriber:', e);
      }
    });
  }
};

/**
 * Creates a new booking in the mock store with artificial latency
 */
export const createBooking = async (payload: CreateBookingPayload): Promise<BookingRecord> => {
  // Artificial network latency (300ms)
  await new Promise((res) => setTimeout(res, 300));

  const bookingId = `BKG-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();

  const newBooking: BookingRecord = {
    booking_id: bookingId,
    passenger_id: payload.passenger_id || 'PSG-DEMO-001',
    passenger_name: payload.passenger_name || 'Juan Dela Cruz',
    passenger_phone: payload.passenger_phone || '+63 917 123 4567',
    booking_type: payload.booking_type || 'Immediate',
    is_shared_trip: payload.is_shared_trip,
    passenger_count: payload.passenger_count,
    pickup_address: payload.pickup_address,
    pickup_latitude: payload.pickup_latitude,
    pickup_longitude: payload.pickup_longitude,
    dropoff_address: payload.dropoff_address,
    dropoff_latitude: payload.dropoff_latitude,
    dropoff_longitude: payload.dropoff_longitude,
    estimated_distance_km: payload.estimated_distance_km,
    estimated_fare: payload.estimated_fare,
    booking_status: 'Searching Driver',
    driver_latitude: payload.pickup_latitude + 0.004,
    driver_longitude: payload.pickup_longitude + 0.003,
    eta_minutes: 4,
    created_at: now,
    updated_at: now,
  };

  const store = loadBookings();
  store[bookingId] = newBooking;
  saveBookings(store);

  // Set as current active trip
  sessionStorage.setItem('current_active_booking_id', bookingId);

  // Publish to shared broker for Driver PWA
  try {
    publishBookingRequest(newBooking as any);
  } catch (e) {
    console.warn('Failed to publish booking to shared dispatch broker:', e);
  }

  return newBooking;
};

/**
 * Retrieves a booking by ID
 */
export const getBooking = (bookingId: string): BookingRecord | null => {
  const store = loadBookings();
  return store[bookingId] || null;
};

/**
 * Cancels a booking
 */
export const cancelBooking = async (bookingId: string, reason?: string): Promise<boolean> => {
  await new Promise((res) => setTimeout(res, 200));

  const store = loadBookings();
  if (store[bookingId]) {
    store[bookingId] = {
      ...store[bookingId],
      booking_status: 'Cancelled',
      updated_at: new Date().toISOString(),
    };
    if (reason) {
      console.log(`Booking ${bookingId} cancelled: ${reason}`);
    }
    saveBookings(store);
    notifyBookingListeners(store[bookingId]);
    return true;
  }
  return false;
};

/**
 * Updates a booking's status and driver details in the mock store
 */
export const updateBookingState = (
  bookingId: string,
  updates: Partial<BookingRecord>
): BookingRecord | null => {
  const store = loadBookings();
  if (store[bookingId]) {
    const updated = {
      ...store[bookingId],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    store[bookingId] = updated;
    saveBookings(store);
    notifyBookingListeners(updated);
    return updated;
  }
  return null;
};

/**
 * Subscribes to reactive booking updates
 */
export const subscribeBooking = (
  bookingId: string,
  callback: (booking: BookingRecord) => void
): (() => void) => {
  if (!listeners.has(bookingId)) {
    listeners.set(bookingId, new Set());
  }
  listeners.get(bookingId)!.add(callback);

  // Immediate callback with current state if exists
  const current = getBooking(bookingId);
  if (current) {
    callback(current);
  }

  return () => {
    listeners.get(bookingId)?.delete(callback);
  };
};
