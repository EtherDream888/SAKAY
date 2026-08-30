import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

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

  const [loading, setLoading] = React.useState(false);
  const [profileStatus, setProfileStatus] = React.useState<string>(state?.accountStatus || 'Pending Verification');
  const [rejectionReason, setRejectionReason] = React.useState<string | undefined>(state?.rejectionReason);
  const [rejectionComment, setRejectionComment] = React.useState<string | undefined>(state?.rejectionComment);

  const driverName = state?.driverName || 'Driver Applicant';

  const checkStatus = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('driver')
          .select('account_status, rejection_reason, rejection_comment')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (data) {
          setProfileStatus(data.account_status || 'Pending Verification');
          setRejectionReason(data.rejection_reason || undefined);
          setRejectionComment(data.rejection_comment || undefined);

          if (data.account_status === 'Active' || data.account_status === 'Verified') {
            navigate('/driver/home', { replace: true });
            return;
          }
        }
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

  const isRejected = profileStatus === 'Rejected';

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
        <Box sx={{ width: 44 }} />
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
              Patuloy na sinusuri ang iyong aplikasyon.
            </Typography>

            <Typography
              sx={{
                fontSize: '14px',
                color: '#64748B',
                lineHeight: 1.5,
                maxWidth: 320,
                mb: 4,
              }}
            >
              Pakihintay habang sinusuri ng TODA at LGU ang iyong mga isinumiteng impormasyon.
            </Typography>

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
                mb: 4,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                  Status ng Rehistrasyon
                </Typography>
                <Chip
                  label={profileStatus === 'TODA Approved' ? 'LGU Screening' : 'TODA Screening'}
                  size="small"
                  sx={{ backgroundColor: '#FEF3C7', color: '#B45309', fontWeight: 800, fontSize: '11px' }}
                />
              </Box>
              <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                Aplikante: {driverName}
              </Typography>
            </Paper>
          </>
        )}
      </Box>

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
          onClick={checkStatus}
          disabled={loading}
        >
          {loading ? 'Kinukumpirma...' : 'Tingnan ang Status ng Aplikasyon'}
        </PrimaryButton>
      </Box>
    </Box>
  );
};

export default DriverStatusMonitor;
