import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { DRIVER_VERIFICATION_DATA } from '../../mockData/dashboardData';

interface SegmentData {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export const DriverVerificationCard: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredSegment, setHoveredSegment] = useState<SegmentData | null>(null);

  const total = DRIVER_VERIFICATION_DATA.totalDrivers;

  const segments: SegmentData[] = [
    { label: 'Approved', count: DRIVER_VERIFICATION_DATA.approvedCount, percentage: 69, color: '#34A853' },
    { label: 'Pending', count: DRIVER_VERIFICATION_DATA.pendingCount, percentage: 19, color: '#FBBC04' },
    { label: 'Rejected', count: DRIVER_VERIFICATION_DATA.rejectedCount, percentage: 7, color: '#EA4335' },
    { label: 'Suspended', count: DRIVER_VERIFICATION_DATA.suspendedCount, percentage: 5, color: '#9AA0A6' },
  ];

  // SVG Donut calculation with generous container bounds to guarantee zero hover clipping
  const size = 150;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;

  return (
    <Box
      sx={{
        backgroundColor: 'var(--mac-card-bg)',
        borderRadius: 'var(--mac-radius-lg)',
        border: '1px solid var(--mac-border-color)',
        boxShadow: 'var(--mac-shadow-card)',
        padding: '26px 28px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header & Subtitle Block */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ fontSize: '17px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
              Driver Verification Status
            </Typography>
            <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', mt: '3px' }}>
              Current verification status of registered drivers.
            </Typography>
          </Box>

          <Button
            onClick={() => navigate('/drivers')}
            size="small"
            sx={{
              height: 38,
              padding: '0 18px',
              borderRadius: '9px',
              backgroundColor: '#FFFFFF',
              color: 'var(--mac-text-primary)',
              fontSize: '14px',
              fontWeight: 500,
              textTransform: 'none',
              border: '1px solid var(--mac-border-color)',
              boxShadow: 'var(--mac-shadow-subtle)',
              transition: 'var(--mac-transition-fast)',
              flexShrink: 0,
              '&:hover': {
                backgroundColor: 'var(--sakay-orange-soft)',
                color: 'var(--sakay-orange)',
                borderColor: 'var(--sakay-orange-border)',
              },
            }}
          >
            View all
          </Button>
        </Box>
      </Box>

      {/* Horizontal Layout: Donut on Left, Interactive Legend Stack on Right */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, gap: 3, pt: 1 }}>
        {/* Left: Donut Chart Surface */}
        <Box
          sx={{
            position: 'relative',
            width: 165,
            height: 165,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
            {segments.map((seg, idx) => {
              const strokeDasharray = `${(seg.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -cumulativeOffset;
              cumulativeOffset += (seg.percentage / 100) * circumference;

              const isHovered = hoveredSegment?.label === seg.label;

              return (
                <circle
                  key={idx}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={isHovered ? strokeWidth + 5 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    cursor: 'pointer',
                    opacity: hoveredSegment && !isHovered ? 0.45 : 1,
                  }}
                  onMouseEnter={() => setHoveredSegment(seg)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              );
            })}
          </svg>

          {/* Center Metric Display */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <Typography
              sx={{
                fontSize: '26px',
                fontWeight: 700,
                color: hoveredSegment ? hoveredSegment.color : 'var(--mac-text-primary)',
                lineHeight: 1,
                transition: 'var(--mac-transition-fast)',
              }}
            >
              {hoveredSegment ? hoveredSegment.count : total}
            </Typography>
            <Typography sx={{ fontSize: '11px', color: 'var(--mac-text-muted)', fontWeight: 500, mt: '3px' }}>
              {hoveredSegment ? hoveredSegment.label : 'Total Drivers'}
            </Typography>
          </Box>
        </Box>

        {/* Right: Interactive Legend Vertical Stack */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {segments.map((seg) => {
            const isHovered = hoveredSegment?.label === seg.label;

            return (
              <Box
                key={seg.label}
                onMouseEnter={() => setHoveredSegment(seg)}
                onMouseLeave={() => setHoveredSegment(null)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: isHovered ? 'var(--mac-canvas-bg)' : 'transparent',
                  border: isHovered ? '1px solid var(--mac-border-color)' : '1px solid transparent',
                  transition: 'var(--mac-transition-fast)',
                  transform: isHovered ? 'translateX(3px)' : 'none',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <Box
                    sx={{
                      width: isHovered ? 11 : 9,
                      height: isHovered ? 11 : 9,
                      borderRadius: '50%',
                      backgroundColor: seg.color,
                      flexShrink: 0,
                      transition: 'var(--mac-transition-fast)',
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: '13.5px',
                      color: isHovered ? 'var(--mac-text-primary)' : 'var(--mac-text-secondary)',
                      fontWeight: isHovered ? 600 : 500,
                    }}
                  >
                    {seg.label}
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontSize: '13.5px',
                    fontWeight: isHovered ? 700 : 600,
                    color: isHovered ? seg.color : 'var(--mac-text-primary)',
                  }}
                >
                  {seg.count}{' '}
                  <span style={{ color: 'var(--mac-text-muted)', fontWeight: 400 }}>({seg.percentage}%)</span>
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};
