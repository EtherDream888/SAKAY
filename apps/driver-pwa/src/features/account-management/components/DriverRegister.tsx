import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  LinearProgress,
  InputBase,
  Alert,
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
import { useLanguage } from '../../../utils/LanguageContext';
import { sendDriverOtp, ensureDriverAuthSession, fetchAccreditedTodas } from '../../../services/driverApiService';

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

interface RegisterInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  error?: boolean;
  helperText?: string;
  endAdornment?: React.ReactNode;
  isPhone?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const RegisterInput: React.FC<RegisterInputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  error = false,
  helperText = '',
  endAdornment,
  isPhone = false,
  onFocus,
  onBlur,
  onKeyDown,
}) => {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || Boolean(value && value.length > 0);

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          width: '100%',
          minHeight: '62px',
          height: '62px',
          borderRadius: '16px',
          backgroundColor: focused ? '#FFFFFF' : '#F1F3F5',
          border: `1.5px solid ${error ? '#DC2626' : focused ? '#FF6B00' : '#E2E8F0'}`,
          boxShadow: focused
            ? '0 0 0 3px rgba(255, 107, 0, 0.12)'
            : 'none',
          px: 2,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxSizing: 'border-box',
          cursor: 'text',
        }}
      >
        <Typography
          sx={{
            position: 'absolute',
            left: '16px',
            right: endAdornment ? '48px' : '16px',
            top: isFloating ? '8px' : '50%',
            transform: isFloating ? 'translateY(0)' : 'translateY(-50%)',
            fontSize: isFloating ? '9.5px' : '15px',
            fontWeight: isFloating ? 700 : 500,
            color: error ? '#DC2626' : focused ? '#FF6B00' : isFloating ? '#64748B' : '#94A3B8',
            letterSpacing: isFloating ? '0.5px' : '0px',
            textTransform: isFloating ? 'uppercase' : 'none',
            userSelect: 'none',
            pointerEvents: 'none',
            whiteSpace: isFloating ? 'normal' : 'nowrap',
            wordBreak: 'break-word',
            lineHeight: 1.15,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {label}
        </Typography>

        <Box
          sx={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mt: isFloating ? '16px' : 0,
            transition: 'margin-top 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {isPhone && isFloating && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                mr: 1,
                pr: 1,
                borderRight: '1px solid #CBD5E1',
                height: '20px',
                flexShrink: 0,
              }}
            >
              <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
                +63
              </Typography>
            </Box>
          )}

          <InputBase
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => {
              setFocused(true);
              onFocus?.();
            }}
            onBlur={() => {
              setFocused(false);
              onBlur?.();
            }}
            onKeyDown={onKeyDown}
            fullWidth
            sx={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#0F172A',
              py: 0,
              '& input': {
                py: 0,
                lineHeight: 1.2,
                opacity: isFloating ? 1 : 0,
                transition: 'opacity 0.15s ease-in-out',
              },
            }}
          />
          {endAdornment && (
            <Box sx={{ zIndex: 2, display: 'flex', alignItems: 'center', ml: 1 }}>
              {endAdornment}
            </Box>
          )}
        </Box>
      </Box>
      {helperText && (
        <Typography sx={{ color: '#DC2626', fontSize: '12px', mt: 0.5, px: 1, fontWeight: 500 }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

export const DriverRegister: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

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

  const handlePhoneFocus = () => {
    if (!phone || !phone.trim()) {
      setPhone('09');
    }
  };

  const handlePhoneBlur = () => {
    const clean = phone.replace(/\D/g, '');
    if (clean === '09' || clean === '0' || clean === '9' || !clean) {
      setPhone('');
    }
  };

  const handlePhoneChange = (val: string) => {
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
        return;
      }
    }
  };

  const cleanPhoneDigits = phone.replace(/\D/g, '');
  const fullName = [firstName.trim(), middleName.trim(), lastName.trim(), suffix.trim()].filter(Boolean).join(' ');

  const criteriaList = [
    { label: 'Subukan ang hindi bababa sa 8 karakter', met: password.length >= 8 },
    { label: 'Isama ang malalaking titik (A-Z) at maliliit na titik (a-z)', met: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: 'Isama ang numero (0-9)', met: /\d/.test(password) },
    { label: 'Isama ang simbolo (@, #, $, atbp.)', met: /[^A-Za-z0-9]/.test(password) },
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
    if (metCount <= 2) return 'Mahina';
    if (metCount === 3) return 'Katamtaman';
    return 'Malakas';
  };

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

  const isFormValid = Boolean(
    firstName.trim() &&
    lastName.trim() &&
    selectedTodaId &&
    cleanPhoneDigits.length === 11 &&
    cleanPhoneDigits.startsWith('09') &&
    isPasswordValid &&
    password === confirmPassword
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    setAccountError(null);
    if (!isFormValid) return;

    setSubmitted(true);

    const sessionResult = await ensureDriverAuthSession(cleanPhoneDigits, password, fullName, selectedTodaId);
    if (!sessionResult.success) {
      setSubmitted(false);
      setAccountError(sessionResult.error || 'Hindi maihanda ang inyong account. Pakisubukang muli.');
      return;
    }

    try {
      localStorage.removeItem('sakay_driver_registration_draft');
      localStorage.setItem('sakay_driver_phone', cleanPhoneDigits);
      localStorage.setItem('sakay_driver_toda_id', selectedTodaId);
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
        password: password,
        driverName: fullName,
        todaId: selectedTodaId,
        isRecovery: false,
        debugOtp: otpResult?.debugOtp,
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
        {/* Tagalog Title & Subtitle */}
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
            Gumawa ng Account ng Drayber
          </Typography>
          <Typography
            sx={{
              fontSize: '15px',
              color: '#64748B',
              mt: 0.75,
              fontWeight: 500,
            }}
          >
            Ilagay ang inyong impormasyon upang magparehistro.
          </Typography>
        </Box>

        {accountError && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }}>
            {accountError}
          </Alert>
        )}

        {/* Input Fields Stack */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          {/* Stacked Name Fields: Unang Pangalan, Gitnang Pangalan, then Apelyido & Suffix */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <RegisterInput
              label="UNANG PANGALAN"
              value={firstName}
              onChange={setFirstName}
              error={hasAttemptedSubmit && !firstName.trim()}
              helperText={hasAttemptedSubmit && !firstName.trim() ? 'Kailangan ang unang pangalan.' : ''}
            />

            <RegisterInput
              label="GITNANG PANGALAN"
              value={middleName}
              onChange={setMiddleName}
            />

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Box sx={{ flex: '7 7 70%', minWidth: 0 }}>
                <RegisterInput
                  label="APELYIDO"
                  value={lastName}
                  onChange={setLastName}
                  error={hasAttemptedSubmit && !lastName.trim()}
                  helperText={hasAttemptedSubmit && !lastName.trim() ? 'Kailangan ang apelyido.' : ''}
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
                }}
              >
                TODA NA KINABABILANGAN
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
                  Piliin ang inyong TODA
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
                Pakipili muna ang inyong TODA.
              </Typography>
            )}
          </Box>

          <RegisterInput
            label="NUMERO NG TELEPONO"
            value={phone}
            onChange={handlePhoneChange}
            onFocus={handlePhoneFocus}
            onBlur={handlePhoneBlur}
            onKeyDown={handlePhoneKeyDown}
            isPhone
            error={hasAttemptedSubmit && (cleanPhoneDigits.length !== 11 || !cleanPhoneDigits.startsWith('09'))}
            helperText={
              hasAttemptedSubmit && cleanPhoneDigits.length !== 11
                ? 'Pakilagay ang 11-digit mobile number na nagsisimula sa 09.'
                : ''
            }
          />

          <RegisterInput
            label="PASSWORD"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(val) => setPassword(val)}
            error={hasAttemptedSubmit && !isPasswordValid}
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
          {password.length > 0 && (
            <Box sx={{ mt: -0.5, mb: 1, px: 0.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                  Lakas ng Password:
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
            label="KUMPIRMAHIN ANG PASSWORD"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(val) => setConfirmPassword(val)}
            error={hasAttemptedSubmit && (isPasswordMismatched || !confirmPassword)}
            helperText={
              hasAttemptedSubmit && isPasswordMismatched
                ? 'Hindi magkatugma ang inyong password.'
                : ''
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
              Magkatugma ang password!
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
          disabled={!isFormValid || submitted}
          sx={{
            height: '56px',
            borderRadius: '16px',
            fontSize: '16px',
            fontWeight: 800,
            backgroundColor: isFormValid ? '#FF6B00' : '#E2E8F0',
            color: isFormValid ? '#FFFFFF' : '#94A3B8',
            boxShadow: 'none',
            '&.Mui-disabled': {
              backgroundColor: '#E2E8F0',
              color: '#94A3B8',
            },
            '&:hover': {
              backgroundColor: isFormValid ? '#E66000' : '#E2E8F0',
              boxShadow: 'none',
            },
          }}
        >
          Magpatuloy
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
          May account ka na?{' '}
          <Box
            component="span"
            sx={{
              color: '#FF6B00',
              fontWeight: 700,
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Mag-log in
          </Box>
        </Typography>
      </Box>
    </Box>
  );
};

export default DriverRegister;
