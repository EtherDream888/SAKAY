import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  LinearProgress,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

import Logo from '../../../../common/components/Logo';
import PrimaryButton from '../../../../common/components/PrimaryButton';
import SakayToast from '../../../../common/components/SakayToast';
import RegisterInput from '../../../../common/components/RegisterInput';
import SakayPhoneInput from '../../../../common/components/SakayPhoneInput';
import { useLanguage } from '../../../../utils/LanguageContext';
import {
  ensurePassengerAuthSession,
  formatPhoneToE164,
  lookupPassengerByPhone,
} from '../../../../services/passengerApiService';

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

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [phoneRegisteredError, setPhoneRegisteredError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.removeItem('sakay_passenger_registration_draft');
    } catch (e) {
      console.warn('[Register] Error clearing draft', e);
    }
  }, []);

  const cleanPhoneDigits = phone.replace(/\D/g, '');
  const fullName = [firstName.trim(), middleName.trim(), lastName.trim(), suffix.trim()].filter(Boolean).join(' ');

  // Clear phone registered error when user edits phone
  useEffect(() => {
    setPhoneRegisteredError(null);
  }, [cleanPhoneDigits]);

  const criteriaList = [
    {
      label: language === 'tl' ? 'Subukan ang hindi bababa sa 8 karakter' : 'Try at least 8 characters',
      met: password.length >= 8,
    },
    {
      label: language === 'tl' ? 'Isama ang malalaking titik (A-Z) at maliliit na titik (a-z)' : 'Include uppercase (A-Z) and lowercase (a-z)',
      met: /[A-Z]/.test(password) && /[a-z]/.test(password),
    },
    {
      label: language === 'tl' ? 'Isama ang numero (0-9)' : 'Include a number (0-9)',
      met: /\d/.test(password),
    },
    {
      label: language === 'tl' ? 'Isama ang simbolo (@, #, $, atbp.)' : 'Include a symbol (@, #, $, etc.)',
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];

  const metCount = criteriaList.filter((item) => item.met).length;
  const passwordScore = (metCount / criteriaList.length) * 100;
  const isPasswordValid = metCount === criteriaList.length;

  const getStrengthColor = () => {
    if (password.length === 0) return '#E2E8F0';
    if (metCount <= 2) return '#DC2626';
    if (metCount === 3) return '#EAB308';
    return '#16A34A';
  };

  const getStrengthLabel = () => {
    if (password.length === 0) return '';
    if (metCount <= 2) return language === 'tl' ? 'Mahina' : 'Weak';
    if (metCount === 3) return language === 'tl' ? 'Katamtaman' : 'Medium';
    return language === 'tl' ? 'Malakas' : 'Strong';
  };

  const isConfirmPasswordEntered = confirmPassword.length > 0;
  const isPasswordMismatched = isConfirmPasswordEntered && password !== confirmPassword;
  const [showMatchSuccess, setShowMatchSuccess] = useState(false);
  const [showPasswordStrength, setShowPasswordStrength] = useState(true);
  const [shakeTrigger, setShakeTrigger] = useState(0);

  useEffect(() => {
    if (shakeTrigger > 0) {
      const timer = setTimeout(() => setShakeTrigger(0), 450);
      return () => clearTimeout(timer);
    }
  }, [shakeTrigger]);

  useEffect(() => {
    if (!isPasswordValid) {
      setShowPasswordStrength(true);
    } else {
      const timer = setTimeout(() => {
        setShowPasswordStrength(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isPasswordValid]);

  useEffect(() => {
    if (isConfirmPasswordEntered && password === confirmPassword) {
      setShowMatchSuccess(true);
      const timer = setTimeout(() => {
        setShowMatchSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowMatchSuccess(false);
    }
  }, [password, confirmPassword, isConfirmPasswordEntered]);

  const e164Phone = formatPhoneToE164(cleanPhoneDigits);
  const isValidPhone = cleanPhoneDigits.length === 11 && cleanPhoneDigits.startsWith('09');
  const isAllRequiredFilled = Boolean(
    firstName.trim() &&
    lastName.trim() &&
    phone.trim() &&
    dob.trim() &&
    password.trim() &&
    confirmPassword.trim()
  );

  const isFormValid = Boolean(
    firstName.trim() &&
    lastName.trim() &&
    isValidPhone &&
    !phoneRegisteredError &&
    dob.trim() &&
    isPasswordValid &&
    password === confirmPassword
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    setAccountError(null);

    if (!isFormValid) {
      setShakeTrigger((prev) => prev + 1);
      return;
    }

    // --- CLIENT-SIDE AGE GATE (Under 12 years old block) ---
    const dobDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }

    if (age < 12) {
      setAccountError(t.under12Block);
      setToastMessage(t.under12Block);
      setShakeTrigger((prev) => prev + 1);
      return;
    }

    // Check if phone number is already registered and Active
    const existing = await lookupPassengerByPhone(cleanPhoneDigits);
    if (existing && (existing.account_status === 'Active' || existing.account_status === 'Verified')) {
      const msg = language === 'tl'
        ? 'Ang mobile number na ito ay nakarehistro na. Mag-log in o i-recover ang password.'
        : 'This mobile number is already registered. Please log in or recover your password.';
      setPhoneRegisteredError(msg);
      setAccountError(msg);
      setToastMessage(msg);
      return;
    }

    setSubmitted(true);

    try {
      const authResult = await ensurePassengerAuthSession(e164Phone, password, fullName);
      if (!authResult.success) {
        setAccountError(authResult.error || (language === 'tl' ? 'Hindi maikonekta ang account sa database.' : 'Failed to initialize account.'));
        setSubmitted(false);
        return;
      }
    } catch (authErr: any) {
      console.warn('[Register] Auth session error:', authErr);
      setAccountError(authErr.message || (language === 'tl' ? 'Nagkaroon ng aberya sa paglikha ng account.' : 'An error occurred creating account.'));
      setSubmitted(false);
      return;
    }

    try {
      localStorage.removeItem('sakay_passenger_registration_draft');
      localStorage.setItem('sakay_passenger_phone', e164Phone);
      localStorage.setItem('sakay_passenger_password', password);
    } catch {}

    navigate('/verify-otp', {
      state: {
        phone: e164Phone,
        identifier: e164Phone,
        password: password,
        passengerName: fullName,
        fullName: fullName,
        role: 'passenger',
        date_of_birth: dob,
        isRecovery: false,
      },
    });
  };

  const handleBack = () => {
    navigate('/get-started');
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
      {/* Pinned Top Navigation Bar with Back Button & Logo */}
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
          onClick={handleBack}
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

      {/* Scrollable Form Content */}
      <Box
        component="form"
        id="passenger-register-form"
        onSubmit={handleSubmit}
        sx={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 24px 16px 24px',
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
            {language === 'tl' ? 'Gumawa ng Account ng Pasahero' : 'Create Passenger Account'}
          </Typography>
          <Typography
            sx={{
              fontSize: '15px',
              color: '#64748B',
              mt: 0.75,
              fontWeight: 500,
            }}
          >
            {language === 'tl' ? 'Ilagay ang inyong impormasyon upang magparehistro.' : 'Enter your information to register.'}
          </Typography>
        </Box>

        {accountError && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }}>
            {accountError}
          </Alert>
        )}

        {/* Input Fields Stack */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          {/* Stacked Name Fields */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <RegisterInput
              label={language === 'tl' ? "UNANG PANGALAN" : "FIRST NAME"}
              value={firstName}
              onChange={setFirstName}
              required
              error={hasAttemptedSubmit && !firstName.trim()}
              helperText={hasAttemptedSubmit && !firstName.trim() ? (language === 'tl' ? 'Kailangan ang unang pangalan.' : 'First name is required.') : ''}
              shake={shakeTrigger > 0 && hasAttemptedSubmit && !firstName.trim()}
            />

            <RegisterInput
              label={language === 'tl' ? "GITNANG PANGALAN" : "MIDDLE NAME"}
              value={middleName}
              onChange={setMiddleName}
            />

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Box sx={{ flex: '7 7 70%', minWidth: 0 }}>
                <RegisterInput
                  label={language === 'tl' ? "APELYIDO" : "LAST NAME"}
                  value={lastName}
                  onChange={setLastName}
                  required
                  error={hasAttemptedSubmit && !lastName.trim()}
                  helperText={hasAttemptedSubmit && !lastName.trim() ? (language === 'tl' ? 'Kailangan ang apelyido.' : 'Last name is required.') : ''}
                  shake={shakeTrigger > 0 && hasAttemptedSubmit && !lastName.trim()}
                />
              </Box>
              <Box sx={{ flex: '3 3 30%', minWidth: 0 }}>
                <RegisterInput
                  label="SUFFIX"
                  value={suffix}
                  onChange={setSuffix}
                />
              </Box>
            </Box>
          </Box>

          {/* Mobile Number with SakayPhoneInput */}
          <SakayPhoneInput
            label={language === 'tl' ? "NUMERO NG TELEPONO" : "MOBILE NUMBER"}
            value={phone}
            onChange={(fullVal) => {
              setPhone(fullVal);
              if (phoneRegisteredError) setPhoneRegisteredError(null);
            }}
            required
            error={(hasAttemptedSubmit && !isValidPhone) || Boolean(phoneRegisteredError)}
            helperText={
              phoneRegisteredError
                ? phoneRegisteredError
                : (hasAttemptedSubmit && !isValidPhone
                    ? (language === 'tl' ? 'Pakikumpleto ang 10-digit mobile number na nagsisimula sa 9.' : 'Please enter a valid 10-digit mobile number starting with 9.')
                    : '')
            }
            shake={shakeTrigger > 0 && ((hasAttemptedSubmit && !isValidPhone) || Boolean(phoneRegisteredError))}
          />
          {phoneRegisteredError && (
            <Typography sx={{ fontSize: '12px', color: '#FF6B00', fontWeight: 600, px: 0.5, mt: -0.5, cursor: 'pointer' }}
              onClick={() => navigate('/forgot-password')}>
              {language === 'tl' ? '→ I-recover ang Password' : '→ Recover Password'}
            </Typography>
          )}

          {/* Date of Birth Input */}
          <RegisterInput
            label={language === 'tl' ? "PETSA NG KAPANGANAKAN" : "DATE OF BIRTH"}
            type="date"
            value={dob}
            onChange={setDob}
            required
            error={hasAttemptedSubmit && !dob.trim()}
            helperText={hasAttemptedSubmit && !dob.trim() ? (language === 'tl' ? 'Kailangan ang petsa ng kapanganakan.' : 'Date of birth is required.') : ''}
            shake={shakeTrigger > 0 && hasAttemptedSubmit && !dob.trim()}
            max={new Date().toISOString().split('T')[0]} // Max date is today
          />

          {/* Password Input */}
          <RegisterInput
            label="PASSWORD"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(val) => setPassword(val)}
            required
            error={hasAttemptedSubmit && (!password || !isPasswordValid)}
            helperText={
              hasAttemptedSubmit && !password
                ? (language === 'tl' ? 'Kailangan ang password.' : 'Password is required.')
                : (hasAttemptedSubmit && !isPasswordValid
                    ? (language === 'tl' ? 'Kailangang sundin ang lahat ng pamantayan sa password.' : 'Password must meet all criteria.')
                    : '')
            }
            shake={shakeTrigger > 0 && hasAttemptedSubmit && (!password || !isPasswordValid)}
            endAdornment={
              <IconButton
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
                size="small"
                sx={{ color: '#64748B' }}
              >
                {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
              </IconButton>
            }
          />

          {/* Password Strength Indicator */}
          {password.length > 0 && showPasswordStrength && (
            <Box sx={{ mt: -0.5, mb: 1, px: 0.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                  {language === 'tl' ? 'Lakas ng Password:' : 'Password Strength:'}
                </Typography>
                <Typography sx={{ fontSize: '12px', fontWeight: 700, color: getStrengthColor() }}>
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
                  },
                }}
              />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1.5 }}>
                {criteriaList.map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {item.met ? (
                      <CheckCircleIcon sx={{ fontSize: 16, color: '#16A34A' }} />
                    ) : (
                      <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                    )}
                    <Typography
                      sx={{
                        fontSize: '12px',
                        color: item.met ? '#15803D' : '#64748B',
                        fontWeight: item.met ? 600 : 400,
                      }}
                    >
                      {item.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Confirm Password Input */}
          <RegisterInput
            label={language === 'tl' ? "KUMPIRMAHIN ANG PASSWORD" : "CONFIRM PASSWORD"}
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(val) => setConfirmPassword(val)}
            required
            error={isPasswordMismatched || (hasAttemptedSubmit && !confirmPassword.trim())}
            helperText={
              isPasswordMismatched
                ? (language === 'tl' ? 'Hindi magkapareho ang password.' : 'Passwords do not match.')
                : (hasAttemptedSubmit && !confirmPassword.trim()
                    ? (language === 'tl' ? 'Kailangan kumpirmahin ang password.' : 'Please confirm password.')
                    : '')
            }
            shake={shakeTrigger > 0 && (isPasswordMismatched || (hasAttemptedSubmit && !confirmPassword.trim()))}
            endAdornment={
              <IconButton
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                edge="end"
                size="small"
                sx={{ color: '#64748B' }}
              >
                {showConfirmPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
              </IconButton>
            }
          />

          {showMatchSuccess && (
            <Typography sx={{ color: '#16A34A', fontSize: '12px', fontWeight: 600, px: 0.5, mt: -1 }}>
              {language === 'tl' ? 'Magkatugma ang password!' : 'Passwords match!'}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Pinned Bottom Action Bar with Submit Button & Login Link */}
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
          type="submit"
          form="passenger-register-form"
          fullWidth
          loading={submitted}
          disabled={!isAllRequiredFilled || submitted}
          sx={{
            height: '56px',
            borderRadius: '16px',
            fontSize: '16px',
            fontWeight: 800,
            backgroundColor: (isAllRequiredFilled && !submitted) ? '#FF6B00' : '#E2E8F0',
            color: (isAllRequiredFilled && !submitted) ? '#FFFFFF' : '#94A3B8',
            boxShadow: 'none',
            '&.Mui-disabled': {
              backgroundColor: '#E2E8F0',
              color: '#94A3B8',
            },
            '&:hover': {
              backgroundColor: (isAllRequiredFilled && !submitted) ? '#E66000' : '#E2E8F0',
              boxShadow: 'none',
            },
          }}
        >
          {t.continue}
        </PrimaryButton>

        <Typography
          onClick={() => navigate('/login')}
          sx={{
            textAlign: 'center',
            fontSize: '13.5px',
            color: '#64748B',
            mt: 1.5,
            fontWeight: 500,
            cursor: 'pointer',
            '&:hover': { color: '#0F172A' },
          }}
        >
          {language === 'tl' ? 'May account ka na?' : 'Already have an account?'}{' '}
          <Box
            component="span"
            sx={{
              color: '#FF6B00',
              fontWeight: 700,
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {language === 'tl' ? 'Mag-log in' : 'Log in'}
          </Box>
        </Typography>
      </Box>

      {/* Transient feedback toast */}
      <SakayToast
        open={Boolean(toastMessage)}
        message={toastMessage}
        severity="warning"
        onClose={() => setToastMessage(null)}
      />
    </Box>
  );
};

export default Register;
