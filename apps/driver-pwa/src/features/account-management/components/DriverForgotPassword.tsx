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
import LocalPhoneOutlinedIcon from '@mui/icons-material/LocalPhoneOutlined';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import SakayPhoneInput from '../../../common/components/SakayPhoneInput';
import { useLanguage } from '../../../utils/LanguageContext';
import { sendDriverOtp } from '../../../services/driverApiService';

export const formatMobileNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

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

export const DriverForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);

  const handlePhoneFocus = () => {
    setPhoneFocused(true);
    if (!phone || !phone.trim()) {
      setPhone('09');
    }
  };

  const handlePhoneBlur = () => {
    setPhoneFocused(false);
    const clean = phone.replace(/\D/g, '');
    if (clean === '09' || clean === '0' || clean === '9' || !clean) {
      setPhone('');
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val || !val.trim()) {
      setPhone('09');
      return;
    }
    setPhone(formatMobileNumber(val));
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;

    if (e.key === 'Backspace') {
      if (start === end) {
        if (start <= 2 && input.value.startsWith('09')) {
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
      if (start === end && start < 2 && input.value.startsWith('09')) {
        e.preventDefault();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length < 11) return;
    setLoading(true);

    let otpResult: { success: boolean; message?: string; error?: string; debugOtp?: string } | null = null;
    try {
      otpResult = await sendDriverOtp(cleanDigits);
    } catch (err) {
      console.warn('[DriverForgotPassword] sendDriverOtp error:', err);
    } finally {
      setLoading(false);
      navigate('/driver/verify-otp', {
        state: {
          phone: cleanDigits,
          isRecovery: true,
          debugOtp: otpResult?.debugOtp,
        },
      });
    }
  };

  const showPhoneIcon = !phoneFocused && !phone;

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
          onClick={() => navigate('/driver/login')}
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
        onSubmit={handleSubmit}
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
            {t.forgotPasswordTitle}
          </Typography>
          <Typography
            sx={{
              fontSize: '15px',
              color: '#64748B',
              mt: 0.75,
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            {t.forgotPasswordDesc}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <SakayPhoneInput
            label={t.mobileNumber || 'Numero ng Telepono'}
            value={phone}
            onChange={(val) => setPhone(val)}
            required
          />


          {/* Space pusher to push button to bottom */}
          <Box sx={{ flexGrow: 1 }} />

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
              mt: 2,
              mb: 1,
            }}
          >
            {t.sendOtpCode}
          </PrimaryButton>
        </Box>
      </Box>
    </Box>
  );
};

export default DriverForgotPassword;
