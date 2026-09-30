import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import { useLanguage } from '../../../utils/LanguageContext';
import { assessImageQuality } from '../../../services/imageEnhancementService';
import {
  saveTricycleScanData,
  getNextCorrectionRoute,
  type FaultyDocType,
} from '../../../services/driverOnboardingCache';
import { saveDriverTricycleVerification } from '../../../services/driverApiService';

export const DriverReviewTricycle: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, t } = useLanguage();
  const isTagalog = language === 'tl';
  const state = location.state as {
    phone?: string;
    driverName?: string;
    photoUrl?: string;
    rawPhotoUrl?: string;
    isEditMode?: boolean;
  } | undefined;

  const [currentPhoto, setCurrentPhoto] = useState<string>(state?.photoUrl || '');
  const [rawPhoto, setRawPhoto] = useState<string>(state?.rawPhotoUrl || state?.photoUrl || '');
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (state?.photoUrl) {
      setCurrentPhoto(state.photoUrl);
      setRawPhoto(state.rawPhotoUrl || state.photoUrl);
    }
  }, [state?.photoUrl, state?.rawPhotoUrl]);

  useEffect(() => {
    if (currentPhoto) {
      assessImageQuality(currentPhoto).then((res) => {
        if (!res.isAcceptable && res.issues.length > 0) {
          setQualityWarning(
            isTagalog
              ? 'Medyo malabo o madilim ang larawan. Maaari itong kuhanan muli para sa mas mabilis na pagbasa.'
              : 'The image may be slightly dark or blurry. You can retake the photo for best results.'
          );
        } else {
          setQualityWarning(null);
        }
      });
    }
  }, [currentPhoto, isTagalog]);

  const handleUsePhoto = async () => {
    if (submitting || !currentPhoto) return;

    setSubmitting(true);
    const targetPhone = state?.phone || localStorage.getItem('sakay_driver_phone') || '';

    try {
      const tricycleData = {
        photoUrl: currentPhoto,
        rawPhotoUrl: rawPhoto || currentPhoto,
        scannedAt: new Date().toISOString(),
      };

      saveTricycleScanData(tricycleData, targetPhone);
      await saveDriverTricycleVerification(currentPhoto, targetPhone);

      let targetRoute = state?.isEditMode ? '/driver/confirm-all-info' : '/driver/scan-face';
      if ((state as any)?.isResubmission && (state as any)?.faultyDocuments) {
        const next = getNextCorrectionRoute('tricycle', (state as any).faultyDocuments as FaultyDocType[]);
        targetRoute = next.nextRoute;
      }
      navigate(targetRoute, {
        state: {
          ...state,
          tricycleUnit: tricycleData,
        },
      });
    } catch (err) {
      console.error('[DriverReviewTricycle] Save error:', err);
      let targetRoute = state?.isEditMode ? '/driver/confirm-all-info' : '/driver/scan-face';
      if ((state as any)?.isResubmission && (state as any)?.faultyDocuments) {
        const next = getNextCorrectionRoute('tricycle', (state as any).faultyDocuments as FaultyDocType[]);
        targetRoute = next.nextRoute;
      }
      navigate(targetRoute, {
        state: {
          ...state,
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    navigate('/driver/scan-tricycle', { state });
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
      {/* 1. Top Header */}
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
          onClick={handleRetake}
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

      {/* 2. Main Content */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 3,
          pb: 'calc(var(--safe-area-bottom) + 150px)',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {/* Title */}
        <Typography
          sx={{
            fontSize: '26px',
            fontWeight: 800,
            color: '#0F172A',
            lineHeight: 1.2,
            letterSpacing: '-0.5px',
            mt: 1,
            mb: 1.5,
          }}
        >
          {t.reviewPhotoTitle || 'Maayos na ba ang kuha?'}
        </Typography>

        {/* Subtitle */}
        <Typography
          sx={{
            fontSize: '15px',
            color: '#334155',
            lineHeight: 1.45,
            fontWeight: 400,
            mb: 3.5,
          }}
        >
          {t.reviewPhotoSubtitle || 'Siguraduhing malinaw at kita ang buong tricycle.'}
        </Typography>

        {/* Captured Photo Container */}
        <Box
          sx={{
            width: '100%',
            borderRadius: '20px',
            backgroundColor: '#F8FAFC',
            p: 2,
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: '100%',
              aspectRatio: '4 / 3',
              minHeight: '260px',
              borderRadius: '16px',
              overflow: 'hidden',
              backgroundColor: '#0F172A',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {currentPhoto ? (
              <Box
                component="img"
                src={currentPhoto}
                alt="Tricycle Unit Preview"
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <Typography sx={{ color: '#64748B', fontSize: '14px', py: 4 }}>
                Walang larawang nakuha
              </Typography>
            )}
          </Box>
        </Box>

        {/* Quality Assessment Feedback */}
        {qualityWarning && (
          <Box
            sx={{
              mt: 2,
              p: 1.75,
              borderRadius: '14px',
              backgroundColor: '#FFF7ED',
              border: '1px solid #FED7AA',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.5,
            }}
          >
            <WarningAmberRoundedIcon sx={{ color: '#EA580C', fontSize: 22, mt: 0.2 }} />
            <Typography sx={{ color: '#9A3412', fontSize: '13px', fontWeight: 600, lineHeight: 1.45 }}>
              {qualityWarning}
            </Typography>
          </Box>
        )}
      </Box>

      {/* 3. Sticky Bottom Action Buttons */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 24px calc(var(--safe-area-bottom) + 16px) 24px',
          background: 'linear-gradient(to top, #FFFFFF 85%, rgba(255, 255, 255, 0.9) 95%, rgba(255, 255, 255, 0) 100%)',
          zIndex: 15,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        <PrimaryButton
          fullWidth
          onClick={handleUsePhoto}
          disabled={submitting || !currentPhoto}
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
          {submitting ? 'Sinusuri...' : t.useThisPhoto || 'Gamitin ang Larawang Ito'}
        </PrimaryButton>

        <Button
          fullWidth
          onClick={handleRetake}
          disabled={submitting}
          sx={{
            height: '52px',
            borderRadius: '16px',
            fontSize: '15px',
            fontWeight: 600,
            color: '#475569',
            backgroundColor: '#F1F5F9',
            textTransform: 'none',
            '&:hover': { backgroundColor: '#E2E8F0' },
          }}
        >
          {t.retakePhoto || 'Kuhanan Muli'}
        </Button>
      </Box>
    </Box>
  );
};

export default DriverReviewTricycle;
