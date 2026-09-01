import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Switch,
  Snackbar,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import RefreshIcon from '@mui/icons-material/Refresh';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import { useLanguage } from '../../../utils/LanguageContext';
import { supabase } from '../../../services/supabaseClient';

export const DriverStatusMonitor: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const state = location.state as {
    driverName?: string;
    phone?: string;
    accountStatus?: string;
    rejectionReason?: string;
    rejectionComment?: string;
  } | undefined;

  const [loading, setLoading] = useState(false);
  const [profileStatus, setProfileStatus] = useState<string>(state?.accountStatus || 'Pending Verification');
  const [rejectionReason, setRejectionReason] = useState<string | undefined>(state?.rejectionReason);
  const [rejectionComment, setRejectionComment] = useState<string | undefined>(state?.rejectionComment);

  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [isDocIncomplete, setIsDocIncomplete] = useState(false);
  const [incompleteDriverInfo, setIncompleteDriverInfo] = useState<{ phone: string; driverName: string } | null>(null);

  const checkStatus = async () => {
    setLoading(true);
    try {
      let driverData: any = null;

      // 1. Try by active Supabase auth user session
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('driver')
          .select(`
            driver_id,
            account_status,
            full_name,
            contact_number,
            plate_number,
            license_number,
            franchise_number,
            rejection_reason,
            rejection_comment,
            toda:toda_id (
              toda_id,
              toda_name,
              toda_acronym
            )
          `)
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (data) driverData = data;
      }

      // 2. Fallback lookup by stored driver_id or stored phone
      if (!driverData) {
        const storedDriverId = localStorage.getItem('sakay_driver_id');
        const storedPhone = localStorage.getItem('sakay_driver_phone') || state?.phone;

        if (storedDriverId) {
          const { data } = await supabase
            .from('driver')
            .select(`
              driver_id,
              account_status,
              full_name,
              contact_number,
              plate_number,
              license_number,
              franchise_number,
              rejection_reason,
              rejection_comment,
              toda:toda_id (
                toda_id,
                toda_name,
                toda_acronym
              )
            `)
            .eq('driver_id', storedDriverId)
            .maybeSingle();

          if (data) driverData = data;
        }

        if (!driverData && storedPhone) {
          const cleanPhone = storedPhone.replace(/\D/g, '');
          const e164 = `+63${cleanPhone.replace(/^0/, '')}`;
          const { data } = await supabase
            .from('driver')
            .select(`
              driver_id,
              account_status,
              full_name,
              contact_number,
              plate_number,
              license_number,
              franchise_number,
              rejection_reason,
              rejection_comment,
              toda:toda_id (
                toda_id,
                toda_name,
                toda_acronym
              )
            `)
            .or(`contact_number.eq.${cleanPhone},contact_number.eq.${e164}`)
            .maybeSingle();

          if (data) driverData = data;
        }
      }

      if (driverData) {
        // Sync local profile cache
        const todaInfo = Array.isArray(driverData.toda) ? driverData.toda[0] : driverData.toda;
        const todaNameStr = todaInfo?.toda_name || 'Calapan Central TODA';
        const todaAcronymStr = todaInfo?.toda_acronym || 'CCTODA';

        localStorage.setItem(
          'sakay_driver_profile',
          JSON.stringify({
            name: driverData.full_name,
            phone: driverData.contact_number,
            vehiclePlate: driverData.plate_number || 'MV-101',
            licenseNumber: driverData.license_number || 'L01-99-123456',
            franchiseNumber: driverData.franchise_number || 'MTOP-PENDING',
            todaName: `${todaNameStr} (${todaAcronymStr})`,
            rating: 5.0,
            isOnline: false,
            isPaused: false,
            accountStatus: driverData.account_status,
            verificationStage: driverData.account_status === 'Verified' ? 'Stage 2 Approved' : 'Stage 1 TODA Review',
          })
        );

        // If approved by LGU (Active / Verified) -> Immediately transition to Active Map
        if (driverData.account_status === 'Active' || driverData.account_status === 'Verified') {
          navigate('/driver/home', { replace: true });
          return;
        }

        // Check if documents have been submitted to driver_verification
        if (driverData.driver_id && driverData.account_status !== 'Rejected') {
          const { data: verif } = await supabase
            .from('driver_verification')
            .select('verification_status, submitted_license_number')
            .eq('driver_id', driverData.driver_id)
            .maybeSingle();

          if (!verif || !verif.submitted_license_number) {
            setIsDocIncomplete(true);
            setIncompleteDriverInfo({
              phone: driverData.contact_number,
              driverName: driverData.full_name,
            });
          } else {
            setIsDocIncomplete(false);
            if (
              verif.verification_status === 'Approved' ||
              verif.verification_status === 'TODA Approved' ||
              verif.verification_status === 'TODA Endorsed' ||
              verif.verification_status === 'Endorsed to LGU'
            ) {
              setProfileStatus('Endorsed to LGU');
              setLoading(false);
              return;
            }
          }
        }

        setProfileStatus(driverData.account_status || 'Pending Verification');
        setRejectionReason(driverData.rejection_reason || undefined);
        setRejectionComment(driverData.rejection_comment || undefined);
      }
    } catch (err) {
      console.warn('[DriverStatusMonitor] Status check warning:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    checkStatus();
  }, []);

  const handleToggleNotify = (checked: boolean) => {
    setNotifyEnabled(checked);
    setSnackbarMsg(
      checked
        ? 'Naka-turn on na ang mga abiso kapag nagbago ang status ng rehistrasyon.'
        : 'Naka-off na ang mga abiso sa pagbago ng status.'
    );
    setSnackbarOpen(true);
  };

  const isRejected = profileStatus === 'Rejected';
  // True when TODA has endorsed the driver but LGU has not yet given final approval
  const isEndorsedToLgu = profileStatus === 'Endorsed to LGU';


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
      {/* Sticky Top Bar */}
      <Box
        sx={{
          padding: 'calc(var(--safe-area-top) + 16px) 24px 16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #F1F5F9',
          backgroundColor: '#FFFFFF',
          flexShrink: 0,
        }}
      >
        <IconButton
          onClick={() => navigate('/')}
          sx={{
            color: '#0F172A',
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            width: 44,
            height: 44,
            '&:hover': { backgroundColor: '#F8FAFC' },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Logo color="orange" width={110} />
      </Box>

      {/* Main Centered Content Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 3,
          py: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        {isRejected ? (
          <>
            <Box
              sx={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3,
                boxShadow: '0 8px 24px rgba(220, 38, 38, 0.15)',
              }}
            >
              <PendingActionsIcon sx={{ fontSize: 40 }} />
            </Box>

            <Typography
              sx={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#0F172A',
                lineHeight: 1.3,
                mb: 1.5,
              }}
            >
              Hindi Na-aprubahan ang Aplikasyon
            </Typography>

            <Typography
              sx={{
                fontSize: '14px',
                color: '#64748B',
                lineHeight: 1.5,
                maxWidth: 320,
                mb: 3,
              }}
            >
              Ang iyong rehistrasyon ay tinanggihan ng TODA Administrator matapos ang masusing pagsusuri.
            </Typography>

            <Paper
              elevation={0}
              sx={{
                width: '100%',
                maxWidth: 340,
                p: 2.5,
                borderRadius: '16px',
                backgroundColor: '#FFF5F5',
                border: '1px solid #FECDD3',
                textAlign: 'left',
                mb: 4,
              }}
            >
              <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#BE123C', letterSpacing: '0.5px', textTransform: 'uppercase', mb: 1 }}>
                Dahilan ng Pagtanggi:
              </Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#9F1239', mb: 1 }}>
                {rejectionReason || 'Hindi natagpuan sa Master Roster ng TODA.'}
              </Typography>
              {rejectionComment && (
                <Typography sx={{ fontSize: '13px', color: '#881337', lineHeight: 1.4 }}>
                  Paliwanag: "{rejectionComment}"
                </Typography>
              )}
            </Paper>
          </>
        ) : isEndorsedToLgu ? (
          <>
            {/* LGU Review State — TODA endorsed but awaiting LGU final approval */}
            <Box
              sx={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                backgroundColor: '#EFF6FF',
                color: '#0066CC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3,
                boxShadow: '0 8px 24px rgba(0, 102, 204, 0.15)',
              }}
            >
              <PendingActionsIcon sx={{ fontSize: 40 }} />
            </Box>

            <Typography
              sx={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#0F172A',
                lineHeight: 1.3,
                mb: 1.5,
              }}
            >
              Nasa LGU Admin na ang Aplikasyon
            </Typography>

            <Typography
              sx={{
                fontSize: '14px',
                color: '#64748B',
                lineHeight: 1.5,
                maxWidth: 330,
                mb: 3,
              }}
            >
              Matagumpay na na-endorse ng iyong TODA ang iyong aplikasyon sa City LGU Franchising Office. Pakihintay ang huling pagsusuri at pag-apruba ng LGU. Hindi mo pa maa-access ang iyong account hanggang sa mabigyan ka ng pinal na pahintulot.
            </Typography>

            {/* Status ng Rehistrasyon Card */}
            <Paper
              elevation={0}
              sx={{
                width: '100%',
                maxWidth: 340,
                p: 2.5,
                borderRadius: '16px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                textAlign: 'left',
                mb: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase' }}>
                  Status ng Rehistrasyon
                </Typography>
                <Chip
                  label="LGU Screening"
                  size="small"
                  sx={{ backgroundColor: '#DBEAFE', color: '#1D4ED8', fontWeight: 800, fontSize: '11px' }}
                />
              </Box>
            </Paper>

            {/* Tagalog Notification Switch Preference Card */}
            <Paper
              elevation={0}
              sx={{
                width: '100%',
                maxWidth: 340,
                p: '14px 18px',
                borderRadius: '16px',
                backgroundColor: notifyEnabled ? '#EFF6FF' : '#F8FAFC',
                border: `1.5px solid ${notifyEnabled ? '#0066CC' : '#E2E8F0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 4,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 1 }}>
                <NotificationsActiveOutlinedIcon
                  sx={{ color: notifyEnabled ? '#0066CC' : '#64748B', fontSize: 22 }}
                />
                <Box sx={{ textAlign: 'left' }}>
                  <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                    I-notify ako kapag nagbago ang status
                  </Typography>
                  <Typography sx={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500, mt: '2px' }}>
                    Magpapadala ng SMS kapag na-aprubahan ng LGU
                  </Typography>
                </Box>
              </Box>

              <Switch
                checked={notifyEnabled}
                onChange={(e) => handleToggleNotify(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#0066CC',
                    '& + .MuiSwitch-track': { backgroundColor: '#0066CC', opacity: 0.9 },
                  },
                }}
              />
            </Paper>
          </>
        ) : (
          <>
            <Box
              sx={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                backgroundColor: '#FFF8F0',
                color: '#FF6B00',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3,
                boxShadow: '0 8px 24px rgba(255, 107, 0, 0.15)',
              }}
            >
              <PendingActionsIcon sx={{ fontSize: 40 }} />
            </Box>

            <Typography
              sx={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#0F172A',
                lineHeight: 1.3,
                mb: 1.5,
              }}
            >
              {isDocIncomplete
                ? 'Kailangan mong Ipasa ang mga Dokumento'
                : 'Patuloy na sinusuri ang iyong aplikasyon.'}
            </Typography>

            <Typography
              sx={{
                fontSize: '14px',
                color: '#64748B',
                lineHeight: 1.5,
                maxWidth: 320,
                mb: 3,
              }}
            >
              {isDocIncomplete
                ? 'Narehistro na ang iyong account, ngunit kailangan mo pang ipasa ang iyong Lisensya, MTOP Permit, Larawan ng Traysikel, at Selfie upang masuri ng iyong napiling TODA.'
                : 'Pakihintay habang sinusuri ng TODA at LGU ang iyong mga isinumiteng impormasyon. Hindi mo muna maa-access ang iyong account at mga serbisyo habang nakabinbin pa ang pinal na pag-apruba.'}
            </Typography>

            {isDocIncomplete && (
              <Box sx={{ width: '100%', maxWidth: 340, mb: 3 }}>
                <PrimaryButton
                  fullWidth
                  onClick={() =>
                    navigate('/driver/prepare-documents', {
                      state: incompleteDriverInfo || {
                        phone: localStorage.getItem('sakay_driver_phone') || '',
                        driverName: 'Bagong Drayber',
                      },
                    })
                  }
                  sx={{
                    height: '52px',
                    borderRadius: '14px',
                    fontSize: '15px',
                    fontWeight: 800,
                    backgroundColor: '#FF6B00',
                    boxShadow: 'none',
                    '&:hover': { backgroundColor: '#E66000', boxShadow: 'none' },
                  }}
                >
                  Ipagpatuloy ang Pagpasa ng Dokumento
                </PrimaryButton>
              </Box>
            )}

            {/* Status ng Rehistrasyon Card */}
            <Paper
              elevation={0}
              sx={{
                width: '100%',
                maxWidth: 340,
                p: 2.5,
                borderRadius: '16px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                textAlign: 'left',
                mb: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                  Status ng Rehistrasyon
                </Typography>
                <Chip
                  label={isDocIncomplete ? 'Kailangan ng Dokumento' : 'TODA Screening'}
                  size="small"
                  sx={{
                    backgroundColor: isDocIncomplete ? '#FEE2E2' : '#FEF3C7',
                    color: isDocIncomplete ? '#DC2626' : '#B45309',
                    fontWeight: 800,
                    fontSize: '11px',
                  }}
                />
              </Box>
            </Paper>

            {/* Tagalog Notification Switch Preference Card */}
            <Paper
              elevation={0}
              sx={{
                width: '100%',
                maxWidth: 340,
                p: '14px 18px',
                borderRadius: '16px',
                backgroundColor: notifyEnabled ? '#FFF5EF' : '#F8FAFC',
                border: `1.5px solid ${notifyEnabled ? '#FF6B00' : '#E2E8F0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 4,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 1 }}>
                <NotificationsActiveOutlinedIcon
                  sx={{ color: notifyEnabled ? '#FF6B00' : '#64748B', fontSize: 22 }}
                />
                <Box sx={{ textAlign: 'left' }}>
                  <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                    I-notify ako kapag nagbago ang status
                  </Typography>
                  <Typography sx={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500, mt: '2px' }}>
                    Magpapadala ng SMS kapag na-aprubahan
                  </Typography>
                </Box>
              </Box>

              <Switch
                checked={notifyEnabled}
                onChange={(e) => handleToggleNotify(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#FF6B00',
                    '& + .MuiSwitch-track': { backgroundColor: '#FF6B00', opacity: 0.9 },
                  },
                }}
              />
            </Paper>
          </>
        )}
      </Box>

      {/* Snackbar Notification Toast */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={notifyEnabled ? 'success' : 'info'}
          sx={{ width: '100%', borderRadius: '12px', fontWeight: 600, fontSize: '13px' }}
        >
          {snackbarMsg}
        </Alert>
      </Snackbar>

      {/* Pinned Single Action Button */}
      <Box
        sx={{
          p: 3,
          pt: 1.5,
          pb: 'calc(var(--safe-area-bottom) + 20px)',
          backgroundColor: '#FFFFFF',
          flexShrink: 0,
        }}
      >
        <PrimaryButton
          fullWidth
          size="large"
          onClick={isRejected ? () => navigate('/account-selection') : checkStatus}
          disabled={loading}
          sx={{
            backgroundColor: isRejected ? '#DC2626' : '#FF6B00',
            '&:hover': { backgroundColor: isRejected ? '#B91C1C' : '#E66000' },
          }}
        >
          {loading ? (
            'Kinukumpirma...'
          ) : isRejected ? (
            'Mag-rehistro Muli'
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <RefreshIcon sx={{ fontSize: 18 }} />
              I-refresh ang Status
            </Box>
          )}
        </PrimaryButton>

        {/* Sign Out / Register New Account Option */}
        <Box
          component="button"
          type="button"
          onClick={async () => {
            try {
              await supabase.auth.signOut();
              localStorage.removeItem('sakay_driver_phone');
              localStorage.removeItem('sakay_driver_id');
              localStorage.removeItem('sakay_driver_profile');
              localStorage.removeItem('sakay_driver_toda_id');
              localStorage.removeItem('sakay_driver_onboarding_cache');
              sessionStorage.clear();
            } catch {}
            navigate('/account-selection', { replace: true });
          }}
          sx={{
            mt: 1.5,
            width: '100%',
            py: 1,
            background: 'none',
            border: 'none',
            color: '#64748B',
            fontSize: '13.5px',
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'center',
            '&:hover': { color: '#0F172A', textDecoration: 'underline' },
          }}
        >
          Mag-sign out / Gumawa ng Bagong Aplikasyon
        </Box>
      </Box>
    </Box>
  );
};

export default DriverStatusMonitor;
