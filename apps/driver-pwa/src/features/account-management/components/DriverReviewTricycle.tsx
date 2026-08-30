import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import { useLanguage } from '../../../utils/LanguageContext';
import { assessImageQuality, rotateImage } from '../../../services/imageEnhancementService';
import { saveTricycleScanData } from '../../../services/driverOnboardingCache';
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
              ? 'Medyo malabo o madilim ang larawan. Maaari itong i-rotate o kuhanan muli para sa mas mabilis na pagbasa.'
              : 'The image may be slightly dark or blurry. You can rotate or retake the photo for best results.'
          );
        } else {
          setQualityWarning(null);
        }
      });
    }
  }, [currentPhoto, isTagalog]);

  const handleRotateLeft = async () => {
    const rotated = await rotateImage(currentPhoto, -90);
    setCurrentPhoto(rotated);
    if (rawPhoto) {
      const rotatedRaw = await rotateImage(rawPhoto, -90);
      setRawPhoto(rotatedRaw);
    }
  };

  const handleRotateRight = async () => {
    const rotated = await rotateImage(currentPhoto, 90);
    setCurrentPhoto(rotated);
    if (rawPhoto) {
      const rotatedRaw = await rotateImage(rawPhoto, 90);
      setRawPhoto(rotatedRaw);
    }
  };

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

      navigate('/driver/confirm-all-info', {
        state: {
          ...state,
          tricycleUnit: tricycleData,
        },
      });
    } catch (err) {
      console.error('[DriverReviewTricycle] Save error:', err);
      navigate('/driver/confirm-all-info', {
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

        {/* Captured Photo Container with Light Gray Background & Rotate Controls (Matching Driver's License) */}
        <Box
          sx={{
            width: '100%',
            borderRadius: '20px',
            backgroundColor: '#EFEFEF',
            p: 2,
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            flexDirection: 'column',
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
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                display: 'block',
                objectFit: 'contain',
                maxHeight: '260px',
              }}
            />
          ) : (
            <Typography sx={{ color: '#64748B', fontSize: '14px', py: 4 }}>
              Walang larawang nakuha
            </Typography>
          )}

          {/* Rotate Controls in the same container */}
          {currentPhoto && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                mt: 2,
                pt: 1.5,
                borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                width: '100%',
              }}
            >
              <Button
                size="small"
                startIcon={<RotateLeftIcon sx={{ color: '#FF6B00' }} />}
                onClick={handleRotateLeft}
                sx={{
                  flex: 1,
                  color: '#0F172A',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  textTransform: 'none',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  py: 0.85,
                  border: '1px solid #CBD5E1',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  '&:hover': { backgroundColor: '#F8FAFC' },
                }}
              >
                {isTagalog ? 'I-rotate Pakaliwa' : 'Rotate Left'}
              </Button>
              <Button
                size="small"
                startIcon={<RotateRightIcon sx={{ color: '#FF6B00' }} />}
                onClick={handleRotateRight}
                sx={{
                  flex: 1,
                  color: '#0F172A',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  textTransform: 'none',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  py: 0.85,
                  border: '1px solid #CBD5E1',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  '&:hover': { backgroundColor: '#F8FAFC' },
                }}
              >
                {isTagalog ? 'I-rotate Pakanan' : 'Rotate Right'}
              </Button>
            </Box>
          )}
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
