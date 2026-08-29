import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  LinearProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import LocalPhoneOutlinedIcon from '@mui/icons-material/LocalPhoneOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import HttpsOutlinedIcon from '@mui/icons-material/HttpsOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
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

export const DriverRegister: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Clear any old stored draft on mount so form always starts fresh
  useEffect(() => {
    try {
      localStorage.removeItem('sakay_driver_registration_draft');
    } catch (e) {
      console.warn('[DriverRegister] Error clearing draft', e);
    }
  }, []);

  // Field focus states to control icon disappearance and label float
  const [nameFocused, setNameFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  // Locked 09 Mobile number handlers (initiates 09 only upon focus/typing)
  const handlePhoneFocus = () => {
    setPhoneFocused(true);
    if (!phone || !phone.trim()) {
      setPhone('09');
    }
  };

  const handlePhoneBlur = () => {
    setPhoneFocused(false);
    const clean = phone.replace(/\D/g, '');
    // If nothing beyond 09 was entered, reset to empty
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
        // If cursor is at or before index 2 (inside or right after '09'), prevent deletion
        if (start <= 2 && input.value.startsWith('09')) {
          e.preventDefault();
          return;
        }
        // If cursor is directly after a space, delete the digit before the space
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

  // Password Criteria Validation (matching TODA registration)
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-]/.test(password);

  const criteriaList = [
    { label: 'Minimum 8 characters', met: hasMinLength },
    { label: 'At least 1 uppercase letter (A-Z)', met: hasUppercase },
    { label: 'At least 1 lowercase letter (a-z)', met: hasLowercase },
    { label: 'At least 1 number (0-9)', met: hasNumber },
    { label: 'At least 1 special character (!@#$%^&*)', met: hasSpecial },
  ];

  const metCount = criteriaList.filter((c) => c.met).length;
  const passwordScore = (metCount / criteriaList.length) * 100;
  const isPasswordValid = metCount === criteriaList.length;

  const getStrengthColor = () => {
    if (metCount <= 2) return '#DC2626';
    if (metCount <= 4) return '#EA580C';
    return '#16A34A';
  };

  const getStrengthLabel = () => {
    if (password.length === 0) return '';
    if (metCount <= 2) return 'Weak';
    if (metCount <= 4) return 'Moderate';
    return 'Strong';
  };

  // Password Confirmation Validation
  const isPasswordMatched = confirmPassword.length > 0 && password === confirmPassword;
  const isPasswordMismatched = confirmPassword.length > 0 && password !== confirmPassword;
  const [showMatchSuccess, setShowMatchSuccess] = useState(false);

  useEffect(() => {
    if (confirmPassword.length > 0 && password === confirmPassword) {
      setShowMatchSuccess(true);
      const timer = setTimeout(() => {
        setShowMatchSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowMatchSuccess(false);
    }
  }, [password, confirmPassword]);

  const cleanPhoneDigits = phone.replace(/\D/g, '');
  const isFormValid = Boolean(
    name.trim() &&
    cleanPhoneDigits.length === 11 &&
    cleanPhoneDigits.startsWith('09') &&
    isPasswordValid &&
    password === confirmPassword
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    if (!isFormValid) return;

    setSubmitted(true);
    try {
      localStorage.removeItem('sakay_driver_registration_draft');
    } catch {}

    let otpResult: { success: boolean; message?: string; error?: string; debugOtp?: string } | null = null;
    try {
      otpResult = await sendDriverOtp(cleanPhoneDigits);
    } catch (err) {
      console.warn('[DriverRegister] Error triggering SMS OTP:', err);
    }

    navigate('/driver/verify-otp', {
      state: {
        phone: cleanPhoneDigits,
        driverName: name.trim(),
        isRecovery: false,
        debugOtp: otpResult?.debugOtp,
      },
    });
  };

  const showNameIcon = !nameFocused && !name;
  const showPhoneIcon = !phoneFocused && !phone;
  const showPasswordIcon = !passwordFocused && !password;
  const showConfirmPasswordIcon = !confirmPasswordFocused && !confirmPassword;

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
          onClick={() => navigate('/account-selection')}
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
        {/* Title & Subtitle */}
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
            {t.createAccountTitle}
          </Typography>
          <Typography
            sx={{
              fontSize: '15px',
              color: '#64748B',
              mt: 0.75,
              fontWeight: 500,
            }}
          >
            {t.prepareYourDetails}
          </Typography>
        </Box>

        {/* Input Fields Stack */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          {/* Field 1: Full Name */}
          <TextField
            fullWidth
            required
            label={t.fullName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            error={hasAttemptedSubmit && !name.trim()}
            helperText={hasAttemptedSubmit && !name.trim() ? 'Full name is required.' : ''}
            slotProps={{
              inputLabel: {
                shrink: Boolean(nameFocused || name),
                sx: {
                  color: '#64748B',
                  fontSize: '14px',
                  fontWeight: 500,
                  '&.Mui-focused': { color: '#FF6B00', fontWeight: 600 },
                  ...(showNameIcon ? { transform: 'translate(44px, 16px) scale(1)' } : {}),
                },
              },
              input: {
                startAdornment: showNameIcon ? (
                  <InputAdornment position="start">
                    <PersonOutlinedIcon sx={{ color: '#0F172A', fontSize: 20 }} />
                  </InputAdornment>
                ) : null,
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

          {/* Field 2: Mobile Number */}
          <TextField
            fullWidth
            required
            label={t.mobileNumber}
            value={phone}
            onChange={handlePhoneChange}
            onKeyDown={handlePhoneKeyDown}
            onFocus={handlePhoneFocus}
            onBlur={handlePhoneBlur}
            error={hasAttemptedSubmit && (cleanPhoneDigits.length !== 11 || !cleanPhoneDigits.startsWith('09'))}
            helperText={
              hasAttemptedSubmit && cleanPhoneDigits.length !== 11
                ? 'Please enter a valid 11-digit mobile number starting with 09.'
                : ''
            }
            slotProps={{
              inputLabel: {
                shrink: Boolean(phoneFocused || phone),
                sx: {
                  color: '#64748B',
                  fontSize: '14px',
                  fontWeight: 500,
                  '&.Mui-focused': { color: '#FF6B00', fontWeight: 600 },
                  ...(showPhoneIcon ? { transform: 'translate(44px, 16px) scale(1)' } : {}),
                },
              },
              input: {
                startAdornment: showPhoneIcon ? (
                  <InputAdornment position="start">
                    <LocalPhoneOutlinedIcon sx={{ color: '#0F172A', fontSize: 20 }} />
                  </InputAdornment>
                ) : null,
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

          {/* Field 3: Password */}
          <TextField
            fullWidth
            required
            type={showPassword ? 'text' : 'password'}
            label={t.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            error={hasAttemptedSubmit && !isPasswordValid}
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

          {/* Password Progress Bar - Disappears completely once all requirements are met */}
          {!isPasswordValid && password.length > 0 && (
            <Box sx={{ mt: -0.5, mb: 0.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                  Password Strength:
                </Typography>
                <Typography sx={{ fontSize: '11px', color: getStrengthColor(), fontWeight: 700 }}>
                  {getStrengthLabel()}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={passwordScore}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#E2E8F0',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getStrengthColor(),
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                  },
                }}
              />
            </Box>
          )}

          {/* Password Criteria Checklist - Disappears completely once all requirements are met */}
          {!isPasswordValid && password.length > 0 && (
            <Box sx={{ p: 1.75, borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#334155', mb: 1 }}>
                Password Requirements:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.85 }}>
                {criteriaList.map((crit, idx) => (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {crit.met ? (
                      <CheckCircleIcon sx={{ fontSize: 16, color: '#16A34A' }} />
                    ) : (
                      <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                    )}
                    <Typography
                      sx={{
                        fontSize: '11.5px',
                        color: crit.met ? '#16A34A' : '#64748B',
                        fontWeight: crit.met ? 600 : 400,
                      }}
                    >
                      {crit.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Field 4: Confirm Password */}
          <TextField
            fullWidth
            required
            type={showConfirmPassword ? 'text' : 'password'}
            label={t.confirmPassword}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onFocus={() => setConfirmPasswordFocused(true)}
            onBlur={() => setConfirmPasswordFocused(false)}
            error={isPasswordMismatched || (hasAttemptedSubmit && !confirmPassword)}
            helperText={
              isPasswordMismatched
                ? 'Passwords do not match.'
                : showMatchSuccess
                ? 'Passwords match ✓'
                : ''
            }
            slotProps={{
              formHelperText: {
                sx: {
                  fontSize: '11.5px',
                  color: isPasswordMismatched ? '#DC2626' : showMatchSuccess ? '#16A34A' : '#64748B',
                  fontWeight: isPasswordMismatched || showMatchSuccess ? 600 : 400,
                },
              },
              inputLabel: {
                shrink: Boolean(confirmPasswordFocused || confirmPassword),
                sx: {
                  color: '#64748B',
                  fontSize: '14px',
                  fontWeight: 500,
                  '&.Mui-focused': { color: '#FF6B00', fontWeight: 600 },
                  ...(showConfirmPasswordIcon ? { transform: 'translate(44px, 16px) scale(1)' } : {}),
                },
              },
              input: {
                startAdornment: showConfirmPasswordIcon ? (
                  <InputAdornment position="start">
                    <HttpsOutlinedIcon sx={{ color: '#0F172A', fontSize: 20 }} />
                  </InputAdornment>
                ) : null,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      size="small"
                      sx={{ color: '#64748B' }}
                    >
                      {showConfirmPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
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
        </Box>

        {/* Space pusher to push button to bottom on tall screens */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Action Button: Continue */}
        <PrimaryButton
          fullWidth
          type="submit"
          loading={submitted}
          sx={{
            height: '56px',
            borderRadius: '16px',
            fontSize: '16px',
            fontWeight: 800,
            backgroundColor: '#FF6B00',
            boxShadow: 'none',
            '&:hover': { backgroundColor: '#E66000', boxShadow: 'none' },
            mb: 2,
            mt: 2,
          }}
        >
          {t.createAccountBtn}
        </PrimaryButton>

        {/* Bottom Link: Already have an account? Login */}
        <Typography
          sx={{
            textAlign: 'center',
            fontSize: '14px',
            color: '#0F172A',
            fontWeight: 700,
            mb: 1,
          }}
        >
          {t.alreadyHaveAccount}{' '}
          <Box
            component="span"
            onClick={() => navigate('/driver/login')}
            sx={{
              color: '#FF6B00',
              fontWeight: 700,
              cursor: 'pointer',
              ml: '4px',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {t.loginLink}
          </Box>
        </Typography>
      </Box>
    </Box>
  );
};

export default DriverRegister;
