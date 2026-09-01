import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalTaxiIcon from '@mui/icons-material/LocalTaxi';

import MapView from '../../../common/components/MapView';
import { getMockBookingById, updateTripStage, completeBookingByDriver } from '@sakay/shared/mockDispatch';

export const DriverActiveTrip: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingId = (location.state as { bookingId?: string })?.bookingId || 'BKG-9011';

  const [booking, setBooking] = useState(() => getMockBookingById(bookingId));
  const [tripStarted, setTripStarted] = useState(false);
  const [progress, setProgress] = useState(0); // 0% to 100%
  const [exitGuardOpen, setExitGuardOpen] = useState(false);

  // Additional Shared Passenger State
  const [pairedPassenger, setPairedPassenger] = useState<string | null>(null);
  const [sharedPromptOpen, setSharedPromptOpen] = useState(false);
  const [hasPromptedShared, setHasPromptedShared] = useState(false);

  // Fare calculations
  const [currentFare, setCurrentFare] = useState(booking?.estimated_fare || 18.0);
  const [proportionateFareP1, setProportionateFareP1] = useState(booking?.estimated_fare || 18.0);

  // Simulated Trip Progress Timer
  useEffect(() => {
    if (!tripStarted) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 5;
        if (next >= 100) {
          clearInterval(interval);
          return 100;
        }

        // Section 3.4 Business Rule: Prompt mid-trip shared request ONLY while under 50% completion
        if (booking?.is_shared_trip && next >= 25 && next <= 45 && !hasPromptedShared) {
          setHasPromptedShared(true);
          setSharedPromptOpen(true);
        }

        return next;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [tripStarted, hasPromptedShared, booking?.is_shared_trip]);

  const handleStartTrip = () => {
    setTripStarted(true);
    updateTripStage(bookingId, 'Trip Ongoing', 5);
  };

  const handleAcceptSharedPassenger = () => {
    setPairedPassenger('Joshua Dizon (San Vicente High)');
    // Recalculate proportionate carpool fare: Base fare split + combined volume
    const newP1 = Math.round(currentFare * 0.75 * 100) / 100;
    const p2Fare = 15.0;
    setProportionateFareP1(newP1);
    setCurrentFare(newP1 + p2Fare);
    setSharedPromptOpen(false);

    // Notify broker of paired passenger update
    updateTripStage(bookingId, 'Trip Ongoing', 4, {
      paired_booking_count: 2,
      proportionate_fare: newP1,
    });
  };

  const handleDeclineSharedPassenger = () => {
    setSharedPromptOpen(false);
  };

  const handleCompleteTrip = () => {
    // For the passenger's individual record, set their payable share (proportionate fare if carpooled)
    const p1PayableFare = pairedPassenger ? proportionateFareP1 : currentFare;
    completeBookingByDriver(bookingId, p1PayableFare);
    navigate('/driver/earnings', {
      replace: true,
      state: {
        completedTrip: {
          bookingCode: booking?.booking_id || bookingId,
          passengerName: booking?.passenger_name || 'Maria Clara Santos',
          pickup: booking?.pickup_address || 'JP Rizal Central Terminal',
          dropoff: booking?.dropoff_address || 'Calapan City Public Market',
          fareAmount: currentFare,
          pairedPassenger,
          proportionateFareP1: pairedPassenger ? proportionateFareP1 : undefined,
        },
      },
    });
  };

  const handleExitToHome = () => {
    setExitGuardOpen(false);
    navigate('/driver/home');
  };

  const passengerName = booking?.passenger_name || 'Maria Clara Santos';
  const dropoffAddress = booking?.dropoff_address || 'Calapan City Public Market';

  return (
    <Box sx={{ width: '100%', height: '100%', backgroundColor: '#E3ECEF', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* 1. Leaflet OpenStreetMap Surface with Pickup and Dropoff markers */}
      <MapView
        pickupLocation={{ lat: 13.4117, lng: 121.1803 }}
        dropoffLocation={{ lat: 13.4180, lng: 121.1850 }}
        userLocation={{ lat: 13.4135, lng: 121.1818 }}
      />

      {/* 2. Top Floating Navigation Header */}
      <Paper
        elevation={6}
        sx={{
          position: 'absolute',
          top: 'calc(var(--safe-area-top) + 12px)',
          left: 16,
          right: 16,
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(8px)',
          borderRadius: '20px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 30,
          border: '1px solid #E2E8F0',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton
            onClick={() => setExitGuardOpen(true)}
            sx={{
              backgroundColor: '#F1F5F9',
              color: '#0F172A',
              width: 36,
              height: 36,
              borderRadius: '10px',
              '&:hover': { backgroundColor: '#E2E8F0' },
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Box>
            <Typography sx={{ fontSize: '10.5px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>
              {tripStarted ? 'ONGOING TRIP' : 'PASSENGER BOARDING'}
            </Typography>
            <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
              {dropoffAddress.split(',')[0]}
            </Typography>
          </Box>
        </Box>
        <Chip
          label={booking?.is_shared_trip ? 'Shared Ride' : 'Solo Charter'}
          size="small"
          sx={{ backgroundColor: '#FFF8F0', color: '#FF6B00', fontWeight: 800, border: '1px solid #FFD6B3' }}
        />
      </Paper>

      {/* 3. Floating Trip Progress Card */}
      <Paper
        elevation={6}
        sx={{
          position: 'absolute',
          top: 'calc(var(--safe-area-top) + 80px)',
          left: 16,
          right: 16,
          p: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderRadius: '18px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
          zIndex: 25,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
          <Typography sx={{ fontSize: '12px', color: '#64748B', fontWeight: 700 }}>
            Progress towards Destination
          </Typography>
          <Typography sx={{ fontSize: '14px', fontWeight: 900, color: '#FF6B00' }}>
            {progress}%
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: '#E2E8F0',
            '& .MuiLinearProgress-bar': { backgroundColor: '#FF6B00', borderRadius: 4 },
            mb: 1.5,
          }}
        />

        {/* Passenger Information Row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 36, height: 36, backgroundColor: '#FF6B00', fontWeight: 800, fontSize: '14px' }}>
            {passengerName.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{passengerName}</Typography>
            <Typography sx={{ fontSize: '11px', color: '#64748B' }}>Passenger #1 • {dropoffAddress.split(',')[0]}</Typography>
          </Box>
          <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#10B981' }}>
            ₱{proportionateFareP1.toFixed(2)}
          </Typography>
        </Box>

        {/* Paired Second Passenger (if accepted) */}
        {pairedPassenger && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, backgroundColor: '#ECFDF5', borderRadius: '12px', border: '1px solid #A7F3D0', mt: 1 }}>
            <Avatar sx={{ width: 30, height: 30, backgroundColor: '#10B981', color: '#FFFFFF', fontWeight: 800, fontSize: '12px' }}>
              J
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#065F46' }}>{pairedPassenger}</Typography>
              <Typography sx={{ fontSize: '10.5px', color: '#047857' }}>Passenger #2 (Shared Carpool)</Typography>
            </Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#047857' }}>
              ₱15.00
            </Typography>
          </Box>
        )}
      </Paper>

      {/* 4. Bottom Action Footer */}
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
          padding: '18px 20px calc(var(--safe-area-bottom) + 20px) 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          zIndex: 30,
          borderTop: '1px solid #E2E8F0',
          boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.08)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5 }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>
            Total Trip Fare:
          </Typography>
          <Typography sx={{ fontSize: '24px', fontWeight: 900, color: '#FF6B00' }}>
            ₱{currentFare.toFixed(2)}
          </Typography>
        </Box>

        {!tripStarted ? (
          <Button
            variant="contained"
            fullWidth
            onClick={handleStartTrip}
            startIcon={<LocalTaxiIcon />}
            sx={{
              height: 50,
              borderRadius: '14px',
              backgroundColor: '#10B981',
              fontWeight: 800,
              fontSize: '15px',
              textTransform: 'none',
              '&:hover': { backgroundColor: '#059669' },
            }}
          >
            Start Trip
          </Button>
        ) : (
          <Button
            variant="contained"
            fullWidth
            onClick={handleCompleteTrip}
            startIcon={<CheckCircleIcon />}
            sx={{
              height: 50,
              borderRadius: '14px',
              backgroundColor: '#FF6B00',
              fontWeight: 800,
              fontSize: '15px',
              textTransform: 'none',
              '&:hover': { backgroundColor: '#E66000' },
            }}
          >
            Complete Trip
          </Button>
        )}
      </Paper>

      {/* Mid-Trip Additional Shared Passenger Prompt (<50% Rule) */}
      <Dialog
        open={sharedPromptOpen}
        fullWidth
        maxWidth="xs"
        slotProps={{
          paper: {
            sx: {
              borderRadius: '24px',
              p: 1,
              backgroundColor: '#FFFFFF',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            },
          },
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Chip label="Mid-Trip Carpool Match (<50% Route)" color="warning" sx={{ fontWeight: 800 }} />
          <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', mt: 1 }}>
            Additional Passenger along Route?
          </Typography>
          <Typography sx={{ fontSize: '12.5px', color: '#64748B' }}>
            A commuter near San Vicente High is also heading towards City Hall.
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ py: 1 }}>
          <Box sx={{ p: 2, backgroundColor: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
            <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
              Passenger: Joshua Dizon (1 seat)
            </Typography>
            <Typography sx={{ fontSize: '12px', color: '#64748B', mt: 0.5 }}>
              Pickup: San Vicente NHS Gate (+200m detour)
            </Typography>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#10B981', mt: 1 }}>
              Extra Trip Earnings: +₱15.00
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: '12px 18px 18px', gap: 1.5 }}>
          <Button
            variant="outlined"
            fullWidth
            color="inherit"
            onClick={handleDeclineSharedPassenger}
            sx={{ height: 44, borderRadius: '12px', fontWeight: 700, textTransform: 'none' }}
          >
            Decline
          </Button>

          <Button
            variant="contained"
            fullWidth
            onClick={handleAcceptSharedPassenger}
            sx={{
              height: 44,
              borderRadius: '12px',
              backgroundColor: '#10B981',
              fontWeight: 800,
              textTransform: 'none',
              '&:hover': { backgroundColor: '#059669' },
            }}
          >
            Accept (+₱15)
          </Button>
        </DialogActions>
      </Dialog>

      {/* Exit Guard Confirmation Dialog */}
      <Dialog
        open={exitGuardOpen}
        onClose={() => setExitGuardOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '20px',
              padding: '8px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '17px', color: '#0F172A', textAlign: 'center' }}>
          Active Ongoing Trip
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 1 }}>
          <Typography sx={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5 }}>
            You currently have passenger(s) on board (<strong>{passengerName}</strong>). Do you want to return to Home? Your trip progress will remain active.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => setExitGuardOpen(false)}
            sx={{
              height: 46,
              borderRadius: '12px',
              backgroundColor: '#FF6B00',
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { backgroundColor: '#E66000' },
            }}
          >
            Stay in Trip
          </Button>
          <Button
            fullWidth
            variant="outlined"
            color="error"
            onClick={handleExitToHome}
            sx={{
              height: 44,
              borderRadius: '12px',
              fontWeight: 700,
              textTransform: 'none',
            }}
          >
            Return to Home
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DriverActiveTrip;
