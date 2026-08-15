import React, { useState } from 'react';
import { Box, Typography, Select, MenuItem, FormControl } from '@mui/material';
import { TrendPeriod, BookingTrendPoint } from '../../types/admin';
import {
  BOOKING_TREND_DAILY,
  BOOKING_TREND_WEEKLY,
  BOOKING_TREND_MONTHLY,
} from '../../mockData/dashboardData';

export const BookingTrendCard: React.FC = () => {
  const [period, setPeriod] = useState<TrendPeriod>('Weekly');
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    point: BookingTrendPoint;
  } | null>(null);

  const getData = (): BookingTrendPoint[] => {
    switch (period) {
      case 'Daily':
        return BOOKING_TREND_DAILY;
      case 'Weekly':
        return BOOKING_TREND_WEEKLY;
      case 'Monthly':
        return BOOKING_TREND_MONTHLY;
      default:
        return BOOKING_TREND_WEEKLY;
    }
  };

  const data = getData();
  const maxValue = Math.max(...data.map((d) => d.value)) * 1.25;

  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = 220;
  const paddingX = 42;
  const paddingY = 25;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  // Calculate coordinates
  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * chartWidth;
    const y = svgHeight - paddingY - (d.value / maxValue) * chartHeight;
    return { x, y, point: d };
  });

  // Construct SVG path for line
  const linePath = points.reduce((acc, curr, index) => {
    return index === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  // Closed path for area fill under line
  const fillPath = `${linePath} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`;

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
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header & Subtitle Block */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontSize: '17px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
            Booking Trend
          </Typography>
          <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', mt: '3px' }}>
            Number of passenger bookings over time.
          </Typography>
        </Box>

        {/* Polished macOS Dropdown with SAKAY Orange Hover & NO BLACK OUTLINE */}
        <FormControl size="small">
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value as TrendPeriod)}
            sx={{
              height: 38,
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: '9px',
              padding: '0 4px',
              backgroundColor: '#FFFFFF',
              color: 'var(--mac-text-primary)',
              transition: 'var(--mac-transition-fast)',
              fieldset: { borderColor: 'var(--mac-border-color)' },
              '&:hover': {
                backgroundColor: 'var(--sakay-orange-soft)',
                color: 'var(--sakay-orange)',
                '& fieldset': { borderColor: 'var(--sakay-orange-border)' },
              },
              '&.Mui-focused': {
                backgroundColor: 'var(--sakay-orange-soft)',
                color: 'var(--sakay-orange)',
                '& fieldset': { borderColor: 'var(--sakay-orange)' },
              },
              '& .MuiSelect-icon': {
                transition: 'color 0.15s ease',
              },
              '&:hover .MuiSelect-icon': {
                color: 'var(--sakay-orange)',
              },
            }}
            MenuProps={{
              slotProps: {
                paper: {
                  className: 'mac-glass-popover',
                  sx: {
                    borderRadius: '10px',
                    mt: 0.5,
                    '& .MuiMenuItem-root': {
                      fontSize: '13.5px',
                      fontWeight: 500,
                      padding: '8px 16px',
                      '&:hover': {
                        backgroundColor: 'var(--sakay-orange-soft)',
                        color: 'var(--sakay-orange)',
                      },
                      '&.Mui-selected': {
                        backgroundColor: 'var(--sakay-orange-soft)',
                        color: 'var(--sakay-orange)',
                        fontWeight: 600,
                      },
                    },
                  },
                },
              },
            }}
          >
            <MenuItem value="Daily">Daily</MenuItem>
            <MenuItem value="Weekly">Weekly</MenuItem>
            <MenuItem value="Monthly">Monthly</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* SVG Chart Surface */}
      <Box
        sx={{
          flex: 1,
          width: '100%',
          position: 'relative',
          minHeight: 200,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF5500" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#FF5500" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.33, 0.66, 1].map((ratio, idx) => {
            const y = paddingY + ratio * chartHeight;
            const val = Math.round((1 - ratio) * maxValue);
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="#F0F0F2"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 8}
                  y={y + 4}
                  fill="#8E8E93"
                  fontSize="10.5"
                  textAnchor="end"
                  fontFamily="var(--mac-font-family)"
                >
                  {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                </text>
              </g>
            );
          })}

          {/* Gradient Fill */}
          <path d={fillPath} fill="url(#orangeGradient)" />

          {/* Main Orange Trend Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#FF5500"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Point Markers */}
          {points.map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredPoint?.point.label === pt.point.label ? 6 : 4}
                fill="#FFFFFF"
                stroke="#FF5500"
                strokeWidth="2.5"
                style={{ transition: 'all 0.15s ease', cursor: 'pointer' }}
              />
              {/* X Axis Labels */}
              <text
                x={pt.x}
                y={svgHeight - 6}
                fill="#8E8E93"
                fontSize={period === 'Monthly' ? '10' : '11.5'}
                fontWeight="500"
                textAnchor="middle"
                fontFamily="var(--mac-font-family)"
              >
                {pt.point.label}
              </text>
              {/* Hit target circle */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="14"
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            </g>
          ))}
        </svg>

        {/* Boundary-aware Tooltip */}
        {hoveredPoint && (
          <Box
            sx={{
              position: 'absolute',
              left: `${(hoveredPoint.x / svgWidth) * 100}%`,
              top: `${(hoveredPoint.y / svgHeight) * 100}%`,
              transform:
                hoveredPoint.x > svgWidth - 100
                  ? 'translate(-95%, -120%)'
                  : hoveredPoint.x < 100
                  ? 'translate(-5%, -120%)'
                  : 'translate(-50%, -120%)',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--mac-border-color)',
              boxShadow: 'var(--mac-shadow-popover)',
              borderRadius: '8px',
              padding: '8px 12px',
              zIndex: 500,
              pointerEvents: 'none',
              minWidth: 110,
              animation: 'fadeIn 0.1s ease',
            }}
          >
            <Typography sx={{ fontSize: '11.5px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: '2px' }}>
              {hoveredPoint.point.label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: 'var(--sakay-orange)' }} />
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                {hoveredPoint.point.value.toLocaleString()} bookings
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};
