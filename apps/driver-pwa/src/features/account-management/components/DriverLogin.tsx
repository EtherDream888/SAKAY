import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Chip,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';

export const DriverLogin: React.FC = () => {
  const navigate = useNavigate();

  // Pre-filled demo credentials for fast review
  const [phone, setPhone] = useState('09181234567');
  const [password, setPassword] = useState('DriverPass123!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      setError('Pakilagay ang iyong numero at password.');
      return;
    }

    setLoading(true);
    setError('');

    setTimeout(() => {
      setLoading(false);
      // Navigate straight to Driver Home dashboard replacing login history
      navigate('/driver/home', { replace: true });
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
      {/* 1. Permanent Sticky Top Bar */}
      <Box
        sx={{
          padding: 'calc(var(--safe-area-top) + 12px) 20px 12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #F1F5F9',
          backgroundColor: '#FFFFFF',
          flexShrink: 0,
          zIndex: 20,
        }}
      >
        <IconButton
          onClick={() => navigate('/')}
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

      {/* 2. Scrollable Form Content */}
      <Box
        component="form"
        onSubmit={handleLogin}
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
            Mag-login
          </Typography>
          <Typography sx={{ fontSize: '13.5px', color: '#64748B' }}>
            Ipasok ang iyong mobile number at password upang makapasok sa iyong account.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Mobile Phone Field */}
          <Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', mb: 1 }}>
              Mobile Phone Number
            </Typography>
            <TextField
              fullWidth
              placeholder="0917 123 4567"
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

          {/* Password Field */}
          <Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', mb: 1 }}>
              Password
            </Typography>
            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: '#94A3B8', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: '14px',
                    backgroundColor: '#F8FAFC',
                    fontSize: '15px',
                  },
                },
              }}
            />
          </Box>

          {/* Forgot Password Link */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Typography
              onClick={() => navigate('/forgot-password')}
              sx={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#FF6B00',
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Nakalimutan ang Password?
            </Typography>
          </Box>

          {/* Submit Action Button */}
          <PrimaryButton fullWidth type="submit" loading={loading} sx={{ mt: 1 }}>
            Mag-login
          </PrimaryButton>

          {/* Register Link */}
          <Typography
            sx={{
              textAlign: 'center',
              fontSize: '14px',
              color: '#64748B',
              mt: 1,
            }}
          >
            Wala pang account?
            <Box
              component="span"
              onClick={() => navigate('/account-selection')}
              sx={{
                color: '#FF6B00',
                fontWeight: 700,
                cursor: 'pointer',
                ml: '6px',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Gumawa ng Account
            </Box>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default DriverLogin;
