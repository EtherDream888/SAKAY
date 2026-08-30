import React from 'react';
import { Box, Typography } from '@mui/material';
import appIcon from '../../../../../../packages/shared/src/assets/icons/app-icon.png';

export type FlowType = 'license' | 'mtop' | 'face';

interface DriverProgressLoaderProps {
  progress: number; // 0.0 to 1.0 (or 0 to 100)
  flowType?: FlowType;
  statusText?: string;
}

export function getFlowProgressMilestoneText(
  pct: number,
  flowType: FlowType = 'license',
  customStatusText?: string
): string {
  if (
    customStatusText &&
    !customStatusText.includes('Sandali lang habang') &&
    !customStatusText.includes('Inihahanda ang larawan...') &&
    !customStatusText.includes('Sinusuri ang') &&
    !customStatusText.includes('Binabasa ang') &&
    !customStatusText.includes('Tinutukoy ang') &&
    !customStatusText.includes('Inihahambing sa') &&
    !customStatusText.includes('Tinatapos ang')
  ) {
    return customStatusText;
  }

  if (flowType === 'mtop') {
    if (pct < 20) return 'Inihahanda ang larawan...';
    if (pct < 40) return 'Sinusuri ang MTOP...';
    if (pct < 60) return 'Binabasa ang impormasyon...';
    if (pct < 80) return 'Sinusuri ang mga detalye...';
    return 'Tinatapos ang pag-verify...';
  }

  if (flowType === 'face') {
    if (pct < 20) return 'Inihahanda ang larawan...';
    if (pct < 40) return 'Sinusuri ang iyong mukha...';
    if (pct < 60) return 'Tinutukoy ang mga detalye...';
    if (pct < 80) return 'Inihahambing sa lisensya...';
    return 'Tinatapos ang pag-verify...';
  }

  // Default / Driver's License ('license')
  if (pct < 20) return 'Inihahanda ang larawan...';
  if (pct < 40) return 'Sinusuri ang lisensya...';
  if (pct < 60) return 'Binabasa ang impormasyon...';
  if (pct < 80) return 'Sinusuri ang mga detalye...';
  return 'Tinatapos ang pag-verify...';
}

export const DriverProgressLoader: React.FC<DriverProgressLoaderProps> = ({
  progress,
  flowType = 'license',
  statusText,
}) => {
  // Convert 0.0-1.0 or 0-100 progress into 0-100 float percentage
  const currentPct = progress <= 1 ? progress * 100 : Math.min(100, Math.max(0, progress));
  const roundedPct = Math.round(currentPct);

  // Width of the tricycle image icon in pixels
  const TRICYCLE_WIDTH_PX = 68;

  // Active milestone status text based on flowType and current percentage
  const activeStatus = getFlowProgressMilestoneText(roundedPct, flowType, statusText);

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
