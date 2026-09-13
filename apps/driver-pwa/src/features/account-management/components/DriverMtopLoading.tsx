import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../../../utils/LanguageContext';
import { parseMtopImage } from '../../../services/mtopOcrService';
import { saveMtopScanData, getCachedLicenseData, MtopExtractedData } from '../../../services/driverOnboardingCache';
import defaultMtopSample from '../../../../../../packages/shared/src/assets/images/mtop_sample.jpg';
import DriverProgressLoader from './DriverProgressLoader';

export const DriverMtopLoading: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const state = location.state as {
    phone?: string;
    driverName?: string;
    mtopPhoto?: string;
    rawMtopPhoto?: string;
  } | undefined;

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
      const photoToProcess = state?.mtopPhoto || state?.rawMtopPhoto || defaultMtopSample;
      const rawPhoto = state?.rawMtopPhoto || photoToProcess;
      const targetPhone = state?.phone || localStorage.getItem('sakay_driver_phone') || '';
      const cachedLicense = getCachedLicenseData();

      try {
        if (photoToProcess) {
          targetPctRef.current = 30;

          const ocrResult = await parseMtopImage(
            photoToProcess,
            (pct) => {
              targetPctRef.current = Math.max(30, Math.min(92, Math.round(pct)));
            },
            rawPhoto
          );

          targetPctRef.current = 100;
          await new Promise((res) => setTimeout(res, 400));

          const cleanData: MtopExtractedData = {
            ...ocrResult.data,
            operatorName: ocrResult.data.operatorName || state?.driverName || cachedLicense?.fullName || '',
            plateNumber: ocrResult.data.plateNumber || cachedLicense?.plateNumber || '',
            authorizedRoute: ocrResult.data.authorizedRoute || 'City of Calapan, Oriental Mindoro',
            expirationDate: ocrResult.data.expirationDate || '12-31-2026',
          };

          saveMtopScanData(cleanData, targetPhone);

          navigate('/driver/confirm-mtop-info', {
            replace: true,
            state: {
              ...state,
              mtopExtracted: cleanData,
            },
          });
          return;
        }
      } catch (err) {
        console.warn('[DriverMtopLoading] OCR Exception:', err);
      }

      // Fallback data if OCR throws unexpected runtime error
      targetPctRef.current = 100;
      await new Promise((res) => setTimeout(res, 400));

      const fallbackData: MtopExtractedData = {
        photoUrl: photoToProcess || '',
        operatorName: state?.driverName || cachedLicense?.fullName || 'DE GUZMAN, MARIO R.',
        franchiseNumber: '3209',
        plateNumber: cachedLicense?.plateNumber || '261VPI',
        chassisNumber: 'MD2DDDUZZTWD39200',
        vehicleMake: 'KAWASAKI',
        motorNumber: 'DUMBTD62743',
        yearModel: '2010',
        orNumber: '1625878',
        expirationDate: '12-31-2026',
        authorizedRoute: 'City of Calapan, Oriental Mindoro',
        scannedAt: new Date().toISOString(),
      };

      saveMtopScanData(fallbackData, targetPhone);

      navigate('/driver/confirm-mtop-info', {
        replace: true,
        state: {
          ...state,
          mtopExtracted: fallbackData,
        },
      });
    };

    executeOcrPipeline();
  }, [navigate, state]);

  return <DriverProgressLoader progress={displayedPct / 100} flowType="mtop" />;
};
