import React from 'react';
import { Box, Typography, Avatar, Chip } from '@mui/material';
import NavigationIcon from '@mui/icons-material/Navigation';
import PersonIcon from '@mui/icons-material/Person';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import RouteIcon from '@mui/icons-material/Route';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

import { ActiveTripRecord } from '../../mockData/adminData';
import { MacCenterModal } from './MacCenterModal';
import { StatusBadge } from '../common/StatusBadge';

interface TripDetailModalProps {
  open: boolean;
  onClose: () => void;
  trip: ActiveTripRecord | null;
}

export const TripDetailModal: React.FC<TripDetailModalProps> = ({ open, onClose, trip }) => {
  if (!trip) return null;

  return (
    <MacCenterModal
      open={open}
      onClose={onClose}
      title={`Trip Details — ${trip.id}`}
      subtitle={`Booking ID: ${trip.bookingId} • ${trip.todaName}`}
      badge={<StatusBadge status={trip.status === 'Trip Ongoing' ? 'Active' : 'Pending'} />}
      maxWidth={780}
    >
      {/* Top Status & Telemetry Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FAFAFC',
          padding: '18px 24px',
          borderRadius: '12px',
          border: '1px solid var(--mac-border-color)',
          mb: 4,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              backgroundColor: trip.status === 'Trip Ongoing' ? 'rgba(21, 101, 192, 0.12)' : 'var(--sakay-orange-soft)',
              color: trip.status === 'Trip Ongoing' ? '#1565C0' : 'var(--sakay-orange)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <NavigationIcon fontSize="medium" />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '18px', fontWeight: 700, color: 'var(--mac-text-primary)', lineHeight: 1.2 }}>
              {trip.status}
            </Typography>
            <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', mt: '3px' }}>
              Current GPS: <span style={{ fontWeight: 600, color: 'var(--mac-text-primary)' }}>{trip.currentArea}</span>
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.8 }}>
          <Chip
            label={trip.tripType}
            size="small"
            sx={{
              fontSize: '12.5px',
              fontWeight: 700,
              backgroundColor: trip.tripType === 'Shared Trip' ? 'rgba(156, 39, 176, 0.12)' : 'rgba(52, 168, 83, 0.12)',
              color: trip.tripType === 'Shared Trip' ? '#9C27B0' : '#1E8E3E',
              height: 26,
            }}
          />
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--sakay-orange)' }}>
            ETA to Destination: {trip.eta}
          </Typography>
        </Box>
      </Box>

      {/* Section 1: Passenger Information */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
          <PersonIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            Passenger Booking Details
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2.5, backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px' }}>
          <Box>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Passenger Name</Typography>
            <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{trip.passengerName}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Mobile Contact</Typography>
            <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{trip.passengerPhone}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Declared Passengers</Typography>
            <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{trip.passengerCount} Commuter(s)</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Booking Request Time</Typography>
            <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{trip.bookingTime}</Typography>
          </Box>
        </Box>
      </Box>

      {/* Section 2: Driver & Vehicle Credentials */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
          <DirectionsCarIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            Assigned Driver & Tricycle Unit
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2.5, backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px' }}>
          <Box>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Driver Name</Typography>
            <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{trip.driverName}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Driver Contact</Typography>
            <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{trip.driverPhone}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Affiliated TODA</Typography>
            <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{trip.todaName}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Vehicle Plate No.</Typography>
            <Typography sx={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--sakay-orange)' }}>{trip.vehiclePlate}</Typography>
          </Box>
        </Box>
      </Box>

      {/* Section 3: Route & Fare Matrix Breakdown */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
          <RouteIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            Route & Fare Matrix Computation
          </Typography>
        </Box>

        <Box sx={{ backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2.5, mb: 2.5 }}>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Pickup Point</Typography>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{trip.pickupArea}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Destination Point</Typography>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{trip.destinationArea}</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: '10px', border: '1px solid var(--mac-border-color)' }}>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '2px' }}>Official Estimated Cash Fare</Typography>
              <Typography sx={{ fontSize: '24px', fontWeight: 700, color: 'var(--sakay-orange)' }}>
                ₱{trip.estimatedFare}.00
              </Typography>
            </Box>

            {trip.sharedTripDetails && (
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: '#9C27B0' }}>
                  Ride-Sharing Allocation Active
                </Typography>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                  {trip.sharedTripDetails.sharedSavings}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </MacCenterModal>
  );
};
