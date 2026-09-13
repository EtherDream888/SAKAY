import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';

import { fetchDriverTrips } from '../../../services/driverApiService';
import { useLanguage } from '../../../utils/LanguageContext';

export interface TripRecord {
  id: string;
  bookingCode: string;
  passengerName: string;
  pickupLocation: string;
  dropoffLocation: string;
  distanceKm: number;
  fareAmount: number;
  tripMode: 'Single Commuter' | 'Shared Ride';
  status: string;
  date: string;
  time: string;
}

export const DriverTripHistory: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<TripRecord | null>(null);

  useEffect(() => {
    const driverId = localStorage.getItem('sakay_driver_id') || undefined;
    fetchDriverTrips(driverId)
      .then((data) => {
        const mapped: TripRecord[] = (data || []).map((b: any) => ({
          id: b.id,
          bookingCode: b.bookingCode || `BKG-${b.id.slice(0, 8)}`,
          passengerName: b.passengerName || 'Calapan Commuter',
          pickupLocation: b.pickupLocation || 'Calapan City',
          dropoffLocation: b.dropoffLocation || 'Calapan City',
          distanceKm: b.distanceKm || 0,
          fareAmount: b.fareAmount || 0,
          tripMode: b.tripMode || 'Single Commuter',
          status: b.status || 'Completed',
          date: b.date || 'Recent',
          time: b.time || '',
        }));
        setTrips(mapped);
      })
      .catch((err) => console.warn('[DriverTripHistory] Fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ width: '100%', height: '100%', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Header */}
      <Box sx={{ padding: 'calc(var(--safe-area-top) + 16px) 20px 16px', display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #F1F5F9', backgroundColor: '#FFFFFF' }}>
        <IconButton onClick={() => navigate('/driver/home')} sx={{ color: '#0F172A' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
          {language === 'tl' ? 'Kasaysayan ng Biyahe' : 'Trip History'}
        </Typography>
      </Box>

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {loading ? (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CircularProgress size={32} sx={{ color: '#FF6B00' }} />
          </Box>
        ) : trips.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: '16px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              textAlign: 'center',
              mt: 2,
            }}
          >
            <TwoWheelerIcon sx={{ fontSize: 44, color: '#CBD5E1', mb: 1 }} />
            <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
              {language === 'tl' ? 'Walang nahanap na biyahe' : 'No trips found yet'}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: '#64748B' }}>
              {language === 'tl'
                ? 'Lilitaw dito ang kumpletong rekord ng iyong mga natapos na biyahe.'
                : 'Your completed trip records will appear here once you finish a ride.'}
            </Typography>
          </Paper>
        ) : (
          trips.map((trip) => (
            <Paper
              key={trip.id}
              elevation={0}
              onClick={() => setSelectedTrip(trip)}
              sx={{
                p: 2,
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
                '&:hover': {
                  transform: 'scale(1.01)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                    {trip.bookingCode}
                  </Typography>
                  <Chip
                    label={trip.tripMode}
                    size="small"
                    sx={{
                      fontSize: '10px',
                      fontWeight: 700,
                      backgroundColor: trip.tripMode === 'Shared Ride' ? '#E6F4EA' : '#FFF8F0',
                      color: trip.tripMode === 'Shared Ride' ? '#1E8E3E' : '#FF6B00',
                    }}
                  />
                </Box>
                <Typography sx={{ fontSize: '16px', fontWeight: 900, color: '#FF6B00' }}>
                  ₱{trip.fareAmount.toFixed(2)}
                </Typography>
              </Box>

              <Typography sx={{ fontSize: '12px', color: '#64748B' }}>
                {language === 'tl' ? 'Pasahero:' : 'Passenger:'} <strong>{trip.passengerName}</strong> {trip.distanceKm > 0 ? `• ${trip.distanceKm} km` : ''} • {trip.date}{trip.time ? `, ${trip.time}` : ''}
              </Typography>

              <Divider sx={{ my: 0.5 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOnIcon sx={{ color: '#34A853', fontSize: 16 }} />
                  <Typography sx={{ fontSize: '12px', color: '#334155' }}>{trip.pickupLocation}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOnIcon sx={{ color: '#EF4444', fontSize: 16 }} />
                  <Typography sx={{ fontSize: '12px', color: '#334155' }}>{trip.dropoffLocation}</Typography>
                </Box>
              </Box>
            </Paper>
          ))
        )}
      </Box>

      {/* Trip Details Dialog Modal */}
      {selectedTrip && (
        <Dialog
          open={Boolean(selectedTrip)}
          onClose={() => setSelectedTrip(null)}
          slotProps={{
            paper: {
              sx: {
                borderRadius: '20px',
                padding: '8px',
                backgroundColor: '#FFFFFF',
                maxWidth: '360px',
              },
            },
          }}
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReceiptLongIcon sx={{ color: '#FF6B00' }} />
              <Typography sx={{ fontWeight: 800, fontSize: '16px', color: '#0F172A' }}>
                Trip Details
              </Typography>
            </Box>
            <Chip
              label={selectedTrip.tripMode}
              size="small"
              sx={{ backgroundColor: '#FF6B00', color: '#FFFFFF', fontWeight: 800 }}
            />
          </DialogTitle>
          <DialogContent sx={{ py: 1 }}>
            <Box sx={{ p: 1.5, borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', mb: 2 }}>
              <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>BOOKING CODE</Typography>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{selectedTrip.bookingCode}</Typography>
              <Typography sx={{ fontSize: '12px', color: '#64748B', mt: 0.5 }}>
                Date: {selectedTrip.date} {selectedTrip.time ? `• ${selectedTrip.time}` : ''}
              </Typography>
            </Box>

            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
              PASSENGER
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#334155', mb: 1.5 }}>
              {selectedTrip.passengerName}
            </Typography>

            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
              ROUTE & DISTANCE
            </Typography>
            <Typography sx={{ fontSize: '13px', color: '#334155', mb: 0.5 }}>
              <strong>From:</strong> {selectedTrip.pickupLocation}
            </Typography>
            <Typography sx={{ fontSize: '13px', color: '#334155', mb: 1.5 }}>
              <strong>To:</strong> {selectedTrip.dropoffLocation} {selectedTrip.distanceKm > 0 ? `(${selectedTrip.distanceKm} km)` : ''}
            </Typography>

            <Divider sx={{ my: 1.5 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                Total Fare:
              </Typography>
              <Typography sx={{ fontSize: '18px', fontWeight: 900, color: '#FF6B00' }}>
                ₱{selectedTrip.fareAmount.toFixed(2)}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              fullWidth
              variant="contained"
              onClick={() => setSelectedTrip(null)}
              sx={{
                height: 44,
                borderRadius: '12px',
                backgroundColor: '#0F172A',
                fontWeight: 700,
                textTransform: 'none',
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default DriverTripHistory;
