import React, { useState } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import RouteIcon from '@mui/icons-material/Route';

interface TrendDataPoint {
  day: string;
  label: string;
  value: number;
  revenue: number;
  formattedVal: string;
  x: number;
  y: number;
}

interface BookingTrendCardProps {
  dataPoints?: TrendDataPoint[];
  totalBookings?: number;
  growthPercentage?: string;
}

export const BookingTrendCard: React.FC<BookingTrendCardProps> = ({
  dataPoints = [],
  totalBookings = 0,
  growthPercentage,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<TrendDataPoint | null>(null);

  const hasData = totalBookings > 0 && dataPoints.length > 0;

  // Generate smooth cubic Bezier curve path string if data exists
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

  const linePath = hasData ? createSmoothPath(dataPoints) : '';
  const areaPath = hasData ? `${linePath} L ${dataPoints[dataPoints.length - 1].x} 200 L ${dataPoints[0].x} 200 Z` : '';

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
        {/* Header Block */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Typography sx={{ fontSize: '18px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                Booking Trend
              </Typography>
              {hasData && growthPercentage && (
                <Box
                  sx={{
                    backgroundColor: 'rgba(52, 168, 83, 0.12)',
                    color: '#1E8E3E',
                    fontWeight: 600,
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: '1px solid rgba(52, 168, 83, 0.25)',
                  }}
                >
                  {growthPercentage}
                </Box>
              )}
            </Box>
            <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', fontWeight: 400 }}>
              Number of completed passenger ride bookings across Calapan City.
            </Typography>
          </Box>
        </Box>

        {hasData ? (
          <>
            {/* SVG Bezier Line Chart */}
            <Box sx={{ width: '100%', height: 260, position: 'relative', mt: 'auto' }}>
              <svg viewBox="0 0 760 240" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="bookingAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--sakay-orange)" stopOpacity="0.28" />
                    <stop offset="60%" stopColor="var(--sakay-orange)" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="var(--sakay-orange)" stopOpacity="0.0" />
                  </linearGradient>

                  <filter id="orangeGlow" x="-10%" y="-20%" width="125%" height="150%">
                    <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="var(--sakay-orange)" floodOpacity="0.38" />
                  </filter>
                </defs>

                <g stroke="#E5E5EA" strokeDasharray="4 4" strokeWidth="1">
                  <line x1="55" y1="35" x2="720" y2="35" />
                  <line x1="55" y1="90" x2="720" y2="90" />
                  <line x1="55" y1="145" x2="720" y2="145" />
                  <line x1="55" y1="200" x2="720" y2="200" />
                </g>

                <path d={areaPath} fill="url(#bookingAreaGrad)" />
                <path d={linePath} fill="none" stroke="var(--sakay-orange)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#orangeGlow)" />

                {dataPoints.map((pt, idx) => (
                  <g
                    key={idx}
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {hoveredPoint?.day === pt.day && (
                      <circle cx={pt.x} cy={pt.y} r="10" fill="var(--sakay-orange-soft)" />
                    )}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredPoint?.day === pt.day ? '6.5' : '5'}
                      fill="#FFFFFF"
                      stroke="var(--sakay-orange)"
                      strokeWidth="3.5"
                      style={{ transition: 'all 0.15s ease' }}
                    />
                  </g>
                ))}

                <g fill="#636366" fontSize="13" fontWeight="500" textAnchor="middle">
                  {dataPoints.map((pt, idx) => (
                    <text key={idx} x={pt.x} y="228">
                      {pt.day}
                    </text>
                  ))}
                </g>
              </svg>

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
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    pointerEvents: 'none',
                    zIndex: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 150,
                  }}
                >
                  <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {hoveredPoint.label}
                  </Typography>
                  <Typography sx={{ fontSize: '16px', fontWeight: 700, color: 'var(--sakay-orange)' }}>
                    {hoveredPoint.value.toLocaleString()} Bookings
                  </Typography>
                </Box>
              )}
            </Box>
          </>
        ) : (
          /* Proper Empty State */
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flexGrow: 1,
              py: 6,
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                backgroundColor: 'var(--sakay-orange-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--sakay-orange)',
              }}
            >
              <RouteIcon fontSize="medium" />
            </Box>
            <Typography sx={{ fontSize: '16px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
              No bookings yet.
            </Typography>
            <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', textAlign: 'center', maxWidth: 360 }}>
              Booking activity will appear here once passengers start booking rides.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
