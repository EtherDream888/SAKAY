import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Divider,
  Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

export const DriverEarnings: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    completedTrip?: {
      bookingCode: string;
      passengerName: string;
      pickup: string;
      dropoff: string;
      fareAmount: number;
      pairedPassenger?: string | null;
      proportionateFareP1?: number;
    };
  } | undefined;

  const justCompleted = state?.completedTrip;

  return (
    <Box sx={{ width: '100%', height: '100%', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Top Header */}
      <Box sx={{ padding: 'calc(var(--safe-area-top) + 16px) 20px 16px', display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #F1F5F9', backgroundColor: '#FFFFFF' }}>
        <IconButton onClick={() => navigate('/driver/home')} sx={{ color: '#0F172A' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
          Talaan ng Kita (Fare & Earnings)
        </Typography>
      </Box>

      <Box sx={{ p: '20px', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* If just completed a trip, show the completed trip fare banner */}
        {justCompleted && (
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: '20px', backgroundColor: '#E6F4EA', border: '1px solid #A7F3D0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#1E8E3E', mb: 1 }}>
              <CheckCircleIcon />
              <Typography sx={{ fontWeight: 800, fontSize: '15px' }}>Matagumpay na Nakumpleto ang Biyahe!</Typography>
            </Box>
            <Typography sx={{ fontSize: '13px', color: '#334155' }}>
              Booking: <strong>{justCompleted.bookingCode}</strong> • {justCompleted.passengerName}
            </Typography>
            {justCompleted.pairedPassenger && (
              <Typography sx={{ fontSize: '12px', color: '#1E8E3E', mt: 0.5 }}>
                ✓ Shared Carpool Paired: {justCompleted.pairedPassenger} (+₱15.00)
              </Typography>
            )}
            <Divider sx={{ my: 1.5, borderColor: '#A7F3D0' }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>Kabuuang Nakolekta:</Typography>
              <Typography sx={{ fontSize: '24px', fontWeight: 900, color: '#1E8E3E' }}>₱{justCompleted.fareAmount.toFixed(2)}</Typography>
            </Box>
          </Paper>
        )}

        {/* Daily & Weekly Gross Totals Card */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: '24px', background: 'linear-gradient(135deg, #1F1F1F 0%, #0A0A0A 100%)', color: '#FFFFFF', boxShadow: '0 12px 24px rgba(0,0,0,0.15)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountBalanceWalletIcon sx={{ color: '#FF6B00' }} />
              <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#94A3B8' }}>KABUUANG KITA NGAYONG ARAW</Typography>
            </Box>
            <Chip label="Live Daily Total" size="small" sx={{ backgroundColor: 'rgba(255, 107, 0, 0.2)', color: '#FF8533', fontWeight: 700, fontSize: '10.5px' }} />
          </Box>

          <Typography sx={{ fontSize: '36px', fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>
            ₱{justCompleted ? (680 + justCompleted.fareAmount).toFixed(2) : '680.00'}
          </Typography>
          <Typography sx={{ fontSize: '12px', color: '#94A3B8', mt: 0.5 }}>
            {justCompleted ? 9 : 8} natapos na mga biyahe (100% Cash / GCash Remittance)
          </Typography>

          <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontSize: '11px', color: '#94A3B8' }}>Lingguhang Kita (This Week)</Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>₱4,930.00</Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: '11px', color: '#94A3B8' }}>Kabuuang Biyahe (Week)</Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#34D399' }}>49 rides</Typography>
            </Box>
          </Box>
        </Paper>

        <Button
          variant="contained"
          fullWidth
          onClick={() => navigate('/driver/home')}
          sx={{
            height: 50,
            borderRadius: '14px',
            backgroundColor: '#0F172A',
            fontWeight: 700,
            '&:hover': { backgroundColor: '#1E293B' },
          }}
        >
          Bumalik sa Driver Dashboard
        </Button>
      </Box>
    </Box>
  );
};
