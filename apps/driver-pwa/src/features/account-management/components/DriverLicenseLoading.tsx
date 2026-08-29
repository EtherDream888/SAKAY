import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
} from '@mui/material';

import { useLanguage } from '../../../utils/LanguageContext';
import { performLicenseOcr } from '../../../services/licenseOcrService';
import { saveLicenseScanData } from '../../../services/driverOnboardingCache';
import appIcon from '../../../../../../packages/shared/src/assets/icons/app-icon.png';
import defaultFrontSample from '../../../../../../packages/shared/src/assets/images/drivers_license_front.png';
import defaultBackSample from '../../../../../../packages/shared/src/assets/images/drivers_license_back.png';

// Preload app icon image in module scope for zero-glitch instant display
const preloadedAppIcon = new Image();
preloadedAppIcon.src = appIcon;

export const DriverLicenseLoading: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const state = location.state as {
    phone?: string;
    driverName?: string;
    frontPhoto?: string;
    backPhoto?: string;
  } | undefined;

  const [progress, setProgress] = useState(0.08);

  useEffect(() => {
    let isCancelled = false;

    const runExtraction = async () => {
      const front = state?.frontPhoto || defaultFrontSample;
      const back = state?.backPhoto || defaultBackSample;

      try {
        const result = await performLicenseOcr(front, back, (prog) => {
          if (!isCancelled) {
            setProgress(Math.max(0.08, Math.min(prog, 0.98)));
          }
        });

        if (isCancelled) return;
        setProgress(1.0);

        // Cache extracted data
        saveLicenseScanData(result.data, state?.phone || '');

        setTimeout(() => {
          if (!isCancelled) {
            navigate('/driver/confirm-license-info', {
              replace: true,
              state: {
                ...state,
                extracted: result.data,
              },
            });
          }
        }, 500);
      } catch (err) {
        console.warn('[DriverLicenseLoading] Extraction error:', err);
        if (!isCancelled) {
          setProgress(1.0);
          const fallbackData = {
            frontPhoto: state?.frontPhoto || '',
            backPhoto: state?.backPhoto || '',
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
          navigate('/driver/confirm-license-info', {
            replace: true,
            state: {
              ...state,
              extracted: fallbackData,
            },
          });
        }
      }
    };

    runExtraction();

    return () => {
      isCancelled = true;
    };
  }, [navigate, state]);

  // Calculate tricycle offset percentage (bounded between 0% and 82%)
  const tricycleLeftPercent = Math.min(Math.max(progress * 82, 0), 82);

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
        px: 3,
        position: 'relative',
      }}
    >
      {/* Centered Loading Animation Container */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '340px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Track with Riding Tricycle */}
        <Box
          sx={{
            width: '100%',
            position: 'relative',
            height: '70px',
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          {/* Animated Tricycle strictly matching actual loading progress */}
          <Box
            sx={{
              position: 'absolute',
              bottom: '4px',
              left: `${tricycleLeftPercent}%`,
              transition: 'left 0.25s linear',
              zIndex: 2,
            }}
          >
            <img
              src={appIcon}
              alt="Loading Tricycle"
              width={58}
              height={58}
              loading="eager"
              decoding="sync"
              style={{
                width: '58px',
                height: '58px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </Box>

          {/* Progress Track (Light Orange Base) */}
          <Box
            sx={{
              width: '100%',
              height: '12px',
              borderRadius: '6px',
              backgroundColor: '#FFB899',
              overflow: 'hidden',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {/* Active Progress Fill (Solid Brand Orange) */}
            <Box
              sx={{
                width: `${progress * 100}%`,
                height: '100%',
                backgroundColor: '#FF6B00',
                borderRadius: '6px',
                transition: 'width 0.25s ease-out',
              }}
            />
          </Box>
        </Box>

        {/* Loading Description Text */}
        <Typography
          sx={{
            mt: 4,
            fontSize: '15px',
            fontWeight: 500,
            color: '#0F172A',
            textAlign: 'center',
            lineHeight: 1.5,
            maxWidth: '300px',
          }}
        >
          {t.ocrProcessingNotice}
        </Typography>
      </Box>
    </Box>
  );
};

export default DriverLicenseLoading;
