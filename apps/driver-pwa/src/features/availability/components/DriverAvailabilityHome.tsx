import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Radio,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import MapView from '../../../common/components/MapView';
import SakayToast from '../../../common/components/SakayToast';
import { supabase } from '../../../services/supabaseClient';
import { fetchAccreditedTodas } from '../../../services/driverApiService';
import { getCurrentDevicePosition, getCachedDevicePosition } from '@sakay/shared';
import { useLanguage } from '../../../utils/LanguageContext';
import { useDriverSession } from '../../../contexts/DriverSessionContext';

export const DriverAvailabilityHome: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, setProfile } = useDriverSession();

  const [toastOpen, setToastOpen] = useState(false);
  const [earnedAmount, setEarnedAmount] = useState<number | null>(null);
  const [searchingPillVisible, setSearchingPillVisible] = useState(() => !location.state?.showEarningsAnimation);

  useEffect(() => {
    if (location.state?.showEarningsAnimation) {
      setEarnedAmount(location.state.completedFare || 35.0);
      setToastOpen(true);
      setSearchingPillVisible(false);
    }
  }, [location.state]);

  const handleToastClose = () => {
    setToastOpen(false);
    setTimeout(() => {
      setSearchingPillVisible(true);
    }, 150);
  };



  // Location Permission Modal State (matching iOS permission prompt)
  // Only opens on the very first instance if never prompted before and not already granted
  const [locationPermissionOpen, setLocationPermissionOpen] = useState(() => {
    const prompted = localStorage.getItem('sakay_driver_location_prompted') === 'true';
    const perm = localStorage.getItem('sakay_driver_location_permission');
    if (prompted || perm === 'always' || perm === 'once') return false;
    return true;
  });

  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string>('');
  const [availableTodas, setAvailableTodas] = useState<Array<{ id: string; name: string; acronym: string; barangay: string; terminalLocation: string }>>([]);
  const [todaModalOpen, setTodaModalOpen] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  // Check if browser native permission is already granted; if so, never prompt and record
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          localStorage.setItem('sakay_driver_location_prompted', 'true');
          localStorage.setItem('sakay_driver_location_permission', 'always');
          setLocationPermissionOpen(false);
        }
      }).catch(() => {});
    }
  }, []);

  // Attempt to get actual driver device position on mount ONLY if permission was already granted
  useEffect(() => {
    const perm = localStorage.getItem('sakay_driver_location_permission');
    const prompted = localStorage.getItem('sakay_driver_location_prompted') === 'true';
    if (perm !== 'always' && perm !== 'once' && !prompted) return;
    if (perm === 'denied') return;

    getCurrentDevicePosition()
      .then((coords) => {
        setProfile((prev) => ({
          ...prev,
          currentLat: coords.latitude,
          currentLng: coords.longitude,
        }));
        setRecenterTrigger((prev) => prev + 1);

        const activeDriverId = localStorage.getItem('sakay_driver_id');
        if (activeDriverId) {
          supabase
            .from('driver')
            .update({
              current_latitude: coords.latitude,
              current_longitude: coords.longitude,
              last_location_update: new Date().toISOString(),
            })
            .eq('driver_id', activeDriverId)
            .then(() => {});
        }
      })
      .catch((err) => {
        console.warn('[DriverAvailabilityHome] Mount position error:', err);
      });
  }, [locationPermissionOpen]);

  // Load live Supabase profile and accredited TODAs on mount
  useEffect(() => {
    fetchAccreditedTodas().then((todas) => {
      if (todas && todas.length > 0) {
        setAvailableTodas(todas);
      }
    });

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
          if (driverData.account_status !== 'Active' && driverData.account_status !== 'Verified') {
            navigate('/driver/status', { replace: true });
            return;
          }

          const { count: completedTripsCount } = await supabase
            .from('booking')
            .select('*', { count: 'exact', head: true })
            .eq('driver_id', driverData.driver_id)
            .eq('booking_status', 'Completed');

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

          const cached = getCachedDevicePosition();
          const resolvedLat = cached?.latitude || (driverData.current_latitude ? Number(driverData.current_latitude) : 13.4117);
          const resolvedLng = cached?.longitude || (driverData.current_longitude ? Number(driverData.current_longitude) : 121.1803);

          setProfile((prev) => {
            const hasPrevRealLat = prev.currentLat && prev.currentLat !== 13.4117 && prev.currentLat !== 13.367554;
            const hasPrevRealLng = prev.currentLng && prev.currentLng !== 121.1803 && prev.currentLng !== 121.168617;
            const finalLat = hasPrevRealLat ? prev.currentLat : resolvedLat;
            const finalLng = hasPrevRealLng ? prev.currentLng : resolvedLng;

            return {
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
              isOnline: driverData.availability_status === 'Available',
              currentLat: finalLat,
              currentLng: finalLng,
            };
          });

          if (cached?.latitude && cached?.longitude && driverData.driver_id) {
            supabase
              .from('driver')
              .update({
                current_latitude: cached.latitude,
                current_longitude: cached.longitude,
                last_location_update: new Date().toISOString(),
              })
              .eq('driver_id', driverData.driver_id)
              .then(() => {});
          }
        }
      } catch (err) {
        console.warn('[DriverAvailabilityHome] Live profile sync note:', err);
      }
    }

    loadLiveDriver();
  }, [navigate, setProfile]);

  const selectedTodaIds = profile.selectedTodaIds && profile.selectedTodaIds.length > 0 
    ? profile.selectedTodaIds 
    : (profile.selectedTodaId ? [profile.selectedTodaId] : []);

  const selectedTodas = availableTodas.filter((t) => selectedTodaIds.includes(t.id));
  const displayTodaText = selectedTodas.length > 0 
    ? selectedTodas.map((t) => `${t.name} (${t.acronym})`).join(', ')
    : (profile.todaName || (language === 'tl' ? 'Pumili ng TODA...' : 'Select TODA...'));

  const selectedVehicle = {
    id: profile.selectedVehicleId || profile.id || 'veh-primary',
    plateNumber: profile.vehiclePlate || 'N/A',
    franchiseNumber: profile.franchiseNumber || 'N/A',
    model: 'Registered Tricycle Unit',
  };

  const isDriverVerifiedInDb = profile.accountStatus === 'Active' || profile.accountStatus === 'Verified';
  const canGoOnline = isDriverVerifiedInDb;

  const handleToggleOnline = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canGoOnline) return;
    const nextState = e.target.checked;
    setProfile((prev) => ({ ...prev, isOnline: nextState }));
    
    // Update Supabase
    const activeDriverId = profile.id || localStorage.getItem('sakay_driver_id') || '11111111-1111-1111-1111-111111111111';
    if (activeDriverId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeDriverId)) {
      try {
        await supabase
          .from('driver')
          .update({ availability_status: nextState ? 'Available' : 'Offline' })
          .eq('driver_id', activeDriverId);
      } catch (err) {
        console.warn('[DriverAvailabilityHome] Failed to sync availability_status:', err);
      }
    }
  };

  const handleRecenter = async () => {
    try {
      const coords = await getCurrentDevicePosition();
      setProfile((prev) => ({
        ...prev,
        currentLat: coords.latitude,
        currentLng: coords.longitude,
      }));
      setRecenterTrigger((prev) => prev + 1);

      const activeDriverId = localStorage.getItem('sakay_driver_id');
      if (activeDriverId) {
        supabase
          .from('driver')
          .update({
            current_latitude: coords.latitude,
            current_longitude: coords.longitude,
            last_location_update: new Date().toISOString(),
          })
          .eq('driver_id', activeDriverId)
          .then(() => {});
      }
    } catch {
      setRecenterTrigger((prev) => prev + 1);
    }
  };

  const handleAllowLocation = async (saveAlways: boolean) => {
    setIsRequestingLocation(true);
    setLocationError('');
    try {
      const coords = await getCurrentDevicePosition();
      localStorage.setItem('sakay_driver_location_prompted', 'true');
      localStorage.setItem('sakay_driver_location_permission', 'always');

      setProfile((prev) => ({
        ...prev,
        currentLat: coords.latitude,
        currentLng: coords.longitude,
      }));
      setRecenterTrigger((prev) => prev + 1);

      const activeDriverId = localStorage.getItem('sakay_driver_id');
      if (activeDriverId) {
        supabase
          .from('driver')
          .update({
            current_latitude: coords.latitude,
            current_longitude: coords.longitude,
            last_location_update: new Date().toISOString(),
          })
          .eq('driver_id', activeDriverId)
          .then(() => {});
      }
      setIsRequestingLocation(false);
      setLocationPermissionOpen(false);
    } catch (err: any) {
      console.warn('[DriverAvailabilityHome] Geolocation note:', err?.message || err);
      setIsRequestingLocation(false);
      setLocationError(
        language === 'tl'
          ? 'Hindi ma-access ang GPS. Pakisuyong i-on ang Location sa settings ng iyong device.'
          : 'Unable to access GPS. Please turn on Location in your device settings.'
      );
    }
  };

  const handleDenyLocation = () => {
    localStorage.setItem('sakay_driver_location_prompted', 'true');
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
      <MapView
        userLocation={{ lat: profile.currentLat, lng: profile.currentLng }}
        recenterTrigger={recenterTrigger}
      />

      <SakayToast
        open={toastOpen}
        message={
          earnedAmount
            ? (language === 'tl'
                ? `🎉 Kumpleto na ang biyahe! +₱${earnedAmount.toFixed(2)} naidagdag sa kita ngayong araw.`
                : `🎉 Trip Completed! +₱${earnedAmount.toFixed(2)} added to today's earnings.`)
            : null
        }
        severity="success"
        autoHideDuration={4500}
        onClose={handleToastClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />

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
              backgroundColor: profile.isOnline ? '#10B981' : '#94A3B8',
            }}
          />
          <Typography
            sx={{
              fontSize: '12px',
              fontWeight: 800,
              color: profile.isOnline ? '#047857' : '#64748B',
            }}
          >
            {profile.isOnline ? 'ONLINE' : 'OFFLINE'}
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

      {searchingPillVisible && (
        <Chip
          label={
            profile.isOnline
              ? (language === 'tl' ? 'Naghahanap ng mga pasahero...' : 'Searching for nearby passengers...')
              : (language === 'tl' ? 'Offline • Mag-online para makatanggap ng biyahe' : 'Offline • Go online to receive trips')
          }
          sx={{
            position: 'absolute',
            top: 'calc(var(--safe-area-top) + 94px)',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#FFFFFF',
            color: profile.isOnline ? '#0F172A' : '#64748B',
            fontWeight: 700,
            fontSize: '11.5px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
            border: '1px solid #E2E8F0',
            zIndex: 10,
            animation: 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
            },
            '@keyframes fadeInUp': {
              from: { opacity: 0, transform: 'translate(-50%, 8px)' },
              to: { opacity: 1, transform: 'translate(-50%, 0)' },
            },
          }}
        />
      )}


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

        {!canGoOnline && (
          <Box sx={{ p: '10px 14px', borderRadius: '12px', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '11.5px', color: '#B45309', fontWeight: 700 }}>
              {language === 'tl'
                ? 'Pumili muna ng beripikadong TODA at Tricycle Unit bago mag-Online.'
                : 'Please select a Verified TODA and Tricycle Unit before going Online.'}
            </Typography>
          </Box>
        )}

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
            <Typography sx={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: 'Poppins, sans-serif' }}>
              {language === 'tl' ? 'Kinabibilangang TODA' : 'Active TODA Affiliation'}
            </Typography>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', mt: '2px', fontFamily: 'Poppins, sans-serif' }}>
              {displayTodaText}
            </Typography>
          </Box>
          <ArrowForwardIosIcon sx={{ fontSize: 13, color: '#94A3B8' }} />
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: '14px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
          }}
        >
          <Box>
            <Typography sx={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: 'Poppins, sans-serif' }}>
              {language === 'tl' ? 'Gamit na Tricycle Unit' : 'Tricycle Unit in Use'}
            </Typography>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', mt: '2px', fontFamily: 'Poppins, sans-serif' }}>
              {selectedVehicle
                ? `${language === 'tl' ? 'Plaka' : 'Plate'}: ${selectedVehicle.plateNumber} • Franchise: ${selectedVehicle.franchiseNumber}`
                : (language === 'tl' ? 'Rehistradong Tricycle Unit' : 'Registered Tricycle Unit')}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Dialog open={todaModalOpen} onClose={() => setTodaModalOpen(false)} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: '24px' } } }}>
        <DialogTitle sx={{ fontWeight: 800, fontSize: '16px', color: '#0F172A', px: 2.5, pt: 2.5, pb: 1, fontFamily: 'Poppins, sans-serif' }}>
          {language === 'tl' ? 'Pumili ng Aktibong TODA' : 'Select Active TODA'}
        </DialogTitle>
        <DialogContent sx={{ px: 2.5, py: 0 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, mt: 0.5 }}>
            {availableTodas.length > 0 ? (
              availableTodas.map((toda) => {
                const isSelected = selectedTodaIds.includes(toda.id);
                return (
                  <Box
                    key={toda.id}
                    onClick={() => {
                      setProfile((prev) => ({
                        ...prev,
                        selectedTodaIds: [toda.id],
                        selectedTodaId: toda.id,
                        todaName: `${toda.name} (${toda.acronym})`,
                      }));
                    }}
                    sx={{
                      p: 1.5,
                      borderRadius: '14px',
                      border: isSelected ? '2px solid #FF6B00' : '1px solid #E2E8F0',
                      backgroundColor: isSelected ? '#FFF8F0' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                      '&:hover': { borderColor: '#FF6B00' },
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', fontFamily: 'Poppins, sans-serif' }}>{toda.name} ({toda.acronym})</Typography>
                      <Typography sx={{ fontSize: '11.5px', color: '#64748B', fontFamily: 'Poppins, sans-serif' }}>Terminal: {toda.terminalLocation}</Typography>
                    </Box>
                    <Radio
                      checked={isSelected}
                      sx={{
                        color: '#CBD5E1',
                        p: 0.5,
                        '&.Mui-checked': { color: '#FF6B00' },
                      }}
                    />
                  </Box>
                );
              })
            ) : (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '12.5px', color: '#64748B', fontFamily: 'Poppins, sans-serif' }}>
                  {language === 'tl' ? 'Walang nahanap na TODA sa database' : 'No TODAs found in database'}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 1.5 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => setTodaModalOpen(false)}
            sx={{
              backgroundColor: '#FF6B00',
              fontWeight: 700,
              borderRadius: '14px',
              height: '46px',
              fontSize: '14px',
              textTransform: 'none',
              fontFamily: 'Poppins, sans-serif',
              '&:hover': { backgroundColor: '#E05300' },
            }}
          >
            {language === 'tl' ? 'Tapos Na' : 'Done'}
          </Button>
        </DialogActions>
      </Dialog>

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
              mb: locationError ? '12px' : 0,
            }}
          >
            {language === 'tl'
              ? 'Ginagamit ang iyong lokasyon para makahanap ng malapit na pasahero at masubaybayan ang iyong biyahe sa mapa.'
              : 'Your location is used to find nearby passengers and track your trip on the map.'}
          </Typography>
          {locationError && (
            <Alert severity="warning" sx={{ mt: '12px', fontSize: '12px', borderRadius: '12px', textAlign: 'left' }}>
              {locationError}
            </Alert>
          )}
        </Box>

        <Divider sx={{ borderColor: '#E2E8F0' }} />

        <Button
          fullWidth
          disabled={isRequestingLocation}
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
          disabled={isRequestingLocation}
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
          {isRequestingLocation ? (
            <CircularProgress size={20} sx={{ color: '#FF6B00' }} />
          ) : (
            language === 'tl' ? 'Habang Ginagamit ang App' : 'While Using the App'
          )}
        </Button>

        <Divider sx={{ borderColor: '#E2E8F0' }} />

        <Button
          fullWidth
          disabled={isRequestingLocation}
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
