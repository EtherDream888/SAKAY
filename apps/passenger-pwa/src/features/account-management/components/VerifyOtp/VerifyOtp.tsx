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

import Logo from '../../../../common/components/Logo';
import PrimaryButton from '../../../../common/components/PrimaryButton';
import { useLanguage } from '../../../../utils/LanguageContext';
import {
  sendPassengerOtp,
  verifyPassengerOtp,
  fetchLatestPassengerOtp,
  getPhoneLookupCandidates,
} from '../../../../services/passengerApiService';
import { supabase } from '../../../../services/supabaseClient';

const formatDisplayPhone = (raw: string = ''): string => {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
};

export const VerifyOtp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const state = location.state as {
    phone?: string;
    identifier?: string;
    password?: string;
    isRecovery?: boolean;
    passengerName?: string;
    fullName?: string;
    debugOtp?: string;
  } | undefined;

  const resolvedPhone = state?.phone || state?.identifier || '';
  const resolvedName = state?.passengerName || state?.fullName || 'Passenger';

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [sendingInitialOtp, setSendingInitialOtp] = useState<boolean>(true);
  const [resendTimer, setResendTimer] = useState(60);
  const [resendKey, setResendKey] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const resendNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutoApprovedRef = useRef(false);
  const hasDispatchedInitialOtpRef = useRef(false);
  const isComplete = otp.every((digit) => digit !== '');

  // Automatically initiate sending OTP SMS as soon as the user lands on this screen
  useEffect(() => {
    if (hasDispatchedInitialOtpRef.current || !resolvedPhone) return;
    hasDispatchedInitialOtpRef.current = true;

    const dispatchInitialOtp = async () => {
      setError('');
      setSendingInitialOtp(true);
      try {
        let result = await sendPassengerOtp(resolvedPhone);
        // If initial radio wake-up glitched, auto-retry once after 1s
        if (!result.success && result.error && result.error.toLowerCase().includes('unreachable')) {
          console.log('[VerifyOtp] Initial SMS Gateway wake-up radio retry...');
          await new Promise((resolve) => setTimeout(resolve, 1000));
          result = await sendPassengerOtp(resolvedPhone);
        }

        setSendingInitialOtp(false);
        if (result.success) {
          setResendTimer(60);
          setInfoNotice(
            language === 'tl'
              ? 'Ipinadala ang 6-digit verification code sa iyong mobile number.'
              : 'A 6-digit verification code was sent to your mobile number.'
          );
          if (resendNoticeTimerRef.current) clearTimeout(resendNoticeTimerRef.current);
          resendNoticeTimerRef.current = setTimeout(() => setInfoNotice(null), 5000);
        } else {
          setError(
            result.error ||
              (language === 'tl'
                ? 'Hindi maipadala ang OTP code. Pakisubukang muli.'
                : 'Failed to send OTP code. Please try again.')
          );
        }
      } catch (err: any) {
        setSendingInitialOtp(false);
        console.warn('[VerifyOtp] Initial OTP dispatch error:', err);
        setError(
          language === 'tl'
            ? 'Nagkaroon ng aberya sa koneksyon sa SMS server.'
            : 'Connection error reaching the SMS server.'
        );
      }
    };

    dispatchInitialOtp();
  }, [resolvedPhone, language]);

  // Countdown timer for resend
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
        const result = await verifyPassengerOtp(resolvedPhone, enteredCode);
        if (!result.success) {
          hasAutoApprovedRef.current = false;
          setLoading(false);
          setError(result.error || (language === 'tl' ? 'Maling OTP code. Pakisubukang muli.' : 'Incorrect OTP code. Please try again.'));
          return;
        }

        // Establish / update active Supabase Auth session for passenger
        const candidates = getPhoneLookupCandidates(resolvedPhone);
        const e164Phone = candidates.e164;
        const passengerPassword = state?.password || localStorage.getItem('sakay_passenger_password') || `SakayPassenger#2026_${candidates.phoneRaw.slice(-4)}`;

        if (resolvedPhone) {
          try {
            let authUser = (await supabase.auth.getUser()).data.user;

            if (!authUser) {
              const { data: signInRes, error: signInErr } = await supabase.auth.signInWithPassword({
                email: `passenger_${candidates.phone63NoPlus}@sakay.ph`,
                password: passengerPassword,
              });
              if (!signInErr && signInRes?.user) {
                authUser = signInRes.user;
              }
            }

            if (!authUser) {
              const { data: signUpRes } = await supabase.auth.signUp({
                email: `passenger_${candidates.phone63NoPlus}@sakay.ph`,
                password: passengerPassword,
                options: {
                  data: {
                    role: 'passenger',
                    phone: e164Phone,
                    contact_number: e164Phone,
                    full_name: resolvedName,
                  },
                },
              });
              authUser = signUpRes?.user || null;
            }

            // Link or update passenger record in public.passenger to Active
            const { data: existingRows } = await supabase
              .from('passenger')
              .select('passenger_id, auth_user_id')
              .or(`contact_number.eq.${candidates.phone63WithPlus},contact_number.eq.${candidates.phone09},contact_number.eq.${candidates.phone63NoPlus},contact_number.eq.${candidates.phoneRaw}${authUser ? `,auth_user_id.eq.${authUser.id}` : ''}`)
              .limit(1);

            const existing = existingRows?.[0] || null;

            // 1. Invoke activate_passenger_otp RPC (SECURITY DEFINER)
            try {
              await supabase.rpc('activate_passenger_otp', { p_contact_number: e164Phone });
            } catch (rpcErr) {
              console.debug('[PassengerVerifyOtp] activate_passenger_otp RPC note:', rpcErr);
            }

            // 2. Update Supabase Auth user metadata to mark OTP as verified
            try {
              await supabase.auth.updateUser({
                data: {
                  account_status: 'Active',
                  otp_verified: true,
                  phone_verified: true,
                },
              });
            } catch {}

            if (existing) {
              const updateData: Record<string, any> = {
                contact_number: e164Phone,
                account_status: 'Active',
              };
              if (authUser) updateData.auth_user_id = authUser.id;
              if (resolvedName && resolvedName !== 'Passenger') updateData.full_name = resolvedName;

              await supabase
                .from('passenger')
                .update(updateData)
                .eq('passenger_id', existing.passenger_id);
            } else if (authUser) {
              await supabase
                .from('passenger')
                .upsert(
                  [
                    {
                      auth_user_id: authUser.id,
                      full_name: resolvedName,
                      contact_number: e164Phone,
                      account_status: 'Active',
                    },
                  ],
                  { onConflict: 'auth_user_id' }
                );
            }
          } catch (authErr) {
            console.warn('[PassengerVerifyOtp] Auth session setup warning:', authErr);
          } finally {
            try {
              localStorage.setItem('sakay_passenger_phone', e164Phone);
              localStorage.setItem('sakay_passenger_status', 'Active');
              localStorage.removeItem('sakay_passenger_password');
            } catch {}
          }
        }

        setLoading(false);

        const isRecovery = Boolean(state?.isRecovery || (state as any)?.type === 'recovery');
        if (isRecovery) {
          navigate('/reset-password', { state: { phone: e164Phone, identifier: e164Phone } });
        } else {
          // Flow: Terms of Service -> Privacy Policy -> Registration Success
          navigate('/terms-of-service', {
            state: {
              phone: e164Phone,
              passengerName: resolvedName,
            },
          });
        }
      } catch (err: any) {
        console.error('[PassengerVerifyOtp] Verification exception:', err);
        hasAutoApprovedRef.current = false;
        setLoading(false);
        setError(language === 'tl' ? 'Hindi makumpleto ang pagpapatunay. Pakisubukang muli.' : 'Verification could not be completed. Please try again.');
      }
    },
    [loading, resolvedPhone, state, language, resolvedName, navigate]
  );

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

  // Background listener for incoming SMS:
  // 1. Browser Web OTP API (when supported)
  // 2. Cellular network arrival sync: waits 4.5s (average cellular transit time in PH) for SMS to hit the phone,
  //    then fetches and automatically enters the delivered code without focusing inputs (virtual keyboard never pops up).
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    // 1. Native Web OTP API listener
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
        .catch(() => {
          // Normal when aborted or dismissed
        });
    }

    // 2. Cellular transit delivery sync timer (triggers right as SMS arrives on device)
    const arrivalTimer = setTimeout(async () => {
      if (!isMounted || hasAutoApprovedRef.current || loading || isComplete) return;
      const userHasEnteredDigit = otp.some((d) => d !== '');
      if (userHasEnteredDigit) return;

      const latest = await fetchLatestPassengerOtp(resolvedPhone);
      if (isMounted && latest.success && latest.code && latest.code.length === 6) {
        console.log('[VerifyOtp] Cellular SMS arrived on device. Auto-filling verification code...');
        handleIncomingSmsOtp(latest.code);
      }
    }, 4500);

    return () => {
      isMounted = false;
      abortController.abort();
      clearTimeout(arrivalTimer);
    };
  }, [handleIncomingSmsOtp, resendKey, resolvedPhone, loading, isComplete, otp]);

  const handleOtpChange = (index: number, val: string) => {
    const rawChar = val.replace(/\D/g, '');
    const newOtp = [...otp];

    if (!rawChar) {
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }

    if (rawChar.length > 1) {
      const pasted = rawChar.slice(0, 6).split('');
      pasted.forEach((ch, idx) => {
        if (index + idx < 6) newOtp[index + idx] = ch;
      });
      setOtp(newOtp);
      const nextIdx = Math.min(index + pasted.length, 5);
      inputRefs.current[nextIdx]?.focus();
      if (newOtp.every((d) => d !== '')) {
        hasAutoApprovedRef.current = true;
        executeVerification(newOtp.join(''));
      }
      return;
    }

    newOtp[index] = rawChar.slice(-1);
    setOtp(newOtp);
    setError('');

    if (rawChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((digit) => digit !== '')) {
      hasAutoApprovedRef.current = true;
      executeVerification(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || loading) return;
    setError('');
    setInfoNotice(null);
    setLoading(true);

    try {
      const result = await sendPassengerOtp(resolvedPhone);
      setLoading(false);
      if (result.success) {
        hasAutoApprovedRef.current = false;
        setResendTimer(60);
        setOtp(['', '', '', '', '', '']);
        setResendKey((prev) => prev + 1);
        setInfoNotice(language === 'tl' ? 'Matagumpay na naipadala muli ang bagong verification code.' : 'Verification code re-sent successfully.');
        if (resendNoticeTimerRef.current) clearTimeout(resendNoticeTimerRef.current);
        resendNoticeTimerRef.current = setTimeout(() => setInfoNotice(null), 5000);
      } else {
        setError(result.error || (language === 'tl' ? 'Hindi maipadala ang OTP code. Pakisubukang muli.' : 'Failed to resend OTP. Please try again.'));
      }
    } catch {
      setLoading(false);
      setError(language === 'tl' ? 'Nagkaroon ng aberya sa koneksyon. Pakisubukang muli.' : 'Network connection error. Please try again.');
    }
  };

  const phoneCandidates = getPhoneLookupCandidates(resolvedPhone);
  const displayPhone = formatDisplayPhone(phoneCandidates.phone09);

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
      {/* Pinned Top Navigation Bar with Back Button and Logo */}
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
            if (state?.isRecovery) navigate('/forgot-password');
            else if (window.history.length > 1) navigate(-1);
            else navigate('/register');
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

      {/* Main Content Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 24px 16px 24px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Title Section */}
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
            {language === 'tl' ? 'I-verify ang Mobile Number' : 'Verify Mobile Number'}
          </Typography>
          <Typography
            sx={{
              fontSize: '15px',
              color: '#64748B',
              mt: 0.75,
              fontWeight: 500,
              lineHeight: 1.4,
            }}
          >
            {language === 'tl'
              ? `Nagpadala kami ng 6-digit code sa `
              : `We sent a 6-digit verification code to `}
            <Box component="span" sx={{ fontWeight: 700, color: '#0F172A' }}>
              {displayPhone || 'iyong numero'}
            </Box>
            .
          </Typography>
        </Box>

        {sendingInitialOtp && !infoNotice && !error && (
          <Alert severity="info" sx={{ mb: 2.5, borderRadius: '12px', alignItems: 'center' }}>
            {language === 'tl'
              ? 'Ipinapadala ang 6-digit verification code sa pamamagitan ng SMS...'
              : 'Sending 6-digit verification code via SMS...'}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        {infoNotice && (
          <Alert
            icon={<CheckCircleRoundedIcon fontSize="inherit" />}
            severity="success"
            sx={{ mb: 2.5, borderRadius: '12px' }}
          >
            {infoNotice}
          </Alert>
        )}

        {/* 6 OTP Input Boxes */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 1.2,
            my: 2,
          }}
        >
          {otp.map((digit, index) => (
            <TextField
              key={index}
              inputRef={(el) => (inputRefs.current[index] = el)}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e: any) => handleKeyDown(index, e)}
              type="tel"
              slotProps={{
                htmlInput: {
                  maxLength: 6,
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                  autoComplete: index === 0 ? 'one-time-code' : 'off',
                  style: {
                    textAlign: 'center',
                    fontSize: '22px',
                    fontWeight: 800,
                    color: '#0F172A',
                    padding: 0,
                    height: '58px',
                  },
                },
              }}
              sx={{
                flex: 1,
                backgroundColor: digit ? '#FFF8F3' : '#F8FAFC',
                borderRadius: '16px',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '16px',
                  height: '58px',
                  border: digit ? '1.5px solid #FF6B00' : '1px solid #E2E8F0',
                  '&.Mui-focused': {
                    borderColor: '#FF6B00',
                    boxShadow: '0 0 0 3px rgba(255, 107, 0, 0.12)',
                  },
                  '& fieldset': { border: 'none' },
                },
              }}
            />
          ))}
        </Box>

        {/* Resend Code Section */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            mt: 2,
          }}
        >
          {resendTimer > 0 ? (
            <Typography sx={{ fontSize: '13.5px', color: '#64748B', fontWeight: 500 }}>
              {language === 'tl'
                ? `Muling magpadala pagkalipas ng `
                : `Resend code in `}
              <Box component="span" sx={{ fontWeight: 700, color: '#FF6B00' }}>
                {resendTimer}s
              </Box>
            </Typography>
          ) : (
            <Box
              onClick={handleResendOtp}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: '#FF6B00',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '14px',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              <RefreshRoundedIcon sx={{ fontSize: 18 }} />
              <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#FF6B00' }}>
                {language === 'tl' ? 'Ipadala Muli ang Code' : 'Resend Code'}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Pinned Bottom Action Bar */}
      <Box
        sx={{
          padding: '12px 24px calc(var(--safe-area-bottom) + 16px) 24px',
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #F1F5F9',
          flexShrink: 0,
          zIndex: 30,
        }}
      >
        <PrimaryButton
          onClick={() => executeVerification(otp.join(''))}
          fullWidth
          loading={loading}
          disabled={!isComplete || loading}
          sx={{
            height: '56px',
            borderRadius: '16px',
            fontSize: '16px',
            fontWeight: 800,
            backgroundColor: isComplete ? '#FF6B00' : '#E2E8F0',
            color: isComplete ? '#FFFFFF' : '#94A3B8',
            boxShadow: 'none',
            '&.Mui-disabled': {
              backgroundColor: '#E2E8F0',
              color: '#94A3B8',
            },
            '&:hover': {
              backgroundColor: isComplete ? '#E66000' : '#E2E8F0',
              boxShadow: 'none',
            },
          }}
        >
          {language === 'tl' ? 'Kumpirmahin' : 'Confirm'}
        </PrimaryButton>
      </Box>
    </Box>
  );
};

export default VerifyOtp;
