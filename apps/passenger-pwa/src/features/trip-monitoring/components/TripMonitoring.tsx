import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PhoneIcon from '@mui/icons-material/Phone';
import MessageIcon from '@mui/icons-material/Message';
import StarIcon from '@mui/icons-material/Star';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';

import { getBooking, cancelBooking, updateBookingState } from '../../../services/bookingService';
import type { BookingRecord } from '../../../services/bookingService';
import { subscribeToDispatchEvents } from '@sakay/shared';
import type { MockDispatchBooking } from '@sakay/shared';

export const TripMonitoring: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const stateBookingId = (location.state as { bookingId?: string })?.bookingId;
  const activeBookingId = stateBookingId || sessionStorage.getItem('current_active_booking_id') || 'BKG-DEMO-001';

  const [booking, setBooking] = useState<BookingRecord | null>(() => {
    return getBooking(activeBookingId) || {
      booking_id: activeBookingId,
      passenger_id: 'PSG-001',
      passenger_name: 'Juan Dela Cruz',
      passenger_phone: '+63 917 123 4567',
      driver_name: 'Aurelio Bautista',
      franchise_no: 'CAL-2025-0773',
      vehicle_plate: '773-MV',
      toda_name: 'Calapan Central TODA (CCTODA)',
      booking_type: 'Immediate',
      is_shared_trip: false,
      passenger_count: 1,
      pickup_address: 'JP Rizal St. Central Terminal',
      pickup_latitude: 13.4124,
      pickup_longitude: 121.1834,
      dropoff_address: 'Calapan City Public Market',
      dropoff_latitude: 13.4150,
      dropoff_longitude: 121.1810,
      estimated_distance_km: 2.4,
      estimated_fare: 18.0,
      booking_status: 'Searching Driver',
      eta_minutes: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [leaveConfirmModalOpen, setLeaveConfirmModalOpen] = useState(false);
  const [commModalOpen, setCommModalOpen] = useState(false);
  const [customSms, setCustomSms] = useState('');
  const [smsAlert, setSmsAlert] = useState<string | null>(null);

  // Simulated Driver Location Refresh (every ~5 seconds matching Table 10.4 near-real-time spec)
  const [driverPos, setDriverPos] = useState({ lat: 13.4140, lng: 121.1845 });

  useEffect(() => {
    const interval = setInterval(() => {
      setDriverPos((prev) => ({
        lat: prev.lat + (Math.random() - 0.5) * 0.0004,
        lng: prev.lng + (Math.random() - 0.5) * 0.0004,
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Listen to Shared Dispatch Broker for updates from Driver PWA
  useEffect(() => {
    const unsubscribe = subscribeToDispatchEvents((updatedBooking: MockDispatchBooking) => {
      if (updatedBooking.booking_id === activeBookingId) {
        setBooking((prev) => {
          const merged: BookingRecord = {
            ...(prev || ({} as any)),
            ...updatedBooking,
          };
          updateBookingState(activeBookingId, merged);
          return merged;
        });

        // If completed, automatically route to Feedback with history replacement
        if (updatedBooking.booking_status === 'Completed') {
          setTimeout(() => {
            navigate('/feedback', { replace: true, state: { booking: updatedBooking } });
          }, 1200);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeBookingId, navigate]);

  const status = booking?.booking_status || 'Searching Driver';
  const isTripActive = status !== 'Completed' && status !== 'Cancelled';

  const handleBackRequest = () => {
    if (isTripActive) {
      setLeaveConfirmModalOpen(true);
    } else {
      navigate('/dashboard');
    }
  };

  const handleCancelTrip = async () => {
    await cancelBooking(activeBookingId, 'Passenger cancelled before pickup');
    setCancelModalOpen(false);
    sessionStorage.removeItem('current_active_booking_id');
    navigate('/dashboard');
  };

  const handleSendSms = (msg: string) => {
    if (!msg.trim()) return;
    setSmsAlert(`Naipadala ang mensahe sa driver: "${msg}"`);
    setCustomSms('');
    setTimeout(() => {
      setSmsAlert(null);
      setCommModalOpen(false);
    }, 1800);
  };

  const driverName = booking?.driver_name || 'Aurelio Bautista';
  const driverPhone = booking?.driver_phone || '+63 917 111 0201';
  const franchiseNo = booking?.franchise_no || 'CAL-2025-0773';
  const plateNo = booking?.vehicle_plate || '773-MV';
  const todaName = booking?.toda_name || 'Calapan Central TODA';
  const fare = booking?.proportionate_fare || booking?.estimated_fare || 18.0;

  return (
    <Box sx={{ width: '100%', height: '100%', backgroundColor: '#0F172A', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* 1. Header Bar with Safe Area */}
      <Box
        sx={{
          paddingTop: 'calc(var(--safe-area-top) + 16px)',
          paddingBottom: '14px',
          paddingX: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0F172A',
          zIndex: 20,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={handleBackRequest} sx={{ color: '#FFFFFF', padding: 0.5 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
              Pagsubaybay sa Biyahe (Trip Monitoring)
            </Typography>
            <Typography sx={{ fontSize: '11.5px', color: '#94A3B8' }}>
              Booking: <strong>{activeBookingId}</strong>
            </Typography>
          </Box>
        </Box>

        {status !== 'Completed' && (
          <Button
            size="small"
            onClick={() => setCancelModalOpen(true)}
            sx={{ color: '#EF4444', fontWeight: 700, fontSize: '12px', textTransform: 'none' }}
          >
            Kanselahin
          </Button>
        )}
      </Box>

      {/* 2. Live Map Surface (Radar / Vehicle Simulation) */}
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#1E293B',
          backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Status Pill Badge */}
        <Chip
          label={
            status === 'Searching Driver'
              ? 'Naghahanap ng pinakamalapit na Tricycle...'
              : status === 'Driver Assigned' || status === 'Driver En Route'
              ? `Papunta na ang Driver • ETA: ${booking?.eta_minutes || 4} mins`
              : status === 'Driver Arrived'
              ? 'Nandito na ang Tricycle sa Pickup Point!'
              : status === 'Trip Ongoing'
              ? 'Kasalukuyang bumibiyahe patungo sa destinasyon'
              : 'Nakumpleto na ang Biyahe!'
          }
          sx={{
            position: 'absolute',
            top: 20,
            backgroundColor:
              status === 'Searching Driver'
                ? '#F59E0B'
                : status === 'Driver Arrived'
                ? '#1E8E3E'
                : '#0F172A',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '12.5px',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            zIndex: 10,
          }}
        />

        {/* Pulsing Radar Ring for Searching Stage */}
        {status === 'Searching Driver' && (
          <Box
            sx={{
              position: 'absolute',
              width: 180,
              height: 180,
              borderRadius: '50%',
              border: '2px solid rgba(255, 107, 0, 0.4)',
              animation: 'pulse 2s infinite ease-out',
              '@keyframes pulse': {
                '0%': { transform: 'scale(0.8)', opacity: 1 },
                '100%': { transform: 'scale(1.6)', opacity: 0 },
              },
            }}
          />
        )}

        {/* Live Tricycle Icon Marker */}
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: '#FF6B00',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            border: '3px solid #FFFFFF',
            zIndex: 10,
          }}
        >
          <TwoWheelerIcon sx={{ fontSize: 32 }} />
        </Box>

        {/* Refresh Badge */}
        <Typography
          sx={{
            position: 'absolute',
            bottom: 16,
            fontSize: '10.5px',
            color: '#94A3B8',
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            padding: '4px 10px',
            borderRadius: '999px',
          }}
        >
          Live Driver GPS: {driverPos.lat.toFixed(4)}, {driverPos.lng.toFixed(4)} (~5s refresh)
        </Typography>
      </Box>

      {/* 3. Driver & Trip Details (Bottom Sheet Card) */}
      <Paper
        elevation={6}
        sx={{
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          padding: '20px 20px calc(var(--safe-area-bottom) + 16px) 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          zIndex: 20,
        }}
      >
        {/* Driver Identity Verification Card */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 48, height: 48, backgroundColor: '#FF6B00', fontWeight: 800, fontSize: '20px' }}>
              {driverName.charAt(0)}
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                {driverName}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <StarIcon sx={{ fontSize: 14, color: '#FBBC04' }} />
                <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                  4.9
                </Typography>
                <Typography sx={{ fontSize: '12px', color: '#64748B' }}>
                  • {todaName.split(' ')[0]}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Quick Communication Actions */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={() => (window.location.href = `tel:${driverPhone}`)} sx={{ backgroundColor: '#E6F4EA', color: '#1E8E3E' }}>
              <PhoneIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={() => setCommModalOpen(true)} sx={{ backgroundColor: '#FFF8F0', color: '#FF6B00' }}>
              <MessageIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Tricycle Franchise Plate Box */}
        <Box sx={{ p: '12px 16px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>FRANCHISE BODY NO.</Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{franchiseNo}</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>PLATE NUMBER</Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{plateNo}</Typography>
          </Box>
        </Box>

        {/* Shared Trip Carpool Savings Banner */}
        {booking?.is_shared_trip && (
          <Box sx={{ p: '10px 14px', borderRadius: '12px', backgroundColor: '#E6F4EA', border: '1px solid #A7F3D0' }}>
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#1E8E3E' }}>
              ✓ Shared Commuter Mode Active
            </Typography>
            <Typography sx={{ fontSize: '11.5px', color: '#065F46', mt: '2px' }}>
              {booking.paired_booking_count && booking.paired_booking_count > 1
                ? 'Nakatipid ka ng 25%! Nabawasan ang iyong pamasahe dahil may kasamang commuter sa ruta.'
                : 'Makatipid kapag may karagdagang commuter sa inyong ruta (hanggang 4 pinagsamang pasahero).'}
            </Typography>
          </Box>
        )}

        {/* Final Fare Display */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.5 }}>
          <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#64748B' }}>
            {booking?.proportionate_fare ? 'Proportionate Shared Fare:' : 'Kabuuang Pamasahe:'}
          </Typography>
          <Typography sx={{ fontSize: '24px', fontWeight: 900, color: '#FF6B00' }}>
            ₱{fare.toFixed(2)}
          </Typography>
        </Box>
      </Paper>

      {/* 4. Cancellation Confirmation Dialog */}
      <Dialog
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: '24px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A' }}>
          Kanselahin ang Biyahe?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '13.5px', color: '#64748B' }}>
            Sigurado ka bang nais mong kanselahin ang booking na ito?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: '12px 18px 18px', gap: 1 }}>
          <Button variant="outlined" fullWidth onClick={() => setCancelModalOpen(false)} sx={{ borderRadius: '12px' }}>
            Huwag Kanselahin
          </Button>
          <Button variant="contained" fullWidth color="error" onClick={handleCancelTrip} sx={{ borderRadius: '12px', fontWeight: 700 }}>
            Oo, Kanselahin
          </Button>
        </DialogActions>
      </Dialog>

      {/* 5. Passenger SMS Communication Modal */}
      <Dialog
        open={commModalOpen}
        onClose={() => setCommModalOpen(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: '24px', p: 1 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography sx={{ fontSize: '17px', fontWeight: 800 }}>Mensahe kay Driver {driverName.split(' ')[0]}</Typography>
          <IconButton onClick={() => setCommModalOpen(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
          {smsAlert && (
            <Box sx={{ p: 1.5, borderRadius: '10px', backgroundColor: '#E6F4EA', border: '1px solid #A7F3D0' }}>
              <Typography sx={{ fontSize: '12px', color: '#1E8E3E', fontWeight: 600 }}>{smsAlert}</Typography>
            </Box>
          )}

          <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>QUICK TEMPLATES</Typography>
          {['Nandito na po ako sa labas.', 'Nasa tapat po ako ng gate.', 'Pakibilisan po ng konti. Salamat!'].map((tpl, i) => (
            <Button
              key={i}
              variant="outlined"
              onClick={() => handleSendSms(tpl)}
              sx={{ justifyContent: 'flex-start', textAlign: 'left', borderRadius: '12px', textTransform: 'none', color: '#0F172A', fontSize: '12.5px', py: 1 }}
            >
              {tpl}
            </Button>
          ))}

          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="I-type ang mensahe..."
              value={customSms}
              onChange={(e) => setCustomSms(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
            <Button variant="contained" onClick={() => handleSendSms(customSms)} disabled={!customSms.trim()} sx={{ borderRadius: '12px', backgroundColor: '#FF6B00' }}>
              <SendIcon fontSize="small" />
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* 6. Active Trip Exit Guard Modal */}
      <Dialog
        open={leaveConfirmModalOpen}
        onClose={() => setLeaveConfirmModalOpen(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: '24px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '17px', color: '#0F172A' }}>
          Kasalukuyang Aktibo ang Biyahe
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
            Mayroon kang tumatakbong biyahe. Nais mo bang pumunta sa Dashboard?
            Mananatiling aktibo ang iyong booking at maaari kang bumalik sa tracking anumang oras.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={() => setLeaveConfirmModalOpen(false)}
            sx={{ borderRadius: '12px', backgroundColor: '#FF6B00', fontWeight: 700, height: '44px', textTransform: 'none', '&:hover': { backgroundColor: '#E05000' } }}
          >
            Manatili sa Tracking
          </Button>
          <Button
            variant="text"
            fullWidth
            onClick={() => {
              setLeaveConfirmModalOpen(false);
              navigate('/dashboard');
            }}
            sx={{ color: '#64748B', fontWeight: 600, textTransform: 'none' }}
          >
            Pumunta sa Dashboard
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
