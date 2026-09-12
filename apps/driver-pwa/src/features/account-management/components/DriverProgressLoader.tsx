import React from 'react';
import { Box, Typography } from '@mui/material';
import appIcon from '../../../../../../packages/shared/src/assets/icons/app-icon.png';
import { useLanguage } from '../../../utils/LanguageContext';

export type FlowType = 'license' | 'mtop' | 'face';

interface DriverProgressLoaderProps {
  progress: number; // 0.0 to 1.0 (or 0 to 100)
  flowType?: FlowType;
  statusText?: string;
}

export function getFlowProgressMilestoneText(
  pct: number,
  flowType: FlowType = 'license',
  customStatusText?: string,
  language: 'tl' | 'en' = 'tl'
): string {
  const isTagalog = language === 'tl';

  if (
    customStatusText &&
    !customStatusText.includes('Sandali lang habang') &&
    !customStatusText.includes('Inihahanda ang larawan...') &&
    !customStatusText.includes('Sinusuri ang') &&
    !customStatusText.includes('Binabasa ang') &&
    !customStatusText.includes('Tinutukoy ang') &&
    !customStatusText.includes('Inihahambing sa') &&
    !customStatusText.includes('Tinatapos ang') &&
    !customStatusText.includes('Preparing') &&
    !customStatusText.includes('Analyzing') &&
    !customStatusText.includes('Reading') &&
    !customStatusText.includes('Verifying') &&
    !customStatusText.includes('Finalizing')
  ) {
    return customStatusText;
  }

  if (flowType === 'mtop') {
    if (pct < 20) return isTagalog ? 'Inihahanda ang larawan...' : 'Preparing document photo...';
    if (pct < 40) return isTagalog ? 'Sinusuri ang MTOP permit...' : 'Analyzing MTOP permit...';
    if (pct < 60) return isTagalog ? 'Binabasa ang impormasyon...' : 'Reading document details...';
    if (pct < 80) return isTagalog ? 'Sinusuri ang mga detalye ng prangkisa...' : 'Verifying franchise details...';
    return isTagalog ? 'Tinatapos ang pag-verify...' : 'Finalizing verification...';
  }

  if (flowType === 'face') {
    if (pct < 20) return isTagalog ? 'Inihahanda ang larawan...' : 'Preparing selfie photo...';
    if (pct < 40) return isTagalog ? 'Sinusuri ang iyong mukha...' : 'Analyzing facial features...';
    if (pct < 60) return isTagalog ? 'Tinutukoy ang mga detalye...' : 'Verifying biometric points...';
    if (pct < 80) return isTagalog ? 'Inihahambing sa lisensya...' : "Matching with driver's license...";
    return isTagalog ? 'Tinatapos ang pag-verify...' : 'Finalizing verification...';
  }

  // Default / Driver's License ('license')
  if (pct < 20) return isTagalog ? 'Inihahanda ang larawan...' : 'Preparing license photo...';
  if (pct < 40) return isTagalog ? 'Sinusuri ang lisensya...' : "Analyzing driver's license...";
  if (pct < 60) return isTagalog ? 'Binabasa ang impormasyon...' : 'Reading license details...';
  if (pct < 80) return isTagalog ? 'Sinusuri ang mga detalye...' : 'Verifying extracted information...';
  return isTagalog ? 'Tinatapos ang pag-verify...' : 'Finalizing verification...';
}

export const DriverProgressLoader: React.FC<DriverProgressLoaderProps> = ({
  progress,
  flowType = 'license',
  statusText,
}) => {
  const { language } = useLanguage();

  // Convert 0.0-1.0 or 0-100 progress into 0-100 float percentage
  const currentPct = progress <= 1 ? progress * 100 : Math.min(100, Math.max(0, progress));
  const roundedPct = Math.round(currentPct);

  // Width of the tricycle image icon in pixels
  const TRICYCLE_WIDTH_PX = 68;

  // Active milestone status text based on flowType, language, and current percentage
  const activeStatus = getFlowProgressMilestoneText(roundedPct, flowType, statusText, language);

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
            height: '76px',
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          {/* Animated Tricycle: right edge (front wheel) aligns with leading progress bar tip */}
          <Box
            sx={{
              position: 'absolute',
              bottom: '6px',
              left: `max(0px, calc(${currentPct}% - ${TRICYCLE_WIDTH_PX}px))`,
              willChange: 'left',
              zIndex: 2,
            }}
          >
            <img
              src={appIcon}
              alt="Loading Tricycle"
              width={TRICYCLE_WIDTH_PX}
              height={TRICYCLE_WIDTH_PX}
              loading="eager"
              decoding="sync"
              style={{
                width: `${TRICYCLE_WIDTH_PX}px`,
                height: `${TRICYCLE_WIDTH_PX}px`,
                objectFit: 'contain',
                display: 'block',
                imageRendering: 'auto',
                WebkitBackfaceVisibility: 'hidden',
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0)',
              }}
            />
          </Box>

          {/* Progress Track (Light Orange Base) */}
          <Box
            sx={{
              width: '100%',
              height: '14px',
              borderRadius: '7px',
              backgroundColor: '#FFC8B3',
              overflow: 'hidden',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {/* Active Progress Fill (Solid Brand Orange) */}
            <Box
              sx={{
                width: `${currentPct}%`,
                height: '100%',
                backgroundColor: '#FF6B00',
                borderRadius: '7px',
                willChange: 'width',
              }}
            />
          </Box>
        </Box>

        {/* Dynamic Telemetry Tagalog Status Text */}
        <Typography
          sx={{
            mt: 4,
            fontSize: '15px',
            fontWeight: 700,
            color: '#FF6B00',
            textAlign: 'center',
            lineHeight: 1.5,
            maxWidth: '320px',
          }}
        >
          {activeStatus}
        </Typography>
      </Box>
    </Box>
  );
};

export default DriverProgressLoader;
