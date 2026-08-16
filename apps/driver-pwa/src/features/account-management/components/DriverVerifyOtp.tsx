import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  TextField,
  Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';

export const DriverVerifyOtp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { phone?: string; isRecovery?: boolean; driverName?: string; todaId?: string } | undefined;

  const [otp, setOtp] = useState(['1', '2', '3', '4', '5', '6']);
  const [loading, setLoading] = useState(false);

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) {
      val = val.charAt(val.length - 1);
    }
    const next = [...otp];
    next[index] = val;
    setOtp(next);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (state?.isRecovery) {
        navigate('/driver/reset-password', { replace: true, state: { phone: state.phone } });
      } else {
        navigate('/driver/status', { replace: true, state: { driverName: state?.driverName || 'Aurelio Bautista', phone: state?.phone } });
      }
    }, 600);
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Sticky Top Bar */}
      <Box
        sx={{
          padding: 'calc(var(--safe-area-top) + 12px) 20px 12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #F1F5F9',
          backgroundColor: '#FFFFFF',
          flexShrink: 0,
        }}
      >
        <IconButton
          onClick={() => navigate(state?.isRecovery ? '/driver/forgot-password' : '/driver/register')}
          sx={{
            color: '#0F172A',
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            '&:hover': { backgroundColor: '#F1F5F9' },
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Logo color="orange" width={100} />
        <Box sx={{ width: 40 }} />
      </Box>

      {/* Form Content */}
      <Box
        component="form"
        onSubmit={handleVerify}
        sx={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 24px calc(var(--safe-area-bottom) + 24px) 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Box sx={{ width: '100%', textAlign: 'left', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography sx={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
              I-verify ang OTP
            </Typography>
            <Chip label="SMS Code" size="small" sx={{ backgroundColor: '#ECFDF5', color: '#10B981', fontWeight: 800 }} />
          </Box>
          <Typography sx={{ fontSize: '13.5px', color: '#64748B' }}>
            Ipinadala ang 6-digit code sa <strong>{state?.phone || '0918 123 4567'}</strong>.
          </Typography>
        </Box>

        {/* 6 Digit Inputs */}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', width: '100%', mb: 4 }}>
          {otp.map((digit, i) => (
            <TextField
              key={i}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              slotProps={{
                htmlInput: {
                  maxLength: 1,
                  style: {
                    textAlign: 'center',
                    fontSize: '20px',
                    fontWeight: 800,
                    padding: '14px 0',
                  },
                },
              }}
              sx={{
                width: '46px',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: '#F8FAFC',
                },
              }}
            />
          ))}
        </Box>

        <PrimaryButton fullWidth type="submit" loading={loading}>
          Kumpirmahin ang OTP
        </PrimaryButton>

        <Typography sx={{ fontSize: '13px', color: '#64748B', mt: 3 }}>
          Walang natanggap na code?{' '}
          <Box component="span" sx={{ color: '#FF6B00', fontWeight: 700, cursor: 'pointer' }}>
            Ipadala Muli (Resend)
          </Box>
        </Typography>
      </Box>
    </Box>
  );
};

export default DriverVerifyOtp;
