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
import { getPhoneLookupCandidates, lookupDriverByPhoneSecure } from '../../../services/driverApiService';

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
  const { t, language } = useLanguage();

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
    const rawDigits = phone.replace(/\D/g, '');
    if (!rawDigits || !password) {
      setError(
        t.enterPhoneAndPassword ||
          (language === 'tl'
            ? 'Mangyaring ilagay ang iyong numero at password.'
            : 'Please enter your mobile number and password.')
      );
      return;
    }

    const candidates = getPhoneLookupCandidates(rawDigits);
    const phone09 = candidates.phone09;
    const phone63 = candidates.phone63WithPlus;

    setLoading(true);
    setError('');

    // Instant Verified Test Driver Login (Option A for live map & ride testing)
    const isTestDriver =
      (phone09 === '09171234567' || phone09 === '09181234567' || phone09 === '09123456789' || phone09 === '09999999999') &&
      (password === 'Password123!' || password === '@Dmin_123' || password === 'password' || password === '123456');

    if (isTestDriver) {
      setLoading(false);
      sessionStorage.setItem('sakay_driver_just_logged_in', 'true');
      sessionStorage.removeItem('sakay_driver_location_prompt_dismissed');
      localStorage.removeItem('sakay_driver_location_permission');
      localStorage.setItem('sakay_driver_phone', phone63);
      localStorage.setItem('sakay_driver_id', 'test-driver-001');
      localStorage.setItem(
        'sakay_driver_profile',
        JSON.stringify({
          id: 'test-driver-001',
          name: 'Juan Dela Cruz',
          phone: phone63,
          vehiclePlate: 'ABC 123',
          licenseNumber: 'N03-12-123456',
          franchiseNumber: '1234',
          todaName: 'Calapan Central TODA (CCTODA)',
          selectedTodaId: 'toda-1',
          selectedVehicleId: 'VEH-001',
          rating: 5.0,
          totalTrips: 0,
          isOnline: true,
          isPaused: false,
          currentLat: 13.4124,
          currentLng: 121.1834,
          accountStatus: 'Verified',
          verificationStage: 'Stage 2 Approved',
        })
      );
      navigate('/driver/home', { replace: true });
      return;
    }

    try {
      // 1. Verify if driver account exists in database first using secure lookup
      const driverData = await lookupDriverByPhoneSecure(phone63);

      if (!driverData) {
        setLoading(false);
        setError(
          language === 'tl'
            ? 'Walang nahanap na account para sa numerong ito. Mangyaring mag-register muna o suriin ang inyong numero.'
            : 'No account found for this mobile number. Please register first or check your mobile number.'
        );
        return;
      }

      // 2. Driver exists! Attempt authentication with Supabase Auth
      let sessionUser: any = null;
      let lastAuthError: any = null;

      // Prepare candidate credentials (including driver email if present in profile)
      const authCandidates = [...candidates.authCandidates];
      if (driverData.email && !authCandidates.some((c: any) => c.email === driverData.email)) {
        authCandidates.unshift({ email: driverData.email });
      }

      for (const candidate of authCandidates) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          ...candidate,
          password: password,
        });

        if (!signInErr && signInData?.user) {
          sessionUser = signInData.user;
          console.log('[DriverLogin] Authenticated successfully with candidate:', candidate);
          break;
        }
        lastAuthError = signInErr;
      }

      // 3. If password was incorrect:
      if (!sessionUser) {
        setLoading(false);
        setError(
          language === 'tl'
            ? 'Mali ang password para sa account na ito. Pakisubukang muli.'
            : 'Incorrect password for this account. Please check your password and try again.'
        );
        return;
      }

      // 4. Session established! Link driver record to sessionUser if unlinked
      if (sessionUser?.id && !driverData.auth_user_id) {
        await supabase
          .from('driver')
          .update({ auth_user_id: sessionUser.id, contact_number: phone63 })
          .eq('driver_id', driverData.driver_id);
      } else if (driverData.contact_number !== phone63) {
        // Standardize contact_number in DB to E.164 (+639XXXXXXXXX)
        supabase
          .from('driver')
          .update({ contact_number: phone63 })
          .eq('driver_id', driverData.driver_id)
          .then(() => {});
      }

      // Reset location permission prompt so the location modal always shows upon entering interface
      sessionStorage.setItem('sakay_driver_just_logged_in', 'true');
      sessionStorage.removeItem('sakay_driver_location_prompt_dismissed');
      localStorage.removeItem('sakay_driver_location_permission');

      // Persist active driver session cache
      localStorage.setItem('sakay_driver_phone', phone63);
      localStorage.setItem('sakay_driver_id', driverData.driver_id);

      const todaInfo = Array.isArray(driverData.toda) ? driverData.toda[0] : driverData.toda;
      const todaNameStr = todaInfo?.toda_name || '';
      const todaAcronymStr = todaInfo?.toda_acronym || '';

      const verif = driverData.verification;
      const plateNumber = driverData.plate_number || verif?.submitted_plate_number || verif?.ocr_plate_number || '';
      const licenseNumber = driverData.license_number || verif?.submitted_license_number || verif?.ocr_license_number || '';
      const franchiseNumber = driverData.franchise_number || verif?.submitted_franchise_number || verif?.ocr_franchise_number || '';
      const rating = Number(driverData.weighted_average_rating) || 5.0;

      localStorage.setItem(
        'sakay_driver_profile',
        JSON.stringify({
          id: driverData.driver_id,
          name: driverData.full_name,
          phone: phone63,
          email: driverData.email || '',
          vehiclePlate: plateNumber,
          licenseNumber: licenseNumber,
          franchiseNumber: franchiseNumber,
          todaName: todaInfo ? `${todaNameStr} (${todaAcronymStr})` : '',
          selectedTodaId: driverData.toda_id || '',
          rating: rating,
          totalTrips: 0,
          isOnline: false,
          isPaused: false,
          accountStatus: driverData.account_status,
          verificationStage: driverData.account_status === 'Verified' || driverData.account_status === 'Active' ? 'Stage 2 Approved' : 'Stage 1 TODA Review',
        })
      );

      setLoading(false);

      // Enforce strict approval lifecycle routing:
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
        // Check verification status
        const verif = driverData.verification;
        if (!verif || !verif.submitted_license_number) {
          navigate('/driver/prepare-documents', {
            replace: true,
            state: {
              phone: phone63,
              driverName: driverData.full_name,
            },
          });
          return;
        }

        const isEndorsed =
          verif.verification_status === 'Approved' ||
          verif.verification_status === 'TODA Approved' ||
          verif.verification_status === 'Endorsed to LGU' ||
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
    } catch (err: any) {
      setLoading(false);
      console.error('[DriverLogin] Login exception:', err);
      setError(
        err?.message ||
          (language === 'tl'
            ? 'Hindi makakonekta sa database. Pakisubukang muli.'
            : 'Unable to connect to the database. Please try again.')
      );
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
            mb: 2.5,
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
