/**
 * SAKAY Passenger Live & Real-Time Booking Service Layer
 * Directly synchronizes bookings with Supabase PostgreSQL tables.
 */

import { supabase } from './supabaseClient';
import type { BookingRecord } from '@sakay/shared';
import { saveTripToHistory } from './tripService';

export type { BookingRecord };

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

const persistToHistoryIfTerminal = (b: BookingRecord) => {
  if (b.booking_status === 'Completed' || b.booking_status === 'Cancelled') {
    const createdDate = b.created_at ? new Date(b.created_at) : new Date();
    const isToday = new Date().toDateString() === createdDate.toDateString();
    const fareVal = b.actual_fare || b.estimated_fare || 0;

    saveTripToHistory({
      id: b.booking_id,
      pickup: b.pickup_address || 'Calapan City',
      pickupLat: Number(b.pickup_latitude) || 13.4124,
      pickupLng: Number(b.pickup_longitude) || 121.1834,
      dropoff: b.dropoff_address || 'Calapan City Public Market',
      dropoffLat: Number(b.dropoff_latitude) || 13.4150,
      dropoffLng: Number(b.dropoff_longitude) || 121.1810,
      price: `₱${parseFloat(String(fareVal)).toFixed(2)}`,
      type: b.is_shared_trip ? 'Share' : 'Solo',
      distanceKm: Number(b.estimated_distance_km) || 1.5,
      time: createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateGroup: isToday ? 'NGAYONG ARAW' : 'NAKARAANG ARAW',
      dateString: createdDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      driverName: b.driver_name || 'Aurelio Bautista',
      bodyNumber: b.franchise_no || 'CAL-2025-0773',
      isLiveRecord: true,
      status: b.booking_status,
    });
  }
};

let isCreatingBooking = false;

/**
 * Creates a new booking directly in Supabase and the reactive store
 */
export const createBooking = async (payload: CreateBookingPayload): Promise<BookingRecord> => {
  if (isCreatingBooking) {
    throw new Error('Booking already in progress');
  }
  isCreatingBooking = true;
  const now = new Date().toISOString();
  
  let validPassengerId = payload.passenger_id || localStorage.getItem('sakay_passenger_id');

  // 1. Resolve passenger UUID from active session if available
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const { data: pData } = await supabase
        .from('passenger')
        .select('passenger_id, full_name, contact_number')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (pData) {
        validPassengerId = pData.passenger_id;
        if (!payload.passenger_name && pData.full_name) payload.passenger_name = pData.full_name;
        if (!payload.passenger_phone && pData.contact_number) payload.passenger_phone = pData.contact_number;
      }
    }
  } catch (e) {
    // ignore
  }

  if (!payload.passenger_name) {
    payload.passenger_name = localStorage.getItem('sakay_passenger_name') || 'Maria Santos';
  }
  if (!payload.passenger_phone) {
    payload.passenger_phone = localStorage.getItem('sakay_passenger_phone') || '+639123456789';
  }

  // 2. If validPassengerId is still not a valid UUID, look up first registered passenger in Supabase
  if (!validPassengerId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(validPassengerId)) {
    try {
      const { data: firstP } = await supabase
        .from('passenger')
        .select('passenger_id, full_name, contact_number')
        .limit(1)
        .maybeSingle();
      if (firstP?.passenger_id) {
        validPassengerId = firstP.passenger_id;
      }
    } catch (e) {
      // ignore
    }
  }

  const insertPayload: any = {
    pickup_address: payload.pickup_address,
    pickup_latitude: payload.pickup_latitude,
    pickup_longitude: payload.pickup_longitude,
    dropoff_address: payload.dropoff_address,
    dropoff_latitude: payload.dropoff_latitude,
    dropoff_longitude: payload.dropoff_longitude,
    estimated_distance_km: payload.estimated_distance_km,
    estimated_fare: payload.estimated_fare,
    actual_fare: payload.estimated_fare,
    is_shared_trip: Boolean(payload.is_shared_trip),
    passenger_count: Math.min(
      Math.max(Number(payload.passenger_count) || 1, 1),
      payload.is_shared_trip ? 3 : 4
    ),
    booking_type: payload.booking_type || 'Immediate',
    booking_status: 'Pending',
    fare_confirmation_status: 'Matched',
    created_at: now,
  };

  if (validPassengerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(validPassengerId)) {
    insertPayload.passenger_id = validPassengerId;
  }

  // 3. Attempt database insertion into public.booking
  const { data: dbData, error } = await supabase
    .from('booking')
    .insert([insertPayload])
    .select()
    .single();

  isCreatingBooking = false;

  if (error || !dbData) {
    console.error('[bookingService] Supabase insert error:', error?.message);
    const msg = error?.message || '';

    // One-open-booking policy: passenger already has an active booking
    if (
      msg.includes('idx_one_open_booking') ||
      msg.includes('duplicate key value violates unique constraint')
    ) {
      throw new Error(
        'Mayroon ka nang aktibong booking. Kanselahin muna ang iyong kasalukuyang booking bago gumawa ng bago.\n\n' +
        '(You already have an active booking. Please cancel it before creating a new one.)'
      );
    }

    if (msg.includes('ERR_OUT_OF_SERVICE_AREA')) {
      throw new Error(
        'Nasa labas ng opisyal na service area ng Calapan City ang napiling pickup location. Mangyaring pumili ng lokasyon sa loob ng lungsod.'
      );
    }

    throw new Error(error?.message || 'Failed to create booking');
  }

  const generatedId = dbData.booking_id;
  const newBooking: BookingRecord = {
    booking_id: generatedId,
    passenger_id: validPassengerId || payload.passenger_id || 'PSG-DEMO-001',
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
    booking_status: 'Pending',
    created_at: dbData.created_at || now,
    updated_at: dbData.created_at || now,
  };

  const store = loadBookings();
  store[generatedId] = newBooking;
  saveBookings(store);

  // Set as current active trip
  sessionStorage.setItem('current_active_booking_id', generatedId);

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
  const store = loadBookings();
  if (store[bookingId]) {
    store[bookingId] = {
      ...store[bookingId],
      booking_status: 'Cancelled',
      updated_at: new Date().toISOString(),
    };
    saveBookings(store);
    notifyBookingListeners(store[bookingId]);
    persistToHistoryIfTerminal(store[bookingId]);

    // Update in Supabase
    try {
      await supabase
        .from('booking')
        .update({
          booking_status: 'Cancelled',
          cancellation_reason: reason || 'Cancelled by user',
          cancelled_by: 'passenger',
        })
        .eq('booking_id', bookingId);
    } catch (err) {
      console.warn('[bookingService] cancelBooking DB sync note:', err);
    }

    return true;
  }
  return false;
};

/**
 * Subscribes to live booking updates
 */
export const subscribeToBooking = (
  bookingId: string,
  callback: (booking: BookingRecord) => void
): (() => void) => {
  if (!listeners.has(bookingId)) {
    listeners.set(bookingId, new Set());
  }
  listeners.get(bookingId)!.add(callback);

  // Fire immediately with current state
  const current = getBooking(bookingId);
  if (current) {
    callback(current);
  }

  return () => {
    const set = listeners.get(bookingId);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        listeners.delete(bookingId);
      }
    }
  };
};

/**
 * Updates a booking's status/fields
 */
export const updateBooking = (
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
    persistToHistoryIfTerminal(updated);
    return updated;
  }
  return null;
};

export const updateBookingState = updateBooking;
