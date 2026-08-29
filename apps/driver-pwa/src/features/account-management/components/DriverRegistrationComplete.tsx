import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import confetti from 'canvas-confetti';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import { clearOnboardingCache } from '../../../services/driverOnboardingCache';

export const DriverRegistrationComplete: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Confetti instance constrained strictly to inner canvas inside PWA mobile container
  useEffect(() => {
    if (!canvasRef.current) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    try {
      const myConfetti = confetti.create(canvasRef.current, {
        resize: true,
        useWorker: true,
      });

      myConfetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.45, x: 0.5 },
        colors: ['#FF6B00', '#10B981', '#3B82F6', '#F59E0B'],
        disableForReducedMotion: true,
      });
    } catch (err) {
      console.warn('[DriverRegistrationComplete] Confetti initialization warning:', err);
    }
  }, []);

  const handleBackToLogin = () => {
    clearOnboardingCache();
    navigate('/driver/login', { replace: true });
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
      {/* Container-Constrained Canvas for Confetti */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* 1. Header Bar (Logo only, no back button) */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 3,
          pt: 'calc(var(--safe-area-top) + 24px)',
          pb: 2,
          backgroundColor: '#FFFFFF',
          flexShrink: 0,
          zIndex: 1,
        }}
      >
        <Logo color="orange" width={120} />
      </Box>

      {/* 2. Main Success Content Container */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 4,
          py: 3,
          zIndex: 1,
        }}
      >
        {/* Standalone Celebration Emoji */}
        <Typography sx={{ fontSize: '56px', mb: 2, lineHeight: 1 }}>
          🎉
        </Typography>

        {/* Headline */}
        <Typography
          sx={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#0F172A',
            textAlign: 'center',
            lineHeight: 1.25,
            letterSpacing: '-0.5px',
            mb: 1.5,
          }}
        >
          Matagumpay ang iyong pagpaparehistro!
        </Typography>

        {/* Body Description */}
        <Typography
          sx={{
            fontSize: '14.5px',
            fontWeight: 500,
            color: '#64748B',
            textAlign: 'center',
            lineHeight: 1.55,
            maxWidth: 320,
          }}
        >
          Natanggap na namin ang iyong mga dokumento. Sisimulan na namin ang pag-review ng iyong account. Karaniwang tumatagal ito ng hanggang 24 oras.
        </Typography>
      </Box>

      {/* 3. Action Footer Button */}
      <Box
        sx={{
          px: 3,
          pb: 'calc(var(--safe-area-bottom) + 24px)',
          backgroundColor: '#FFFFFF',
          flexShrink: 0,
          zIndex: 1,
        }}
      >
        <PrimaryButton fullWidth onClick={handleBackToLogin}>
          Bumalik sa Pag-login
        </PrimaryButton>
      </Box>
    </Box>
  );
};

export default DriverRegistrationComplete;
