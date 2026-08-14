/**
 * SAKAY Trip & Booking Service
 * Clean service layer isolating trip history & booking queries
 */

import { supabase } from "./supabaseClient";

export interface HistoryTrip {
  id: string;
  pickup: string;
  pickupLat: number;
  pickupLng: number;
  dropoff: string;
  dropoffLat: number;
  dropoffLng: number;
  price: string;
  type: "Solo" | "Share";
  time: string;
  dateGroup: "NGAYONG ARAW" | "NAKARAANG ARAW";
  driverName?: string;
  bodyNumber?: string;
  dateString?: string;
  isLiveRecord: boolean;
}

// UI Demo reference data matching PASSENGER HISTORY.png
export const DEMO_HISTORY_TRIPS: HistoryTrip[] = [
  {
    id: "TRIP-2026-0813-01",
    pickup: "Calapan Port",
    pickupLat: 13.4248,
    pickupLng: 121.1812,
    dropoff: "Xentro Mall Calapan",
    dropoffLat: 13.4130,
    dropoffLng: 121.1790,
    price: "₱66.40",
    type: "Solo",
    time: "2:30 PM",
    dateGroup: "NGAYONG ARAW",
    driverName: "Juan Dela Cruz",
    bodyNumber: "TODA-104",
    dateString: "August 13, 2026",
    isLiveRecord: false,
  },
  {
    id: "TRIP-2026-0813-02",
    pickup: "Calapan City Hall",
    pickupLat: 13.3980,
    pickupLng: 121.1824,
    dropoff: "Filipiniana Hotel Calapan",
    dropoffLat: 13.4100,
    dropoffLng: 121.1780,
    price: "₱64.40",
    type: "Solo",
    time: "9:15 AM",
    dateGroup: "NGAYONG ARAW",
    driverName: "Pedro Penduko",
    bodyNumber: "TODA-088",
    dateString: "August 13, 2026",
    isLiveRecord: false,
  },
  {
    id: "TRIP-2026-0812-01",
    pickup: "Puregold -Calapan",
    pickupLat: 13.4120,
    pickupLng: 121.1800,
    dropoff: "Santo Niño Cathedral (Dioc...",
    dropoffLat: 13.4128,
    dropoffLng: 121.1830,
    price: "₱20.00",
    type: "Share",
    time: "5:45 PM",
    dateGroup: "NAKARAANG ARAW",
    driverName: "Mario Reyes",
    bodyNumber: "TODA-215",
    dateString: "August 12, 2026",
    isLiveRecord: false,
  },
];

/**
 * Fetches passenger trip history from Supabase database or falls back to structured demo data
 */
export const fetchTripHistory = async (): Promise<HistoryTrip[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return DEMO_HISTORY_TRIPS;

    // Fetch passenger profile
    const { data: profile } = await supabase
      .from("passenger")
      .select("passenger_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!profile) return DEMO_HISTORY_TRIPS;

    // Query real bookings
    const { data: bookings, error } = await supabase
      .from("booking")
      .select(`
        booking_id,
        pickup_address,
        pickup_latitude,
        pickup_longitude,
        dropoff_address,
        dropoff_latitude,
        dropoff_longitude,
        estimated_fare,
        is_shared_trip,
        created_at
      `)
      .eq("passenger_id", profile.passenger_id)
      .order("created_at", { ascending: false });

    if (error || !bookings || bookings.length === 0) {
      return DEMO_HISTORY_TRIPS;
    }

    // Map database bookings to HistoryTrip records
    return bookings.map((b: any) => {
      const createdDate = new Date(b.created_at);
      const isToday = new Date().toDateString() === createdDate.toDateString();

      return {
        id: b.booking_id,
        pickup: b.pickup_address,
        pickupLat: b.pickup_latitude,
        pickupLng: b.pickup_longitude,
        dropoff: b.dropoff_address,
        dropoffLat: b.dropoff_latitude,
        dropoffLng: b.dropoff_longitude,
        price: `₱${parseFloat(b.estimated_fare || 0).toFixed(2)}`,
        type: b.is_shared_trip ? "Share" : "Solo",
        time: createdDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        dateGroup: isToday ? "NGAYONG ARAW" : "NAKARAANG ARAW",
        dateString: createdDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        isLiveRecord: true,
      };
    });
  } catch (err) {
    console.warn("Trip history database fetch fallback:", err);
    return DEMO_HISTORY_TRIPS;
  }
};
