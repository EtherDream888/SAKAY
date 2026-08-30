import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

import { performLicenseOcr } from '../../../services/licenseOcrService';
import { saveLicenseScanData } from '../../../services/driverOnboardingCache';
import appIcon from '../../../../../../packages/shared/src/assets/icons/app-icon.png';
import defaultFrontSample from '../../../../../../packages/shared/src/assets/images/drivers_license_front.png';
import defaultBackSample from '../../../../../../packages/shared/src/assets/images/drivers_license_back.png';

import DriverProgressLoader from './DriverProgressLoader';

// Preload app icon image in module scope for zero-glitch instant display
const preloadedAppIcon = new Image();
preloadedAppIcon.src = appIcon;

export const DriverLicenseLoading: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    phone?: string;
    driverName?: string;
    frontPhoto?: string;
    rawFrontPhoto?: string;
    backPhoto?: string;
    rawBackPhoto?: string;
  } | undefined;

  // Target progress (from OCR processing milestones) & smooth rendered display progress
  const targetProgressRef = useRef(0.05);
  const [displayProgress, setDisplayProgress] = useState(0.05);
  const isFinishedRef = useRef(false);
  const navTriggeredRef = useRef(false);
  const extractedDataRef = useRef<any>(null);

  // Smooth gradual 60fps ticker loop
  useEffect(() => {
    let animId: number;

    const tick = () => {
      setDisplayProgress((prev) => {
        const target = targetProgressRef.current;
        const diff = target - prev;

        if (diff <= 0.0005) {
          // If reached 100% target and OCR is finished, trigger navigation
          if (target >= 0.999 && isFinishedRef.current && !navTriggeredRef.current) {
            navTriggeredRef.current = true;
            setTimeout(() => {
              navigate('/driver/confirm-license-info', {
                replace: true,
                state: {
                  ...state,
                  extracted: extractedDataRef.current,
                },
              });
            }, 300);
          }
          return target;
        }

        // Slow, gradual step (smooth lerp interpolation)
        const step = Math.max(0.003, diff * 0.07);
        return Math.min(1.0, prev + step);
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [navigate, state]);

  // Run OCR processing pipeline
  useEffect(() => {
    let isCancelled = false;

    const runExtraction = async () => {
      const front = state?.frontPhoto || defaultFrontSample;
      const back = state?.backPhoto || defaultBackSample;
      const rawFront = state?.rawFrontPhoto || front;
      const rawBack = state?.rawBackPhoto || back;

      try {
        const result = await performLicenseOcr(front, back, (prog) => {
          if (!isCancelled) {
            // Smoothly advance target milestone
            targetProgressRef.current = Math.max(targetProgressRef.current, Math.min(prog, 0.92));
          }
        });

        if (isCancelled) return;

        const fullResultData = {
          ...result.data,
          rawFrontPhoto: rawFront,
          rawBackPhoto: rawBack,
        };

        saveLicenseScanData(fullResultData, state?.phone || '');
        extractedDataRef.current = fullResultData;
        isFinishedRef.current = true;
        targetProgressRef.current = 1.0;
      } catch (err) {
        console.warn('[DriverLicenseLoading] Extraction error:', err);
        if (!isCancelled) {
          const fallbackData = {
            frontPhoto: state?.frontPhoto || '',
            backPhoto: state?.backPhoto || '',
            rawFrontPhoto: rawFront,
            rawBackPhoto: rawBack,
            fullName: '',
            dob: '',
            gender: 'Male',
            address: '',
            licenseNumber: '',
            dlCodes: '',
            expirationDate: '',
            scannedAt: new Date().toISOString(),
          };
          saveLicenseScanData(fallbackData, state?.phone || '');
          extractedDataRef.current = fallbackData;
          isFinishedRef.current = true;
          targetProgressRef.current = 1.0;
        }
      }
    };

    runExtraction();

    return () => {
      isCancelled = true;
    };
  }, [state]);

  return <DriverProgressLoader progress={displayProgress} flowType="license" />;
};

export default DriverLicenseLoading;

