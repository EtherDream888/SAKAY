import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';

export const DriverReviewMtop: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    phone?: string;
    driverName?: string;
    mtopPhoto?: string;
    rawMtopPhoto?: string;
  } | undefined;

  const photoToDisplay = state?.mtopPhoto || state?.rawMtopPhoto || '';

  const handleConfirmImage = () => {
    navigate('/driver/mtop-loading', { state });
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
          Maayos na ba ang kuha?
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
          Siguraduhing malinaw at mababasa ang lahat ng impormasyon sa iyong MTOP.
        </Typography>

        {/* Captured Document Preview Card */}
        <Box
          sx={{
            width: '100%',
            borderRadius: '20px',
            border: '1.5px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            mb: 3,
            overflow: 'hidden',
          }}
        >
          {photoToDisplay ? (
            <Box
              component="img"
              src={photoToDisplay}
              alt="MTOP Captured Scan"
              sx={{
                width: '100%',
                aspectRatio: '4 / 3',
                minHeight: '260px',
                objectFit: 'contain',
                borderRadius: '16px',
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
              Walang nahanap na larawan ng MTOP
            </Box>
          )}
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
          Gamitin ang Larawang Ito
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
          Kuhanan Muli
        </Button>
      </Box>
    </Box>
  );
};
