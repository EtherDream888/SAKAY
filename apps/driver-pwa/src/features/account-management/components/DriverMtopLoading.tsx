import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

import Logo from '../../../common/components/Logo';
import { parseMtopImage } from '../../../services/mtopOcrService';
import appIcon from '../../../../../../packages/shared/src/assets/icons/app-icon.png';

export const DriverMtopLoading: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    phone?: string;
    driverName?: string;
    mtopPhoto?: string;
    rawMtopPhoto?: string;
  } | undefined;

  const [ocrStatus, setOcrStatus] = useState('Sandali lang habang kinukuha namin ang impormasyon mula sa iyong dokumento.');
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

  // Main OCR Execution Workflow
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    targetPctRef.current = 15;

    const executeOcrPipeline = async () => {
      const photoToProcess = state?.mtopPhoto || state?.rawMtopPhoto;

      try {
        if (photoToProcess) {
          targetPctRef.current = 30;

          const ocrResult = await parseMtopImage(photoToProcess, (pct, status) => {
            targetPctRef.current = Math.max(30, Math.min(90, Math.round(pct)));
            if (status) setOcrStatus(status);
          });

          targetPctRef.current = 100;
          await new Promise((res) => setTimeout(res, 400));

          navigate('/driver/confirm-mtop-info', {
            replace: true,
            state: {
              ...state,
              mtopExtracted: ocrResult.data,
            },
          });
          return;
        }
      } catch (err) {
        console.warn('[DriverMtopLoading] OCR Exception:', err);
      }

      // Default Fallback mock data if photo is missing or OCR fails
      targetPctRef.current = 100;
      await new Promise((res) => setTimeout(res, 400));

      navigate('/driver/confirm-mtop-info', {
        replace: true,
        state: {
          ...state,
          mtopExtracted: {
            photoUrl: photoToProcess || '',
            operatorName: state?.driverName || 'Juan Dela Cruz',
            franchiseNumber: 'MTOP-2025-0891',
            plateNumber: 'ABC 123',
            chassisNumber: 'AB1CDEFGHIJK23456',
            vehicleMake: 'Yamaha',
            motorNumber: 'A1B2345678',
            orNumber: '1234567',
            expirationDate: '2027-12-31',
            authorizedRoute: 'City of Calapan, Oriental Mindoro',
            scannedAt: new Date().toISOString(),
          },
        },
      });
    };

    executeOcrPipeline();
  }, []);

  const currentPct = Math.round(displayedPct);
  // Front-wheel alignment offset calculation
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
          {ocrStatus}
        </Typography>
      </Box>
    </Box>
  );
};
