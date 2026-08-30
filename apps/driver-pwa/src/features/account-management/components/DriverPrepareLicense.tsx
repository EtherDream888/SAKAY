import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import { useLanguage } from '../../../utils/LanguageContext';

import driversLicenseFront from '../../../../../../packages/shared/src/assets/images/drivers_license_front.png';
import driversLicenseBack from '../../../../../../packages/shared/src/assets/images/drivers_license_back.png';

export const DriverPrepareLicense: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const state = location.state as { phone?: string; driverName?: string } | undefined;

  // Preload license sample images to prevent layout shift
  React.useEffect(() => {
    const img1 = new Image();
    img1.src = driversLicenseFront;
    const img2 = new Image();
    img2.src = driversLicenseBack;
  }, []);

  const handleBack = () => {
    navigate('/driver/prepare-documents', { state });
  };

  const handleContinue = () => {
    navigate('/driver/scan-license-front', {
      state: {
        driverName: state?.driverName || 'Aurelio Bautista',
        phone: state?.phone || '09181234567',
      },
    });
  };

  const bullets = [
    t.licenseBullet1,
    t.licenseBullet2,
    t.licenseBullet3,
    t.licenseBullet4,
    t.licenseBullet5,
    t.licenseBullet6,
  ];

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
      {/* 1. Header Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          pt: 'calc(var(--safe-area-top) + 20px)',
          pb: 2,
          backgroundColor: '#FFFFFF',
          zIndex: 10,
        }}
      >
        <IconButton
          onClick={handleBack}
          sx={{
            width: 44,
            height: 44,
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            '&:hover': { backgroundColor: '#F8FAFC' },
          }}
        >
          <ArrowBackIcon sx={{ color: '#0F172A', fontSize: 22 }} />
        </IconButton>

        <Logo color="orange" width={110} />
      </Box>

      {/* 2. Scrollable Body Content */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 3,
          pb: 'calc(var(--safe-area-bottom) + 110px)',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        }}
      >
        {/* Step Indicator */}
        <Box sx={{ mt: 1, mb: 2 }}>
          <Typography
            sx={{
              fontSize: '13.5px',
              fontWeight: 600,
              color: '#475569',
              mb: 0.75,
            }}
          >
            Hakbang 1 ng 4
          </Typography>

          {/* 4-segment Progress Bar */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Box
              sx={{
                flex: 1,
                height: '6px',
                borderRadius: '3px',
                backgroundColor: '#FF6B00',
              }}
            />
            <Box
              sx={{
                flex: 1,
                height: '6px',
                borderRadius: '3px',
                backgroundColor: '#E2E8F0',
              }}
            />
            <Box
              sx={{
                flex: 1,
                height: '6px',
                borderRadius: '3px',
                backgroundColor: '#E2E8F0',
              }}
            />
            <Box
              sx={{
                flex: 1,
                height: '6px',
                borderRadius: '3px',
                backgroundColor: '#E2E8F0',
              }}
            />
          </Box>
        </Box>

        {/* Main Title */}
        <Typography
          sx={{
            fontSize: '26px',
            fontWeight: 800,
            color: '#0F172A',
            lineHeight: 1.2,
            letterSpacing: '-0.5px',
            mb: 1.5,
          }}
        >
          {t.prepareLicenseTitle}
        </Typography>

        {/* Instructions Header */}
        <Typography
          sx={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#0F172A',
            mb: 1,
          }}
        >
          {t.forClearPhoto}
        </Typography>

        {/* Bullet List */}
        <Box
          component="ul"
          sx={{
            m: 0,
            pl: 2.5,
            color: '#64748B',
            fontSize: '13px',
            lineHeight: 1.6,
            mb: 3,
            '& li': {
              mb: 0.25,
            },
          }}
        >
          {bullets.map((bullet, idx) => (
            <li key={idx}>{bullet}</li>
          ))}
        </Box>

        {/* Visual License Sample Previews */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          {/* Front License Card */}
          <Box
            sx={{
              borderRadius: '16px',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              backgroundColor: '#F8FAFC',
              aspectRatio: '1.58 / 1',
              minHeight: '180px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              component="img"
              src={driversLicenseFront}
              alt="Driver's License Front"
              loading="eager"
              decoding="sync"
              sx={{
                width: '100%',
                height: '100%',
                display: 'block',
                objectFit: 'contain',
              }}
            />
          </Box>

          {/* Back License Card (Full Back ID Card) */}
          <Box
            sx={{
              borderRadius: '16px',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              backgroundColor: '#F8FAFC',
              aspectRatio: '1.58 / 1',
              minHeight: '180px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              component="img"
              src={driversLicenseBack}
              alt="Driver's License Back"
              loading="eager"
              decoding="sync"
              sx={{
                width: '100%',
                height: '100%',
                display: 'block',
                objectFit: 'contain',
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* 3. Sticky Bottom Action Bar */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 24px calc(var(--safe-area-bottom) + 16px) 24px',
          background: 'linear-gradient(to top, #FFFFFF 80%, rgba(255, 255, 255, 0.9) 90%, rgba(255, 255, 255, 0) 100%)',
          zIndex: 15,
        }}
      >
        <PrimaryButton
          fullWidth
          onClick={handleContinue}
          sx={{
            height: '56px',
            borderRadius: '16px',
            fontSize: '16px',
            fontWeight: 800,
            backgroundColor: '#FF6B00',
            boxShadow: 'none',
            '&:hover': { backgroundColor: '#E66000', boxShadow: 'none' },
          }}
        >
          {t.continue}
        </PrimaryButton>
      </Box>
    </Box>
  );
};

export default DriverPrepareLicense;
