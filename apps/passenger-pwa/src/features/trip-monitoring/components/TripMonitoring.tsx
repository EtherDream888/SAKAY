import React, { useState, useEffect, useRef } from 'react';
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
  MenuItem,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PhoneIcon from '@mui/icons-material/Phone';
import MessageIcon from '@mui/icons-material/Message';
import StarIcon from '@mui/icons-material/Star';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import GroupsIcon from '@mui/icons-material/Groups';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import MapView from '../../../common/components/MapView';
import { getBooking, cancelBooking, updateBookingState } from '../../../services/bookingService';
import type { BookingRecord } from '../../../services/bookingService';
import { subscribeToDispatchEvents } from '@sakay/shared';
import type { MockDispatchBooking } from '@sakay/shared';
import { supabase } from '../../../services/supabaseClient';

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

  // Workflow Step 12: Trip Completion & Fare Confirmation State
  const [completionFareModalOpen, setCompletionFareModalOpen] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputedAmount, setDisputedAmount] = useState('');
  const [disputeCategory, setDisputeCategory] = useState('Overcharging Attempt');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);

  // Driver Location Telemetry
  const [driverPos, setDriverPos] = useState({
    lat: booking?.driver_latitude || 13.4140,
    lng: booking?.driver_longitude || 121.1845,
  });
  const hasLiveDriverGpsRef = useRef(false);

  // Simulated Driver Location Refresh (~5 seconds) when live GPS is not broadcasting
  useEffect(() => {
    const interval = setInterval(() => {
      if (!hasLiveDriverGpsRef.current) {
        setDriverPos((prev) => ({
          lat: prev.lat + (Math.random() - 0.5) * 0.0004,
          lng: prev.lng + (Math.random() - 0.5) * 0.0004,
        }));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Fetch initial booking details from Supabase if activeBookingId exists
  useEffect(() => {
    if (!activeBookingId) return;

    const fetchBookingFromDb = async () => {
      try {
        const { data, error } = await supabase
          .from('booking')
          .select(`
            booking_id,
            passenger_id,
            booking_status,
            pickup_address,
            pickup_latitude,
            pickup_longitude,
            dropoff_address,
            dropoff_latitude,
            dropoff_longitude,
            estimated_fare,
            actual_fare,
            estimated_distance_km,
            is_shared_trip,
            passenger_count,
            driver_id,
            driver:driver_id (
              driver_id,
              full_name,
              contact_number,
              body_number,
              plate_number,
              toda:toda_id (toda_name)
            )
          `)
          .eq('booking_id', activeBookingId)
          .maybeSingle();

        if (!error && data) {
          const d = data as any;
          const driverInfo = Array.isArray(d.driver) ? d.driver[0] : d.driver;
          const todaInfo = driverInfo?.toda ? (Array.isArray(driverInfo.toda) ? driverInfo.toda[0] : driverInfo.toda) : null;

          const mappedStatus = d.booking_status === 'Pending' ? 'Searching Driver'
            : d.booking_status === 'Accepted' || d.booking_status === 'Driver Assigned' ? 'Driver Assigned'
            : d.booking_status === 'In Transit' || d.booking_status === 'Trip Ongoing' ? 'Trip Ongoing'
            : d.booking_status === 'Arrived at Pickup' || d.booking_status === 'Driver Arrived' ? 'Driver Arrived'
            : d.booking_status === 'Completed' ? 'Completed'
            : d.booking_status === 'Cancelled' ? 'Cancelled'
            : (d.booking_status || 'Searching Driver');

          setBooking((prev) => {
            const updated: BookingRecord = {
              ...(prev || ({} as any)),
              booking_id: d.booking_id,
              passenger_id: d.passenger_id || prev?.passenger_id || 'PSG-001',
              passenger_name: prev?.passenger_name || 'Juan Dela Cruz',
              passenger_phone: prev?.passenger_phone || '+63 917 123 4567',
              driver_id: d.driver_id || prev?.driver_id,
              driver_name: driverInfo?.full_name || prev?.driver_name || 'Aurelio Bautista',
              driver_phone: driverInfo?.contact_number || prev?.driver_phone || '+63 917 111 0201',
              franchise_no: driverInfo?.body_number || prev?.franchise_no || 'CAL-2025-0773',
              vehicle_plate: driverInfo?.plate_number || prev?.vehicle_plate || '773-MV',
              toda_name: todaInfo?.toda_name || prev?.toda_name || 'Calapan Central TODA',
              booking_status: mappedStatus as any,
              pickup_address: d.pickup_address || prev?.pickup_address || '',
              dropoff_address: d.dropoff_address || prev?.dropoff_address || '',
              pickup_latitude: d.pickup_latitude ?? prev?.pickup_latitude ?? 13.4124,
              pickup_longitude: d.pickup_longitude ?? prev?.pickup_longitude ?? 121.1834,
              dropoff_latitude: d.dropoff_latitude ?? prev?.dropoff_latitude ?? 13.4150,
              dropoff_longitude: d.dropoff_longitude ?? prev?.dropoff_longitude ?? 121.1810,
              estimated_fare: Number(d.estimated_fare) || prev?.estimated_fare || 18,
              actual_fare: d.actual_fare !== null && d.actual_fare !== undefined ? Number(d.actual_fare) : prev?.actual_fare || 18,
              is_shared_trip: Boolean(d.is_shared_trip),
              passenger_count: Number(d.passenger_count) || 1,
              created_at: prev?.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            updateBookingState(activeBookingId, updated);
            if (mappedStatus === 'Completed') {
              setCompletionFareModalOpen(true);
            }
            return updated;
          });
        }
      } catch (err) {
        console.warn('[TripMonitoring] fetchBookingFromDb note:', err);
      }
    };

    fetchBookingFromDb();
  }, [activeBookingId]);

  // Listen to Shared Dispatch Broker & Supabase Realtime for updates
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

        // Live driver GPS coordinates
        if (updatedBooking.driver_latitude && updatedBooking.driver_longitude) {
          hasLiveDriverGpsRef.current = true;
          setDriverPos({
            lat: updatedBooking.driver_latitude,
            lng: updatedBooking.driver_longitude,
          });
        }

        // Trigger Workflow Step 12 Simultaneous Fare Confirmation Dialog
        if (updatedBooking.booking_status === 'Completed') {
          setCompletionFareModalOpen(true);
        }
      }
    });

    // Secondary direct Supabase Realtime channel specifically for activeBookingId
    const channel = supabase
      .channel(`passenger_trip_${activeBookingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking',
          filter: `booking_id=eq.${activeBookingId}`,
        },
        (payload: any) => {
          const row = payload.new;
          if (row && row.booking_id === activeBookingId) {
            setBooking((prev) => {
              const mappedStatus = row.booking_status === 'Pending' ? 'Searching Driver'
                : row.booking_status === 'Accepted' || row.booking_status === 'Driver Assigned' ? 'Driver Assigned'
                : row.booking_status === 'In Transit' || row.booking_status === 'Trip Ongoing' ? 'Trip Ongoing'
                : row.booking_status === 'Arrived at Pickup' || row.booking_status === 'Driver Arrived' ? 'Driver Arrived'
                : row.booking_status === 'Completed' ? 'Completed'
                : row.booking_status === 'Cancelled' ? 'Cancelled'
                : (row.booking_status || prev?.booking_status);

              const merged: BookingRecord = {
                ...(prev || ({} as any)),
                booking_status: mappedStatus as any,
                actual_fare: row.actual_fare !== null && row.actual_fare !== undefined ? Number(row.actual_fare) : prev?.actual_fare,
                updated_at: row.updated_at || new Date().toISOString(),
              };
              updateBookingState(activeBookingId, merged);

              if (mappedStatus === 'Completed') {
                setCompletionFareModalOpen(true);
              }
              return merged;
            });
          }
        }
      )
      .subscribe();

    return () => {
      unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [activeBookingId]);

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
  const passengerPayableFare = booking?.proportionate_fare || booking?.actual_fare || booking?.estimated_fare || 18.0;

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

      {/* 2. Live Map Surface (Leaflet OpenStreetMap with Driver, Pickup, and Destination) */}
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#E3ECEF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <MapView
          pickupLocation={{
            lat: booking?.pickup_latitude || 13.4124,
            lng: booking?.pickup_longitude || 121.1834,
          }}
          dropoffLocation={{
            lat: booking?.dropoff_latitude || 13.4150,
            lng: booking?.dropoff_longitude || 121.1810,
          }}
          driverLocation={status !== 'Searching Driver' ? driverPos : null}
        />

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
              border: '2px solid rgba(255, 107, 0, 0.5)',
              zIndex: 5,
              pointerEvents: 'none',
              animation: 'pulse 2s infinite ease-out',
              '@keyframes pulse': {
                '0%': { transform: 'scale(0.8)', opacity: 1 },
                '100%': { transform: 'scale(1.6)', opacity: 0 },
              },
            }}
          />
        )}

        {/* Refresh / Telemetry Badge */}
        <Typography
          sx={{
            position: 'absolute',
            bottom: 16,
            fontSize: '10.5px',
            color: '#FFFFFF',
            backgroundColor: 'rgba(15, 23, 42, 0.82)',
            padding: '5px 12px',
            borderRadius: '999px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            zIndex: 10,
          }}
        >
          Live Driver GPS: {driverPos.lat.toFixed(4)}, {driverPos.lng.toFixed(4)} {hasLiveDriverGpsRef.current ? '• Live Watch' : '(~5s refresh)'}
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

        {/* Real-time Paired Commuter Notification Banner */}
        {Boolean(booking?.paired_passenger_name || (booking?.paired_booking_count && booking.paired_booking_count > 1)) && (
          <Box sx={{ p: '12px 16px', borderRadius: '16px', backgroundColor: '#ECFDF5', border: '1.5px solid #10B981', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <GroupsIcon sx={{ color: '#10B981', fontSize: 26 }} />
            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#065F46' }}>
                🎉 May Kasabay na Commuter! ({booking?.paired_passenger_name || 'Joshua Dizon'})
              </Typography>
              <Typography sx={{ fontSize: '11px', color: '#047857' }}>
                Nahati ang pamasahe! Bagong babayaran: ₱{passengerPayableFare.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Final Fare Display */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.5 }}>
          <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#64748B' }}>
            {booking?.proportionate_fare ? 'Proportionate Shared Fare:' : 'Kabuuang Pamasahe:'}
          </Typography>
          <Typography sx={{ fontSize: '24px', fontWeight: 900, color: '#FF6B00' }}>
            ₱{passengerPayableFare.toFixed(2)}
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

      {/* 7. Workflow Step 12: Trip Completion & Simultaneous Fare Check Dialog */}
      <Dialog
        open={completionFareModalOpen}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: '28px', p: 2, textAlign: 'center' } } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1, mt: 1 }}>
          <CheckCircleIcon sx={{ fontSize: 54, color: '#10B981' }} />
        </Box>
        <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
          Nakarating na sa Destinasyon!
        </Typography>
        <Typography sx={{ fontSize: '13px', color: '#64748B', mb: 2 }}>
          Pakisuri ang siningil na pamasahe ng drayber bago magpatuloy.
        </Typography>

        <Paper elevation={0} sx={{ p: 2, borderRadius: '18px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', mb: 2.5 }}>
          <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.5px' }}>
            OPISYAL NA PAMASAHE
          </Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 900, color: '#FF6B00', my: 0.5 }}>
            ₱{passengerPayableFare.toFixed(2)}
          </Typography>
          <Typography sx={{ fontSize: '11px', color: '#94A3B8' }}>
            Batay sa Calapan City Ordinance No. 118
          </Typography>
        </Paper>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={() => {
              setCompletionFareModalOpen(false);
              navigate('/feedback', { replace: true, state: { booking: { ...booking, actual_fare: passengerPayableFare } } });
            }}
            sx={{
              height: '48px',
              borderRadius: '14px',
              backgroundColor: '#10B981',
              fontWeight: 800,
              fontSize: '14px',
              textTransform: 'none',
              '&:hover': { backgroundColor: '#059669' },
            }}
          >
            I Paid ₱{passengerPayableFare.toFixed(2)} (Tama ang Bayad)
          </Button>

          <Button
            variant="outlined"
            fullWidth
            color="error"
            onClick={() => {
              setCompletionFareModalOpen(false);
              setDisputeModalOpen(true);
            }}
            startIcon={<ReportProblemIcon />}
            sx={{
              height: '44px',
              borderRadius: '14px',
              fontWeight: 700,
              fontSize: '13px',
              textTransform: 'none',
            }}
          >
            Amount Doesn't Match (May Aberya)
          </Button>
        </Box>
      </Dialog>

      {/* 8. LGU Fare Dispute & Incident Form Dialog */}
      <Dialog
        open={disputeModalOpen}
        onClose={() => setDisputeModalOpen(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: '24px', p: 1.5 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <ReportProblemIcon sx={{ color: '#EF4444' }} />
          <Typography sx={{ fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
            Isumite ang Reklamo sa LGU
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
          {disputeSubmitted ? (
            <Alert severity="success" sx={{ borderRadius: '12px' }}>
              Naisumite na ang iyong reklamo sa City LGU Transport Board (Incident #{activeBookingId}). Iimbestigahan ito agad.
            </Alert>
          ) : (
            <>
              <Typography sx={{ fontSize: '12.5px', color: '#64748B' }}>
                Ipapadala ang ulat na ito sa City LGU Administrator sa ilalim ng Complaint & Incident Management.
              </Typography>

              <TextField
                select
                fullWidth
                size="small"
                label="Uri ng Reklamo"
                value={disputeCategory}
                onChange={(e) => setDisputeCategory(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              >
                <MenuItem value="Overcharging Attempt">Overcharging (Sobra ang singil sa pamasahe)</MenuItem>
                <MenuItem value="Refusal to Follow Tariff">Refusal to Follow Tariff (Hindi sumunod sa taripa)</MenuItem>
                <MenuItem value="Unauthorized Route">Unauthorized Route (Maling ruta)</MenuItem>
                <MenuItem value="Rude Behavior">Rude Behavior (Hindi magandang asal)</MenuItem>
              </TextField>

              <TextField
                fullWidth
                size="small"
                label="Halagang Siningil ng Drayber (₱)"
                type="number"
                placeholder="Hal. 50"
                value={disputedAmount}
                onChange={(e) => setDisputedAmount(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />

              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                label="Paliwanag o Detalye"
                placeholder="Pakilarawan ang nangyari..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </>
          )}
        </DialogContent>

        {!disputeSubmitted && (
          <DialogActions sx={{ p: '12px 18px 18px', gap: 1 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => setDisputeModalOpen(false)}
              sx={{ borderRadius: '12px', textTransform: 'none' }}
            >
              Kanselahin
            </Button>
            <Button
              variant="contained"
              fullWidth
              color="error"
              onClick={async () => {
                const payload = {
                  incident_id: `INC-${Date.now().toString().slice(-6)}`,
                  booking_id: activeBookingId,
                  driver_name: driverName,
                  reporter_name: booking?.passenger_name || 'Passenger User',
                  reporter_role: 'Passenger',
                  category: disputeCategory || 'Overcharging Attempt',
                  description: `Disputed Fare. Expected: ₱${passengerPayableFare.toFixed(2)}, Actual: ₱${disputedAmount || passengerPayableFare}. Details: ${disputeReason}`,
                  status: 'Pending Review',
                  reported_at: new Date().toISOString(),
                };

                try {
                  await supabase.from('incident_report').insert([payload]);
                } catch (err) {
                  console.warn('[TripMonitoring] Supabase incident insert note:', err);
                }

                try {
                  const stored = localStorage.getItem('sakay_shared_incidents') || '[]';
                  const list = JSON.parse(stored);
                  list.unshift(payload);
                  localStorage.setItem('sakay_shared_incidents', JSON.stringify(list));
                } catch (err) {
                  console.warn('[TripMonitoring] Local incident storage note:', err);
                }

                setDisputeSubmitted(true);
                setTimeout(() => {
                  setDisputeModalOpen(false);
                  navigate('/dashboard', { replace: true });
                }, 2000);
              }}
              sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none' }}
            >
              Isumite sa LGU
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </Box>
  );
};
