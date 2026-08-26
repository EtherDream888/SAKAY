import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import BadgeIcon from '@mui/icons-material/Badge';

interface SegmentData {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

interface DriverVerificationCardProps {
  data?: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    suspended: number;
  };
}

export const DriverVerificationCard: React.FC<DriverVerificationCardProps> = ({ data }) => {
  const navigate = useNavigate();
  const [hoveredSegment, setHoveredSegment] = useState<SegmentData | null>(null);

  const total = data?.total || 0;
  const approved = data?.approved || 0;
  const pending = data?.pending || 0;
  const rejected = data?.rejected || 0;
  const suspended = data?.suspended || 0;

  const segments: SegmentData[] = [
    {
      label: 'Approved',
      count: approved,
      percentage: total > 0 ? Math.round((approved / total) * 100) : 0,
      color: '#34A853',
    },
    {
      label: 'Pending',
      count: pending,
      percentage: total > 0 ? Math.round((pending / total) * 100) : 0,
      color: '#FBBC04',
    },
    {
      label: 'Rejected',
      count: rejected,
      percentage: total > 0 ? Math.round((rejected / total) * 100) : 0,
      color: '#EA4335',
    },
    {
      label: 'Suspended',
      count: suspended,
      percentage: total > 0 ? Math.round((suspended / total) * 100) : 0,
      color: '#9AA0A6',
    },
  ];

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
      {/* Header Block */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ fontSize: '17px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
              Driver Verification Status
            </Typography>
            <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', mt: '3px' }}>
              Live verification status of registered drivers.
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

      {total > 0 ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, gap: 3, pt: 1 }}>
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
      ) : (
        /* Empty State */
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexGrow: 1,
            py: 5,
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              backgroundColor: 'var(--sakay-orange-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--sakay-orange)',
            }}
          >
            <BadgeIcon fontSize="medium" />
          </Box>
          <Typography sx={{ fontSize: '15px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
            No driver verification requests yet.
          </Typography>
          <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', textAlign: 'center', maxWidth: 320 }}>
            Driver verification activity will appear here once accredited TODAs begin registering drivers.
          </Typography>
        </Box>
      )}
    </Box>
  );
};
