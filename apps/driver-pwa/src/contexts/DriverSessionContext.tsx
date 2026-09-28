import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import type { BookingRecord } from '@sakay/shared';
import type { DriverProfile } from '../mockData/driverMockData';

interface DriverSessionContextType {
  profile: DriverProfile;
  setProfile: React.Dispatch<React.SetStateAction<DriverProfile>>;
  incomingRequest: BookingRecord | null;
  setIncomingRequest: React.Dispatch<React.SetStateAction<BookingRecord | null>>;
  currentAttemptId: string | null;
  setCurrentAttemptId: React.Dispatch<React.SetStateAction<string | null>>;
  countdown: number;
  setCountdown: React.Dispatch<React.SetStateAction<number>>;
  declinedBookings: Set<string>;
  setDeclinedBookings: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleDeclineRequest: () => void;
  playIncomingAlert: () => void;
}

const DriverSessionContext = createContext<DriverSessionContextType | undefined>(undefined);

export const DriverSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<DriverProfile>(() => {
    const saved = localStorage.getItem('sakay_driver_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          id: parsed.id || '',
          name: parsed.name || '',
          phone: parsed.phone || '',
          email: parsed.email || '',
          licenseNo: parsed.licenseNumber || parsed.licenseNo || '',
          licenseExpiry: parsed.licenseExpiry || '',
          avatarUrl: '',
          rating: typeof parsed.rating === 'number' ? parsed.rating : 5.0,
          totalTrips: typeof parsed.totalTrips === 'number' ? parsed.totalTrips : 0,
          accountStatus: parsed.accountStatus || 'Verified',
          selectedTodaId: parsed.selectedTodaId || '',
          selectedTodaIds: parsed.selectedTodaIds || (parsed.selectedTodaId ? [parsed.selectedTodaId] : []),
          selectedVehicleId: parsed.selectedVehicleId || '',
          vehiclePlate: parsed.vehiclePlate || '',
          franchiseNumber: parsed.franchiseNumber || '',
          todaName: parsed.todaName || '',
          isOnline: parsed.isOnline || false, // Persist isOnline
          isPaused: parsed.isPaused || false,
          currentLat: typeof parsed.currentLat === 'number' ? parsed.currentLat : 13.4117,
          currentLng: typeof parsed.currentLng === 'number' ? parsed.currentLng : 121.1803,
        };
      } catch (e) {
        console.warn('Error parsing driver profile from storage:', e);
      }
    }
    return {
      id: '', name: '', phone: '', email: '', licenseNo: '', licenseExpiry: '', avatarUrl: '',
      rating: 5.0, totalTrips: 0, accountStatus: 'Verified', selectedTodaId: '', selectedTodaIds: [], selectedVehicleId: '',
      vehiclePlate: '', franchiseNumber: '', todaName: '', isOnline: false, isPaused: false,
      currentLat: 13.4117, currentLng: 121.1803,
    };
  });

  const [incomingRequest, setIncomingRequest] = useState<BookingRecord | null>(null);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(15);
  const [declinedBookings, setDeclinedBookings] = useState<Set<string>>(new Set());

  // Save profile changes (like goes online/offline)
  useEffect(() => {
    localStorage.setItem('sakay_driver_profile', JSON.stringify(profile));
  }, [profile]);

  // GPS Tracking (App-Level)
  useEffect(() => {
    if (!navigator.geolocation) return;
    const storedPerm = localStorage.getItem('sakay_driver_location_permission');
    if (storedPerm === 'denied') return;

    const updateLocation = (pos: GeolocationPosition) => {
      setProfile((prev) => ({
        ...prev,
        currentLat: pos.coords.latitude,
        currentLng: pos.coords.longitude,
      }));
    };

    navigator.geolocation.getCurrentPosition(
      updateLocation,
      (err) => console.warn('[DriverSessionProvider] Geolocation initial fix note:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    );

    const watchId = navigator.geolocation.watchPosition(
      updateLocation,
      (err) => console.warn('[DriverSessionProvider] Geolocation live watch note:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const playIncomingAlert = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch {}
  };

  const handleDeclineRequest = async () => {
    if (!incomingRequest) return;
    setDeclinedBookings((prev) => {
      const updated = new Set(prev);
      updated.add(incomingRequest.booking_id);
      return updated;
    });

    if (currentAttemptId) {
      try {
        await supabase.from('dispatch_attempt').update({ response_status: 'Declined' }).eq('attempt_id', currentAttemptId);
      } catch (err) {
        console.warn('Failed to decline attempt:', err);
      }
    }

    setIncomingRequest(null);
    setCurrentAttemptId(null);
  };

  // Countdown Timer
  useEffect(() => {
    if (!incomingRequest) return;
    if (countdown <= 0) {
      handleDeclineRequest();
      return;
    }
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [incomingRequest, countdown]);

  // Realtime Dispatch Listener
  useEffect(() => {
    if (!profile.isOnline || profile.isPaused) {
      if (incomingRequest) {
        setIncomingRequest(null);
        setCurrentAttemptId(null);
      }
      return;
    }

    const fetchPendingAttempt = async () => {
      const { data: attempt, error: attemptError } = await supabase
        .from('dispatch_attempt')
        .select('*')
        .eq('driver_id', profile.id)
        .eq('response_status', 'Pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!attemptError && attempt && !incomingRequest && !declinedBookings.has(attempt.booking_id)) {
        // Fetch booking details
        const { data: data } = await supabase
          .from('booking')
          .select('*, passenger:passenger_id(*)')
          .eq('booking_id', attempt.booking_id)
          .single();

        if (data) {
          const p = Array.isArray(data.passenger) ? data.passenger[0] : data.passenger;
          const mapped: BookingRecord = {
            booking_id: data.booking_id,
            passenger_id: data.passenger_id || 'passenger-demo',
            passenger_name: data.passenger_name || p?.full_name || 'Passenger',
            passenger_phone: p?.contact_number || data.passenger_phone || '+63 917 123 4567',
            booking_type: data.booking_type || 'Immediate',
            is_shared_trip: Boolean(data.is_shared_trip),
            passenger_count: data.passenger_count || 1,
            pickup_address: data.pickup_address,
            pickup_latitude: data.pickup_latitude,
            pickup_longitude: data.pickup_longitude,
            dropoff_address: data.dropoff_address,
            dropoff_latitude: data.dropoff_latitude,
            dropoff_longitude: data.dropoff_longitude,
            estimated_distance_km: data.estimated_distance_km || 1,
            estimated_fare: data.estimated_fare || 20,
            booking_status: 'Pending',
            created_at: data.created_at,
            updated_at: data.created_at,
          };
          
          setCurrentAttemptId(attempt.attempt_id);
          setIncomingRequest(mapped);
          setCountdown(15);
          playIncomingAlert();
        }
      }
    };

    fetchPendingAttempt();
    const interval = setInterval(fetchPendingAttempt, 5000);

    const channel = supabase
      .channel('public:dispatch_attempt')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dispatch_attempt', filter: `driver_id=eq.${profile.id}` },
        (payload) => {
          fetchPendingAttempt();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [profile.isOnline, profile.isPaused, incomingRequest, declinedBookings, profile.id]);

  return (
    <DriverSessionContext.Provider
      value={{
        profile,
        setProfile,
        incomingRequest,
        setIncomingRequest,
        currentAttemptId,
        setCurrentAttemptId,
        countdown,
        setCountdown,
        declinedBookings,
        setDeclinedBookings,
        handleDeclineRequest,
        playIncomingAlert
      }}
    >
      {children}
    </DriverSessionContext.Provider>
  );
};

export const useDriverSession = () => {
  const context = useContext(DriverSessionContext);
  if (!context) {
    throw new Error('useDriverSession must be used within a DriverSessionProvider');
  }
  return context;
};
