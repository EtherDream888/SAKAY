import React from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { useLanguage } from '../../utils/LanguageContext';
import { useDriverSession } from '../../contexts/DriverSessionContext';
import { TYPOGRAPHY_TOKENS } from '@sakay/shared';

export const DriverIncomingRequestModal: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const {
    profile,
    incomingRequest,
    setIncomingRequest,
    currentAttemptId,
    countdown,
    handleDeclineRequest,
  } = useDriverSession();

  const handleAcceptRequest = async () => {
    if (!incomingRequest) return;

    const activeDriverId = profile.id || localStorage.getItem('sakay_driver_id') || '11111111-1111-1111-1111-111111111111';

    // Explicit Supabase update
    try {
      const updatePayload: any = {
        booking_status: 'Accepted',
        accepted_at: new Date().toISOString(),
      };
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeDriverId)) {
        updatePayload.driver_id = activeDriverId;
      }

      const { error } = await supabase
        .from('booking')
        .update(updatePayload)
        .eq('booking_id', incomingRequest.booking_id)
        .in('booking_status', ['Pending', 'Searching Driver']); // Concurrency check

      if (error) {
        console.warn('[DriverIncomingRequestModal] acceptBooking DB sync warning:', error.message);
        alert('Database Update Error: ' + error.message);
        return;
      }

      // Also mark attempt as Accepted with responded_at timestamp
      if (currentAttemptId) {
        await supabase
          .from('dispatch_attempt')
          .update({
            response_status: 'Accepted',
            responded_at: new Date().toISOString(),
          })
          .eq('attempt_id', currentAttemptId);
      }
    } catch (err: any) {
      console.warn('[DriverIncomingRequestModal] acceptBooking DB sync exception:', err);
      alert('Exception: ' + (err.message || err));
      return;
    }

    const activeId = incomingRequest.booking_id;
    setIncomingRequest(null);

    // Route to Active Navigation to Pickup
    navigate('/driver/navigation', { state: { bookingId: activeId, stage: 'pickup' } });
  };

  if (!incomingRequest) return null;

  return (
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
          sx={{ fontWeight: 800, fontSize: TYPOGRAPHY_TOKENS.fontSize.caption }}
        />
        <Typography sx={{ fontSize: TYPOGRAPHY_TOKENS.fontSize.pageTitle, fontWeight: 800, color: '#0F172A', mt: 1 }}>
          {incomingRequest.is_shared_trip
            ? (language === 'tl' ? 'Shared Commuter Ride' : 'Shared Commuter Ride')
            : (language === 'tl' ? 'Solo Trip' : 'Solo Trip')}
        </Typography>
        <Typography sx={{ fontSize: TYPOGRAPHY_TOKENS.fontSize.bodyMobile, color: '#64748B' }}>
          {language === 'tl' ? 'Pasahero:' : 'Passenger:'} <strong>{incomingRequest.passenger_name}</strong> • {incomingRequest.passenger_count} {language === 'tl' ? 'pasahero' : 'passenger(s)'}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ py: 1 }}>
        <Box sx={{ p: '14px 16px', backgroundColor: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
            <LocationOnIcon sx={{ color: '#10B981', fontSize: 20 }} />
            <Box>
              <Typography sx={{ fontSize: TYPOGRAPHY_TOKENS.fontSize.micro, color: '#94A3B8', fontWeight: 700 }}>
                {language === 'tl' ? 'LOKASYON NG PICKUP' : 'PICKUP LOCATION'}
              </Typography>
              <Typography sx={{ fontSize: TYPOGRAPHY_TOKENS.fontSize.bodyMobile, fontWeight: 700, color: '#0F172A' }}>{incomingRequest.pickup_address}</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <LocationOnIcon sx={{ color: '#EF4444', fontSize: 20 }} />
            <Box>
              <Typography sx={{ fontSize: TYPOGRAPHY_TOKENS.fontSize.micro, color: '#94A3B8', fontWeight: 700 }}>
                {language === 'tl' ? 'DESTINASYON' : 'DESTINATION'}
              </Typography>
              <Typography sx={{ fontSize: TYPOGRAPHY_TOKENS.fontSize.bodyMobile, fontWeight: 700, color: '#0F172A' }}>{incomingRequest.dropoff_address}</Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1 }}>
          <Box>
            <Typography sx={{ fontSize: TYPOGRAPHY_TOKENS.fontSize.caption, color: '#64748B' }}>
              {language === 'tl' ? 'Tinatayang Distansya' : 'Estimated Distance'}
            </Typography>
            <Typography sx={{ fontSize: TYPOGRAPHY_TOKENS.fontSize.section, fontWeight: 700, color: '#0F172A' }}>{incomingRequest.estimated_distance_km} km</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: TYPOGRAPHY_TOKENS.fontSize.caption, color: '#64748B' }}>
              {language === 'tl' ? 'Pamasahe' : 'Fare'}
            </Typography>
            <Typography sx={{ fontSize: TYPOGRAPHY_TOKENS.fontSize.display, fontWeight: 900, color: '#FF6B00' }}>₱{incomingRequest.estimated_fare.toFixed(2)}</Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: '12px 18px 18px', gap: 1.5 }}>
        <Button
          variant="outlined"
          fullWidth
          color="inherit"
          onClick={handleDeclineRequest}
          sx={{ height: 44, borderRadius: '14px', fontWeight: 700, fontSize: TYPOGRAPHY_TOKENS.fontSize.buttonMobile, color: '#64748B', textTransform: 'none' }}
        >
          {language === 'tl' ? 'Tanggihan' : 'Decline'}
        </Button>

        <Button
          variant="contained"
          fullWidth
          onClick={handleAcceptRequest}
          sx={{
            height: 44,
            borderRadius: '14px',
            backgroundColor: '#1E8E3E',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: TYPOGRAPHY_TOKENS.fontSize.buttonMobile,
            textTransform: 'none',
            '&:hover': { backgroundColor: '#137333' },
          }}
        >
          {language === 'tl' ? 'Tanggapin' : 'Accept'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
