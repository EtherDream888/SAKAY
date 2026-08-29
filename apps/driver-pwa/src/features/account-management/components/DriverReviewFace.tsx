import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';

export const DriverReviewFace: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    phone?: string;
    driverName?: string;
    rawSelfie?: string;
    selfiePhoto?: string;
    isEditMode?: boolean;
  } | undefined;

  const isEditMode = Boolean(state?.isEditMode);
  const photoToDisplay = state?.selfiePhoto || state?.rawSelfie;

  const handleRetake = () => {
    navigate('/driver/scan-face', { state });
  };

  const handleConfirmPhoto = () => {
    navigate('/driver/face-loading', { state });
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
          flexShrink: 0,
        }}
      >
        <IconButton
          onClick={handleRetake}
          sx={{
            width: 44,
            height: 44,
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            '&:hover': { backgroundColor: '#F8FAFC' },
          }}
        >
          <ArrowBackIcon sx={{ color: '#0F172A', fontSize: 20 }} />
        </IconButton>

        <Logo color="orange" width={110} />
      </Box>

      {/* 2. Main Content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 3,
          py: 2,
        }}
      >
        <Typography
          sx={{
            fontSize: '24px',
            fontWeight: 800,
            color: '#0F172A',
            textAlign: 'center',
            lineHeight: 1.2,
            letterSpacing: '-0.5px',
            mb: 1,
          }}
        >
          Maayos na ba ang kuha?
        </Typography>

        <Typography
          sx={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#64748B',
            textAlign: 'center',
            mb: 3,
          }}
        >
          Siguraduhing malinaw ang iyong mukha at walang takip.
        </Typography>

        {/* Circular Selfie Preview Container */}
        <Box
          sx={{
            width: 240,
            height: 240,
            borderRadius: '50%',
            border: '3px solid #FF6B00',
            boxShadow: '0 8px 30px rgba(255, 107, 0, 0.25)',
            overflow: 'hidden',
            backgroundColor: '#0F172A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 4,
          }}
        >
          {photoToDisplay ? (
            <Box
              component="img"
              src={photoToDisplay}
              alt="Driver Selfie Preview"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)', // Mirrored orientation for realistic display
              }}
            />
          ) : (
            <Typography sx={{ color: '#94A3B8', fontSize: '13px' }}>Walang larawan</Typography>
          )}
        </Box>
      </Box>

      {/* 3. Action Buttons Footer */}
      <Box
        sx={{
          px: 3,
          pb: 'calc(var(--safe-area-bottom) + 20px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          backgroundColor: '#FFFFFF',
          flexShrink: 0,
        }}
      >
        <PrimaryButton fullWidth onClick={handleConfirmPhoto}>
          Gamitin ang Larawang Ito
        </PrimaryButton>

        <PrimaryButton
          fullWidth
          variant="outlined"
          onClick={handleRetake}
          sx={{
            backgroundColor: 'transparent',
            borderColor: '#CBD5E1',
            color: '#0F172A',
            '&:hover': { backgroundColor: '#F8FAFC', borderColor: '#94A3B8' },
          }}
        >
          Kuhanan Muli
        </PrimaryButton>
      </Box>
    </Box>
  );
};
