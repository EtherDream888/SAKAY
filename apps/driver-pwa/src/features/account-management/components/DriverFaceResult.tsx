import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, IconButton, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import { FaceMatchResult } from '../../../services/faceMatchingService';
import { saveSelfieScanData } from '../../../services/driverOnboardingCache';
import { saveDriverSelfieVerification } from '../../../services/driverApiService';

export const DriverFaceResult: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    phone?: string;
    driverName?: string;
    rawSelfie?: string;
    selfiePhoto?: string;
    faceResult?: FaceMatchResult;
    isEditMode?: boolean;
  } | undefined;

  const isEditMode = Boolean(state?.isEditMode);
  const selfiePhoto = state?.selfiePhoto || state?.rawSelfie || '';
  const result: FaceMatchResult = state?.faceResult || {
    match: true,
    score: 0.88,
    faceDetectedInSelfie: true,
    faceDetectedInLicense: true,
    statusMessageTagalog: 'Magkatugma ang mga larawan.',
  };

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!result.match) {
      navigate('/driver/scan-face', { state });
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const targetPhone = state?.phone || localStorage.getItem('sakay_driver_phone') || '';
    const selfieData = {
      rawSelfie: selfiePhoto,
      selfiePhotoUrl: selfiePhoto,
      faceMatchPassed: result.match,
      faceMatchScore: result.score,
      verifiedAt: new Date().toISOString(),
    };

    try {
      saveSelfieScanData(selfieData, targetPhone);
      await saveDriverSelfieVerification(selfiePhoto, targetPhone);
      console.log('[DriverFaceResult] Selfie verification saved successfully.');
    } catch (err) {
      console.warn('[DriverFaceResult] Warning saving selfie:', err);
    } finally {
      setSubmitting(false);
      const targetRoute = isEditMode ? '/driver/confirm-all-info' : '/driver/tricycle-instructions';
      navigate(targetRoute, {
        replace: true,
        state: {
          ...state,
          faceVerified: true,
          selfiePhoto,
          isEditMode: false,
        },
      });
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
          onClick={() => navigate('/driver/scan-face', { state })}
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

      {/* 2. Main Result Content */}
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
        {submitError && (
          <Alert severity="error" sx={{ width: '100%', maxWidth: 340, mb: 2, borderRadius: '12px' }}>
            {submitError}
          </Alert>
        )}

        {/* Circular Selfie Display Card */}
        <Box
          sx={{
            width: 200,
            height: 200,
            borderRadius: '50%',
            border: result.match ? '4px solid #16A34A' : '4px solid #DC2626',
            boxShadow: result.match
              ? '0 8px 30px rgba(22, 163, 74, 0.25)'
              : '0 8px 30px rgba(220, 38, 38, 0.25)',
            overflow: 'hidden',
            backgroundColor: '#0F172A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
            position: 'relative',
          }}
        >
          {selfiePhoto ? (
            <Box
              component="img"
              src={selfiePhoto}
              alt="Driver Selfie Result"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)',
              }}
            />
          ) : (
            <Typography sx={{ color: '#94A3B8', fontSize: '13px' }}>Walang larawan</Typography>
          )}
        </Box>

        {/* Match Result Badge */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 2.5,
            py: 1,
            borderRadius: '20px',
            backgroundColor: result.match ? '#DCFCE7' : '#FEE2E2',
            color: result.match ? '#15803D' : '#B91C1C',
            mb: 2,
          }}
        >
          {result.match ? (
            <CheckCircleIcon sx={{ fontSize: 20, color: '#16A34A' }} />
          ) : (
            <ErrorIcon sx={{ fontSize: 20, color: '#DC2626' }} />
          )}
          <Typography sx={{ fontSize: '14px', fontWeight: 800 }}>
            {result.match ? 'Magkatugma ang mga larawan' : 'Hindi magkatugma ang mga larawan'}
          </Typography>
        </Box>

        {/* Description Text */}
        <Typography
          sx={{
            fontSize: '15px',
            fontWeight: 500,
            color: '#64748B',
            textAlign: 'center',
            lineHeight: 1.45,
            maxWidth: 320,
          }}
        >
          {result.match
            ? 'Ang iyong selfie ay tumutugma sa larawan sa iyong lisensya.'
            : 'Pakisigurong malinaw ang iyong mukha at subukang muli.'}
        </Typography>
      </Box>

      {/* 3. Action Footer Button */}
      <Box
        sx={{
          px: 3,
          pb: 'calc(var(--safe-area-bottom) + 20px)',
          backgroundColor: '#FFFFFF',
          flexShrink: 0,
        }}
      >
        <PrimaryButton
          fullWidth
          disabled={submitting}
          onClick={handleContinue}
          sx={{
            backgroundColor: result.match ? '#FF6B00' : '#DC2626',
            '&:hover': {
              backgroundColor: result.match ? '#E66000' : '#B91C1C',
            },
          }}
        >
          {submitting ? 'Isina-save...' : result.match ? 'Magpatuloy' : 'Subukang Muli'}
        </PrimaryButton>
      </Box>
    </Box>
  );
};
