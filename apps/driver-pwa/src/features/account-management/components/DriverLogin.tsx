import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import { RegisterInput } from '../../../common/components/RegisterInput';
import SakayPhoneInput from '../../../common/components/SakayPhoneInput';
import { useLanguage } from '../../../utils/LanguageContext';
import { supabase } from '../../../services/supabaseClient';

export const formatMobileNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';

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
  if (!afterPrefix) return '09';

  const full = '09' + afterPrefix;
  if (full.length <= 4) return full;
  if (full.length <= 7) return `${full.slice(0, 4)} ${full.slice(4)}`;
  return `${full.slice(0, 4)} ${full.slice(4, 7)} ${full.slice(7, 11)}`;
};

export const DriverLogin: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Input fields start EMPTY (no prefilled default credentials)
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneChange = (val: string) => {
    const formatted = formatMobileNumber(val);
    setPhone(formatted);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, '');
    if (!cleanDigits || !password) {
      setError(t.enterPhoneAndPassword || 'Mangyaring ilagay ang iyong numero at password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Query driver record status from Supabase
      const { data: driverData } = await supabase
        .from('driver')
        .select('account_status, full_name, rejection_reason, rejection_comment')
        .or(`contact_number.eq.${cleanDigits},contact_number.eq.+63${cleanDigits.slice(-10)}`)
        .maybeSingle();

      setLoading(false);

      if (driverData) {
        // Enforce strict approval lifecycle routing:
        // Only grant full map & dashboard access if BOTH TODA & LGU have approved (Active / Verified)
        if (driverData.account_status === 'Active' || driverData.account_status === 'Verified') {
          navigate('/driver/home', { replace: true });
        } else if (driverData.account_status === 'Rejected') {
          navigate('/driver/status', {
            replace: true,
            state: {
              driverName: driverData.full_name,
              accountStatus: 'Rejected',
              rejectionReason: driverData.rejection_reason,
              rejectionComment: driverData.rejection_comment,
            },
          });
        } else {
          // Pending review screen (NO map access)
          navigate('/driver/status', {
            replace: true,
            state: {
              driverName: driverData.full_name,
              accountStatus: driverData.account_status || 'Pending Verification',
            },
          });
        }
      } else {
        // Default route to status monitor for unverified/pending accounts
        navigate('/driver/status', {
          replace: true,
          state: {
            accountStatus: 'Pending Verification',
          },
        });
      }
    } catch {
      setLoading(false);
      navigate('/driver/status', {
        replace: true,
        state: {
          accountStatus: 'Pending Verification',
        },
      });
    }
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
      {/* Header with Back Button & SAKAY Logo */}
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

      {/* Form Content */}
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
          {/* Mobile Phone Number Input (+63 | 9XXXXXXXX) */}
          <SakayPhoneInput
            label={t.phoneOrEmail || 'Numero ng Telepono'}
            value={phone}
            onChange={(val) => setPhone(val)}
          />

          {/* Password Input (Starts Empty, Floating Label Inside, Active Orange Glow) */}
          <RegisterInput
            label={t.password || 'Password'}
            value={password}
            onChange={(val) => setPassword(val)}
            type={showPassword ? 'text' : 'password'}
            endAdornment={
              <IconButton
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
                size="small"
                sx={{ color: '#64748B' }}
              >
                {showPassword ? (
                  <VisibilityOffOutlinedIcon fontSize="small" />
                ) : (
                  <VisibilityOutlinedIcon fontSize="small" />
                )}
              </IconButton>
            }
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

        <Box sx={{ flexGrow: 1 }} />

        {/* Primary Submit Action Button */}
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

        {/* Tagalog Registration Link */}
        <Typography
          sx={{
            textAlign: 'center',
            fontSize: '14px',
            color: '#0F172A',
            fontWeight: 700,
            mb: 1,
          }}
        >
          {t.dontHaveAccount || 'Wala ka pang account?'}{' '}
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
            {t.registerLink || 'Mag-register'}
          </Box>
        </Typography>
      </Box>
    </Box>
  );
};

export default DriverLogin;
