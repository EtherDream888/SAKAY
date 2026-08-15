import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Button, Menu, MenuItem, Chip } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

import { TrendPeriod } from '../../types/admin';

interface TrendDataPoint {
  day: string;
  label: string;
  value: number;
  revenue: number;
  formattedVal: string;
  x: number;
  y: number;
}

export const BookingTrendCard: React.FC = () => {
  const [period, setPeriod] = useState<TrendPeriod>('Weekly');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<TrendDataPoint | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (selectedPeriod?: TrendPeriod) => {
    if (selectedPeriod) {
      setPeriod(selectedPeriod);
    }
    setAnchorEl(null);
  };

  // Weekly data points with coordinates mapped to 760x240 SVG canvas
  const weeklyPoints: TrendDataPoint[] = [
    { day: 'Mon', label: 'Monday', value: 680, revenue: 16320, formattedVal: '680', x: 60, y: 175 },
    { day: 'Tue', label: 'Tuesday', value: 1120, revenue: 26880, formattedVal: '1.1k', x: 168, y: 130 },
    { day: 'Wed', label: 'Wednesday', value: 1640, revenue: 39360, formattedVal: '1.6k', x: 276, y: 65 },
    { day: 'Thu', label: 'Thursday', value: 1040, revenue: 24960, formattedVal: '1.0k', x: 384, y: 138 },
    { day: 'Fri', label: 'Friday', value: 890, revenue: 21360, formattedVal: '890', x: 492, y: 154 },
    { day: 'Sat', label: 'Saturday', value: 1020, revenue: 24480, formattedVal: '1.0k', x: 600, y: 140 },
    { day: 'Sun', label: 'Sunday', value: 1420, revenue: 34080, formattedVal: '1.4k', x: 708, y: 92 },
  ];

  // Generate smooth cubic Bezier curve path string
  const createSmoothPath = (pts: TrendDataPoint[]) => {
    if (pts.length < 2) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const cp1x = curr.x + (next.x - curr.x) / 2;
      const cp1y = curr.y;
      const cp2x = curr.x + (next.x - curr.x) / 2;
      const cp2y = next.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const linePath = createSmoothPath(weeklyPoints);
  const areaPath = `${linePath} L ${weeklyPoints[weeklyPoints.length - 1].x} 200 L ${weeklyPoints[0].x} 200 Z`;

  return (
    <Card
      sx={{
        borderRadius: 'var(--mac-radius-lg)',
        border: '1px solid var(--mac-border-color)',
        boxShadow: 'var(--mac-shadow-card)',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent sx={{ padding: '24px 28px !important', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header & Controls */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Typography sx={{ fontSize: '18px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                Booking Trend
              </Typography>
              <Chip
                icon={<TrendingUpIcon style={{ fontSize: 14, color: '#1E8E3E' }} />}
                label="+14.2% vs last week"
                size="small"
                sx={{
                  backgroundColor: 'rgba(52, 168, 83, 0.12)',
                  color: '#1E8E3E',
                  fontWeight: 600,
                  fontSize: '12px',
                  height: 24,
                  border: '1px solid rgba(52, 168, 83, 0.25)',
                }}
              />
            </Box>
            <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', fontWeight: 400 }}>
              Number of completed passenger ride bookings across Calapan City.
            </Typography>
          </Box>

          <Button
            onClick={handleClick}
            endIcon={<KeyboardArrowDownIcon />}
            sx={{
              height: 38,
              padding: '0 16px',
              borderRadius: '9px',
              border: '1px solid var(--mac-border-color)',
              backgroundColor: '#FFFFFF',
              color: 'var(--mac-text-primary)',
              fontSize: '13.5px',
              fontWeight: 500,
              textTransform: 'none',
              boxShadow: 'var(--mac-shadow-subtle)',
              '&:hover': {
                backgroundColor: 'var(--sakay-orange-soft)',
                borderColor: 'var(--sakay-orange-border)',
                color: 'var(--sakay-orange)',
              },
            }}
          >
            {period}
          </Button>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => handleClose()}
            slotProps={{
              paper: {
                sx: {
                  borderRadius: '10px',
                  boxShadow: 'var(--mac-shadow-popover)',
                  mt: 0.5,
                  minWidth: 130,
                },
              },
            }}
          >
            <MenuItem onClick={() => handleClose('Weekly')} selected={period === 'Weekly'}>
              Weekly
            </MenuItem>
            <MenuItem onClick={() => handleClose('Monthly')} selected={period === 'Monthly'}>
              Monthly
            </MenuItem>
            <MenuItem onClick={() => handleClose('Daily')} selected={period === 'Daily'}>
              Daily
            </MenuItem>
          </Menu>
        </Box>

        {/* Centered Metric Summary Cards Container */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 2,
            width: '100%',
            maxWidth: 680,
            margin: '0 auto 24px auto',
          }}
        >
          {/* Card 1: Total Weekly Bookings */}
          <Box
            sx={{
              backgroundColor: '#FAFAFC',
              borderRadius: '12px',
              border: '1px solid var(--mac-border-color)',
              padding: '14px 18px',
              textAlign: 'center',
              boxShadow: 'var(--mac-shadow-subtle)',
              transition: 'var(--mac-transition-fast)',
              '&:hover': {
                backgroundColor: '#FFFFFF',
                borderColor: 'rgba(255, 85, 0, 0.3)',
                boxShadow: 'var(--mac-shadow-card)',
              },
            }}
          >
            <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', mb: '4px' }}>
              Total Weekly Bookings
            </Typography>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: 'var(--mac-text-primary)', lineHeight: 1.1 }}>
              7,810
            </Typography>
          </Box>

          {/* Card 2: Peak Volume (Wed) */}
          <Box
            sx={{
              backgroundColor: '#FFF7ED',
              borderRadius: '12px',
              border: '1px solid #FDBA74',
              padding: '14px 18px',
              textAlign: 'center',
              boxShadow: 'var(--mac-shadow-subtle)',
              transition: 'var(--mac-transition-fast)',
              '&:hover': {
                backgroundColor: '#FFEDD5',
                boxShadow: 'var(--mac-shadow-card)',
              },
            }}
          >
            <Typography sx={{ fontSize: '11.5px', color: '#C2410C', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', mb: '4px' }}>
              Peak Volume (Wed)
            </Typography>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: '#EA580C', lineHeight: 1.1 }}>
              1,640
            </Typography>
          </Box>

          {/* Card 3: Est. Fare Volume */}
          <Box
            sx={{
              backgroundColor: '#FAFAFC',
              borderRadius: '12px',
              border: '1px solid var(--mac-border-color)',
              padding: '14px 18px',
              textAlign: 'center',
              boxShadow: 'var(--mac-shadow-subtle)',
              transition: 'var(--mac-transition-fast)',
              '&:hover': {
                backgroundColor: '#FFFFFF',
                borderColor: 'rgba(255, 85, 0, 0.3)',
                boxShadow: 'var(--mac-shadow-card)',
              },
            }}
          >
            <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', mb: '4px' }}>
              Est. Fare Volume
            </Typography>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: 'var(--mac-text-primary)', lineHeight: 1.1 }}>
              ₱187.4k
            </Typography>
          </Box>
        </Box>

        {/* Spacious SVG Bezier Line Chart */}
        <Box sx={{ width: '100%', height: 260, position: 'relative', mt: 'auto' }}>
          <svg viewBox="0 0 760 240" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              {/* Orange Area Gradient */}
              <linearGradient id="bookingAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF5500" stopOpacity="0.28" />
                <stop offset="60%" stopColor="#FF5500" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#FF5500" stopOpacity="0.0" />
              </linearGradient>

              {/* Orange Drop Glow Filter */}
              <filter id="orangeGlow" x="-10%" y="-20%" width="125%" height="150%">
                <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#FF5500" floodOpacity="0.38" />
              </filter>
            </defs>

            {/* Y-Axis Horizontal Grid Lines & Labels with Generous Left Margin (55px) */}
            <g stroke="#E5E5EA" strokeDasharray="4 4" strokeWidth="1">
              <line x1="55" y1="35" x2="720" y2="35" />
              <line x1="55" y1="90" x2="720" y2="90" />
              <line x1="55" y1="145" x2="720" y2="145" />
              <line x1="55" y1="200" x2="720" y2="200" />
            </g>

            {/* Y-Axis Text Labels */}
            <g fill="#8E8E93" fontSize="12.5" fontWeight="500" textAnchor="end">
              <text x="42" y="39">2.0k</text>
              <text x="42" y="94">1.4k</text>
              <text x="42" y="149">800</text>
              <text x="42" y="204">0</text>
            </g>

            {/* Area Gradient Fill */}
            <path d={areaPath} fill="url(#bookingAreaGrad)" />

            {/* Smooth Bezier Spline Line Path with Glow Filter */}
            <path
              d={linePath}
              fill="none"
              stroke="#FF5500"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#orangeGlow)"
            />

            {/* Data Node Circles & Interactive Hover Hits */}
            {weeklyPoints.map((pt, idx) => (
              <g
                key={idx}
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Outer Glow Ring on Hover */}
                {hoveredPoint?.day === pt.day && (
                  <circle cx={pt.x} cy={pt.y} r="10" fill="rgba(255, 85, 0, 0.22)" />
                )}

                {/* Outer Node Border Circle */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredPoint?.day === pt.day ? "6.5" : "5"}
                  fill="#FFFFFF"
                  stroke="#FF5500"
                  strokeWidth="3.5"
                  style={{ transition: 'all 0.15s ease' }}
                />
              </g>
            ))}

            {/* X-Axis Day Labels with Generous Bottom Margin */}
            <g fill="#636366" fontSize="13" fontWeight="500" textAnchor="middle">
              {weeklyPoints.map((pt, idx) => (
                <text key={idx} x={pt.x} y="228">
                  {pt.day}
                </text>
              ))}
            </g>
          </svg>

          {/* Floating White macOS Interactive Tooltip */}
          {hoveredPoint && (
            <Box
              sx={{
                position: 'absolute',
                left: `calc(${(hoveredPoint.x / 760) * 100}% - 75px)`,
                top: `calc(${(hoveredPoint.y / 240) * 100}% - 85px)`,
                backgroundColor: '#FFFFFF',
                color: 'var(--mac-text-primary)',
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid var(--mac-border-color)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                pointerEvents: 'none',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: 150,
                transform: 'translateY(-10px)',
                transition: 'all 0.15s ease-out',
              }}
            >
              <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', mb: '2px' }}>
                {hoveredPoint.label}
              </Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 700, color: 'var(--sakay-orange)', lineHeight: 1.2 }}>
                {hoveredPoint.value.toLocaleString()} Bookings
              </Typography>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-secondary)', mt: '3px', fontWeight: 500 }}>
                Est. Fare: ₱{hoveredPoint.revenue.toLocaleString()}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
