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

export const DriverStatusMonitor: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const state = location.state as { driverName?: string; phone?: string; todaId?: string } | undefined;

  const driverName = state?.driverName || 'Aurelio "Auring" Bautista';

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
          padding: 'calc(var(--safe-area-top) + 12px) 20px 12px 20px',
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
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            '&:hover': { backgroundColor: '#F1F5F9' },
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Logo color="orange" width={100} />
        <Box sx={{ width: 40 }} />
      </Box>

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 20px calc(var(--safe-area-bottom) + 24px) 20px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: '#FFF8F0', color: '#FF6B00', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', boxShadow: '0 4px 14px rgba(255, 107, 0, 0.2)' }}>
            <PendingActionsIcon sx={{ fontSize: 32 }} />
          </Box>
          <Typography sx={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
            {t.applicationStatusTitle}
          </Typography>
          <Typography sx={{ fontSize: '13.5px', color: '#64748B', mt: 0.5 }}>
            Driver: <strong>{driverName}</strong>
          </Typography>
        </Box>

        {/* SLA Progress Tracker */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: '18px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ fontSize: '12.5px', fontWeight: 800, color: '#0F172A' }}>
              Review Progress
            </Typography>
            <Chip label="Awaiting TODA Endorsement" size="small" sx={{ backgroundColor: '#FEF3C7', color: '#B45309', fontWeight: 800, fontSize: '10.5px' }} />
          </Box>

          {/* Step 1: TODA Screening */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
            <CheckCircleIcon sx={{ color: '#10B981', fontSize: 20, mt: '2px' }} />
            <Box>
              <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                {t.submissionComplete}
              </Typography>
              <Typography sx={{ fontSize: '12px', color: '#64748B' }}>
                {t.submissionCompleteDesc}
              </Typography>
            </Box>
          </Box>

          {/* Step 2: TODA Stage */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
            <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #FF6B00', backgroundColor: '#FFF8F0', mt: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#FF6B00' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#FF6B00' }}>
                {t.todaRosterVerification}
              </Typography>
              <Typography sx={{ fontSize: '12px', color: '#64748B' }}>
                {t.todaRosterVerificationDesc}
              </Typography>
            </Box>
          </Box>

          {/* Step 3: LGU Final Sign-off */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #CBD5E1', mt: '2px' }} />
            <Box>
              <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: '#94A3B8' }}>
                {t.lguAccreditation}
              </Typography>
              <Typography sx={{ fontSize: '12px', color: '#94A3B8' }}>
                {t.lguAccreditationDesc}
              </Typography>
            </Box>
          </Box>
        </Paper>

        <PrimaryButton
          fullWidth
          onClick={() => navigate('/driver/home', { replace: true })}
        >
          {t.goToDashboard}
        </PrimaryButton>
      </Box>
    </Box>
  );
};

export default DriverStatusMonitor;
