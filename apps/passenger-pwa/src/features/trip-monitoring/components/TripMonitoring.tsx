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
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
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
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CancelIcon from '@mui/icons-material/Cancel';
import LinearProgress from '@mui/material/LinearProgress';
import MapView from '../../../common/components/MapView';
import PassengerCancelModal from '../../../common/components/PassengerCancelModal';
import SakayToast from '../../../common/components/SakayToast';
import { getBooking, cancelBooking, updateBookingState } from '../../../services/bookingService';
import type { BookingRecord } from '@sakay/shared';
import { formatShortBookingId, calculateHaversineKm, formatDistance } from '@sakay/shared';
import { supabase } from '../../../services/supabaseClient';
import { useLanguage } from '../../../utils/LanguageContext';

const mapBookingStatus = (rawStatus: string): any => {
  if (rawStatus === 'Pending') return 'Searching Driver';
  if (rawStatus === 'Accepted' || rawStatus === 'Driver Assigned') return 'Driver Assigned';
  if (rawStatus === 'In Transit') return 'Driver En Route';
  if (rawStatus === 'Arrived at Pickup' || rawStatus === 'Driver Arrived') return 'Driver Arrived';
  if (rawStatus === 'Trip Ongoing') return 'Trip Ongoing';
  if (rawStatus === 'Arrived at Destination') return 'Arrived at Destination';
  if (rawStatus === 'Completed') return 'Completed';
  if (rawStatus === 'Cancelled') return 'Cancelled';
  return rawStatus || 'Searching Driver';
};

const SlideToCancel: React.FC<{ onCancel: () => void; language: string }> = ({ onCancel, language }) => {
  const [slidePos, setSlidePos] = useState(0);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleStart = () => {
    isDragging.current = true;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const maxOffset = rect.width - 52;
    const offset = Math.max(0, Math.min(clientX - rect.left - 24, maxOffset));
    setSlidePos(offset);

    if (offset >= maxOffset * 0.85) {
      isDragging.current = false;
      setSlidePos(maxOffset);
      onCancel();
    }
  };

  const handleEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setSlidePos(0);
  };

  return (
    <Box
      ref={containerRef}
      onMouseDown={handleStart}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
      sx={{
        position: 'relative',
        width: '100%',
        height: '52px',
        backgroundColor: '#FEF2F2',
        border: '1.5px solid #FCA5A5',
        borderRadius: '999px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        cursor: 'grab',
        userSelect: 'none',
        touchAction: 'none',
        mt: 1,
      }}
    >
      <Typography
        sx={{
          fontSize: '13px',
          fontWeight: 700,
          color: '#EF4444',
          fontFamily: 'Poppins, sans-serif',
          pointerEvents: 'none',
          opacity: Math.max(0.25, 1 - slidePos / 140),
        }}
      >
        {language === 'tl' ? 'Slide to Cancel >>>' : 'Slide to Cancel >>>'}
      </Typography>

      <Box
        sx={{
          position: 'absolute',
          left: 4 + slidePos,
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          backgroundColor: '#EF4444',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
          transition: isDragging.current ? 'none' : 'left 0.25s ease',
        }}
      >
        <CloseIcon sx={{ fontSize: 22 }} />
      </Box>
    </Box>
  );
};

const SlideToFinish: React.FC<{ onFinish: () => void; language: string; disabled?: boolean }> = ({
  onFinish,
  language,
  disabled = false,
}) => {
  const [slidePos, setSlidePos] = useState(0);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleStart = () => {
    if (disabled) return;
    isDragging.current = true;
  };

  const handleMove = (clientX: number) => {
    if (disabled || !isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const maxOffset = rect.width - 52;
    const offset = Math.max(0, Math.min(clientX - rect.left - 24, maxOffset));
    setSlidePos(offset);

    if (offset >= maxOffset * 0.85) {
      isDragging.current = false;
      setSlidePos(maxOffset);
      onFinish();
    }
  };

  const handleEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setSlidePos(0);
  };

  return (
    <Box
      ref={containerRef}
      onMouseDown={handleStart}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
      sx={{
        position: 'relative',
        width: '100%',
        height: '52px',
        backgroundColor: disabled ? '#F1F5F9' : '#FFF7ED',
        border: disabled ? '1.5px solid #CBD5E1' : '1.5px solid #FFD6B3',
        borderRadius: '999px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        cursor: disabled ? 'not-allowed' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
        mt: 1.5,
      }}
    >
      <Typography
        sx={{
          fontSize: '13.5px',
          fontWeight: 800,
          color: disabled ? '#94A3B8' : '#FF6B00',
          fontFamily: 'Poppins, sans-serif',
          pointerEvents: 'none',
          opacity: disabled ? 1 : Math.max(0.2, 1 - slidePos / 140),
        }}
      >
        {disabled
          ? (language === 'tl' ? 'Naghihintay na simulan ang biyahe...' : 'Waiting for trip to start...')
          : (language === 'tl' ? 'Slide to Finish Trip >>>' : 'Slide to Finish Trip >>>')}
      </Typography>

      <Box
        sx={{
          position: 'absolute',
          left: 4 + (disabled ? 0 : slidePos),
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          backgroundColor: disabled ? '#94A3B8' : '#FF6B00',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: disabled ? 'none' : '0 4px 12px rgba(255, 107, 0, 0.4)',
          transition: isDragging.current ? 'none' : 'left 0.25s ease',
        }}
      >
        <CheckCircleIcon sx={{ fontSize: 24 }} />
      </Box>
    </Box>
  );
};

export const TripMonitoring: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();

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
      booking_status: 'Pending',
      eta_minutes: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [leaveConfirmModalOpen, setLeaveConfirmModalOpen] = useState(false);
  const [commModalOpen, setCommModalOpen] = useState(false);
  const [selectedSmsTemplate, setSelectedSmsTemplate] = useState<string>('');
  const [customSms, setCustomSms] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Bidirectional Driver Cancelled Alert State
  const [driverCancelledAlertOpen, setDriverCancelledAlertOpen] = useState(false);
  const [driverCancelReason, setDriverCancelReason] = useState<string>('');

  // Draggable Bottom Sheet State
  const [isExpanded, setIsExpanded] = useState(false);
  const [dragY, setDragY] = useState(0);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);

  const handleCopyBookingId = () => {
    if (activeBookingId) {
      navigator.clipboard.writeText(activeBookingId);
      setToastMessage(
        language === 'tl'
          ? `Na-copy ang Buong Booking ID: ${activeBookingId}`
          : `Full Booking ID Copied: ${activeBookingId}`
      );
    }
  };

  const handleDragStart = (e: React.PointerEvent | React.TouchEvent) => {
    isDraggingRef.current = true;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;
    startYRef.current = clientY;
  };

  const handleDragMove = (e: React.PointerEvent | React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;
    const deltaY = clientY - startYRef.current;
    // Strict drag bounds (maxDrag = 180px) so bottom sheet never pulls off-screen
    const clamped = Math.max(-180, Math.min(180, deltaY));
    setDragY(clamped);
  };

  const handleDragEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (dragY < -40) {
      setIsExpanded(true);
    } else if (dragY > 40) {
      setIsExpanded(false);
    }
    setDragY(0);
  };

  // Workflow Step 12: Trip Completion & Fare Confirmation State
  const [completionFareModalOpen, setCompletionFareModalOpen] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputedAmount, setDisputedAmount] = useState('');
  const [disputeCategory, setDisputeCategory] = useState('Overcharging Attempt');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);

  const handlePassengerFinishTrip = async () => {
    try {
      localStorage.setItem(`passenger_finished_${activeBookingId}`, 'true');
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeBookingId)) {
        await supabase
          .from('booking')
          .update({
            booking_status: 'Arrived at Destination',
            arrived_at: new Date().toISOString(),
          })
          .eq('booking_id', activeBookingId);
      }

      const channel = supabase.channel(`booking_sync_${activeBookingId}`);
      await channel.send({
        type: 'broadcast',
        event: 'passenger_finished',
        payload: { bookingId: activeBookingId, passenger_finished: true },
      });
    } catch (err) {
      console.warn('[TripMonitoring] markPassengerFinished error:', err);
    }
    setCompletionFareModalOpen(true);
  };

  const handlePassengerPaid = async () => {
    try {
      localStorage.setItem(`payment_confirmed_${activeBookingId}`, 'true');
      localStorage.setItem(`passenger_finished_${activeBookingId}`, 'true');
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeBookingId)) {
        await supabase
          .from('booking')
          .update({
            booking_status: 'Completed',
            actual_fare: passengerPayableFare,
            trip_completed_at: new Date().toISOString(),
          })
          .eq('booking_id', activeBookingId);
      }

      const channel = supabase.channel(`booking_sync_${activeBookingId}`);
      await channel.send({
        type: 'broadcast',
        event: 'payment_confirmed',
        payload: { bookingId: activeBookingId, payment_confirmed: true },
      });

      updateBookingState(activeBookingId, {
        booking_status: 'Completed',
        actual_fare: passengerPayableFare,
      });
    } catch (err) {
      console.warn('[TripMonitoring] handlePassengerPaid error:', err);
    }
    setCompletionFareModalOpen(true);
  };


  // Driver Location Telemetry
  const [driverPos, setDriverPos] = useState({
    lat: booking?.driver_latitude || 13.4140,
    lng: booking?.driver_longitude || 121.1845,
  });
  const hasLiveDriverGpsRef = useRef(false);

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
              franchise_number,
              plate_number,
              current_latitude,
              current_longitude,
              toda:toda_id (toda_name)
            )
          `)
          .eq('booking_id', activeBookingId)
          .maybeSingle();

        if (!error && data) {
          const d = data as any;
          const driverInfo = Array.isArray(d.driver) ? d.driver[0] : d.driver;
          const todaInfo = driverInfo?.toda ? (Array.isArray(driverInfo.toda) ? driverInfo.toda[0] : driverInfo.toda) : null;

          const mappedStatus = mapBookingStatus(d.booking_status);

          const drvLat = driverInfo?.current_latitude ?? d.driver_latitude;
          const drvLng = driverInfo?.current_longitude ?? d.driver_longitude;
          if (drvLat && drvLng && !hasLiveDriverGpsRef.current) {
            setDriverPos({
              lat: Number(drvLat),
              lng: Number(drvLng),
            });
          }

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
              franchise_no: driverInfo?.franchise_number || prev?.franchise_no || 'CAL-2025-0773',
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

  // Listen to Supabase Realtime for updates and broadcast for driver GPS
  useEffect(() => {
    if (!activeBookingId) return;

    // Polling fallback in case Supabase Realtime is not enabled on the dashboard
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('booking')
          .select(`
            booking_status,
            actual_fare,
            created_at,
            driver_id,
            cancelled_by,
            cancellation_reason,
            driver:driver_id (
              current_latitude,
              current_longitude
            )
          `)
          .eq('booking_id', activeBookingId)
          .maybeSingle();

        if (!error && data) {
          const d = data as any;
          if (d.booking_status === 'Cancelled' && (d.cancelled_by === 'driver' || !d.cancelled_by)) {
            setDriverCancelReason(d.cancellation_reason || (language === 'tl' ? 'Kinansela ng drayber ang booking' : 'The driver cancelled the booking'));
            setDriverCancelledAlertOpen(true);
          }

          const drv = Array.isArray(d.driver) ? d.driver[0] : d.driver;
          if (drv?.current_latitude && drv?.current_longitude && !hasLiveDriverGpsRef.current) {
            setDriverPos({
              lat: Number(drv.current_latitude),
              lng: Number(drv.current_longitude),
            });
          }

          setBooking((prev) => {
            if (prev?.booking_status === d.booking_status) return prev; // No change
            
            const mappedStatus = mapBookingStatus(d.booking_status);

            const merged: BookingRecord = {
              ...(prev || ({} as any)),
              booking_status: mappedStatus as any,
              actual_fare: d.actual_fare !== null && d.actual_fare !== undefined ? Number(d.actual_fare) : prev?.actual_fare,
              updated_at: new Date().toISOString(),
            };
            updateBookingState(activeBookingId, merged);

            if (mappedStatus === 'Completed') {
              setCompletionFareModalOpen(true);
            }
            return merged;
          });
        }
      } catch (err) {
        // ignore polling errors
      }
    }, 5000);

    const syncChannel = supabase.channel(`booking_sync_${activeBookingId}`);
    syncChannel
      .on('broadcast', { event: 'booking_cancelled' }, (payload: any) => {
        if (payload.payload?.cancelled_by === 'driver' || payload.payload?.cancelledBy === 'driver') {
          setDriverCancelReason(payload.payload?.reason || (language === 'tl' ? 'Kinansela ng drayber ang booking' : 'The driver cancelled the booking'));
          setDriverCancelledAlertOpen(true);
        }
      })
      .subscribe();

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
            if (row.booking_status === 'Cancelled' && (row.cancelled_by === 'driver' || !row.cancelled_by)) {
              setDriverCancelReason(row.cancellation_reason || (language === 'tl' ? 'Kinansela ng drayber ang booking' : 'The driver cancelled the booking'));
              setDriverCancelledAlertOpen(true);
            }

            if (row.driver_latitude && row.driver_longitude && !hasLiveDriverGpsRef.current) {
              setDriverPos({
                lat: Number(row.driver_latitude),
                lng: Number(row.driver_longitude),
              });
            }

            setBooking((prev) => {
              const mappedStatus = mapBookingStatus(row.booking_status);

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
      .on('broadcast', { event: 'driver_location' }, (payload: any) => {
        if (payload.payload?.lat && payload.payload?.lng) {
          hasLiveDriverGpsRef.current = true;
          setDriverPos({
            lat: payload.payload.lat,
            lng: payload.payload.lng,
          });
        }
      })
      .on('broadcast', { event: 'booking_cancelled' }, (payload: any) => {
        if (payload.payload?.cancelled_by === 'driver' || payload.payload?.cancelledBy === 'driver') {
          setDriverCancelReason(payload.payload?.reason || (language === 'tl' ? 'Kinansela ng drayber ang booking' : 'The driver cancelled the booking'));
          setDriverCancelledAlertOpen(true);
        }
      })
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
      supabase.removeChannel(syncChannel);
    };
  }, [activeBookingId, language]);

  const status = booking?.booking_status || 'Searching Driver';
  const isTripActive = status !== 'Completed' && status !== 'Cancelled';

  const handleBackRequest = () => {
    if (isTripActive) {
      setLeaveConfirmModalOpen(true);
    } else {
      navigate('/dashboard');
    }
  };

  const handleCancelTrip = async (reasonText?: string) => {
    const finalReason = reasonText || (language === 'tl' ? 'Kinansela ng pasahero bago ang pickup' : 'Passenger cancelled before pickup');
    try {
      const syncChannel = supabase.channel(`booking_sync_${activeBookingId}`);
      await syncChannel.send({
        type: 'broadcast',
        event: 'booking_cancelled',
        payload: {
          bookingId: activeBookingId,
          cancelled_by: 'passenger',
          reason: finalReason,
        },
      });
    } catch (err) {
      console.warn('[TripMonitoring] Broadcast cancel note:', err);
    }

    await cancelBooking(activeBookingId, finalReason);
    setCancelModalOpen(false);
    sessionStorage.removeItem('current_active_booking_id');
    navigate('/dashboard');
  };

  const handleOpenCommModal = () => {
    setSelectedSmsTemplate('');
    setCustomSms('');
    setCommModalOpen(true);
  };

  const handleSendSmsClick = () => {
    const finalMsg = selectedSmsTemplate === 'custom' ? customSms.trim() : selectedSmsTemplate;
    if (!finalMsg) return;

    const cleanPhone = driverPhone.replace(/[^\d+]/g, '');
    const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(finalMsg)}`;

    try {
      window.location.href = smsUrl;
    } catch (err) {
      console.warn('[TripMonitoring] SMS launch error:', err);
    }

    setToastMessage(
      language === 'tl'
        ? `Binubuksan ang SMS app para magpadala ng mensahe...`
        : `Opening SMS app to send message...`
    );

    setCommModalOpen(false);
    setSelectedSmsTemplate('');
    setCustomSms('');
  };

  const driverName = booking?.driver_name || 'Aurelio Bautista';
  const driverPhone = booking?.driver_phone || '+63 917 111 0201';
  const franchiseNo = booking?.franchise_no || 'CAL-2025-0773';
  const plateNo = booking?.vehicle_plate || '773-MV';
  const todaName = booking?.toda_name || 'Calapan Central TODA';
  const passengerPayableFare = booking?.proportionate_fare || booking?.actual_fare || booking?.estimated_fare || 18.0;

  const isPreTrip =
    status === 'Searching Driver' ||
    status === 'Driver Assigned' ||
    status === 'Driver En Route' ||
    status === 'Driver Arrived';

  const pickupLat = booking?.pickup_latitude || 13.4124;
  const pickupLng = booking?.pickup_longitude || 121.1834;
  const dropoffLat = booking?.dropoff_latitude || 13.4150;
  const dropoffLng = booking?.dropoff_longitude || 121.1810;

  const totalTripKm = calculateHaversineKm(pickupLat, pickupLng, dropoffLat, dropoffLng);
  const driverToPickupKm = calculateHaversineKm(driverPos.lat, driverPos.lng, pickupLat, pickupLng);
  const driverToDropoffKm = calculateHaversineKm(driverPos.lat, driverPos.lng, dropoffLat, dropoffLng);

  let tripProgress = 0;
  if (status === 'Trip Ongoing') {
    if (totalTripKm > 0) {
      const remainingKm = Math.min(totalTripKm, driverToDropoffKm);
      tripProgress = Math.max(5, Math.min(95, Math.round(((totalTripKm - remainingKm) / totalTripKm) * 100)));
    } else {
      tripProgress = 50;
    }
  } else if (status === 'Arrived at Destination' || status === 'Completed') {
    tripProgress = 100;
  }

  return (
    <Box sx={{ width: '100%', height: '100%', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {/* 1. Header Bar matching Settings PageHeader */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          width: '100%',
          pt: 'calc(var(--safe-area-top) + 12px)',
          pb: 1.5,
          px: 2,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #F1F5F9',
          flexShrink: 0,
          zIndex: 20,
        }}
      >
        {!isTripActive ? (
          <IconButton
            onClick={handleBackRequest}
            aria-label="Go back"
            sx={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              color: '#1A1A1A',
              borderRadius: '14px',
              width: '44px',
              height: '44px',
              '&:hover': { backgroundColor: '#F8FAFC' },
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 20 }} />
          </IconButton>
        ) : (
          <Box sx={{ width: '44px' }} />
        )}

        <Box sx={{ textAlign: 'center', flex: 1 }}>
          <Typography
            sx={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#0F172A',
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            {language === 'tl' ? 'Pagsubaybay sa Biyahe' : 'Trip Monitoring'}
          </Typography>
          <Typography
            sx={{
              fontSize: '11px',
              color: '#64748B',
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            Booking: <strong onClick={handleCopyBookingId} style={{ cursor: 'pointer' }} title="Click to copy full Booking ID">{formatShortBookingId(activeBookingId)}</strong>
          </Typography>
        </Box>

        <Box sx={{ width: '44px' }} />

      </Box>

      {/* 2. Full Surface Map View */}
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#E3ECEF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <MapView
          pickupLocation={{
            lat: pickupLat,
            lng: pickupLng,
          }}
          dropoffLocation={
            isPreTrip
              ? undefined
              : {
                  lat: dropoffLat,
                  lng: dropoffLng,
                }
          }
          driverLocation={status !== 'Searching Driver' ? driverPos : null}
        />

        {/* Status Pill Badge */}
        <Chip
          label={
            status === 'Searching Driver'
              ? (language === 'tl' ? 'Naghahanap ng pinakamalapit na Tricycle...' : 'Finding nearest tricycle...')
              : status === 'Driver Assigned' || status === 'Driver En Route'
              ? (language === 'tl'
                  ? `Papunta na ang Driver • ${formatDistance(driverToPickupKm)} (~${Math.max(1, Math.round(driverToPickupKm * 3))} min)`
                  : `Driver en route • ${formatDistance(driverToPickupKm)} (~${Math.max(1, Math.round(driverToPickupKm * 3))} min)`)
              : status === 'Driver Arrived'
              ? (language === 'tl' ? 'Nandito na ang Tricycle sa Pickup Point!' : 'Tricycle has arrived at the pickup point!')
              : status === 'Trip Ongoing'
              ? (language === 'tl'
                  ? `Bumibiyahe sa Destinasyon • ${tripProgress}% (${formatDistance(driverToDropoffKm)} naiwan)`
                  : `Traveling to destination • ${tripProgress}% (${formatDistance(driverToDropoffKm)} left)`)
              : (language === 'tl' ? 'Nakumpleto na ang Biyahe!' : 'Trip Completed!')
          }
          sx={{
            position: 'absolute',
            top: 16,
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

        {/* Telemetry Badge */}
        <Typography
          sx={{
            position: 'absolute',
            bottom: 12,
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

      {/* 3. Driver & Trip Details (Mobile Draggable Bottom Sheet) */}
      <Paper
        elevation={8}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        className="hide-scrollbar"
        sx={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px 24px 0 0',
          padding: '12px 20px calc(var(--safe-area-bottom) + 16px) 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          zIndex: 20,
          width: '100%',
          maxHeight: isExpanded ? '78vh' : '38vh',
          transform: dragY !== 0 ? `translateY(${dragY}px)` : 'none',
          transition: isDraggingRef.current ? 'none' : 'max-height 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.2s ease',
          boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.08)',
          overflowY: isExpanded ? 'auto' : 'hidden',
        }}
      >
        {/* Drag Handle Bar */}
        <Box
          onClick={() => setIsExpanded(!isExpanded)}
          sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'grab',
            py: 0.5,
            userSelect: 'none',
          }}
        >
          <Box sx={{ width: 40, height: 5, borderRadius: 3, backgroundColor: '#CBD5E1', mb: 0.5 }} />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
              color: isExpanded ? '#FF6B00' : '#94A3B8',
              transition: 'color 0.2s ease',
            }}
          >
            {isExpanded ? (
              <>
                <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
                <Typography sx={{ fontSize: '11px', fontWeight: 600, fontFamily: 'Poppins, sans-serif' }}>
                  {language === 'tl' ? 'Scroll down to continue trip' : 'Scroll down to continue trip'}
                </Typography>
                <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
              </>
            ) : (
              <>
                <KeyboardArrowUpIcon sx={{ fontSize: 16 }} />
                <Typography sx={{ fontSize: '11px', fontWeight: 600, fontFamily: 'Poppins, sans-serif' }}>
                  {language === 'tl' ? 'Scroll up to cancel trip' : 'Scroll up to cancel trip'}
                </Typography>
                <KeyboardArrowUpIcon sx={{ fontSize: 16 }} />
              </>
            )}
          </Box>
        </Box>

        {/* Driver Identity Card */}
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
            <IconButton onClick={handleOpenCommModal} sx={{ backgroundColor: '#FFF8F0', color: '#FF6B00' }}>
              <MessageIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Driver En Route Proximity Box */}
        {(status === 'Driver Assigned' || status === 'Driver En Route') && (
          <Box
            sx={{
              p: '10px 14px',
              borderRadius: '12px',
              backgroundColor: '#FFF7ED',
              border: '1.5px solid #FFD6B3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '10.5px', fontWeight: 700, color: '#C2410C', letterSpacing: '0.4px' }}>
                {language === 'tl' ? 'DRAYBER PAPUNTA SA PICKUP' : 'DRIVER HEADING TO PICKUP'}
              </Typography>
              <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#9A3412' }}>
                {formatDistance(driverToPickupKm)} away
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#EA580C' }}>
              ETA ~{Math.max(1, Math.round(driverToPickupKm * 3))} min
            </Typography>
          </Box>
        )}

        {/* Live Trip Progress Bar (Ongoing Trip) */}
        {status === 'Trip Ongoing' && (
          <Box
            sx={{
              p: '12px 16px',
              borderRadius: '14px',
              backgroundColor: '#F8FAFC',
              border: '1.5px solid #E2E8F0',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.4px' }}>
                {language === 'tl' ? 'PROGRESO NG BIYAHE' : 'TRIP PROGRESS'}
              </Typography>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 800, color: '#FF6B00' }}>
                {tripProgress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={tripProgress}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: '#E2E8F0',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: '#FF6B00',
                  borderRadius: 4,
                },
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.75 }}>
              <Typography sx={{ fontSize: '11px', color: '#64748B' }}>
                {language === 'tl' ? 'Natitira:' : 'Remaining:'} <strong>{formatDistance(driverToDropoffKm)}</strong>
              </Typography>
              <Typography sx={{ fontSize: '11px', color: '#64748B' }}>
                ETA: <strong>~{Math.max(1, Math.round(driverToDropoffKm * 3))} min</strong>
              </Typography>
            </Box>
          </Box>
        )}

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
                ? (language === 'tl'
                    ? 'Nakatipid ka ng 25%! Nabawasan ang iyong pamasahe dahil may kasamang commuter sa ruta.'
                    : 'You saved 25%! Your fare was reduced with a shared commuter along the route.')
                : (language === 'tl'
                    ? 'Makatipid kapag may karagdagang commuter sa inyong ruta (hanggang 4 pinagsamang pasahero).'
                    : 'Save when an additional commuter shares your route (up to 4 passengers combined).')}
            </Typography>
          </Box>
        )}

        {/* Real-time Paired Commuter Notification Banner */}
        {Boolean(booking?.paired_passenger_name || (booking?.paired_booking_count && booking.paired_booking_count > 1)) && (
          <Box sx={{ p: '12px 16px', borderRadius: '16px', backgroundColor: '#ECFDF5', border: '1.5px solid #10B981', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <GroupsIcon sx={{ color: '#10B981', fontSize: 26 }} />
            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#065F46' }}>
                🎉 {language === 'tl' ? 'May Kasabay na Commuter!' : 'Commuter Paired!'} ({booking?.paired_passenger_name || 'Joshua Dizon'})
              </Typography>
              <Typography sx={{ fontSize: '11px', color: '#047857' }}>
                {language === 'tl'
                  ? `Nahati ang pamasahe! Bagong babayaran: ₱${passengerPayableFare.toFixed(2)}`
                  : `Fare split applied! New fare: ₱${passengerPayableFare.toFixed(2)}`}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Final Fare Display */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.5 }}>
          <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#64748B' }}>
            {booking?.proportionate_fare
              ? (language === 'tl' ? 'Proportionate Shared Fare:' : 'Proportionate Shared Fare:')
              : (language === 'tl' ? 'Kabuuang Pamasahe:' : 'Total Fare:')}
          </Typography>
          <Typography sx={{ fontSize: '24px', fontWeight: 900, color: '#FF6B00' }}>
            ₱{passengerPayableFare.toFixed(2)}
          </Typography>
        </Box>

        {/* Draggable Sheet Revealed Actions (Finish Trip & Visually Separated Cancel Trip) */}
        {status === 'Arrived at Destination' ? (
          <Box sx={{ pt: 1, mt: 0.5 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={handlePassengerPaid}
              sx={{
                height: 50,
                borderRadius: '14px',
                backgroundColor: '#10B981',
                fontWeight: 800,
                fontSize: '15px',
                textTransform: 'none',
                fontFamily: 'Poppins, sans-serif',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                '&:hover': { backgroundColor: '#059669' },
              }}
            >
              {language === 'tl' ? 'Nabayaran Ko Na (I Paid)' : 'I Paid'}
            </Button>
          </Box>
        ) : status !== 'Completed' && (
          <Box sx={{ pt: 1, borderTop: '1px solid #F1F5F9', mt: 0.5 }}>
            {/* Initial Collapsed View: Slide to Finish Trip (Disabled until driver clicks Start Trip) */}
            <Box
              sx={{
                opacity: isExpanded ? 0 : 1,
                maxHeight: isExpanded ? '0px' : '140px',
                overflow: 'hidden',
                transition: 'opacity 0.3s ease, max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                pointerEvents: isExpanded ? 'none' : 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
              }}
            >
              <SlideToFinish
                onFinish={handlePassengerFinishTrip}
                language={language}
                disabled={status !== 'Trip Ongoing'}
              />
            </Box>

            {/* Revealed Expanded View: Visually Separated Slide to Cancel */}
            <Box
              sx={{
                opacity: isExpanded ? 1 : 0,
                maxHeight: isExpanded ? '140px' : '0px',
                overflow: 'hidden',
                transition: 'opacity 0.3s ease, max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                pointerEvents: isExpanded ? 'auto' : 'none',
                mt: isExpanded ? 1 : 0,
                pt: isExpanded ? 1.5 : 0,
                borderTop: isExpanded ? '1px dashed #FCA5A5' : 'none',
                textAlign: 'center',
                width: '100%',
              }}
            >
              <SlideToCancel onCancel={() => setCancelModalOpen(true)} language={language} />
            </Box>
          </Box>
        )}

      </Paper>

      {/* 4. Cancellation Confirmation Modal */}
      <PassengerCancelModal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirmCancel={handleCancelTrip}
        language={language}
      />

      {/* 5. Passenger SMS Communication Modal */}
      <Dialog
        open={commModalOpen}
        onClose={() => setCommModalOpen(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: '24px', p: 1 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography sx={{ fontSize: '17px', fontWeight: 800 }}>
            {language === 'tl' ? `Mensahe kay Driver ${driverName.split(' ')[0]}` : `Message Driver ${driverName.split(' ')[0]}`}
          </Typography>
          <IconButton onClick={() => setCommModalOpen(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
          <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
            {language === 'tl' ? 'PUMILI NG MENSAHE' : 'SELECT A MESSAGE'}
          </Typography>

          <FormControl component="fieldset">
            <RadioGroup
              value={selectedSmsTemplate}
              onChange={(e) => setSelectedSmsTemplate(e.target.value)}
            >
              {(language === 'tl'
                ? [
                    'Nandito na po ako sa labas.',
                    'Nasa tapat po ako ng gate.',
                    'Pakibilisan po ng konti. Salamat!',
                  ]
                : [
                    "I'm waiting outside.",
                    "I'm in front of the gate.",
                    "Please hurry if possible. Thank you!",
                  ]
              ).map((tpl, i) => (
                <FormControlLabel
                  key={i}
                  value={tpl}
                  control={<Radio size="small" sx={{ color: '#FF6B00', '&.Mui-checked': { color: '#FF6B00' } }} />}
                  label={<Typography sx={{ fontSize: '13px', fontWeight: 500, fontFamily: 'Poppins, sans-serif' }}>{tpl}</Typography>}
                  sx={{ py: 0.5 }}
                />
              ))}
              <FormControlLabel
                value="custom"
                control={<Radio size="small" sx={{ color: '#FF6B00', '&.Mui-checked': { color: '#FF6B00' } }} />}
                label={
                  <Typography sx={{ fontSize: '13px', fontWeight: 500, fontFamily: 'Poppins, sans-serif' }}>
                    {language === 'tl' ? 'Iba pang mensahe...' : 'Custom message'}
                  </Typography>
                }
                sx={{ py: 0.5 }}
              />
            </RadioGroup>
          </FormControl>

          {selectedSmsTemplate === 'custom' && (
            <TextField
              fullWidth
              multiline
              rows={2}
              size="small"
              placeholder={language === 'tl' ? "I-type ang mensahe dito..." : "Type custom message here..."}
              value={customSms}
              onChange={(e) => setCustomSms(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' }, mt: 0.5 }}
            />
          )}

          <Button
            variant="contained"
            fullWidth
            onClick={handleSendSmsClick}
            disabled={!selectedSmsTemplate || (selectedSmsTemplate === 'custom' && !customSms.trim())}
            startIcon={<SendIcon />}
            sx={{
              mt: 1,
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#FF6B00',
              fontWeight: 700,
              fontSize: '14px',
              textTransform: 'none',
              fontFamily: 'Poppins, sans-serif',
              '&:hover': { backgroundColor: '#E05000' },
              '&.Mui-disabled': { backgroundColor: '#CBD5E1', color: '#94A3B8' },
            }}
          >
            {language === 'tl' ? 'Ipadala ang Mensahe' : 'Send Message'}
          </Button>
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
          {language === 'tl' ? 'Kasalukuyang Aktibo ang Biyahe' : 'Trip Is Currently Active'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
            {language === 'tl'
              ? 'Mayroon kang tumatakbong biyahe. Nais mo bang pumunta sa Dashboard? Mananatiling aktibo ang iyong booking at maaari kang bumalik sa tracking anumang oras.'
              : 'You have an ongoing trip. Do you want to return to the Dashboard? Your booking will remain active and you can return to tracking anytime.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={() => setLeaveConfirmModalOpen(false)}
            sx={{ borderRadius: '12px', backgroundColor: '#FF6B00', fontWeight: 700, height: '44px', textTransform: 'none', '&:hover': { backgroundColor: '#E05000' } }}
          >
            {language === 'tl' ? 'Manatili sa Tracking' : 'Stay on Tracking'}
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
            {language === 'tl' ? 'Pumunta sa Dashboard' : 'Go to Dashboard'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 7. Arrived at Destination! Modal with Expanded Padding, Spacing, and Centered Tariff */}
      <Dialog
        open={completionFareModalOpen}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: '28px', p: 3, textAlign: 'center' } } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5, mt: 0.5 }}>
          <CheckCircleIcon sx={{ fontSize: 60, color: '#10B981' }} />
        </Box>
        <Typography sx={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
          {language === 'tl' ? 'Nakarating na sa Destinasyon!' : 'Arrived at Destination!'}
        </Typography>
        <Typography sx={{ fontSize: '13.5px', color: '#64748B', mb: 2.5, px: 1 }}>
          {language === 'tl'
            ? 'Pakisuri ang siningil na pamasahe ng drayber bago magpatuloy.'
            : 'Please verify the fare charged by the driver before proceeding.'}
        </Typography>

        <Paper elevation={0} sx={{ p: 2.5, borderRadius: '20px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', mb: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', letterSpacing: '0.5px', textAlign: 'center', display: 'block' }}>
            {language === 'tl' ? 'OPISYAL NA PAMASAHE' : 'OFFICIAL TARIFF FARE'}
          </Typography>
          <Typography sx={{ fontSize: '34px', fontWeight: 900, color: '#FF6B00', my: 1, textAlign: 'center' }}>
            ₱{passengerPayableFare.toFixed(2)}
          </Typography>
          <Typography sx={{ fontSize: '11.5px', color: '#94A3B8', textAlign: 'center', display: 'block' }}>
            {language === 'tl' ? 'Batay sa Calapan City Ordinance No. 118' : 'Based on Calapan City Ordinance No. 118'}
          </Typography>
        </Paper>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={() => {
              setCompletionFareModalOpen(false);
              sessionStorage.removeItem('current_active_booking_id');
              sessionStorage.removeItem('trip_dropoff');
              sessionStorage.removeItem('trip_pickup');
              sessionStorage.removeItem('trip_notes');
              updateBookingState(activeBookingId, {
                booking_status: 'Completed',
                actual_fare: passengerPayableFare,
              });
              navigate('/feedback', {
                replace: true,
                state: {
                  booking: {
                    ...booking,
                    booking_status: 'Completed',
                    actual_fare: passengerPayableFare,
                  },
                },
              });
            }}
            sx={{
              height: '52px',
              borderRadius: '16px',
              backgroundColor: '#10B981',
              fontWeight: 800,
              fontSize: '14.5px',
              textTransform: 'none',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              '&:hover': { backgroundColor: '#059669' },
            }}
          >
            {language === 'tl'
              ? `Nagbayad ako ng ₱${passengerPayableFare.toFixed(2)} (Tama ang Bayad)`
              : `I paid ₱${passengerPayableFare.toFixed(2)} (Fare Verified)`}
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
              height: '46px',
              borderRadius: '16px',
              fontWeight: 700,
              fontSize: '13.5px',
              textTransform: 'none',
              borderColor: '#FCA5A5',
              color: '#EF4444',
            }}
          >
            {language === 'tl' ? "Amount Doesn't Match (May Aberya)" : "Amount Doesn't Match (Dispute Fare)"}
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
            {language === 'tl' ? 'Isumite ang Reklamo sa LGU' : 'Submit Dispute to City LGU'}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
          {disputeSubmitted ? (
            <Alert severity="success" sx={{ borderRadius: '12px' }}>
              {language === 'tl'
                ? `Naisumite na ang iyong reklamo sa City LGU Transport Board (Incident #${activeBookingId}). Iimbestigahan ito agad.`
                : `Your complaint has been submitted to the City LGU Transport Board (Incident #${activeBookingId}). It will be investigated promptly.`}
            </Alert>
          ) : (
            <>
              <Typography sx={{ fontSize: '12.5px', color: '#64748B' }}>
                {language === 'tl'
                  ? 'Ipapadala ang ulat na ito sa City LGU Administrator sa ilalim ng Complaint & Incident Management.'
                  : 'This report is sent directly to the City LGU Administrator under Complaint & Incident Management.'}
              </Typography>

              <TextField
                select
                fullWidth
                size="small"
                label={language === 'tl' ? "Uri ng Reklamo" : "Dispute Category"}
                value={disputeCategory}
                onChange={(e) => setDisputeCategory(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              >
                <MenuItem value="Overcharging Attempt">
                  {language === 'tl' ? 'Overcharging (Sobra ang singil sa pamasahe)' : 'Overcharging (Exceeded official tariff)'}
                </MenuItem>
                <MenuItem value="Refusal to Follow Tariff">
                  {language === 'tl' ? 'Refusal to Follow Tariff (Hindi sumunod sa taripa)' : 'Refusal to Follow Tariff (Arbitrary pricing)'}
                </MenuItem>
                <MenuItem value="Unauthorized Route">
                  {language === 'tl' ? 'Unauthorized Route (Maling ruta)' : 'Unauthorized Route (Unscheduled detour)'}
                </MenuItem>
                <MenuItem value="Rude Behavior">
                  {language === 'tl' ? 'Rude Behavior (Hindi magandang asal)' : 'Rude Behavior / Harassment'}
                </MenuItem>
              </TextField>

              <TextField
                fullWidth
                size="small"
                label={language === 'tl' ? "Halagang Siningil ng Drayber (₱)" : "Amount Charged by Driver (₱)"}
                type="number"
                placeholder={language === 'tl' ? "Hal. 50" : "e.g. 50"}
                value={disputedAmount}
                onChange={(e) => setDisputedAmount(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />

              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                label={language === 'tl' ? "Paliwanag o Detalye" : "Explanation or Details"}
                placeholder={language === 'tl' ? "Pakilarawan ang nangyari..." : "Please describe what happened..."}
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
              {language === 'tl' ? 'Kanselahin' : 'Cancel'}
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
              {language === 'tl' ? 'Isumite sa LGU' : 'Submit to LGU'}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* Bidirectional Driver Cancellation Realtime Notification Modal */}
      <Dialog
        open={driverCancelledAlertOpen}
        onClose={() => {
          setDriverCancelledAlertOpen(false);
          sessionStorage.removeItem('current_active_booking_id');
          navigate('/dashboard', { replace: true });
        }}
        slotProps={{
          paper: {
            sx: { borderRadius: '24px', p: 1.5, backgroundColor: '#FFFFFF', maxWidth: '380px', width: '90%' },
          },
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pt: 2, pb: 1 }}>
          <CancelIcon sx={{ fontSize: 48, color: '#EF4444', mb: 1 }} />
          <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', fontFamily: 'Poppins, sans-serif' }}>
            {language === 'tl' ? 'Kanselado ang Biyahe' : 'Trip Cancelled'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 2 }}>
          <Typography sx={{ fontSize: '14px', color: '#475569', fontWeight: 600, fontFamily: 'Poppins, sans-serif' }}>
            {language === 'tl'
              ? 'Kinansela ng drayber ang booking.'
              : 'The driver has cancelled the booking.'}
          </Typography>
          {driverCancelReason && (
            <Box sx={{ mt: 1.5, p: '10px 14px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px' }}>
              <Typography sx={{ fontSize: '12.5px', color: '#B91C1C', fontWeight: 600, fontFamily: 'Poppins, sans-serif' }}>
                {language === 'tl' ? 'Rason:' : 'Reason:'} "{driverCancelReason}"
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => {
              setDriverCancelledAlertOpen(false);
              sessionStorage.removeItem('current_active_booking_id');
              navigate('/dashboard', { replace: true });
            }}
            sx={{
              height: 46,
              borderRadius: '14px',
              backgroundColor: '#FF6B00',
              fontWeight: 800,
              fontSize: '14px',
              textTransform: 'none',
              fontFamily: 'Poppins, sans-serif',
              boxShadow: '0 4px 14px rgba(255, 107, 0, 0.25)',
              '&:hover': { backgroundColor: '#E66000' },
            }}
          >
            {language === 'tl' ? 'OK (Mag-book Ulit)' : 'OK (Book Another Ride)'}
          </Button>
        </DialogActions>
      </Dialog>

      <SakayToast message={toastMessage} onClose={() => setToastMessage(null)} />
    </Box>
  );
};
