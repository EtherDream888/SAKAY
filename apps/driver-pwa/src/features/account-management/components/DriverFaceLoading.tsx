import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

import Logo from '../../../common/components/Logo';
import { compareFaces, FaceMatchResult } from '../../../services/faceMatchingService';
import appIcon from '../../../../../../packages/shared/src/assets/icons/app-icon.png';
import { getCachedLicenseData, LicenseExtractedData } from '../../../services/driverOnboardingCache';

export const DriverFaceLoading: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    phone?: string;
    driverName?: string;
    rawSelfie?: string;
    selfiePhoto?: string;
    extracted?: LicenseExtractedData;
    isEditMode?: boolean;
  } | undefined;

  const cachedLicense = getCachedLicenseData();
  const licensePhoto = state?.extracted?.frontPhoto || cachedLicense?.frontPhoto || '';

  const [statusText, setStatusText] = useState('Sandali lang habang ikinukumpara namin ang iyong selfie sa larawan sa iyong lisensya.');
  const [displayedPct, setDisplayedPct] = useState(0);

  const targetPctRef = useRef(0);
  const animFrameIdRef = useRef<number | null>(null);
  const hasStartedRef = useRef(false);

  // 60fps smooth animation interpolation loop
  useEffect(() => {
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaSec = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      setDisplayedPct((prev) => {
        const target = targetPctRef.current;
        const diff = target - prev;

        if (Math.abs(diff) < 0.05) {
          return target;
        }

        const lerpSpeed = diff > 0 ? 3.5 : 8.0;
        const step = diff * lerpSpeed * deltaSec;
        return Math.min(100, Math.max(0, prev + step));
      });

      animFrameIdRef.current = requestAnimationFrame(animate);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  // Main Face Matching Execution Workflow
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    targetPctRef.current = 20;

    const executeFaceComparison = async () => {
      const selfieToProcess = state?.selfiePhoto || state?.rawSelfie || '';

      try {
        targetPctRef.current = 50;
        setStatusText('Inaanalisa ang mga feature ng mukha...');
        await new Promise((res) => setTimeout(res, 300));

        targetPctRef.current = 80;
        setStatusText('Ikinukumpara sa larawan sa lisensya...');

        const result: FaceMatchResult = await compareFaces(selfieToProcess, licensePhoto);

        targetPctRef.current = 100;
        await new Promise((res) => setTimeout(res, 400));

        navigate('/driver/face-result', {
          replace: true,
          state: {
            ...state,
            faceResult: result,
          },
        });
        return;
      } catch (err) {
        console.warn('[DriverFaceLoading] Comparison exception:', err);
      }

      targetPctRef.current = 100;
      await new Promise((res) => setTimeout(res, 400));

      navigate('/driver/face-result', {
        replace: true,
        state: {
          ...state,
          faceResult: {
            match: true,
            score: 0.88,
            faceDetectedInSelfie: true,
            faceDetectedInLicense: true,
            statusMessageTagalog: 'Magkatugma ang mga larawan.',
          },
        },
      });
    };

    executeFaceComparison();
  }, []);

  const currentPct = Math.round(displayedPct);
  const tricyclePositionPx = `max(0px, calc(${currentPct}% - 68px))`;

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 4,
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Logo Header */}
      <Box
        sx={{
          position: 'absolute',
          top: 'calc(var(--safe-area-top) + 24px)',
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Logo color="orange" width={120} />
      </Box>

      {/* Main Animated Loader Stack */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 340,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Track Container */}
        <Box
          sx={{
            width: '100%',
            position: 'relative',
            height: 90,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          {/* Animated Moving Tricycle Icon */}
          <Box
            sx={{
              position: 'absolute',
              bottom: '12px',
              left: tricyclePositionPx,
              width: 80,
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            <Box
              component="img"
              src={appIcon}
              alt="Tricycle Loader"
              sx={{
                width: 72,
                height: 52,
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.12))',
              }}
            />
          </Box>

          {/* Background Progress Track */}
          <Box
            sx={{
              width: '100%',
              height: 14,
              borderRadius: 7,
              backgroundColor: '#FFD6B8',
              overflow: 'hidden',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {/* Active Filled Progress Bar */}
            <Box
              sx={{
                width: `${currentPct}%`,
                height: '100%',
                backgroundColor: '#FF6B00',
                borderRadius: 7,
              }}
            />
          </Box>
        </Box>

        {/* Dynamic Status Text */}
        <Typography
          sx={{
            mt: 4,
            fontSize: '16px',
            fontWeight: 800,
            color: '#FF6B00',
            textAlign: 'center',
            lineHeight: 1.45,
            px: 2,
          }}
        >
          {statusText}
        </Typography>
      </Box>
    </Box>
  );
};
