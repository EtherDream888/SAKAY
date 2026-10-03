import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import SuccessModal from '../../../common/components/SuccessModal';
import SakayToast from '../../../common/components/SakayToast';
import { RegisterInput } from '../../../common/components/RegisterInput';
import SakayPhoneInput from '../../../common/components/SakayPhoneInput';
import { useLanguage } from '../../../utils/LanguageContext';
import { supabase } from '../../../services/supabaseClient';
import { describeRestriction, fetchOwnAccountRestriction } from '@sakay/shared';
import { getPhoneLookupCandidates, lookupDriverByPhoneSecure, rotateDriverSession } from '../../../services/driverApiService';

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

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Toast and Modal State
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);



  const cleanPhoneDigits = phone.replace(/\D/g, '');
  const isValidPhone = cleanPhoneDigits.length === 11 && cleanPhoneDigits.startsWith('09');
  const showPhoneError = phoneTouched && !isValidPhone;

  // Disabled if mobile number or password is empty or loading
  const isLoginDisabled = !phone.trim() || !password.trim() || loading;

  const handleBack = () => {
    navigate('/driver/get-started');
  };

  const triggerErrorToast = (msg: string) => {
    setToastMessage(msg);
    setToastOpen(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoginDisabled) return;

    const rawDigits = phone.replace(/\D/g, '');
    if (!rawDigits || !isValidPhone) {
      triggerErrorToast(
        language === 'tl'
          ? 'Pakikumpleto ang 10-digit mobile number na nagsisimula sa 9.'
          : 'Please enter a valid 10-digit mobile number starting with 9.'
      );
      return;
    }

    const candidates = getPhoneLookupCandidates(rawDigits);
    const phone09 = candidates.phone09;
    const phone63 = candidates.phone63WithPlus;

    setLoading(true);

    // Instant Verified Test Driver Login (Option A for live map & ride testing)
    const isTestDriver =
      (phone09 === '09171234567' || phone09 === '09181234567' || phone09 === '09123456789' || phone09 === '09999999999') &&
      (password === 'Password123!' || password === '@Dmin_123' || password === 'password' || password === '123456');

    if (isTestDriver) {
      setLoading(false);
      localStorage.setItem('sakay_driver_phone', phone63);
      localStorage.setItem('sakay_driver_id', '11111111-1111-1111-1111-111111111111');
      localStorage.setItem(
        'sakay_driver_profile',
        JSON.stringify({
          id: '11111111-1111-1111-1111-111111111111',
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

      // Guarantee driver record is online and verified in Supabase
      supabase
        .from('driver')
        .upsert({
          driver_id: '11111111-1111-1111-1111-111111111111',
          full_name: 'Juan Dela Cruz',
          contact_number: phone63,
          plate_number: 'ABC 123',
          account_status: 'Verified',
          is_online: true,
          current_latitude: 13.4124,
          current_longitude: 121.1834,
          last_location_update: new Date().toISOString(),
        })
        .then(() => {});

      setSuccess(true);
      setTimeout(() => {
        navigate('/driver/home', { replace: true });
      }, 1000);
      return;
    }

    try {
      // 1. Pre-fetch driver record if available
      let driverData = await lookupDriverByPhoneSecure(phone63);

      // 2. Attempt authentication with Supabase Auth across candidate credentials
      let sessionUser: any = null;

      const authCandidates = [...candidates.authCandidates];
      if (driverData?.email && !authCandidates.some((c: any) => c.email === driverData.email)) {
        authCandidates.unshift({ email: driverData.email });
      }

      for (const candidate of authCandidates) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          ...candidate,
          password: password,
        });

        if (!signInErr && signInData?.user) {
          sessionUser = signInData.user;
          break;
        }
      }

      // 3. If Supabase Auth succeeded but pre-lookup didn't find driverData:
      if (sessionUser && !driverData) {
        driverData = await lookupDriverByPhoneSecure(phone63);
        if (!driverData) {
          const { data: userRows } = await supabase
            .from('driver')
            .select(`
              driver_id,
              auth_user_id,
              full_name,
              contact_number,
              email,
              plate_number,
              license_number,
              franchise_number,
              account_status,
              toda:toda_id (
                toda_id,
                toda_name,
                toda_acronym
              )
            `)
            .or(`auth_user_id.eq.${sessionUser.id},contact_number.eq.${phone63},contact_number.eq.${phone09}`)
            .limit(1);

          if (userRows && userRows.length > 0) {
            driverData = userRows[0];
          }
        }
      }

      // 4. If password was incorrect or user not found:
      if (!sessionUser) {
        setLoading(false);
        if (driverData) {
          triggerErrorToast(
            language === 'tl'
              ? 'Mali ang numero o password. Pakisubukang muli.'
              : 'Invalid mobile number or password.'
          );
        } else {
          triggerErrorToast(
            language === 'tl'
              ? 'Walang nahanap na account para sa numerong ito. Mangyaring mag-register muna o suriin ang inyong numero.'
              : 'No account found for this mobile number. Please register first or check your mobile number.'
          );
        }
        return;
      }

      // 5. Session established! Link driver record to sessionUser if unlinked or provision if missing
      if (!driverData) {
        const newDriverObj = {
          auth_user_id: sessionUser.id,
          contact_number: phone63,
          full_name: sessionUser.user_metadata?.full_name || 'Driver Applicant',
          account_status: 'Pending Verification',
        };
        const { data: createdDriver } = await supabase
          .from('driver')
          .insert([newDriverObj])
          .select('*, toda:toda_id(*)')
          .maybeSingle();

        driverData = createdDriver || {
          driver_id: sessionUser.id,
          auth_user_id: sessionUser.id,
          full_name: sessionUser.user_metadata?.full_name || 'Driver Applicant',
          contact_number: phone63,
          account_status: 'Pending Verification',
        };
      } else if (sessionUser?.id && !driverData.auth_user_id) {
        await supabase
          .from('driver')
          .update({ auth_user_id: sessionUser.id, contact_number: phone63 })
          .eq('driver_id', driverData.driver_id);
      } else if (driverData.contact_number !== phone63) {
        supabase
          .from('driver')
          .update({ contact_number: phone63 })
          .eq('driver_id', driverData.driver_id)
          .then(() => {});
      }

      // A suspended or deactivated driver cannot log in (Section 1). The database decides, and
      // lifts a suspension whose period has ended, so the message always carries the real end date.
      const restriction = await fetchOwnAccountRestriction(supabase, 'driver');
      if (restriction?.restricted) {
        setLoading(false);
        triggerErrorToast(describeRestriction(restriction, language === 'tl' ? 'tl' : 'en'));
        await supabase.auth.signOut();
        return;
      }

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
          verificationStage: driverData.account_status === 'Verified' ? 'Stage 2 Approved' : 'Stage 1 TODA Review',
        })
      );

      // BATCH 2 FIX: Update single-session token upon new login
      if (driverData?.driver_id) {
        try {
          await rotateDriverSession(driverData.driver_id);
        } catch (err) {
          console.warn("Failed to rotate session:", err);
        }
      }

      setLoading(false);
      setSuccess(true);

      setTimeout(() => {
        if (driverData.account_status === 'Verified') {
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
          const verifObj = driverData.verification;
          if (!verifObj || !verifObj.submitted_license_number) {
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
            verifObj.verification_status === 'Approved' ||
            verifObj.verification_status === 'TODA Approved' ||
            verifObj.verification_status === 'Endorsed to LGU' ||
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
      }, 1000);
    } catch (err: any) {
      setLoading(false);
      console.error('[DriverLogin] Login exception:', err);
      triggerErrorToast(
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
        overflow: 'hidden',
      }}
    >
      {/* Toast Error Notification */}
      <SakayToast
        open={toastOpen}
        message={toastMessage}
        severity="error"
        onClose={() => setToastOpen(false)}
      />

      {/* Fixed Sticky Header matching Passenger PWA */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '16px 24px 12px 24px',
          paddingTop: 'calc(var(--safe-area-top) + 16px)',
          backgroundColor: '#FFFFFF',
          zIndex: 20,
          flexShrink: 0,
          borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
        }}
      >
        <IconButton
          onClick={handleBack}
          sx={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            color: '#1A1A1A',
            borderRadius: '14px',
            width: '44px',
            height: '44px',
            '&:hover': { backgroundColor: '#F8FAFC' },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Logo color="orange" width={110} />
      </Box>

      {/* Scrollable Form Body */}
      <Box
        component="form"
        onSubmit={handleLogin}
        className="anim-fade-in hide-scrollbar"
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          padding: '24px 24px calc(var(--safe-area-bottom) + 24px) 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ width: '100%' }}>
          <Box sx={{ marginTop: '8px', textAlign: 'left', width: '100%' }}>
            <Typography
              component="h2"
              sx={{
                fontSize: '26px',
                fontWeight: 800,
                color: '#0F172A',
                lineHeight: 1.3,
              }}
            >
              {t.loginTitle}
            </Typography>
            <Typography
              sx={{
                fontSize: '15px',
                color: '#64748B',
                marginTop: '8px',
                lineHeight: 1.5,
                fontWeight: 500,
              }}
            >
              {language === 'tl'
                ? 'Ilagay ang inyong numero ng telepono at password upang mag-login.'
                : 'Enter your mobile number and password to log in.'}
            </Typography>
          </Box>

          <Box
            sx={{
              marginTop: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              width: '100%',
            }}
          >
            <SakayPhoneInput
              label={language === 'tl' ? 'NUMERO NG TELEPONO' : 'MOBILE NUMBER'}
              value={phone}
              onChange={(val) => setPhone(val)}
              onFocus={() => setPhoneTouched(true)}
              onBlur={() => setPhoneTouched(true)}
              required
              error={showPhoneError}
              helperText={
                showPhoneError
                  ? language === 'tl'
                    ? 'Pakikumpleto ang 10-digit mobile number na nagsisimula sa 9.'
                    : 'Please enter a valid 10-digit mobile number starting with 9.'
                  : ''
              }
            />

            <RegisterInput
              label="PASSWORD"
              required
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(val) => setPassword(val)}
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

            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <Typography
                onClick={() => navigate('/forgot-password')}
                sx={{
                  fontSize: '14px',
                  color: '#FF6B00',
                  fontWeight: 600,
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline', color: '#E66000' },
                }}
              >
                {t.forgotPassword}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            marginTop: 'auto',
            paddingTop: '24px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <PrimaryButton type="submit" fullWidth disabled={isLoginDisabled} loading={loading}>
            {t.loginTitle}
          </PrimaryButton>

          <Typography
            sx={{
              textAlign: 'center',
              fontSize: '14px',
              color: '#0F172A',
              fontWeight: 600,
            }}
          >
            {t.dontHaveAccount || 'Wala ka pang account?'}{' '}
            <Box
              component="span"
              onClick={() => navigate('/driver/register')}
              sx={{
                color: '#FF6B00',
                fontWeight: 700,
                cursor: 'pointer',
                marginLeft: '6px',
                transition: 'color 0.2s',
                '&:hover': { color: '#E66000', textDecoration: 'underline' },
              }}
            >
              {t.registerLink || 'Mag-register'}
            </Box>
          </Typography>
        </Box>
      </Box>

      <SuccessModal
        open={success}
        title={language === 'tl' ? 'Matagumpay na Login!' : 'Login Successful!'}
        message={t.successLogin || (language === 'tl' ? 'Maligayang pagbabalik sa SAKAY Driver!' : 'Welcome back to SAKAY Driver!')}
      />
    </Box>
  );
};

export default DriverLogin;
