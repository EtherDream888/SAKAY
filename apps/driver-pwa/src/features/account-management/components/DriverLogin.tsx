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
    const rawDigits = phone.replace(/\D/g, '');
    if (!rawDigits || !password) {
      setError(t.enterPhoneAndPassword || 'Mangyaring ilagay ang iyong numero at password.');
      return;
    }

    // Normalize phone format to 09XXXXXXXXX
    let cleanPhone = rawDigits;
    if (cleanPhone.startsWith('63') && cleanPhone.length === 12) {
      cleanPhone = '0' + cleanPhone.slice(2);
    } else if (!cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      cleanPhone = '0' + cleanPhone;
    }

    setLoading(true);
    setError('');

    const phoneDigits = cleanPhone.replace(/\D/g, '');
    const phone09 = phoneDigits.startsWith('0') ? phoneDigits : `0${phoneDigits}`;
    const phone63 = `+63${phoneDigits.replace(/^0/, '')}`;
    const phoneRaw = phoneDigits.replace(/^0/, '');

    // Instant Verified Test Driver Login (Option A for live map & ride testing)
    const isTestDriver =
      (phone09 === '09171234567' || phone09 === '09181234567' || phone09 === '09123456789' || phone09 === '09999999999') &&
      (password === 'Password123!' || password === '@Dmin_123' || password === 'password' || password === '123456');

    if (isTestDriver) {
      setLoading(false);
      localStorage.setItem('sakay_driver_phone', phone09);
      localStorage.setItem('sakay_driver_id', 'test-driver-001');
      localStorage.setItem(
        'sakay_driver_profile',
        JSON.stringify({
          id: 'test-driver-001',
          name: 'Juan Dela Cruz',
          phone: phone09,
          vehiclePlate: 'ABC 123',
          licenseNumber: 'N03-12-123456',
          franchiseNumber: '1234',
          todaName: 'Calapan Central TODA (CCTODA)',
          selectedTodaId: 'toda-1',
          selectedVehicleId: 'VEH-001',
          rating: 5.0,
          totalTrips: 142,
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

    const driverEmail = `driver_${cleanPhone}@sakay.ph`;
    const e164Phone = `+63${cleanPhone.slice(1)}`;

    try {
      // 1. Authenticate with Supabase Auth to establish live JWT session
      let sessionUser: any = null;

      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: driverEmail,
        password: password,
      });

      if (!signInErr && signInData?.user) {
        sessionUser = signInData.user;
      } else {
        // Fallback: Attempt sign-in with phone format if email identifier fails
        const { data: phoneSignInData, error: phoneSignInErr } = await supabase.auth.signInWithPassword({
          phone: e164Phone,
          password: password,
        });

        if (!phoneSignInErr && phoneSignInData?.user) {
          sessionUser = phoneSignInData.user;
        } else {
          console.warn('[DriverLogin] Supabase Auth sign-in note:', signInErr?.message || phoneSignInErr?.message);
        }
      }

      // 2. Query driver record from Supabase database across all phone representations
      const phoneDigits = cleanPhone.replace(/\D/g, '');
      const phone09 = phoneDigits.startsWith('0') ? phoneDigits : `0${phoneDigits}`;
      const phone63 = `+63${phoneDigits.replace(/^0/, '')}`;
      const phoneRaw = phoneDigits.replace(/^0/, '');

      let driverQuery = supabase
        .from('driver')
        .select(`
          driver_id,
          auth_user_id,
          full_name,
          contact_number,
          plate_number,
          license_number,
          franchise_number,
          account_status,
          rejection_reason,
          rejection_comment,
          toda:toda_id (
            toda_id,
            toda_name,
            toda_acronym
          )
        `);

      if (sessionUser?.id) {
        driverQuery = driverQuery.or(`auth_user_id.eq.${sessionUser.id},contact_number.eq.${phone09},contact_number.eq.${phone63},contact_number.eq.${phoneRaw},contact_number.eq.${cleanPhone}`);
      } else {
        driverQuery = driverQuery.or(`contact_number.eq.${phone09},contact_number.eq.${phone63},contact_number.eq.${phoneRaw},contact_number.eq.${cleanPhone}`);
      }

      const { data: driverData, error: dbErr } = await driverQuery.maybeSingle();

      if (dbErr) {
        console.error('[DriverLogin] Driver profile lookup error:', dbErr);
      }

      setLoading(false);

      if (driverData) {
        // If Supabase Auth failed with invalid password AND driver exists in database:
        if (!sessionUser && signInErr && (signInErr.message?.toLowerCase().includes('invalid login credentials') || signInErr.message?.toLowerCase().includes('invalid credentials'))) {
          setError('Mali ang password. Pakisubukang muli.');
          return;
        }

        // Persist active driver session cache
        localStorage.setItem('sakay_driver_phone', phone09);
        localStorage.setItem('sakay_driver_id', driverData.driver_id);

        const todaInfo = Array.isArray(driverData.toda) ? driverData.toda[0] : driverData.toda;
        const todaNameStr = todaInfo?.toda_name || 'Calapan Central TODA';
        const todaAcronymStr = todaInfo?.toda_acronym || 'CCTODA';

        localStorage.setItem(
          'sakay_driver_profile',
          JSON.stringify({
            name: driverData.full_name,
            phone: driverData.contact_number || phone09,
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

        // Enforce strict approval lifecycle routing:
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
          // Check if documents have been submitted to verification queue
          const { data: verif } = await supabase
            .from('driver_verification')
            .select('verification_status, submitted_license_number')
            .eq('driver_id', driverData.driver_id)
            .maybeSingle();

          // If the account was created but no documents have been submitted yet:
          if (!verif || !verif.submitted_license_number) {
            navigate('/driver/prepare-documents', {
              replace: true,
              state: {
                phone: phone09,
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
      } else {
        // Account does NOT exist in the system:
        setError(
          'Walang nahanap na account para sa numerong ito. Mangyaring mag-register muna o suriin ang iyong numero at password.'
        );
      }
    } catch (err: any) {
      setLoading(false);
      console.error('[DriverLogin] Login exception:', err);
      setError(err?.message || 'Hindi makakonekta sa database. Pakisubukang muli.');
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
