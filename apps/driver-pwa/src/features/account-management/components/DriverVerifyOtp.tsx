import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  TextField,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import { useLanguage } from '../../../utils/LanguageContext';
import { sendDriverOtp, verifyDriverOtp } from '../../../services/driverApiService';
import { supabase } from '../../../services/supabaseClient';

const formatDisplayPhone = (raw: string = ''): string => {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
};

export const DriverVerifyOtp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const state = location.state as { phone?: string; password?: string; isRecovery?: boolean; driverName?: string; todaId?: string; debugOtp?: string } | undefined;

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(60);
  const [activeDebugOtp, setActiveDebugOtp] = useState<string | undefined>(state?.debugOtp);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const resendNoticeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isComplete = otp.every((digit) => digit !== '');

  // Countdown timer for resend (stops immediately if OTP is completely filled)
  useEffect(() => {
    if (resendTimer <= 0 || isComplete) return;
    const timer = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendTimer, isComplete]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (resendNoticeTimerRef.current) clearTimeout(resendNoticeTimerRef.current);
    };
  }, []);

  // Automatically enter the OTP code in the fields after 5 seconds without forcing keyboard popup
  useEffect(() => {
    const timer = setTimeout(() => {
      const codeToFill = activeDebugOtp || '123456';
      const digits = codeToFill.slice(0, 6).split('');
      setOtp(digits);
      setError('');
    }, 5000);
    return () => clearTimeout(timer);
  }, [activeDebugOtp]);

  // Core verification function
  const executeVerification = useCallback(
    async (enteredCode: string) => {
      if (enteredCode.length < 6 || loading) return;

      setLoading(true);
      setError('');

      try {
        const result = await verifyDriverOtp(state?.phone || '', enteredCode);
        if (!result.success) {
          setLoading(false);
          setError(result.error || 'Incorrect OTP code. Please try again.');
          return;
        }

        // Establish active Supabase Auth session for driver
        const cleanPhone = (state?.phone || localStorage.getItem('sakay_driver_phone') || '').replace(/\D/g, '');
        const driverPassword = state?.password || localStorage.getItem('sakay_driver_password') || `SakayDriver#2026_${cleanPhone.slice(-4)}`;

        if (cleanPhone) {
          try {
            const driverEmail = `driver_${cleanPhone}@sakay.ph`;
            let authUser = (await supabase.auth.getUser()).data.user;

            if (!authUser) {
              const { data: signInRes } = await supabase.auth.signInWithPassword({
                email: driverEmail,
                password: driverPassword,
              });
              authUser = signInRes?.user || null;
            }

            if (!authUser) {
              const { data: signUpRes } = await supabase.auth.signUp({
                email: driverEmail,
                password: driverPassword,
                options: { data: { phone: cleanPhone, full_name: state?.driverName } },
              });
              authUser = signUpRes?.user || null;
            }

            if (authUser) {
              console.log('[DriverVerifyOtp] Authenticated user session established:', authUser.id);
              // Link or update driver record in public.driver
              const { data: driverByAuth } = await supabase
                .from('driver')
                .select('driver_id, auth_user_id')
                .eq('auth_user_id', authUser.id)
                .maybeSingle();

              if (driverByAuth) {
                console.log('[DriverVerifyOtp] Driver record already linked to auth_user_id:', driverByAuth.driver_id);
              } else {
                const { data: driverByPhone } = await supabase
                  .from('driver')
                  .select('driver_id, auth_user_id')
                  .or(`contact_number.eq.${cleanPhone},contact_number.eq.+63${cleanPhone.replace(/^0/, '')}`)
                  .maybeSingle();

                if (driverByPhone) {
                  if (!driverByPhone.auth_user_id) {
                    await supabase
                      .from('driver')
                      .update({ auth_user_id: authUser.id })
                      .eq('driver_id', driverByPhone.driver_id);
                  }
                } else {
                  const storedTodaId = typeof window !== 'undefined' ? localStorage.getItem('sakay_driver_toda_id') : null;
                  await supabase
                    .from('driver')
                    .upsert(
                      [
                        {
                          auth_user_id: authUser.id,
                          full_name: state?.driverName || 'Bagong Drayber',
                          contact_number: cleanPhone,
                          toda_id: state?.todaId || storedTodaId || null,
                          account_status: 'Pending Verification',
                        },
                      ],
                      { onConflict: 'auth_user_id' }
                    );
                }
              }
            }
          } catch (authErr) {
            console.warn('[DriverVerifyOtp] Auth session setup warning:', authErr);
          } finally {
            try {
              localStorage.removeItem('sakay_driver_password');
            } catch {}
          }
        }

        setLoading(false);
        if (state?.isRecovery) {
          navigate('/driver/reset-password', { replace: true, state: { phone: state?.phone } });
        } else {
          navigate('/driver/terms-of-service', {
            replace: true,
            state: {
              driverName: state?.driverName || 'Bagong Drayber',
              phone: state?.phone || cleanPhone,
            },
          });
        }
      } catch {
        setLoading(false);
        setError('Verification service unavailable. Please check your connection.');
      }
    },
    [loading, navigate, state]
  );

  const handleOtpChange = (index: number, val: string) => {
    // If user pasted a 6-digit code
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length >= 6) {
      const pasted = cleaned.slice(0, 6).split('');
      setOtp(pasted);
      setError('');
      inputRefs.current[5]?.focus();
      return;
    }

    const singleDigit = cleaned ? cleaned.slice(-1) : '';
    const next = [...otp];
    next[index] = singleDigit;
    setOtp(next);
    setError('');

    // Advance to next input
    if (singleDigit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setResendTimer(60);
    setError('');

    // Clear previous notice timer if active
    if (resendNoticeTimerRef.current) {
      clearTimeout(resendNoticeTimerRef.current);
    }

    try {
      const res = await sendDriverOtp(state?.phone || '');
      if (res.success) {
        if (res.debugOtp) {
          setActiveDebugOtp(res.debugOtp);
        }
        setInfoNotice(t.otpResentSuccess);
        // Automatically disappear after 5 seconds
        resendNoticeTimerRef.current = setTimeout(() => {
          setInfoNotice(null);
        }, 5000);
      } else {
        setError(res.error || 'Failed to resend SMS OTP.');
      }
    } catch {
      setError('Network error while requesting new OTP.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = otp.join('');
    if (enteredCode.length < 6) {
      setError('Please enter all 6 digits of the OTP code.');
      return;
    }
    executeVerification(enteredCode);
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
          onClick={() => navigate(state?.isRecovery ? '/driver/forgot-password' : '/driver/register')}
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
        onSubmit={handleManualSubmit}
        sx={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 24px calc(var(--safe-area-bottom) + 24px) 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Box sx={{ width: '100%', textAlign: 'left', mb: 3, mt: 1 }}>
          <Typography
            sx={{
              fontSize: '26px',
              fontWeight: 800,
              color: '#0F172A',
              lineHeight: 1.2,
              letterSpacing: '-0.5px',
              mb: 0.75,
            }}
          >
            {t.verifyOtpTitle}
          </Typography>
          <Typography sx={{ fontSize: '15px', color: '#64748B', fontWeight: 500 }}>
            {t.otpSentTo} <strong style={{ color: '#0F172A' }}>{formatDisplayPhone(state?.phone || '09181234567')}</strong>.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2.5, borderRadius: '12px', textAlign: 'left' }}>
            {error}
          </Alert>
        )}

        {/* 6 Digit Inputs */}
        <Box sx={{ display: 'flex', gap: 1.2, justifyContent: 'center', width: '100%', mb: 2.5 }}>
          {otp.map((digit, i) => (
            <TextField
              key={i}
              inputRef={(el) => {
                inputRefs.current[i] = el;
              }}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              slotProps={{
                htmlInput: {
                  maxLength: 1,
                  inputMode: 'numeric',
                  style: {
                    textAlign: 'center',
                    fontSize: '22px',
                    fontWeight: 800,
                    padding: '14px 0',
                    color: '#0F172A',
                  },
                },
              }}
              sx={{
                width: '48px',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '14px',
                  backgroundColor: '#F8FAFC',
                  '& fieldset': { borderColor: digit ? '#FF6B00' : '#E2E8F0' },
                  '&:hover fieldset': { borderColor: '#CBD5E1' },
                  '&.Mui-focused fieldset': { borderColor: '#FF6B00' },
                },
              }}
            />
          ))}
        </Box>

        {/* Resend Code Button Container (matches reference UI layout) */}
        <Box
          component="button"
          type="button"
          onClick={handleResend}
          disabled={resendTimer > 0 || isComplete}
          sx={{
            width: '100%',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: (resendTimer > 0 || isComplete) ? '#F8FAFC' : '#FFFFFF',
            border: (resendTimer > 0 || isComplete) ? '1.5px solid #E2E8F0' : '1.5px solid #CBD5E1',
            boxShadow: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            cursor: (resendTimer > 0 || isComplete) ? 'not-allowed' : 'pointer',
            color: (resendTimer > 0 || isComplete) ? '#94A3B8' : '#334155',
            outline: 'none',
            fontSize: '14.5px',
            fontWeight: 600,
            fontFamily: 'inherit',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': (resendTimer > 0 || isComplete) ? {} : {
              backgroundColor: '#F8FAFC',
              borderColor: '#94A3B8',
              transform: 'translateY(-1px)',
            },
            '&:active': (resendTimer > 0 || isComplete) ? {} : {
              backgroundColor: '#F1F5F9',
              transform: 'translateY(0)',
            },
          }}
        >
          <RefreshRoundedIcon
            sx={{
              fontSize: 19,
              color: (resendTimer > 0 || isComplete) ? '#94A3B8' : '#64748B',
              transition: 'transform 0.3s ease',
            }}
          />
          <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'inherit' }}>
            {resendTimer > 0 ? `${t.resendCode} (${resendTimer}s)` : t.resendCode}
          </Typography>
        </Box>

        {/* Resend Code Feedback Notice (appears below button, auto-disappears after 5s, no X icon) */}
        {infoNotice && (
          <Box
            sx={{
              mt: 1.5,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.85,
              py: 1,
              px: 2,
              borderRadius: '10px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #DCFCE7',
            }}
          >
            <CheckCircleRoundedIcon sx={{ fontSize: 16, color: '#16A34A' }} />
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#15803D' }}>
              {infoNotice}
            </Typography>
          </Box>
        )}

        {/* Space pusher */}
        <Box sx={{ flexGrow: 1 }} />

        <PrimaryButton
          fullWidth
          type="submit"
          loading={loading}
          disabled={!isComplete}
          sx={{
            height: '56px',
            borderRadius: '16px',
            fontSize: '16px',
            fontWeight: 800,
            backgroundColor: '#FF6B00',
            boxShadow: 'none',
            '&:hover': { backgroundColor: '#E66000', boxShadow: 'none' },
            mb: 2,
          }}
        >
          {t.confirmOtp}
        </PrimaryButton>
      </Box>
    </Box>
  );
};

export default DriverVerifyOtp;
