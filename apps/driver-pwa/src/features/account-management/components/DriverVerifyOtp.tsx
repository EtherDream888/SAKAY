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
import { sendDriverOtp, verifyDriverOtp, fetchLatestDriverOtp, formatPhoneToE164, getPhoneLookupCandidates, lookupDriverByPhoneSecure } from '../../../services/driverApiService';
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
  const { t, language } = useLanguage();
  const state = location.state as { phone?: string; password?: string; isRecovery?: boolean; isOtpLogin?: boolean; driverName?: string; todaId?: string; debugOtp?: string } | undefined;

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(60);
  const [resendKey, setResendKey] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const resendNoticeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoApprovedRef = useRef(false);
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
        const rawPhone = state?.phone || localStorage.getItem('sakay_driver_phone') || '';
        const candidates = getPhoneLookupCandidates(rawPhone);
        const e164Phone = candidates.e164;
        const driverPassword = state?.password || localStorage.getItem('sakay_driver_password') || `SakayDriver#2026_${candidates.phoneRaw.slice(-4)}`;

        if (rawPhone) {
          try {
            let authUser = (await supabase.auth.getUser()).data.user;

            const savedAuthEmail = localStorage.getItem('sakay_driver_auth_email');
            if (savedAuthEmail && !candidates.authCandidates.some((c: any) => c.email === savedAuthEmail)) {
              candidates.authCandidates.unshift({ email: savedAuthEmail });
            }

            if (!authUser) {
              for (const candidate of candidates.authCandidates) {
                const { data: signInRes, error: signInErr } = await supabase.auth.signInWithPassword({
                  ...candidate,
                  password: driverPassword,
                });
                if (!signInErr && signInRes?.user) {
                  authUser = signInRes.user;
                  break;
                }
              }
            }

            if (!authUser) {
              const emailToUse = savedAuthEmail || `driver_${candidates.phone63NoPlus}@sakay.ph`;
              const { data: signUpRes } = await supabase.auth.signUp({
                email: emailToUse,
                password: driverPassword,
                options: {
                  data: {
                    role: 'driver',
                    phone: e164Phone,
                    contact_number: e164Phone,
                    full_name: state?.driverName || null,
                    toda_id: state?.todaId || null,
                  },
                },
              });
              authUser = signUpRes?.user || null;

              if (!authUser) {
                const altEmail = `driver_${candidates.phone63NoPlus}+${Date.now().toString().slice(-6)}@sakay.ph`;
                const { data: altSignUp } = await supabase.auth.signUp({
                  email: altEmail,
                  password: driverPassword,
                  options: {
                    data: {
                      role: 'driver',
                      phone: e164Phone,
                      contact_number: e164Phone,
                      full_name: state?.driverName || null,
                      toda_id: state?.todaId || null,
                    },
                  },
                });
                authUser = altSignUp?.user || null;
              }
            }

            if (authUser) {
              console.log('[DriverVerifyOtp] Authenticated user session established:', authUser.id);
              // Link or update driver record in public.driver
              const { data: driverRows } = await supabase
                .from('driver')
                .select('driver_id, auth_user_id, contact_number')
                .or(`auth_user_id.eq.${authUser.id},contact_number.eq.${candidates.phone63WithPlus},contact_number.eq.${candidates.phone09},contact_number.eq.${candidates.phone63NoPlus},contact_number.eq.${candidates.phoneRaw}`)
                .limit(1);

              const driverRow = driverRows?.[0] || null;

              if (driverRow) {
                console.log('[DriverVerifyOtp] Linking existing driver profile:', driverRow.driver_id);
                await supabase
                  .from('driver')
                  .update({
                    auth_user_id: authUser.id,
                    contact_number: e164Phone,
                    ...(state?.todaId ? { toda_id: state.todaId } : {}),
                    ...(state?.driverName ? { full_name: state.driverName } : {}),
                  })
                  .eq('driver_id', driverRow.driver_id);
              } else {
                const storedTodaId = typeof window !== 'undefined' ? localStorage.getItem('sakay_driver_toda_id') : null;
                await supabase
                  .from('driver')
                  .upsert(
                    [
                      {
                        auth_user_id: authUser.id,
                        full_name: state?.driverName || 'Bagong Drayber',
                        contact_number: e164Phone,
                        toda_id: state?.todaId || storedTodaId || null,
                        account_status: 'Pending Verification',
                        availability_status: 'Offline',
                      },
                    ],
                    { onConflict: 'auth_user_id' }
                  );
              }
            }
          } catch (authErr) {
            console.warn('[DriverVerifyOtp] Auth session setup warning:', authErr);
          } finally {
            try {
              localStorage.setItem('sakay_driver_phone', e164Phone);
              localStorage.removeItem('sakay_driver_password');
            } catch {}
          }
        }

        if (state?.isOtpLogin) {
          const driverData = await lookupDriverByPhoneSecure(e164Phone);
          setLoading(false);
          if (driverData) {
            localStorage.setItem('sakay_driver_phone', e164Phone);
            localStorage.setItem('sakay_driver_id', driverData.driver_id);
            const todaInfo = Array.isArray(driverData.toda) ? driverData.toda[0] : driverData.toda;
            const todaNameStr = todaInfo?.toda_name || 'Calapan Central TODA';
            const todaAcronymStr = todaInfo?.toda_acronym || 'CCTODA';

            localStorage.setItem(
              'sakay_driver_profile',
              JSON.stringify({
                name: driverData.full_name,
                phone: driverData.contact_number || e164Phone,
                vehiclePlate: driverData.plate_number || 'MV-101',
                licenseNumber: driverData.license_number || 'L01-99-123456',
                franchiseNumber: driverData.franchise_number || 'MTOP-PENDING',
                todaName: `${todaNameStr} (${todaAcronymStr})`,
                rating: 5.0,
                isOnline: false,
                isPaused: false,
                accountStatus: driverData.account_status,
                verificationStage: driverData.account_status === 'Verified' || driverData.account_status === 'Active' ? 'Stage 2 Approved' : 'Stage 1 TODA Review',
              })
            );

            if (driverData.account_status === 'Active' || driverData.account_status === 'Verified') {
              navigate('/driver/home', { replace: true });
            } else if (driverData.account_status === 'Rejected') {
              navigate('/driver/status', {
                replace: true,
                state: {
                  driverName: driverData.full_name,
                  accountStatus: 'Rejected',
                  rejectionReason: driverData.verification?.remarks || 'Application rejected',
                },
              });
            } else {
              if (!driverData.verification || !driverData.verification.submitted_license_number) {
                navigate('/driver/prepare-documents', {
                  replace: true,
                  state: {
                    phone: e164Phone,
                    driverName: driverData.full_name,
                  },
                });
              } else {
                const isEndorsed =
                  driverData.verification.verification_status === 'Approved' ||
                  driverData.verification.verification_status === 'TODA Approved' ||
                  driverData.verification.verification_status === 'Endorsed to LGU' ||
                  driverData.account_status === 'TODA Approved' ||
                  driverData.account_status === 'Endorsed to LGU';

                navigate('/driver/status', {
                  replace: true,
                  state: {
                    driverName: driverData.full_name,
                    accountStatus: isEndorsed ? 'Endorsed to LGU' : 'Pending Verification',
                  },
                });
              }
            }
            return;
          } else {
            setError(
              language === 'tl'
                ? 'Walang nahanap na account para sa numerong ito. Mangyaring mag-register muna.'
                : 'No account found for this mobile number. Please register first.'
            );
            return;
          }
        }

        setLoading(false);
        if (state?.isRecovery) {
          navigate('/driver/reset-password', { replace: true, state: { phone: e164Phone } });
        } else {
          navigate('/driver/terms-of-service', {
            replace: true,
            state: {
              driverName: state?.driverName || 'Bagong Drayber',
              phone: e164Phone,
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

  const resolvedPhone = state?.phone || localStorage.getItem('sakay_driver_phone') || '';

  // Auto-fill OTP as soon as SMS is received, without focusing inputs or showing soft keyboard
  const handleIncomingSmsOtp = useCallback(
    (incomingCode: string) => {
      const cleaned = (incomingCode || '').replace(/\D/g, '').slice(0, 6);
      if (cleaned.length !== 6 || hasAutoApprovedRef.current || loading) return;

      hasAutoApprovedRef.current = true;
      const digits = cleaned.split('');
      setOtp(digits);
      setError('');

      // CRITICAL FOR CLEAN & SMOOTH FLOW:
      // We do NOT call inputRefs.current[...].focus() here!
      // Keeping focus off the input ensures the virtual keyboard never opens unless the user taps a field.

      // Automatically execute verification with a gentle delay so the user sees the filled numbers
      setTimeout(() => {
        executeVerification(cleaned);
      }, 400);
    },
    [loading, executeVerification]
  );

  // Background listener for incoming SMS (Web OTP API + Gateway delivery synchronization)
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    // 1. Native Web OTP API for mobile Chrome & supported browsers
    if (typeof window !== 'undefined' && 'OTPCredential' in window) {
      navigator.credentials
        .get({
          otp: { transport: ['sms'] },
          signal: abortController.signal,
        } as any)
        .then((content: any) => {
          if (!isMounted) return;
          if (content && content.code) {
            handleIncomingSmsOtp(content.code);
          }
        })
        .catch(() => {});
    }

    // 2. Real-time SMS Gateway delivery synchronization (matches 2-3s cellular SMS transit time)
    if (!resolvedPhone) return;

    let pollCount = 0;
    const maxPolls = 20; // 30 seconds total window
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    // Start checking after 2 seconds to match actual cellular network dispatch time
    const initialTimer = setTimeout(() => {
      const checkOtpDelivery = async () => {
        if (!isMounted || hasAutoApprovedRef.current) {
          if (pollInterval) clearInterval(pollInterval);
          return;
        }
        pollCount += 1;
        if (pollCount > maxPolls) {
          if (pollInterval) clearInterval(pollInterval);
          return;
        }

        const res = await fetchLatestDriverOtp(resolvedPhone);
        if (res.success && res.code && res.code.length === 6) {
          if (pollInterval) clearInterval(pollInterval);
          handleIncomingSmsOtp(res.code);
        }
      };

      checkOtpDelivery();
      pollInterval = setInterval(checkOtpDelivery, 1500);
    }, 2000);

    return () => {
      isMounted = false;
      abortController.abort();
      clearTimeout(initialTimer);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [resolvedPhone, handleIncomingSmsOtp, resendKey]);

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
        hasAutoApprovedRef.current = false;
        setOtp(['', '', '', '', '', '']);
        setResendKey((prev) => prev + 1);
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
          onClick={() => {
            if (state?.isRecovery) navigate('/driver/forgot-password');
            else if (state?.isOtpLogin) navigate('/driver/login');
            else if (window.history.length > 1) navigate(-1);
            else navigate('/driver/register');
          }}
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
                  pattern: '[0-9]*',
                  autoComplete: i === 0 ? 'one-time-code' : 'off',
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
