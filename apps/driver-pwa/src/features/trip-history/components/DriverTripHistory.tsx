import React, { useState } from 'react';
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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { MOCK_DRIVER_HISTORY, DriverEarningRecord } from '../../../mockData/driverMockData';

export const DriverTripHistory: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTrip, setSelectedTrip] = useState<DriverEarningRecord | null>(null);

  return (
    <Box sx={{ width: '100%', height: '100%', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Header */}
      <Box sx={{ padding: 'calc(var(--safe-area-top) + 16px) 20px 16px', display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #F1F5F9', backgroundColor: '#FFFFFF' }}>
        <IconButton onClick={() => navigate('/driver/home')} sx={{ color: '#0F172A' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
          Kasaysayan ng mga Biyahe
        </Typography>
      </Box>

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {MOCK_DRIVER_HISTORY.map((trip) => (
          <Paper
            key={trip.tripId}
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
                  label={trip.tripType}
                  size="small"
                  sx={{
                    fontSize: '10px',
                    fontWeight: 700,
                    backgroundColor: trip.tripType === 'Shared' ? '#E6F4EA' : '#FFF8F0',
                    color: trip.tripType === 'Shared' ? '#1E8E3E' : '#FF6B00',
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: '16px', fontWeight: 900, color: '#FF6B00' }}>
                ₱{trip.fareAmount.toFixed(2)}
              </Typography>
            </Box>

            <Typography sx={{ fontSize: '12px', color: '#64748B' }}>
              Pasahero: <strong>{trip.passengerName}</strong> • {trip.distanceKm} km • {trip.date}, {trip.time}
            </Typography>

            <Divider sx={{ my: 0.5 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOnIcon sx={{ color: '#34A853', fontSize: 16 }} />
                <Typography sx={{ fontSize: '12px', color: '#334155' }}>{trip.pickup}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOnIcon sx={{ color: '#EF4444', fontSize: 16 }} />
                <Typography sx={{ fontSize: '12px', color: '#334155' }}>{trip.dropoff}</Typography>
              </Box>
            </Box>
          </Paper>
        ))}
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
                Detalye ng Biyahe
              </Typography>
            </Box>
            <Chip
              label={selectedTrip.tripType}
              size="small"
              sx={{ backgroundColor: '#FF6B00', color: '#FFFFFF', fontWeight: 800 }}
            />
          </DialogTitle>
          <DialogContent sx={{ py: 1 }}>
            <Box sx={{ p: 1.5, borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', mb: 2 }}>
              <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>BOOKING CODE</Typography>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{selectedTrip.bookingCode}</Typography>
              <Typography sx={{ fontSize: '12px', color: '#64748B', mt: 0.5 }}>
                Petsa: {selectedTrip.date} • {selectedTrip.time}
              </Typography>
            </Box>

            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
              PASAHERO
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#334155', mb: 1.5 }}>
              {selectedTrip.passengerName}
            </Typography>

            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
              RUTA AT DISTANSYA
            </Typography>
            <Typography sx={{ fontSize: '13px', color: '#334155', mb: 0.5 }}>
              <strong>Mula:</strong> {selectedTrip.pickup}
            </Typography>
            <Typography sx={{ fontSize: '13px', color: '#334155', mb: 1.5 }}>
              <strong>Patungo:</strong> {selectedTrip.dropoff} ({selectedTrip.distanceKm} km)
            </Typography>

            <Divider sx={{ my: 1.5 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                Kabuuang Pamasahe:
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
              Isara (Close)
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};
