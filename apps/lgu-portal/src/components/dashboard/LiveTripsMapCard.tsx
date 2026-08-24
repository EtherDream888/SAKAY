import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import L from 'leaflet';

interface LiveTripsMapCardProps {
  ongoingTripsCount?: number;
}

export const LiveTripsMapCard: React.FC<LiveTripsMapCardProps> = ({ ongoingTripsCount = 0 }) => {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletInstanceRef.current) return;

    // Center on Calapan City
    const map = L.map(mapRef.current, {
      center: [13.4117, 121.1803],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    // OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Zoom control in bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    leafletInstanceRef.current = map;

    return () => {
      if (leafletInstanceRef.current) {
        leafletInstanceRef.current.remove();
        leafletInstanceRef.current = null;
      }
    };
  }, []);

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
            Live Trips & Fleet Map
          </Typography>
          <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', mt: '3px' }}>
            Real-time transportation operations in Calapan City.
          </Typography>
        </Box>

        <Button
          onClick={() => navigate('/live-trips')}
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
            '&:hover': {
              backgroundColor: 'var(--sakay-orange-soft)',
              color: 'var(--sakay-orange)',
              borderColor: 'var(--sakay-orange-border)',
            },
          }}
        >
          View full map
        </Button>
      </Box>

      {/* Map Surface */}
      <Box
        sx={{
          flex: 1,
          minHeight: 230,
          width: '100%',
          borderRadius: 'var(--mac-radius-md)',
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid var(--mac-border-subtle)',
        }}
      >
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* Floating Active Trip Status Badge */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '5px 14px',
            boxShadow: 'var(--mac-shadow-popover)',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            zIndex: 400,
            border: '1px solid var(--mac-border-color)',
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: ongoingTripsCount > 0 ? '#34A853' : '#9CA3AF',
            }}
          />
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
            {ongoingTripsCount > 0 ? `Active Trips (${ongoingTripsCount})` : 'No Active Trips in Transit'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
