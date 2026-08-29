import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NavigationIcon from '@mui/icons-material/Navigation';
import PhoneIcon from '@mui/icons-material/Phone';
import MessageIcon from '@mui/icons-material/Message';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import MapView from '../../../common/components/MapView';
import { DriverCommunicationModal } from '../../communication/components/DriverCommunicationModal';
import { getMockBookingById, updateTripStage } from '@sakay/shared/mockDispatch';

export const DriverNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingId = (location.state as { bookingId?: string })?.bookingId || 'BKG-9011';

  const [booking, setBooking] = useState(() => getMockBookingById(bookingId));
  const [commModalOpen, setCommModalOpen] = useState(false);
  const [exitGuardOpen, setExitGuardOpen] = useState(false);
  const [eta, setEta] = useState(4);

  useEffect(() => {
    // Notify broker that driver is en route
    updateTripStage(bookingId, 'Driver En Route', 3);

    // Simulate ETA countdown
    const interval = setInterval(() => {
      setEta((prev) => (prev > 1 ? prev - 1 : 1));
    }, 4000);

    return () => clearInterval(interval);
  }, [bookingId]);

  const handleArrivedAtPickup = () => {
    updateTripStage(bookingId, 'Driver Arrived', 0);
    navigate('/driver/active-trip', { replace: true, state: { bookingId } });
  };

  const handleExitToHome = () => {
    setExitGuardOpen(false);
    navigate('/driver/home');
  };

  const passengerName = booking?.passenger_name || 'Maria Clara Santos';
  const passengerPhone = booking?.passenger_phone || '+63 917 555 1001';
  const pickupAddress = booking?.pickup_address || 'JP Rizal St. Central Terminal, Calapan City';
  const fare = booking?.estimated_fare || 18.0;

  return (
    <Box sx={{ width: '100%', height: '100%', backgroundColor: '#E3ECEF', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* 1. Leaflet OpenStreetMap Surface with Driver and Pickup markers */}
      <MapView
        userLocation={{ lat: 13.4117, lng: 121.1803 }}
        pickupLocation={{ lat: 13.4150, lng: 121.1825 }}
      />

      {/* 2. Top Floating Turn-by-Turn Instruction Banner */}
      <Paper
        elevation={6}
        sx={{
          position: 'absolute',
          top: 'calc(var(--safe-area-top) + 12px)',
          left: 16,
          right: 16,
          backgroundColor: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(8px)',
          color: '#FFFFFF',
          borderRadius: '20px',
          padding: '14px 16px',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.25)',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <IconButton
          onClick={() => setExitGuardOpen(true)}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            color: '#FFFFFF',
            width: 36,
            height: 36,
            borderRadius: '10px',
            flexShrink: 0,
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.25)' },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 18 }} />
        </IconButton>

        <Box sx={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#FF6B00', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(255, 107, 0, 0.4)' }}>
          <NavigationIcon sx={{ fontSize: 22, transform: 'rotate(0deg)' }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
            NEXT DIRECTION (IN 200M)
          </Typography>
          <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
            Turn right onto JP Rizal St. towards pickup point
          </Typography>
        </Box>
      </Paper>

      {/* 3. Bottom Route Summary Card */}
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
          zIndex: 20,
          borderTop: '1px solid #E2E8F0',
          boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.08)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 44, height: 44, backgroundColor: '#FF6B00', fontWeight: 800, fontSize: '16px' }}>
              {passengerName.charAt(0)}
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                {passengerName}
              </Typography>
              <Typography sx={{ fontSize: '12px', color: '#64748B' }}>
                Pickup: {pickupAddress.split(',')[0]}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={() => setCommModalOpen(true)} sx={{ backgroundColor: '#ECFDF5', color: '#10B981', '&:hover': { backgroundColor: '#D1FAE5' } }}>
              <PhoneIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={() => setCommModalOpen(true)} sx={{ backgroundColor: '#FFF8F0', color: '#FF6B00', '&:hover': { backgroundColor: '#FFE8D6' } }}>
              <MessageIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* ETA & Distance */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '10px 14px', borderRadius: '14px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <Box>
            <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>ESTIMATED ARRIVAL (ETA)</Typography>
            <Typography sx={{ fontSize: '17px', fontWeight: 900, color: '#0F172A' }}>{eta} mins</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>FARE</Typography>
            <Typography sx={{ fontSize: '17px', fontWeight: 900, color: '#FF6B00' }}>₱{fare.toFixed(2)}</Typography>
          </Box>
        </Box>

        {/* Arrival Confirmation Action Button */}
        <Button
          variant="contained"
          fullWidth
          onClick={handleArrivedAtPickup}
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
          Driver Arrived at Pickup
        </Button>
      </Paper>

      {/* Communication Dialog */}
      <DriverCommunicationModal
        open={commModalOpen}
        onClose={() => setCommModalOpen(false)}
        passengerName={passengerName}
        passengerPhone={passengerPhone}
      />

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
          Active Navigation En Route
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 1 }}>
          <Typography sx={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5 }}>
            You are currently en route to the pickup point of <strong>{passengerName}</strong>. Do you wish to cancel this navigation and return to Home?
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
            Stay in Navigation
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
            Cancel and Return to Home
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DriverNavigation;
