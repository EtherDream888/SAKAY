import React, { useState } from 'react';
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

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import { useLanguage } from '../../../utils/LanguageContext';
import { rotateImage } from '../../../services/imageEnhancementService';

export const DriverReviewMtop: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const isTagalog = language === 'tl';
  const state = location.state as {
    phone?: string;
    driverName?: string;
    mtopPhoto?: string;
    rawMtopPhoto?: string;
  } | undefined;

  const initialPhoto = state?.mtopPhoto || state?.rawMtopPhoto || '';
  const [currentPhoto, setCurrentPhoto] = useState<string>(initialPhoto);

  const handleRotateLeft = async () => {
    if (!currentPhoto) return;
    const rotated = await rotateImage(currentPhoto, -90);
    setCurrentPhoto(rotated);
  };

  const handleRotateRight = async () => {
    if (!currentPhoto) return;
    const rotated = await rotateImage(currentPhoto, 90);
    setCurrentPhoto(rotated);
  };

  const handleConfirmImage = () => {
    navigate('/driver/mtop-loading', {
      state: {
        ...state,
        mtopPhoto: currentPhoto,
        rawMtopPhoto: state?.rawMtopPhoto || currentPhoto,
      },
    });
  };

  const handleRetake = () => {
    navigate('/driver/scan-mtop', { state });
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

      {/* 2. Scrollable Content */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 3,
          pb: 3,
          display: 'flex',
          flexDirection: 'column',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Typography
          sx={{
            fontSize: '26px',
            fontWeight: 800,
            color: '#0F172A',
            lineHeight: 1.2,
            letterSpacing: '-0.5px',
            mt: 1,
            mb: 1.25,
          }}
        >
          {isTagalog ? 'Maayos na ba ang kuha?' : 'Does the photo look good?'}
        </Typography>

        <Typography
          sx={{
            fontSize: '15px',
            color: '#64748B',
            lineHeight: 1.45,
            fontWeight: 500,
            mb: 3,
          }}
        >
          {isTagalog
            ? 'Siguraduhing malinaw at mababasa ang lahat ng impormasyon sa iyong MTOP.'
            : 'Make sure all information on your MTOP is clear and readable.'}
        </Typography>

        {/* Captured Document Preview Card */}
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
            mb: 3,
          }}
        >
          {currentPhoto ? (
            <Box
              component="img"
              src={currentPhoto}
              alt="MTOP Captured Scan"
              sx={{
                width: '100%',
                aspectRatio: '1.45 / 1',
                minHeight: '250px',
                objectFit: 'contain',
                borderRadius: '16px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                backgroundColor: '#0F172A',
              }}
            />
          ) : (
            <Box
              sx={{
                height: 220,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                fontWeight: 600,
              }}
            >
              {isTagalog ? 'Walang nahanap na larawan ng MTOP' : 'No MTOP photo found'}
            </Box>
          )}

          {/* Rotate Controls in the same container */}
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
        </Box>
      </Box>

      {/* 3. Action Buttons Stack */}
      <Box
        sx={{
          p: 3,
          pt: 1.5,
          pb: 'calc(var(--safe-area-bottom) + 20px)',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          flexShrink: 0,
        }}
      >
        <PrimaryButton fullWidth onClick={handleConfirmImage}>
          {isTagalog ? 'Gamitin ang Larawang Ito' : 'Use This Photo'}
        </PrimaryButton>

        <Button
          fullWidth
          variant="text"
          onClick={handleRetake}
          sx={{
            height: '52px',
            borderRadius: '16px',
            backgroundColor: '#F1F3F5',
            color: '#475569',
            fontSize: '16px',
            fontWeight: 700,
            textTransform: 'none',
            '&:hover': { backgroundColor: '#E2E8F0' },
          }}
        >
          {isTagalog ? 'Kuhanan Muli' : 'Retake Photo'}
        </Button>
      </Box>
    </Box>
  );
};
