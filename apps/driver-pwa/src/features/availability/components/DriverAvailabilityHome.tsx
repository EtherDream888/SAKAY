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
import {
  INITIAL_DRIVER_PROFILE,
  ACCREDITED_TODAS,
  VERIFIED_TRICYCLES,
  DriverProfile,
} from '../../../mockData/driverMockData';
import {
  subscribeToDispatchEvents,
  acceptBookingByDriver,
  declineBookingByDriver,
  MockDispatchBooking,
} from '@sakay/shared/mockDispatch';

import { supabase } from '../../../services/supabaseClient';

export const DriverAvailabilityHome: React.FC = () => {
  const navigate = useNavigate();

  // Location Permission Modal State (matching iOS permission prompt)
  const [locationPermissionOpen, setLocationPermissionOpen] = useState(() => {
    return !localStorage.getItem('sakay_driver_location_permission');
  });

  // Driver State with resilient defaults
  const [profile, setProfile] = useState<DriverProfile>(() => {
    const saved = localStorage.getItem('sakay_driver_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_DRIVER_PROFILE,
          ...parsed,
          name: parsed.name || INITIAL_DRIVER_PROFILE.name,
          rating: typeof parsed.rating === 'number' ? parsed.rating : INITIAL_DRIVER_PROFILE.rating,
          totalTrips: typeof parsed.totalTrips === 'number' ? parsed.totalTrips : INITIAL_DRIVER_PROFILE.totalTrips,
          currentLat: typeof parsed.currentLat === 'number' ? parsed.currentLat : INITIAL_DRIVER_PROFILE.currentLat,
          currentLng: typeof parsed.currentLng === 'number' ? parsed.currentLng : INITIAL_DRIVER_PROFILE.currentLng,
          selectedTodaId: parsed.selectedTodaId || INITIAL_DRIVER_PROFILE.selectedTodaId,
          selectedVehicleId: parsed.selectedVehicleId || INITIAL_DRIVER_PROFILE.selectedVehicleId,
        };
      } catch (e) {
        console.warn('Error parsing driver profile from storage:', e);
      }
    }
    return INITIAL_DRIVER_PROFILE;
  });

  const [todaModalOpen, setTodaModalOpen] = useState(false);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  // Incoming Booking Request State
  const [incomingRequest, setIncomingRequest] = useState<MockDispatchBooking | null>(null);
  const [countdown, setCountdown] = useState<number>(15);

  // Load live Supabase profile on mount
  useEffect(() => {
    async function loadLiveDriver() {
      try {
        const storedId = localStorage.getItem('sakay_driver_id');
        const storedPhone = localStorage.getItem('sakay_driver_phone');

        // If active session is the verified test driver, keep on map
        if (storedId === 'test-driver-001' || storedPhone === '09171234567' || storedPhone === '09181234567') {
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();

        let query = supabase
          .from('driver')
          .select(`
            driver_id,
            full_name,
            contact_number,
            plate_number,
            license_number,
            franchise_number,
            account_status,
            availability_status,
            weighted_average_rating,
            toda:toda_id (
              toda_id,
              toda_name,
              toda_acronym
            )
          `);

        if (user?.id) {
          query = query.eq('auth_user_id', user.id);
        } else if (storedId) {
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

          const todaObj = Array.isArray(driverData.toda) ? driverData.toda[0] : driverData.toda;
          const todaNameStr = todaObj?.toda_name || 'Calapan Central TODA';
          const todaAcronymStr = todaObj?.toda_acronym || 'CCTODA';

          setProfile((prev) => ({
            ...prev,
            id: driverData.driver_id,
            name: driverData.full_name || prev.name,
            phone: driverData.contact_number || prev.phone,
            vehiclePlate: driverData.plate_number || prev.vehiclePlate,
            licenseNumber: driverData.license_number || prev.licenseNumber,
            franchiseNumber: driverData.franchise_number || prev.franchiseNumber,
            todaName: `${todaNameStr} (${todaAcronymStr})`,
            rating: Number(driverData.weighted_average_rating) || 5.0,
            accountStatus: driverData.account_status,
            verificationStage: 'Stage 2 Approved',
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

  // Subscribe to Shared Dispatch Broker for incoming ride requests
  useEffect(() => {
    const unsubscribe = subscribeToDispatchEvents((booking) => {
      // Only receive if Driver is Online, not paused, and matching TODA
      if (profile.isOnline && !profile.isPaused && booking.booking_status === 'Searching Driver') {
        setIncomingRequest(booking);
        setCountdown(15);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [profile.isOnline, profile.isPaused]);

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

  const selectedToda = ACCREDITED_TODAS.find((t) => t.id === profile.selectedTodaId) || ACCREDITED_TODAS[0];
  const selectedVehicle = VERIFIED_TRICYCLES.find((v) => v.id === profile.selectedVehicleId) || VERIFIED_TRICYCLES[0];

  // Dual-Gate Verification Check (Permits live verified driver or mock fallback)
  const isDriverVerifiedInDb = profile.accountStatus === 'Active' || profile.accountStatus === 'Verified';
  const canGoOnline = isDriverVerifiedInDb || Boolean(
    selectedToda &&
    selectedToda.status === 'Verified' &&
    selectedVehicle &&
    selectedVehicle.status === 'Verified'
  );

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

    acceptBookingByDriver(incomingRequest.booking_id, {
      driver_id: profile.id || 'test-driver-001',
      driver_name: profile.name || 'Juan Dela Cruz',
      driver_phone: profile.phone || '09171234567',
      franchise_no: selectedVehicle?.franchiseNumber || 'CAL-2025-0773',
      vehicle_plate: selectedVehicle?.plateNumber || '773-MV',
      toda_name: selectedToda?.name || 'Calapan Central TODA',
    });

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
    if (saveAlways) {
      localStorage.setItem('sakay_driver_location_permission', 'always');
    } else {
      sessionStorage.setItem('sakay_driver_location_permission', 'once');
    }

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
        (err) => {
          console.warn('[DriverAvailabilityHome] Geolocation note:', err.message);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
    setLocationPermissionOpen(false);
  };

  const handleDenyLocation = () => {
    localStorage.setItem('sakay_driver_location_permission', 'denied');
    setLocationPermissionOpen(false);
  };

  const displayName = profile.name || 'Juan Dela Cruz';
  const firstName = displayName.split(' ')[0] || 'Drayber';
  const initialLetter = firstName.charAt(0) || 'D';
  const ratingNum = typeof profile.rating === 'number' ? profile.rating : 5.0;
  const tripsCount = typeof profile.totalTrips === 'number' ? profile.totalTrips : 124;

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
              ? 'Dispatch Paused'
              : 'Searching for nearby passengers...'
            : 'Offline • Go online to receive trips'
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
              Please select a Verified TODA and Tricycle Unit before going Online.
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
              Active TODA Affiliation
            </Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', mt: '2px' }}>
              {selectedToda ? `${selectedToda.name} (${selectedToda.acronym})` : 'Select TODA...'}
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
              Tricycle Unit in Use
            </Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', mt: '2px' }}>
              {selectedVehicle ? `Plate: ${selectedVehicle.plateNumber} • Franchise: ${selectedVehicle.franchiseNumber}` : 'Select Tricycle Unit...'}
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
            <Chip label={`New Booking Request (${countdown}s)`} color="warning" sx={{ fontWeight: 800, fontSize: '12px' }} />
            <Typography sx={{ fontSize: '19px', fontWeight: 800, color: '#0F172A', mt: 1 }}>
              {incomingRequest.is_shared_trip ? 'Shared Commuter Ride' : 'Solo Charter Ride'}
            </Typography>
            <Typography sx={{ fontSize: '13px', color: '#64748B' }}>
              Passenger: <strong>{incomingRequest.passenger_name}</strong> • {incomingRequest.passenger_count} passenger(s)
            </Typography>
          </DialogTitle>

          <DialogContent sx={{ py: 1 }}>
            <Box sx={{ p: '14px 16px', backgroundColor: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                <LocationOnIcon sx={{ color: '#10B981', fontSize: 20 }} />
                <Box>
                  <Typography sx={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>PICKUP LOCATION</Typography>
                  <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{incomingRequest.pickup_address}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <LocationOnIcon sx={{ color: '#EF4444', fontSize: 20 }} />
                <Box>
                  <Typography sx={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>DESTINATION</Typography>
                  <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{incomingRequest.dropoff_address}</Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1 }}>
              <Box>
                <Typography sx={{ fontSize: '11.5px', color: '#64748B' }}>Estimated Distance</Typography>
                <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>{incomingRequest.estimated_distance_km} km</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: '11.5px', color: '#64748B' }}>Fare</Typography>
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
              Decline
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
              Accept
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* 5. TODA Selection Modal */}
      <Dialog open={todaModalOpen} onClose={() => setTodaModalOpen(false)} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: '20px' } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A' }}>Select Active TODA</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            {ACCREDITED_TODAS.map((toda) => (
              <Box
                key={toda.id}
                onClick={() => {
                  setProfile((prev) => ({ ...prev, selectedTodaId: toda.id }));
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
            ))}
          </Box>
        </DialogContent>
      </Dialog>

      {/* 6. Vehicle Selection Modal */}
      <Dialog open={vehicleModalOpen} onClose={() => setVehicleModalOpen(false)} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: '20px' } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A' }}>Select Tricycle Unit</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            {VERIFIED_TRICYCLES.map((veh) => (
              <Box
                key={veh.id}
                onClick={() => {
                  setProfile((prev) => ({ ...prev, selectedVehicleId: veh.id }));
                  setVehicleModalOpen(false);
                }}
                sx={{
                  p: 2,
                  borderRadius: '14px',
                  border: profile.selectedVehicleId === veh.id ? '2px solid #FF6B00' : '1px solid #E2E8F0',
                  backgroundColor: profile.selectedVehicleId === veh.id ? '#FFF8F0' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  '&:hover': { borderColor: '#FF6B00' },
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: '14.5px', color: '#0F172A' }}>Plate: {veh.plateNumber} • Franchise: {veh.franchiseNumber}</Typography>
                <Typography sx={{ fontSize: '12px', color: '#64748B' }}>{veh.model}</Typography>
              </Box>
            ))}
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
            Payagan ang “SAKAY” na gamitin ang iyong lokasyon?
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
            Ginagamit ang iyong lokasyon para makahanap ng malapit na drayber at masubaybayan ang iyong biyahe sa mapa.
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
          Payagan nang isang beses
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
          Habang Ginagamit ang App
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
          Huwag Payagan
        </Button>
      </Dialog>
    </Box>
  );
};

export default DriverAvailabilityHome;
