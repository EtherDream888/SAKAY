import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';

export const DriverForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('09181234567');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/driver/verify-otp', { state: { phone, isRecovery: true } });
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
          onClick={() => navigate('/driver/login')}
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
        onSubmit={handleSubmit}
        sx={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 24px calc(var(--safe-area-bottom) + 24px) 24px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
            Nakalimutan ang Password?
          </Typography>
          <Typography sx={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.5 }}>
            Ipasok ang iyong rehistradong mobile number upang makatanggap ng 6-digit verification code.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', mb: 1 }}>
              Mobile Phone (+63)
            </Typography>
            <TextField
              fullWidth
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIphoneIcon sx={{ color: '#94A3B8', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: '14px',
                    backgroundColor: '#F8FAFC',
                    fontSize: '15px',
                    fontWeight: 600,
                  },
                },
              }}
            />
          </Box>

          <PrimaryButton fullWidth type="submit" loading={loading} sx={{ mt: 1 }}>
            Ipadala ang OTP Code
          </PrimaryButton>
        </Box>
      </Box>
    </Box>
  );
};

export default DriverForgotPassword;
