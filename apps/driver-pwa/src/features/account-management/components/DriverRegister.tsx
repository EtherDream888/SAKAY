import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  LinearProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Select, MenuItem } from '@mui/material';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import SakayToast from '../../../common/components/SakayToast';
import SakayPhoneInput from '../../../common/components/SakayPhoneInput';
import { RegisterInput } from '../../../common/components/RegisterInput';
import { useLanguage } from '../../../utils/LanguageContext';
import { ensureDriverAuthSession, fetchAccreditedTodas, formatPhoneToE164, lookupDriverByPhoneSecure } from '../../../services/driverApiService';
import { saveRegisteredNameParts } from '../../../services/driverOnboardingCache';

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

export const DriverRegister: React.FC = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedTodaId, setSelectedTodaId] = useState('');
  const [todaList, setTodaList] = useState<Array<{ id: string; name: string; acronym: string; barangay: string }>>([]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [todaFocused, setTodaFocused] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [shakeTrigger, setShakeTrigger] = useState(0);

  useEffect(() => {
    try {
      localStorage.removeItem('sakay_driver_registration_draft');
    } catch (e) {
      console.warn('[DriverRegister] Error clearing draft', e);
    }
    fetchAccreditedTodas().then((list) => {
      setTodaList(list);
    });
  }, []);

  useEffect(() => {
    if (shakeTrigger > 0) {
      const timer = setTimeout(() => setShakeTrigger(0), 450);
      return () => clearTimeout(timer);
    }
  }, [shakeTrigger]);

  const cleanPhoneDigits = phone.replace(/\D/g, '');
  const fullName = [firstName.trim(), middleName.trim(), lastName.trim(), suffix.trim()].filter(Boolean).join(' ');

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
    selectedTodaId &&
    phone.trim() &&
    password.trim() &&
    confirmPassword.trim()
  );

  const isFormValid = Boolean(
    firstName.trim() &&
    lastName.trim() &&
    selectedTodaId &&
    isValidPhone &&
    isPasswordValid &&
    password === confirmPassword
  );

  const handleBack = () => {
    navigate('/driver/get-started');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    setAccountError(null);
    if (!isFormValid) {
      setShakeTrigger((prev) => prev + 1);
      return;
    }

    setSubmitted(true);

    const existing = await lookupDriverByPhoneSecure(cleanPhoneDigits);
    if (existing && (existing.account_status === 'Active' || existing.account_status === 'Verified' || existing.account_status === 'Approved')) {
      const msg = language === 'tl'
        ? 'Ang mobile number na ito ay nakarehistro na. Mangyaring gumamit ng ibang numero o mag-log in.'
        : 'This mobile number is already registered. Please use another number or log in.';
      setAccountError(msg);
      setSubmitted(false);
      return;
    }

    const sessionResult = await ensureDriverAuthSession(e164Phone, password, fullName, selectedTodaId);
    if (!sessionResult.success) {
      setSubmitted(false);
      const isAlreadyReg = sessionResult.error?.toLowerCase().includes('already') || sessionResult.error?.toLowerCase().includes('registered') || sessionResult.error?.toLowerCase().includes('exists');
      const errToastMsg = isAlreadyReg
        ? (language === 'tl'
            ? 'Ang mobile number na ito ay nakarehistro na. Mangyaring gumamit ng ibang numero o mag-log in.'
            : 'This mobile number is already registered. Please use another number or log in.')
        : (sessionResult.error || (language === 'tl' ? 'Hindi maihanda ang inyong account. Pakisubukang muli.' : 'Unable to prepare your account. Please try again.'));
      setAccountError(errToastMsg);
      return;
    }

    try {
      localStorage.removeItem('sakay_driver_registration_draft');
      localStorage.setItem('sakay_driver_phone', e164Phone);
      localStorage.setItem('sakay_driver_password', password);
      localStorage.setItem('sakay_driver_toda_id', selectedTodaId);
      saveRegisteredNameParts({
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        suffix: suffix.trim(),
        fullName,
      }, e164Phone);
    } catch {}

    navigate('/driver/verify-otp', {
      state: {
        phone: e164Phone,
        password: password,
        driverName: fullName,
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        suffix: suffix.trim(),
        todaId: selectedTodaId,
        isRecovery: false,
      },
    });
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
      {/* Toast Error Notification */}
      <SakayToast
        open={Boolean(accountError)}
        message={accountError}
        severity="warning"
        onClose={() => setAccountError(null)}
      />

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
        id="driver-register-form"
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
            {language === 'tl' ? 'Gumawa ng Account ng Drayber' : 'Create Driver Account'}
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

        {/* Input Fields Stack */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          {/* Stacked Name Fields */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <RegisterInput
              label={language === 'tl' ? "UNANG PANGALAN" : "FIRST NAME"}
              required
              value={firstName}
              onChange={setFirstName}
              shake={shakeTrigger > 0 && hasAttemptedSubmit && !firstName.trim()}
              error={hasAttemptedSubmit && !firstName.trim()}
              helperText={hasAttemptedSubmit && !firstName.trim() ? (language === 'tl' ? 'Kailangan ang unang pangalan.' : 'First name is required.') : ''}
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
                  required
                  value={lastName}
                  onChange={setLastName}
                  shake={shakeTrigger > 0 && hasAttemptedSubmit && !lastName.trim()}
                  error={hasAttemptedSubmit && !lastName.trim()}
                  helperText={hasAttemptedSubmit && !lastName.trim() ? (language === 'tl' ? 'Kailangan ang apelyido.' : 'Last name is required.') : ''}
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

          {/* TODA Selection Combobox */}
          <Box sx={{ width: '100%' }}>
            <Box
              className={shakeTrigger > 0 && hasAttemptedSubmit && !selectedTodaId ? 'anim-shake' : ''}
              sx={{
                width: '100%',
                minHeight: '62px',
                height: '62px',
                borderRadius: '16px',
                backgroundColor: todaFocused ? '#FFFFFF' : '#F1F3F5',
                border: `1.5px solid ${
                  hasAttemptedSubmit && !selectedTodaId
                    ? '#DC2626'
                    : todaFocused
                    ? '#FF6B00'
                    : '#E2E8F0'
                }`,
                boxShadow: todaFocused
                  ? '0 0 0 3px rgba(255, 107, 0, 0.12)'
                  : 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                px: 2,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                boxSizing: 'border-box',
              }}
            >
              <Typography
                sx={{
                  position: 'absolute',
                  left: '16px',
                  top: selectedTodaId ? '8px' : '50%',
                  transform: selectedTodaId ? 'translateY(0)' : 'translateY(-50%)',
                  fontSize: selectedTodaId ? '9.5px' : '15px',
                  fontWeight: selectedTodaId ? 700 : 500,
                  color:
                    hasAttemptedSubmit && !selectedTodaId
                      ? '#DC2626'
                      : todaFocused
                      ? '#FF6B00'
                      : selectedTodaId
                      ? '#64748B'
                      : '#94A3B8',
                  letterSpacing: selectedTodaId ? '0.5px' : '0px',
                  textTransform: selectedTodaId ? 'uppercase' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  pointerEvents: 'none',
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {language === 'tl' ? 'TODA NA KINABABILANGAN' : 'AFFILIATED TODA'}
                <Box component="span" sx={{ color: '#DC2626', fontWeight: 800 }}>
                  *
                </Box>
              </Typography>
              <Select
                value={selectedTodaId}
                onChange={(e) => setSelectedTodaId(e.target.value as string)}
                onOpen={() => setTodaFocused(true)}
                onClose={() => setTodaFocused(false)}
                onFocus={() => setTodaFocused(true)}
                onBlur={() => setTodaFocused(false)}
                displayEmpty
                renderValue={(selected) => {
                  if (!selected) return null;
                  const matched = todaList.find((t) => t.id === selected);
                  return matched ? `${matched.name} (${matched.acronym})` : selected;
                }}
                IconComponent={ExpandMoreIcon}
                fullWidth
                sx={{
                  height: '100%',
                  pt: selectedTodaId ? '16px' : 0,
                  '& .MuiSelect-select': {
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0F172A',
                    py: 0,
                    px: 0,
                    display: 'flex',
                    alignItems: 'center',
                  },
                  '& fieldset': { border: 'none' },
                }}
              >
                <MenuItem value="" disabled sx={{ color: '#94A3B8', fontSize: '14px' }}>
                  {language === 'tl' ? 'Piliin ang inyong TODA' : 'Select your TODA'}
                </MenuItem>
                {todaList.map((toda) => (
                  <MenuItem key={toda.id} value={toda.id} sx={{ fontSize: '14px', fontWeight: 500 }}>
                    {toda.name} ({toda.acronym})
                  </MenuItem>
                ))}
              </Select>
            </Box>
            {hasAttemptedSubmit && !selectedTodaId && (
              <Typography sx={{ color: '#DC2626', fontSize: '12px', mt: 0.5, px: 1, fontWeight: 500 }}>
                {language === 'tl' ? 'Pakipili muna ang inyong TODA.' : 'Please select your TODA.'}
              </Typography>
            )}
          </Box>

          <SakayPhoneInput
            label={language === 'tl' ? "NUMERO NG TELEPONO" : "MOBILE NUMBER"}
            value={phone}
            onChange={(fullVal) => setPhone(fullVal)}
            onFocus={() => setPhoneTouched(true)}
            onBlur={() => setPhoneTouched(true)}
            required
            shake={shakeTrigger > 0 && ((phoneTouched || hasAttemptedSubmit) && !isValidPhone)}
            error={(hasAttemptedSubmit || phoneTouched) && !isValidPhone}
            helperText={
              (hasAttemptedSubmit || phoneTouched) && !isValidPhone
                ? (language === 'tl' ? 'Pakikumpleto ang 10-digit mobile number na nagsisimula sa 9.' : 'Please enter a valid 10-digit mobile number starting with 9.')
                : ''
            }
          />

          <RegisterInput
            label="PASSWORD"
            required
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(val) => setPassword(val)}
            shake={shakeTrigger > 0 && hasAttemptedSubmit && (!password || !isPasswordValid)}
            error={hasAttemptedSubmit && (!password || !isPasswordValid)}
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

          <RegisterInput
            label={language === 'tl' ? "KUMPIRMAHIN ANG PASSWORD" : "CONFIRM PASSWORD"}
            required
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(val) => setConfirmPassword(val)}
            shake={shakeTrigger > 0 && (isPasswordMismatched || (hasAttemptedSubmit && !confirmPassword.trim()))}
            error={isPasswordMismatched || (hasAttemptedSubmit && !confirmPassword.trim())}
            helperText={
              isPasswordMismatched
                ? (language === 'tl' ? 'Hindi magkatugma ang password.' : 'Passwords do not match.')
                : (hasAttemptedSubmit && !confirmPassword.trim()
                    ? (language === 'tl' ? 'Pakikumpirma ang password.' : 'Please confirm your password.')
                    : '')
            }
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

      {/* Pinned Bottom Action Bar with Submit Button */}
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
          form="driver-register-form"
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
          onClick={() => navigate('/driver/login')}
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
    </Box>
  );
};

export default DriverRegister;
