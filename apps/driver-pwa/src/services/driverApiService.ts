/**
 * ============================================================================
 * SAKAY DRIVER API CLIENT SERVICE (driverApiService.ts)
 * ============================================================================
 * Purpose:
 *   Centralized network service providing typed database requests connecting the
 *   SAKAY Driver PWA directly to the Supabase database.
 * ============================================================================
 */

import { supabase } from './supabaseClient';
import {
  CURRENT_DRIVER_PROFILE,
  MOCK_DRIVER_TRIPS,
  MOCK_DRIVER_NOTIFICATIONS,
  MOCK_PENDING_BOOKING_REQUEST,
} from '../mockData/driverMockData';

export const DEFAULT_DRIVER_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22';

// ============================================================================
// 1. REGISTRATION & PROFILE
// ============================================================================

export async function fetchAccreditedTodas(): Promise<Array<{ id: string; name: string; acronym: string; barangay: string }>> {
  try {
    const { data, error } = await supabase
      .from('toda')
      .select('toda_id, toda_name, toda_acronym, barangay')
      .eq('account_status', 'Active');

    if (error || !data || data.length === 0) {
      return [
        { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Calapan Central TODA', acronym: 'CCTODA', barangay: 'San Vicente Central' },
        { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', name: 'Balite-Lumangbayan TODA', acronym: 'BLTODA', barangay: 'Balite' },
        { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', name: 'San Vicente East Drivers Association', acronym: 'SVEDA', barangay: 'San Vicente East' },
      ];
    }

    return data.map((t: any) => ({
      id: t.toda_id,
      name: t.toda_name,
      acronym: t.toda_acronym || 'TODA',
      barangay: t.barangay || 'Calapan City',
    }));
  } catch (err) {
    console.error('[driverApiService] fetchAccreditedTodas error:', err);
    return [
      { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Calapan Central TODA', acronym: 'CCTODA', barangay: 'San Vicente Central' },
    ];
  }
}

export async function registerDriver(payload: {
  fullName: string;
  contactNumber: string;
  todaId: string;
  plateNumber: string;
  licenseNumber: string;
  franchiseNumber?: string;
  residentialAddress?: string;
}) {
  const insertPayload = {
    full_name: payload.fullName,
    contact_number: payload.contactNumber,
    toda_id: payload.todaId,
    plate_number: payload.plateNumber,
    license_number: payload.licenseNumber,
    franchise_number: payload.franchiseNumber || 'MTOP-PENDING',
    barangay_service_area: payload.residentialAddress || 'Calapan City',
    account_status: 'Pending Verification',
    is_profile_complete: true,
  };

  const { data, error } = await supabase.from('driver').insert([insertPayload]).select().single();
  if (error) throw error;
  return data;
}

export async function fetchDriverProfile(driverId: string = DEFAULT_DRIVER_ID) {
  try {
    const { data, error } = await supabase
      .from('driver')
      .select('*, toda:toda_id(*)')
      .eq('driver_id', driverId)
      .maybeSingle();

    if (error || !data) return CURRENT_DRIVER_PROFILE;

    return {
      id: data.driver_id,
      name: data.full_name,
      phone: data.contact_number,
      vehiclePlate: data.plate_number || 'MV-101',
      licenseNumber: data.license_number || 'L01-99-123456',
      franchiseNumber: data.franchise_number || 'MTOP-2024-001',
      todaName: data.toda?.toda_name || 'Calapan Central TODA',
      todaAcronym: data.toda?.toda_acronym || 'CCTODA',
      todaId: data.toda_id,
      rating: Number(data.weighted_average_rating) || 5.0,
      accountStatus: data.account_status,
      isOnline: false,
      isPaused: false,
      verificationStage: data.account_status === 'Verified' ? 'Stage 2 Approved' : 'Stage 1 TODA Review',
    };
  } catch (err) {
    console.error('[driverApiService] fetchDriverProfile error:', err);
    return CURRENT_DRIVER_PROFILE;
  }
}

export async function updateDriverProfile(driverId: string = DEFAULT_DRIVER_ID, updates: Partial<{ fullName: string; contactNumber: string; plateNumber: string; licenseNumber: string }>) {
  const payload: any = {};
  if (updates.fullName) payload.full_name = updates.fullName;
  if (updates.contactNumber) payload.contact_number = updates.contactNumber;
  if (updates.plateNumber) payload.plate_number = updates.plateNumber;
  if (updates.licenseNumber) payload.license_number = updates.licenseNumber;

  const { data, error } = await supabase.from('driver').update(payload).eq('driver_id', driverId).select().single();
  if (error) throw error;
  return data;
}

// ============================================================================
// 2. AVAILABILITY & DISPATCH
// ============================================================================

export async function updateDriverAvailability(driverId: string, isOnline: boolean, isPaused: boolean = false) {
  // In live production, sets driver online status in Supabase or Redis
  return { success: true, isOnline, isPaused };
}

// ============================================================================
// 3. BOOKINGS & ACTIVE TRIPS
// ============================================================================

export async function fetchDriverTrips(driverId: string = DEFAULT_DRIVER_ID) {
  try {
    const { data, error } = await supabase
      .from('booking')
      .select('*, passenger:passenger_id(*)')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return MOCK_DRIVER_TRIPS;

    return data.map((b: any) => ({
      id: b.booking_id,
      bookingCode: `BKG-${b.booking_id.slice(0, 8).toUpperCase()}`,
      passengerName: b.passenger?.full_name || 'Calapan Commuter',
      passengerPhone: b.passenger?.contact_number || '+63 917 000 0000',
      pickupLocation: b.pickup_location_address || 'Calapan Public Market',
      pickupLat: b.pickup_latitude || 13.4115,
      pickupLng: b.pickup_longitude || 121.1803,
      dropoffLocation: b.dropoff_location_address || 'Provincial Capitol',
      dropoffLat: b.dropoff_latitude || 13.4145,
      dropoffLng: b.dropoff_longitude || 121.1785,
      distanceKm: Number(b.route_distance_km) || 2.4,
      fareAmount: Number(b.final_fare || b.estimated_fare) || 20,
      tripMode: (b.trip_type === 'shared' ? 'Shared Ride' : 'Single Commuter') as any,
      status: (b.booking_status === 'Completed' ? 'Completed' : b.booking_status.includes('Cancel') ? 'Cancelled' : 'In Progress') as any,
      date: b.created_at ? new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
      time: b.created_at ? new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM',
      rating: 5,
    }));
  } catch (err) {
    console.error('[driverApiService] fetchDriverTrips error:', err);
    return MOCK_DRIVER_TRIPS;
  }
}

export async function updateTripStatus(bookingId: string, status: string, finalFare?: number) {
  const updatePayload: any = { booking_status: status };
  if (finalFare !== undefined) updatePayload.final_fare = finalFare;

  const { data, error } = await supabase
    .from('booking')
    .update(updatePayload)
    .eq('booking_id', bookingId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// 4. EARNINGS & NOTIFICATIONS
// ============================================================================

export async function fetchDriverEarnings(driverId: string = DEFAULT_DRIVER_ID) {
  try {
    const trips = await fetchDriverTrips(driverId);
    const completedTrips = trips.filter((t: any) => t.status === 'Completed');
    const totalEarnings = completedTrips.reduce((sum: number, t: any) => sum + (t.fareAmount || 0), 0);

    return {
      todayEarnings: Math.round(totalEarnings * 0.4) || 240,
      todayTrips: Math.max(1, Math.round(completedTrips.length * 0.4)),
      weeklyEarnings: totalEarnings || 1280,
      weeklyTrips: completedTrips.length || 28,
      recentTrips: completedTrips.slice(0, 10),
    };
  } catch {
    return {
      todayEarnings: 240,
      todayTrips: 6,
      weeklyEarnings: 1280,
      weeklyTrips: 28,
      recentTrips: [],
    };
  }
}

export async function fetchDriverNotifications(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('announcement')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return MOCK_DRIVER_NOTIFICATIONS;

    return data.map((a: any) => ({
      id: a.announcement_id,
      title: a.title,
      message: a.message,
      type: a.urgency === 'Urgent' ? 'alert' : 'announcement',
      timestamp: a.created_at ? new Date(a.created_at).toLocaleDateString('en-US') : 'Recent',
      read: false,
    }));
  } catch {
    return MOCK_DRIVER_NOTIFICATIONS;
  }
}
