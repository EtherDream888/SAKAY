import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { parseMtopImage } from '../../../services/mtopOcrService';
import DriverProgressLoader from './DriverProgressLoader';

export const DriverMtopLoading: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    phone?: string;
    driverName?: string;
    mtopPhoto?: string;
    rawMtopPhoto?: string;
  } | undefined;

  const [ocrStatus, setOcrStatus] = useState('Inihahanda ang larawan...');
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

  return <DriverProgressLoader progress={displayedPct / 100} flowType="mtop" statusText={ocrStatus} />;
};
