import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Card,
  CardContent,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import { useLanguage } from '../../../utils/LanguageContext';

export const DriverPrepareDocuments: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const state = location.state as { phone?: string; driverName?: string } | undefined;

  const handleBack = () => {
    navigate('/driver/privacy-policy', { state });
  };

  const handleContinue = () => {
    navigate('/driver/prepare-license', {
      state: {
        driverName: state?.driverName || 'Aurelio Bautista',
        phone: state?.phone || '09181234567',
      },
    });
  };

  const docItems = [
    {
      title: t.docDriversLicenseTitle,
      desc: t.docDriversLicenseDesc,
    },
    {
      title: t.docMtopTitle,
      desc: t.docMtopDesc,
    },
    {
      title: t.docCrTitle,
      desc: t.docCrDesc,
    },
    {
      title: t.docOrTitle,
      desc: t.docOrDesc,
    },
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
          pb: 'calc(var(--safe-area-bottom) + 120px)',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        }}
      >
        {/* Main Title */}
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
          {t.prepareDocsTitle}
        </Typography>

        {/* Subtitle Description */}
        <Typography
          sx={{
            fontSize: '14.5px',
            color: '#334155',
            lineHeight: 1.45,
            fontWeight: 400,
            mb: 1.5,
          }}
        >
          {t.prepareDocsSubtitle}
        </Typography>

        {/* Bullet Points */}
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
          <li>{t.prepareDocsBullet1}</li>
          <li>{t.prepareDocsBullet2}</li>
          <li>{t.prepareDocsBullet3}</li>
          <li>{t.prepareDocsBullet4}</li>
        </Box>

        {/* Documents Checklist Card */}
        <Card
          elevation={0}
          sx={{
            borderRadius: '20px',
            border: '1.5px solid #FFEDE1',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 4px 20px rgba(255, 107, 0, 0.04)',
            mb: 3,
          }}
        >
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
              {docItems.map((doc, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      backgroundColor: '#FFEDE1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      mt: 0.25,
                    }}
                  >
                    <CheckIcon sx={{ color: '#FF6B00', fontSize: 14, stroke: '#FF6B00', strokeWidth: 0.5 }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      sx={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: '#0F172A',
                        lineHeight: 1.3,
                        mb: 0.25,
                      }}
                    >
                      {doc.title}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '12.5px',
                        color: '#64748B',
                        lineHeight: 1.45,
                        fontWeight: 400,
                      }}
                    >
                      {doc.desc}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
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
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography
          sx={{
            color: '#FF6B00',
            fontSize: '13.5px',
            fontWeight: 600,
            textAlign: 'center',
            mb: 1.5,
          }}
        >
          {t.estimatedTimeNotice}
        </Typography>

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

export default DriverPrepareDocuments;
