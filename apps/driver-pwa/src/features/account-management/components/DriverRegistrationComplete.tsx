import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import { clearOnboardingCache } from '../../../services/driverOnboardingCache';

export const DriverRegistrationComplete: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Native confetti particle burst constrained strictly to inner canvas inside PWA mobile container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    canvas.width = canvas.parentElement?.clientWidth || 360;
    canvas.height = canvas.parentElement?.clientHeight || 640;

    const colors = ['#FF6B00', '#10B981', '#3B82F6', '#F59E0B', '#EC4899'];
    const particles = Array.from({ length: 45 }, () => ({
      x: canvas.width * 0.5,
      y: canvas.height * 0.45,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.8) * 10,
      size: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
    }));

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.rotation += p.vRot;
        p.alpha -= 0.015;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });

      if (alive) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
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
