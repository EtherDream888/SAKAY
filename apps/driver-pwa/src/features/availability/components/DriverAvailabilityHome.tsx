import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Switch,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Divider,
} from '@mui/material';
import NavigationIcon from '@mui/icons-material/Navigation';
import StarIcon from '@mui/icons-material/Star';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import MyLocationIcon from '@mui/icons-material/MyLocation';

import MapView from '../../../common/components/MapView';
import type { DriverProfile } from '../../../mockData/driverMockData';
import {
  subscribeToDispatchEvents,
  acceptBookingByDriver,
  declineBookingByDriver,
  getAllActiveBookings,
  MockDispatchBooking,
} from '@sakay/shared/mockDispatch';

import { supabase } from '../../../services/supabaseClient';
import { fetchAccreditedTodas } from '../../../services/driverApiService';
import { useLanguage } from '../../../utils/LanguageContext';

export const DriverAvailabilityHome: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  // Location Permission Modal State (matching iOS permission prompt)
  // Shows immediately upon entering interface after login or if not yet granted
  const [locationPermissionOpen, setLocationPermissionOpen] = useState(() => {
    const justLoggedIn = sessionStorage.getItem('sakay_driver_just_logged_in') === 'true';
    const dismissedInSession = sessionStorage.getItem('sakay_driver_location_prompt_dismissed') === 'true';
    if (justLoggedIn) return true;
    if (dismissedInSession) return false;
    return localStorage.getItem('sakay_driver_location_permission') !== 'always';
  });

  const [availableTodas, setAvailableTodas] = useState<Array<{ id: string; name: string; acronym: string; barangay: string; terminalLocation: string }>>([]);

  // Driver State with real database defaults (no mock placeholders)
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
          selectedVehicleId: parsed.selectedVehicleId || '',
          vehiclePlate: parsed.vehiclePlate || '',
          franchiseNumber: parsed.franchiseNumber || '',
          todaName: parsed.todaName || '',
          isOnline: false,
          isPaused: false,
          currentLat: typeof parsed.currentLat === 'number' ? parsed.currentLat : 13.4117,
          currentLng: typeof parsed.currentLng === 'number' ? parsed.currentLng : 121.1803,
        };
      } catch (e) {
        console.warn('Error parsing driver profile from storage:', e);
      }
    }
    return {
      id: '',
      name: '',
      phone: '',
      email: '',
      licenseNo: '',
      licenseExpiry: '',
      avatarUrl: '',
      rating: 5.0,
      totalTrips: 0,
      accountStatus: 'Verified',
      selectedTodaId: '',
      selectedVehicleId: '',
      vehiclePlate: '',
      franchiseNumber: '',
      todaName: '',
      isOnline: false,
      isPaused: false,
      currentLat: 13.4117,
      currentLng: 121.1803,
    };
  });

  const [todaModalOpen, setTodaModalOpen] = useState(false);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  // Incoming Booking Request State
  const [incomingRequest, setIncomingRequest] = useState<MockDispatchBooking | null>(null);
  const [countdown, setCountdown] = useState<number>(15);

  // Load live Supabase profile and accredited TODAs on mount
  useEffect(() => {
    // 1. Fetch live TODAs
    fetchAccreditedTodas().then((todas) => {
      if (todas && todas.length > 0) {
        setAvailableTodas(todas);
      }
    });

    // 2. Fetch live Driver Profile
    async function loadLiveDriver() {
      try {
        const storedId = localStorage.getItem('sakay_driver_id');
        const storedPhone = localStorage.getItem('sakay_driver_phone');

        const { data: { user } } = await supabase.auth.getUser();

        let query = supabase
          .from('driver')
          .select(`
            driver_id,
            full_name,
            contact_number,
            email,
            plate_number,
            license_number,
            franchise_number,
            account_status,
            availability_status,
            weighted_average_rating,
            current_latitude,
            current_longitude,
            toda:toda_id (
              toda_id,
              toda_name,
              toda_acronym
            )
          `);

        if (user?.id) {
          query = query.eq('auth_user_id', user.id);
        } else if (storedId && storedId !== 'test-driver-001') {
          query = query.eq('driver_id', storedId);
        } else if (storedPhone) {
          const clean = storedPhone.replace(/\D/g, '');
          query = query.or(`contact_number.eq.${clean},contact_number.eq.+63${clean.replace(/^0/, '')}`);
        } else {
          return;
        }

        const { data: driverData } = await query.maybeSingle();

        if (driverData) {
          // If driver is not verified yet, bounce back to status monitor
          if (driverData.account_status !== 'Active' && driverData.account_status !== 'Verified') {
            navigate('/driver/status', { replace: true });
            return;
          }

          // Query completed trips count for this driver
          const { count: completedTripsCount } = await supabase
            .from('booking')
            .select('*', { count: 'exact', head: true })
            .eq('driver_id', driverData.driver_id)
            .eq('booking_status', 'Completed');

          // Check verification record if plate/license/franchise are null in driver table
          let plateNumber = driverData.plate_number;
          let licenseNumber = driverData.license_number;
          let franchiseNumber = driverData.franchise_number;

          if (!plateNumber || !licenseNumber || !franchiseNumber) {
            const { data: verif } = await supabase
              .from('driver_verification')
              .select('submitted_plate_number, submitted_license_number, submitted_franchise_number, ocr_plate_number, ocr_license_number, ocr_franchise_number')
              .eq('driver_id', driverData.driver_id)
              .maybeSingle();

            if (verif) {
              plateNumber = plateNumber || verif.submitted_plate_number || verif.ocr_plate_number || '';
              licenseNumber = licenseNumber || verif.submitted_license_number || verif.ocr_license_number || '';
              franchiseNumber = franchiseNumber || verif.submitted_franchise_number || verif.ocr_franchise_number || '';
            }
          }

          const todaObj = Array.isArray(driverData.toda) ? driverData.toda[0] : driverData.toda;
          const todaNameStr = todaObj ? `${todaObj.toda_name} (${todaObj.toda_acronym})` : '';

          setProfile((prev) => ({
            ...prev,
            id: driverData.driver_id,
            name: driverData.full_name || prev.name,
            phone: driverData.contact_number || prev.phone,
            email: driverData.email || prev.email,
            vehiclePlate: plateNumber || prev.vehiclePlate,
            licenseNumber: licenseNumber || prev.licenseNumber,
            franchiseNumber: franchiseNumber || prev.franchiseNumber,
            todaName: todaNameStr || prev.todaName,
            selectedTodaId: todaObj?.toda_id || prev.selectedTodaId,
            rating: Number(driverData.weighted_average_rating) || 5.0,
            totalTrips: completedTripsCount || 0,
            accountStatus: driverData.account_status,
            verificationStage: 'Stage 2 Approved',
            currentLat: driverData.current_latitude ? Number(driverData.current_latitude) : prev.currentLat,
            currentLng: driverData.current_longitude ? Number(driverData.current_longitude) : prev.currentLng,
          }));
        }
      } catch (err) {
        console.warn('[DriverAvailabilityHome] Live profile sync note:', err);
      }
    }

    loadLiveDriver();
  }, [navigate]);

  // Real-time High-Accuracy GPS Tracking (matches Passenger live map precision)
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

    // 1. Immediate position fix
    navigator.geolocation.getCurrentPosition(
      updateLocation,
      (err) => console.warn('[DriverAvailabilityHome] Geolocation initial fix note:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    );

    // 2. Real-time watchPosition for accurate live movement
    const watchId = navigator.geolocation.watchPosition(
      updateLocation,
      (err) => console.warn('[DriverAvailabilityHome] Geolocation live watch note:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('sakay_driver_profile', JSON.stringify(profile));
  }, [profile]);

  // Synthesized Web Audio alert chime for incoming booking dispatch
  const playIncomingAlert = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
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
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Subscribe to Shared Dispatch Broker for incoming ride requests
  useEffect(() => {
    const unsubscribe = subscribeToDispatchEvents((booking) => {
      // Only receive if Driver is Online, not paused
      if (profile.isOnline && !profile.isPaused && booking.booking_status === 'Searching Driver') {
        setIncomingRequest(booking);
        setCountdown(15);
        playIncomingAlert();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [profile.isOnline, profile.isPaused]);

  // Immediate check for waiting pending bookings upon toggling online or unpausing
  useEffect(() => {
    if (!profile.isOnline || profile.isPaused || incomingRequest) return;

    const fifteenMinsAgoMs = Date.now() - 15 * 60000;

    // 1. Check local broker cache
    const activeWaiting = getAllActiveBookings().find((b) => {
      if (b.booking_status !== 'Searching Driver') return false;
      // Ignore stale local bookings
      const createdTime = new Date(b.created_at || Date.now()).getTime();
      return createdTime >= fifteenMinsAgoMs;
    });

    if (activeWaiting) {
      setIncomingRequest(activeWaiting);
      setCountdown(15);
      playIncomingAlert();
      return;
    }

    // 2. Query Supabase for waiting pending bookings across devices
    const fifteenMinsAgoStr = new Date(fifteenMinsAgoMs).toISOString();

    Promise.resolve(
      supabase
        .from('booking')
        .select('*')
        .eq('booking_status', 'Pending')
        .gte('created_at', fifteenMinsAgoStr)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    )
      .then(({ data }: any) => {
        if (data && profile.isOnline && !profile.isPaused && !incomingRequest) {
          const mapped: MockDispatchBooking = {
            booking_id: data.booking_id,
            passenger_id: data.passenger_id || 'passenger-demo',
            passenger_name: 'Calapan Commuter',
            passenger_phone: '+63 917 123 4567',
            booking_type: data.booking_type || 'Immediate',
            is_shared_trip: Boolean(data.is_shared_trip),
            passenger_count: data.passenger_count || 1,
            pickup_address: data.pickup_address,
            pickup_latitude: data.pickup_latitude,
            pickup_longitude: data.pickup_longitude,
            dropoff_address: data.dropoff_address,
            dropoff_latitude: data.dropoff_latitude,
            dropoff_longitude: data.dropoff_longitude,
            estimated_distance_km: data.estimated_distance_km || 1.5,
            estimated_fare: Number(data.estimated_fare) || 18,
            booking_status: 'Searching Driver',
            created_at: data.created_at,
            updated_at: data.created_at,
          };
          setIncomingRequest(mapped);
          setCountdown(15);
          playIncomingAlert();
        }
      })
      .catch((err: any) => console.warn('[DriverAvailabilityHome] Pending booking query note:', err));
  }, [profile.isOnline, profile.isPaused, incomingRequest]);

  // Request Countdown Timer
  useEffect(() => {
    if (!incomingRequest) return;

    if (countdown <= 0) {
      handleDeclineRequest();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [incomingRequest, countdown]);

  const selectedToda = availableTodas.find((t) => t.id === profile.selectedTodaId) || (profile.todaName ? {
    id: profile.selectedTodaId,
    name: profile.todaName,
    acronym: '',
    terminalLocation: '',
  } : null);

  const selectedVehicle = {
    id: profile.selectedVehicleId || profile.id || 'veh-primary',
    plateNumber: profile.vehiclePlate || 'N/A',
    franchiseNumber: profile.franchiseNumber || 'N/A',
    model: 'Registered Tricycle Unit',
  };

  // Dual-Gate Verification Check (Permits live verified driver)
  const isDriverVerifiedInDb = profile.accountStatus === 'Active' || profile.accountStatus === 'Verified';
  const canGoOnline = isDriverVerifiedInDb;

  const handleToggleOnline = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canGoOnline) return;
    setProfile((prev) => ({ ...prev, isOnline: e.target.checked, isPaused: false }));
  };

  const handleTogglePause = () => {
    setProfile((prev) => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const handleRecenter = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setProfile((prev) => ({
            ...prev,
            currentLat: pos.coords.latitude,
            currentLng: pos.coords.longitude,
          }));
          setRecenterTrigger((prev) => prev + 1);
        },
        () => {
          setRecenterTrigger((prev) => prev + 1);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setRecenterTrigger((prev) => prev + 1);
    }
  };

  const handleAcceptRequest = () => {
    if (!incomingRequest) return;

    const driverPayload = {
      driver_id: profile.id || 'test-driver-001',
      driver_name: profile.name || 'Drayber',
      driver_phone: profile.phone || '',
      franchise_no: profile.franchiseNumber || selectedVehicle?.franchiseNumber || 'MTOP-PENDING',
      vehicle_plate: profile.vehiclePlate || selectedVehicle?.plateNumber || 'N/A',
      toda_name: profile.todaName || selectedToda?.name || 'TODA',
    };

    acceptBookingByDriver(incomingRequest.booking_id, driverPayload);

    // Explicit Supabase update
    Promise.resolve(
      supabase
        .from('booking')
        .update({
          booking_status: 'Driver Assigned',
          accepted_at: new Date().toISOString(),
          ...(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(driverPayload.driver_id)
            ? { driver_id: driverPayload.driver_id }
            : {}),
        })
        .eq('booking_id', incomingRequest.booking_id)
    )
      .then(({ error }: any) => {
        if (error) console.warn('[DriverAvailabilityHome] acceptBooking DB sync warning:', error.message);
      })
      .catch((err: any) => console.warn('[DriverAvailabilityHome] acceptBooking DB sync exception:', err));

    const activeId = incomingRequest.booking_id;
    setIncomingRequest(null);

    // Route to Active Navigation to Pickup
    navigate('/driver/navigation', { state: { bookingId: activeId, stage: 'pickup' } });
  };

  const handleDeclineRequest = () => {
    if (!incomingRequest) return;

    declineBookingByDriver(incomingRequest.booking_id, profile.id || 'test-driver-001', 'Driver unavailable / queue rotation timeout');
    setIncomingRequest(null);
  };

  const handleAllowLocation = (saveAlways: boolean) => {
    sessionStorage.setItem('sakay_driver_just_logged_in', 'false');
    sessionStorage.setItem('sakay_driver_location_prompt_dismissed', 'true');
    if (saveAlways) {
      localStorage.setItem('sakay_driver_location_permission', 'always');
    } else {
      sessionStorage.setItem('sakay_driver_location_permission', 'once');
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setProfile((prev) => ({
            ...prev,
            currentLat: latitude,
            currentLng: longitude,
          }));
          setRecenterTrigger((prev) => prev + 1);

          // Update driver's coordinates in Supabase database so live map and features have real GPS
          const activeDriverId = localStorage.getItem('sakay_driver_id');
          if (activeDriverId) {
            supabase
              .from('driver')
              .update({
                current_latitude: latitude,
                current_longitude: longitude,
                last_location_update: new Date().toISOString(),
              })
              .eq('driver_id', activeDriverId)
              .then(() => {});
          }
        },
        (err) => {
          console.warn('[DriverAvailabilityHome] Geolocation note:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
      );
    }
    setLocationPermissionOpen(false);
  };

  const handleDenyLocation = () => {
    sessionStorage.setItem('sakay_driver_just_logged_in', 'false');
    sessionStorage.setItem('sakay_driver_location_prompt_dismissed', 'true');
    localStorage.setItem('sakay_driver_location_permission', 'denied');
    setLocationPermissionOpen(false);
  };

  const displayName = profile.name || 'Drayber';
  const firstName = displayName.split(' ')[0] || 'Drayber';
  const initialLetter = firstName.charAt(0) || 'D';
  const ratingNum = typeof profile.rating === 'number' ? profile.rating : 5.0;
  const tripsCount = typeof profile.totalTrips === 'number' ? profile.totalTrips : 0;

  return (
    <Box sx={{ width: '100%', height: '100%', backgroundColor: '#E3ECEF', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* 1. OpenStreetMap Leaflet Map Surface (Clean Light OpenStreetMap matching Passenger) */}
      <MapView
        userLocation={{ lat: profile.currentLat, lng: profile.currentLng }}
        recenterTrigger={recenterTrigger}
      />

      {/* 2. Top Floating Driver Status Header (Clean White Card matching Passenger) */}
      <Paper
        elevation={4}
        sx={{
          position: 'absolute',
          top: 'calc(var(--safe-area-top) + 12px)',
          left: '16px',
          right: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderRadius: '20px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 20,
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              width: 42,
              height: 42,
              backgroundColor: '#FF6B00',
              fontWeight: 800,
              fontSize: '17px',
              border: '2px solid #FFFFFF',
              boxShadow: '0 2px 8px rgba(255, 107, 0, 0.3)',
            }}
          >
            {initialLetter}
          </Avatar>
          <Box>
            <Typography sx={{ color: '#0F172A', fontWeight: 800, fontSize: '14.5px', lineHeight: 1.2 }}>
              {firstName}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: '2px' }}>
              <StarIcon sx={{ fontSize: 13, color: '#FFB800' }} />
              <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                {ratingNum.toFixed(1)}
              </Typography>
              <Typography sx={{ fontSize: '11px', color: '#64748B' }}>
                ({tripsCount} trips)
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Online / Offline Switch Container */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            backgroundColor: profile.isOnline ? '#ECFDF5' : '#F1F5F9',
            padding: '5px 12px',
            borderRadius: '999px',
            border: `1px solid ${profile.isOnline ? '#A7F3D0' : '#E2E8F0'}`,
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: profile.isOnline ? (profile.isPaused ? '#F59E0B' : '#10B981') : '#94A3B8',
            }}
          />
          <Typography
            sx={{
              fontSize: '12px',
              fontWeight: 800,
              color: profile.isOnline ? (profile.isPaused ? '#B45309' : '#047857') : '#64748B',
            }}
          >
            {profile.isOnline ? (profile.isPaused ? 'PAUSED' : 'ONLINE') : 'OFFLINE'}
          </Typography>
          <Switch
            checked={profile.isOnline}
            disabled={!canGoOnline}
            onChange={handleToggleOnline}
            color="success"
            size="small"
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#10B981',
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: '#10B981',
              },
            }}
          />
        </Box>
      </Paper>

      {/* Floating Status Pill over Map */}
      <Chip
        label={
          profile.isOnline
            ? profile.isPaused
              ? (language === 'tl' ? 'Naka-pause ang Dispatch' : 'Dispatch Paused')
              : (language === 'tl' ? 'Naghahanap ng mga pasahero...' : 'Searching for nearby passengers...')
            : (language === 'tl' ? 'Offline • Mag-online para makatanggap ng biyahe' : 'Offline • Go online to receive trips')
        }
        sx={{
          position: 'absolute',
          top: 'calc(var(--safe-area-top) + 82px)',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#FFFFFF',
          color: profile.isOnline ? '#0F172A' : '#64748B',
          fontWeight: 700,
          fontSize: '11.5px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
          border: '1px solid #E2E8F0',
          zIndex: 10,
        }}
      />

      {/* Floating Recenter GPS Button (Right) */}
      <IconButton
        onClick={handleRecenter}
        aria-label="Recenter map"
        sx={{
          position: 'absolute',
          bottom: '220px',
          right: '16px',
          backgroundColor: '#FFFFFF',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)',
          color: '#0F172A',
          zIndex: 10,
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: '#F8FAFC',
            transform: 'scale(1.05)',
          },
        }}
      >
        <MyLocationIcon sx={{ fontSize: 20, color: '#0F172A' }} />
      </IconButton>

      {/* Pause/Resume FAB while online */}
      {profile.isOnline && (
        <IconButton
          onClick={handleTogglePause}
          aria-label="Toggle pause"
          sx={{
            position: 'absolute',
            bottom: '220px',
            left: '16px',
            backgroundColor: '#FFFFFF',
            color: '#0F172A',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            zIndex: 10,
            '&:hover': { backgroundColor: '#F8FAFC' },
          }}
        >
          {profile.isPaused ? <PlayCircleIcon sx={{ color: '#1E8E3E' }} /> : <PauseCircleIcon sx={{ color: '#F59E0B' }} />}
        </IconButton>
      )}

      {/* 3. Availability Selector Controls (Bottom Sheet Card matching Passenger) */}
      <Paper
        elevation={8}
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          padding: '16px 20px 20px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          zIndex: 20,
          borderTop: '1px solid #E2E8F0',
          boxShadow: '0 -6px 24px rgba(0, 0, 0, 0.06)',
        }}
      >
        {/* Drag Handle Indicator */}
        <Box
          sx={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#CBD5E1',
            alignSelf: 'center',
            mb: 0.5,
          }}
        />

        {/* Dual-Gate Warning if incomplete */}
        {!canGoOnline && (
          <Box sx={{ p: '10px 14px', borderRadius: '12px', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '11.5px', color: '#B45309', fontWeight: 700 }}>
              {language === 'tl'
                ? 'Pumili muna ng beripikadong TODA at Tricycle Unit bago mag-Online.'
                : 'Please select a Verified TODA and Tricycle Unit before going Online.'}
            </Typography>
          </Box>
        )}

        {/* Active TODA Selection Button */}
        <Box
          onClick={() => setTodaModalOpen(true)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: '14px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            '&:hover': { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
          }}
        >
          <Box>
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              {language === 'tl' ? 'Kinabibilangang TODA' : 'Active TODA Affiliation'}
            </Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', mt: '2px' }}>
              {selectedToda ? `${selectedToda.name} (${selectedToda.acronym})` : (language === 'tl' ? 'Pumili ng TODA...' : 'Select TODA...')}
            </Typography>
          </Box>
          <ArrowForwardIosIcon sx={{ fontSize: 14, color: '#94A3B8' }} />
        </Box>

        {/* Active Tricycle Unit Selection Button */}
        <Box
          onClick={() => setVehicleModalOpen(true)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: '14px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            '&:hover': { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
          }}
        >
          <Box>
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              {language === 'tl' ? 'Gamit na Tricycle Unit' : 'Tricycle Unit in Use'}
            </Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', mt: '2px' }}>
              {selectedVehicle
                ? `${language === 'tl' ? 'Plaka' : 'Plate'}: ${selectedVehicle.plateNumber} • Franchise: ${selectedVehicle.franchiseNumber}`
                : (language === 'tl' ? 'Pumili ng Tricycle Unit...' : 'Select Tricycle Unit...')}
            </Typography>
          </Box>
          <ArrowForwardIosIcon sx={{ fontSize: 14, color: '#94A3B8' }} />
        </Box>
      </Paper>

      {/* 4. Incoming Booking Request Alert Modal Card */}
      {incomingRequest && (
        <Dialog
          open={Boolean(incomingRequest)}
          maxWidth="xs"
          fullWidth
          slotProps={{
            paper: {
              sx: {
                borderRadius: '24px',
                padding: '8px',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
              },
            },
          }}
        >
          <DialogTitle sx={{ textAlign: 'center', pb: 1, pt: 2 }}>
            <Chip
              label={language === 'tl' ? `Bagong Booking Request (${countdown}s)` : `New Booking Request (${countdown}s)`}
              color="warning"
              sx={{ fontWeight: 800, fontSize: '12px' }}
            />
            <Typography sx={{ fontSize: '19px', fontWeight: 800, color: '#0F172A', mt: 1 }}>
              {incomingRequest.is_shared_trip
                ? (language === 'tl' ? 'Shared Commuter Ride' : 'Shared Commuter Ride')
                : (language === 'tl' ? 'Solo Charter Ride' : 'Solo Charter Ride')}
            </Typography>
            <Typography sx={{ fontSize: '13px', color: '#64748B' }}>
              {language === 'tl' ? 'Pasahero:' : 'Passenger:'} <strong>{incomingRequest.passenger_name}</strong> • {incomingRequest.passenger_count} {language === 'tl' ? 'pasahero' : 'passenger(s)'}
            </Typography>
          </DialogTitle>

          <DialogContent sx={{ py: 1 }}>
            <Box sx={{ p: '14px 16px', backgroundColor: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                <LocationOnIcon sx={{ color: '#10B981', fontSize: 20 }} />
                <Box>
                  <Typography sx={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>
                    {language === 'tl' ? 'LOKASYON NG PICKUP' : 'PICKUP LOCATION'}
                  </Typography>
                  <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{incomingRequest.pickup_address}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <LocationOnIcon sx={{ color: '#EF4444', fontSize: 20 }} />
                <Box>
                  <Typography sx={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>
                    {language === 'tl' ? 'DESTINASYON' : 'DESTINATION'}
                  </Typography>
                  <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{incomingRequest.dropoff_address}</Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1 }}>
              <Box>
                <Typography sx={{ fontSize: '11.5px', color: '#64748B' }}>
                  {language === 'tl' ? 'Tinatayang Distansya' : 'Estimated Distance'}
                </Typography>
                <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>{incomingRequest.estimated_distance_km} km</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: '11.5px', color: '#64748B' }}>
                  {language === 'tl' ? 'Pamasahe' : 'Fare'}
                </Typography>
                <Typography sx={{ fontSize: '24px', fontWeight: 900, color: '#FF6B00' }}>₱{incomingRequest.estimated_fare.toFixed(2)}</Typography>
              </Box>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: '12px 18px 18px', gap: 1.5 }}>
            <Button
              variant="outlined"
              fullWidth
              color="inherit"
              onClick={handleDeclineRequest}
              sx={{ height: 48, borderRadius: '14px', fontWeight: 700, color: '#64748B', textTransform: 'none' }}
            >
              {language === 'tl' ? 'Tanggihan' : 'Decline'}
            </Button>

            <Button
              variant="contained"
              fullWidth
              onClick={handleAcceptRequest}
              sx={{
                height: 48,
                borderRadius: '14px',
                backgroundColor: '#1E8E3E',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '15px',
                textTransform: 'none',
                '&:hover': { backgroundColor: '#137333' },
              }}
            >
              {language === 'tl' ? 'Tanggapin' : 'Accept'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* 5. TODA Selection Modal */}
      <Dialog open={todaModalOpen} onClose={() => setTodaModalOpen(false)} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: '20px' } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A' }}>
          {language === 'tl' ? 'Pumili ng Aktibong TODA' : 'Select Active TODA'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            {availableTodas.length > 0 ? (
              availableTodas.map((toda) => (
                <Box
                  key={toda.id}
                  onClick={() => {
                    setProfile((prev) => ({ ...prev, selectedTodaId: toda.id, todaName: `${toda.name} (${toda.acronym})` }));
                    setTodaModalOpen(false);
                  }}
                  sx={{
                    p: 2,
                    borderRadius: '14px',
                    border: profile.selectedTodaId === toda.id ? '2px solid #FF6B00' : '1px solid #E2E8F0',
                    backgroundColor: profile.selectedTodaId === toda.id ? '#FFF8F0' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    '&:hover': { borderColor: '#FF6B00' },
                  }}
                >
                  <Typography sx={{ fontWeight: 700, fontSize: '14.5px', color: '#0F172A' }}>{toda.name} ({toda.acronym})</Typography>
                  <Typography sx={{ fontSize: '12px', color: '#64748B' }}>Terminal: {toda.terminalLocation}</Typography>
                </Box>
              ))
            ) : (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '13px', color: '#64748B' }}>
                  {language === 'tl' ? 'Walang nahanap na TODA sa database' : 'No TODAs found in database'}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      {/* 6. Vehicle Selection Modal */}
      <Dialog open={vehicleModalOpen} onClose={() => setVehicleModalOpen(false)} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: '20px' } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A' }}>
          {language === 'tl' ? 'Pumili ng Tricycle Unit' : 'Select Tricycle Unit'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            <Box
              onClick={() => setVehicleModalOpen(false)}
              sx={{
                p: 2,
                borderRadius: '14px',
                border: '2px solid #FF6B00',
                backgroundColor: '#FFF8F0',
                cursor: 'pointer',
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: '14.5px', color: '#0F172A' }}>
                {language === 'tl' ? 'Plaka' : 'Plate'}: {profile.vehiclePlate || 'N/A'} • Franchise: {profile.franchiseNumber || 'N/A'}
              </Typography>
              <Typography sx={{ fontSize: '12px', color: '#64748B' }}>
                {language === 'tl' ? 'Rehistradong Tricycle Unit ng Drayber' : "Driver's Registered Tricycle Unit"}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* 7. Location Permission Modal matching media_1788260393583.png */}
      <Dialog
        open={locationPermissionOpen}
        onClose={() => setLocationPermissionOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '28px',
              padding: 0,
              backgroundColor: '#FFFFFF',
              overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
              maxWidth: '320px',
              margin: 'auto',
            },
          },
        }}
      >
        <Box sx={{ p: '24px 20px 18px 20px', textAlign: 'center' }}>
          <Typography
            sx={{
              fontSize: '17px',
              fontWeight: 800,
              color: '#0F172A',
              lineHeight: 1.35,
              mb: '12px',
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            {language === 'tl' ? 'Payagan ang “SAKAY” na gamitin ang iyong lokasyon?' : 'Allow “SAKAY” to use your location?'}
          </Typography>
          <Typography
            sx={{
              fontSize: '13px',
              fontWeight: 400,
              color: '#475569',
              lineHeight: 1.5,
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            {language === 'tl'
              ? 'Ginagamit ang iyong lokasyon para makahanap ng malapit na pasahero at masubaybayan ang iyong biyahe sa mapa.'
              : 'Your location is used to find nearby passengers and track your trip on the map.'}
          </Typography>
        </Box>

        <Divider sx={{ borderColor: '#E2E8F0' }} />

        <Button
          fullWidth
          onClick={() => handleAllowLocation(false)}
          sx={{
            py: '14px',
            color: '#0F172A',
            fontWeight: 600,
            fontSize: '14px',
            textTransform: 'none',
            fontFamily: 'Poppins, sans-serif',
            borderRadius: 0,
            '&:hover': { backgroundColor: '#F8FAFC' },
          }}
        >
          {language === 'tl' ? 'Payagan nang isang beses' : 'Allow Once'}
        </Button>

        <Divider sx={{ borderColor: '#E2E8F0' }} />

        <Button
          fullWidth
          onClick={() => handleAllowLocation(true)}
          sx={{
            py: '14px',
            color: '#FF6B00',
            fontWeight: 700,
            fontSize: '14px',
            textTransform: 'none',
            fontFamily: 'Poppins, sans-serif',
            borderRadius: 0,
            '&:hover': { backgroundColor: '#FFF8F0' },
          }}
        >
          {language === 'tl' ? 'Habang Ginagamit ang App' : 'While Using the App'}
        </Button>

        <Divider sx={{ borderColor: '#E2E8F0' }} />

        <Button
          fullWidth
          onClick={handleDenyLocation}
          sx={{
            py: '14px',
            color: '#64748B',
            fontWeight: 600,
            fontSize: '14px',
            textTransform: 'none',
            fontFamily: 'Poppins, sans-serif',
            borderRadius: 0,
            '&:hover': { backgroundColor: '#F8FAFC' },
          }}
        >
          {language === 'tl' ? 'Huwag Payagan' : "Don't Allow"}
        </Button>
      </Dialog>
    </Box>
  );
};

export default DriverAvailabilityHome;
