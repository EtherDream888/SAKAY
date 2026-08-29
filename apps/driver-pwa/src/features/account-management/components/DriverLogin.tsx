import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LocalPhoneOutlinedIcon from '@mui/icons-material/LocalPhoneOutlined';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import { useLanguage } from '../../../utils/LanguageContext';

export const formatMobileNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '');

  let afterPrefix = '';
  if (digits.startsWith('09')) {
    afterPrefix = digits.slice(2);
  } else if (digits.startsWith('639')) {
    afterPrefix = digits.slice(3);
  } else if (digits.startsWith('9')) {
    afterPrefix = digits.slice(1);
  } else if (digits.startsWith('0')) {
    afterPrefix = digits.slice(1);
  } else {
    afterPrefix = digits;
  }

  afterPrefix = afterPrefix.slice(0, 9);

  if (!afterPrefix) {
    return '09';
  }

  const full = '09' + afterPrefix;
  if (full.length <= 4) {
    return full;
  }
  if (full.length <= 7) {
    return `${full.slice(0, 4)} ${full.slice(4)}`;
  }
  return `${full.slice(0, 4)} ${full.slice(4, 7)} ${full.slice(7, 11)}`;
};

export const DriverLogin: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Pre-filled demo credentials for fast review
  const [phone, setPhone] = useState('0918 123 4567');
  const [password, setPassword] = useState('DriverPass123!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handlePhoneFocus = () => {
    setPhoneFocused(true);
    if (!phone || phone.replace(/\D/g, '').length < 2) {
      setPhone('09');
    }
  };

  const handlePhoneBlur = () => {
    setPhoneFocused(false);
    if (!phone || phone.replace(/\D/g, '').length < 2) {
      setPhone('09');
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatMobileNumber(e.target.value);
    setPhone(formatted);
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;

    if (e.key === 'Backspace') {
      if (start === end) {
        if (start <= 2) {
          e.preventDefault();
          return;
        }
        if (input.value[start - 1] === ' ') {
          e.preventDefault();
          const currentVal = input.value;
          const updated = currentVal.slice(0, start - 2) + currentVal.slice(start);
          setPhone(formatMobileNumber(updated));
        }
      }
    }

    if (e.key === 'Delete') {
      if (start === end && start < 2) {
        e.preventDefault();
      }
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, '');
    if (!cleanDigits || !password) {
      setError(t.enterPhoneAndPassword);
      return;
    }

    setLoading(true);
    setError('');

    setTimeout(() => {
      setLoading(false);
      navigate('/driver/home', { replace: true });
    }, 600);
  };

  const showPhoneIcon = !phoneFocused && !phone;
  const showPasswordIcon = !passwordFocused && !password;

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
      {/* 1. Header with Rounded Back Button and SAKAY Logo */}
      <Box
        sx={{
          padding: 'calc(var(--safe-area-top) + 16px) 24px 12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          flexShrink: 0,
          zIndex: 20,
        }}
      >
        <IconButton
          onClick={() => navigate('/')}
          sx={{
            color: '#0F172A',
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            width: 44,
            height: 44,
            '&:hover': { backgroundColor: '#F8FAFC' },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Logo color="orange" width={110} />
      </Box>

      {/* 2. Scrollable Form Content */}
      <Box
        component="form"
        onSubmit={handleLogin}
        sx={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 24px calc(var(--safe-area-bottom) + 24px) 24px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ mb: 3.5, mt: 1 }}>
          <Typography
            sx={{
              fontSize: '26px',
              fontWeight: 800,
              color: '#0F172A',
              lineHeight: 1.2,
              letterSpacing: '-0.5px',
            }}
          >
            {t.loginTitle}
          </Typography>
          <Typography
            sx={{
              fontSize: '15px',
              color: '#64748B',
              mt: 0.75,
              fontWeight: 500,
            }}
          >
            {t.loginSubtitle}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Mobile Number Field */}
          <TextField
            fullWidth
            label={t.phoneOrEmail}
            value={phone}
            onChange={handlePhoneChange}
            onKeyDown={handlePhoneKeyDown}
            onFocus={handlePhoneFocus}
            onBlur={handlePhoneBlur}
            slotProps={{
              inputLabel: {
                shrink: true,
                sx: {
                  color: '#64748B',
                  fontSize: '14px',
                  fontWeight: 500,
                  '&.Mui-focused': { color: '#FF6B00', fontWeight: 600 },
                },
              },
              input: {
                sx: {
                  borderRadius: '16px',
                  backgroundColor: '#F8FAFC',
                  fontSize: '15px',
                  fontWeight: 500,
                  height: '56px',
                  '& fieldset': { borderColor: '#E2E8F0' },
                  '&:hover fieldset': { borderColor: '#CBD5E1' },
                  '&.Mui-focused fieldset': { borderColor: '#FF6B00' },
                },
              },
            }}
          />

          {/* Password Field */}
          <TextField
            fullWidth
            type={showPassword ? 'text' : 'password'}
            label={t.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            slotProps={{
              inputLabel: {
                shrink: Boolean(passwordFocused || password),
                sx: {
                  color: '#64748B',
                  fontSize: '14px',
                  fontWeight: 500,
                  '&.Mui-focused': { color: '#FF6B00', fontWeight: 600 },
                  ...(showPasswordIcon ? { transform: 'translate(44px, 16px) scale(1)' } : {}),
                },
              },
              input: {
                startAdornment: showPasswordIcon ? (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ color: '#0F172A', fontSize: 20 }} />
                  </InputAdornment>
                ) : null,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                      sx={{ color: '#64748B' }}
                    >
                      {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: '16px',
                  backgroundColor: '#F8FAFC',
                  fontSize: '15px',
                  height: '56px',
                  '& fieldset': { borderColor: '#E2E8F0' },
                  '&:hover fieldset': { borderColor: '#CBD5E1' },
                  '&.Mui-focused fieldset': { borderColor: '#FF6B00' },
                },
              },
            }}
          />

          {/* Forgot Password Link */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
            <Typography
              onClick={() => navigate('/forgot-password')}
              sx={{
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#FF6B00',
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {t.forgotPassword}
            </Typography>
          </Box>
        </Box>

        {/* Space pusher to push button to bottom on tall screens */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Submit Action Button */}
        <PrimaryButton
          fullWidth
          type="submit"
          loading={loading}
          sx={{
            height: '56px',
            borderRadius: '16px',
            fontSize: '16px',
            fontWeight: 800,
            backgroundColor: '#FF6B00',
            boxShadow: 'none',
            '&:hover': { backgroundColor: '#E66000', boxShadow: 'none' },
            mb: 2,
            mt: 3,
          }}
        >
          {t.loginTitle}
        </PrimaryButton>

        {/* Register Link */}
        <Typography
          sx={{
            textAlign: 'center',
            fontSize: '14px',
            color: '#0F172A',
            fontWeight: 700,
            mb: 1,
          }}
        >
          {t.dontHaveAccount}{' '}
          <Box
            component="span"
            onClick={() => navigate('/account-selection')}
            sx={{
              color: '#FF6B00',
              fontWeight: 700,
              cursor: 'pointer',
              ml: '4px',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {t.registerLink}
          </Box>
        </Typography>
      </Box>
    </Box>
  );
};

export default DriverLogin;
