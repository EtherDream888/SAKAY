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
import mtopImg from '../../../../../../packages/shared/src/assets/images/mtop.png';

export const DriverMtopInstructions: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state;

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
          onClick={() => navigate('/driver/confirm-license-info', { state })}
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
        {/* Step Indicator Bar */}
        <Box sx={{ mt: 1, mb: 2 }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#64748B', mb: 1 }}>
            Hakbang 2 ng 4
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Box sx={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: '#FF6B00' }} />
            <Box sx={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: '#FF6B00' }} />
            <Box sx={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: '#E2E8F0' }} />
            <Box sx={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: '#E2E8F0' }} />
          </Box>
        </Box>

        <Typography
          sx={{
            fontSize: '24px',
            fontWeight: 800,
            color: '#0F172A',
            lineHeight: 1.25,
            letterSpacing: '-0.5px',
            mb: 2,
          }}
        >
          Ihanda ang iyong Motorized Tricycle Operator's Permit (MTOP)
        </Typography>

        <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', mb: 1 }}>
          Para sa malinaw na larawan:
        </Typography>

        <Box component="ul" sx={{ pl: 2.5, m: 0, mb: 3, color: '#64748B', '& li': { mb: 0.75, fontSize: '14px', lineHeight: 1.4 } }}>
          <li>Kunan ang buong dokumento.</li>
          <li>Siguraduhing mababasa ang lahat ng impormasyon.</li>
          <li>Ilagay sa patag na ibabaw.</li>
          <li>Iwasan ang silaw, tiklop, at anino.</li>
          <li>Kumuha ng larawan sa maliwanag na lugar.</li>
        </Box>

        {/* Document Graphic Card */}
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
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            mb: 4,
            overflow: 'hidden',
          }}
        >
          <Box
            component="img"
            src={mtopImg}
            alt="MTOP Document Sample"
            sx={{
              width: '100%',
              maxWidth: 320,
              maxHeight: 220,
              objectFit: 'contain',
              borderRadius: '12px',
            }}
          />
        </Box>
      </Box>

      {/* 3. Pinned Action Button */}
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
          onClick={() => navigate('/driver/scan-mtop', { state })}
        >
          Magpatuloy
        </PrimaryButton>
      </Box>
    </Box>
  );
};
