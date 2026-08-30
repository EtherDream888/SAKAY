import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Fade,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlaceIcon from '@mui/icons-material/Place';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface TerminalMapPickerModalProps {
  open: boolean;
  onClose: () => void;
  initialLat?: number | null;
  initialLng?: number | null;
  onConfirmLocation: (location: { lat: number; lng: number; locationName?: string }) => void;
}

const DEFAULT_CALAPAN_LAT = 13.4117;
const DEFAULT_CALAPAN_LNG = 121.1803;

const CALAPAN_QUICK_LANDMARKS = [
  { name: 'Public Market', lat: 13.4117, lng: 121.1803 },
  { name: 'City Hall Plaza', lat: 13.4140, lng: 121.1808 },
  { name: 'Provincial Capitol', lat: 13.4075, lng: 121.1782 },
  { name: 'Lumangbayan Port', lat: 13.4285, lng: 121.1960 },
  { name: 'San Vicente Central', lat: 13.4125, lng: 121.1765 },
];

export const TerminalMapPickerModal: React.FC<TerminalMapPickerModalProps> = ({
  open,
  onClose,
  initialLat,
  initialLng,
  onConfirmLocation,
}) => {
  const [currentLat, setCurrentLat] = useState<number>(initialLat || DEFAULT_CALAPAN_LAT);
  const [currentLng, setCurrentLng] = useState<number>(initialLng || DEFAULT_CALAPAN_LNG);
  const [activeLandmark, setActiveLandmark] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Synchronize coordinates when modal opens
  useEffect(() => {
    if (open) {
      const lat = initialLat || DEFAULT_CALAPAN_LAT;
      const lng = initialLng || DEFAULT_CALAPAN_LNG;
      setCurrentLat(lat);
      setCurrentLng(lng);
    }
  }, [open, initialLat, initialLng]);

  // Position update function
  const updateMapPosition = useCallback((lat: number, lng: number, landmarkName?: string) => {
    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));
    setCurrentLat(roundedLat);
    setCurrentLng(roundedLng);
    if (landmarkName) {
      setActiveLandmark(landmarkName);
    } else {
      setActiveLandmark(null);
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([roundedLat, roundedLng]);
    }
    if (circleRef.current) {
      circleRef.current.setLatLng([roundedLat, roundedLng]);
    }
  }, []);

  // Initialize Map
  const initMap = useCallback(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const startLat = initialLat || DEFAULT_CALAPAN_LAT;
    const startLng = initialLng || DEFAULT_CALAPAN_LNG;

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: 15,
      zoomControl: true,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    // Real OpenStreetMap Tiles (Official standard tiles)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);

    // Custom Styled Orange Marker Pin
    const pinIcon = L.divIcon({
      className: 'custom-terminal-marker',
      html: `
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 50% 50% 50% 0;
          background: #FF6B00;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #FFFFFF;
          box-shadow: 0 4px 14px rgba(255, 107, 0, 0.45);
          cursor: grab;
        ">
          <div style="
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #FFFFFF;
            transform: rotate(45deg);
          "></div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });

    const marker = L.marker([startLat, startLng], {
      icon: pinIcon,
      draggable: true,
    }).addTo(map);
    markerRef.current = marker;

    const circle = L.circle([startLat, startLng], {
      color: '#FF6B00',
      fillColor: '#FF6B00',
      fillOpacity: 0.12,
      weight: 1.5,
      radius: 350,
    }).addTo(map);
    circleRef.current = circle;

    // Marker drag event
    marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      updateMapPosition(pos.lat, pos.lng);
    });

    // Map click event
    map.on('click', (e) => {
      updateMapPosition(e.latlng.lat, e.latlng.lng);
    });

    // Invalidate map size after container settles
    const resizeTimers = [50, 150, 300, 500].map((delay) =>
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, delay)
    );

    return () => {
      resizeTimers.forEach(clearTimeout);
    };
  }, [initialLat, initialLng, updateMapPosition]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        initMap();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, initMap]);

  const handleLandmarkClick = (landmark: { name: string; lat: number; lng: number }) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([landmark.lat, landmark.lng], 16, { duration: 0.8 });
    }
    updateMapPosition(landmark.lat, landmark.lng, landmark.name);
  };

  const handleResetToCenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([DEFAULT_CALAPAN_LAT, DEFAULT_CALAPAN_LNG], 15, { duration: 0.8 });
    }
    updateMapPosition(DEFAULT_CALAPAN_LAT, DEFAULT_CALAPAN_LNG);
  };

  const handleConfirm = () => {
    onConfirmLocation({
      lat: currentLat,
      lng: currentLng,
      locationName: activeLandmark || undefined,
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '16px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
            border: '1px solid var(--mac-border-color)',
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
          },
        },
        transition: {
          onEntered: () => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
            }
          },
        },
      }}
    >
      {/* Modal Header */}
      <Box
        sx={{
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--mac-border-color)',
          backgroundColor: '#FFFFFF',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              backgroundColor: 'var(--sakay-orange-soft)',
              color: 'var(--sakay-orange)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LocationOnIcon fontSize="small" />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '16px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
              Pin Terminal Location on Map
            </Typography>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
              Click anywhere on Calapan City map or drag the orange pin to set the exact terminal coordinates.
            </Typography>
          </Box>
        </Box>

        <IconButton size="small" onClick={onClose} sx={{ color: 'var(--mac-text-muted)' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Quick Landmark Chips Bar */}
      <Box
        sx={{
          px: 3,
          py: 1.25,
          backgroundColor: '#F8FAFC',
          borderBottom: '1px solid var(--mac-border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          overflowX: 'auto',
        }}
      >
        <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748B', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
          Quick Jump:
        </Typography>
        {CALAPAN_QUICK_LANDMARKS.map((lm) => (
          <Chip
            key={lm.name}
            icon={<PlaceIcon sx={{ fontSize: '14px !important' }} />}
            label={lm.name}
            size="small"
            clickable
            onClick={() => handleLandmarkClick(lm)}
            sx={{
              fontSize: '11.5px',
              fontWeight: 600,
              backgroundColor: activeLandmark === lm.name ? 'var(--sakay-orange)' : '#FFFFFF',
              color: activeLandmark === lm.name ? '#FFFFFF' : 'var(--mac-text-primary)',
              border: '1px solid',
              borderColor: activeLandmark === lm.name ? 'var(--sakay-orange)' : '#E2E8F0',
              '&:hover': {
                backgroundColor: activeLandmark === lm.name ? 'var(--sakay-orange)' : 'var(--sakay-orange-soft)',
                borderColor: 'var(--sakay-orange)',
              },
            }}
          />
        ))}
      </Box>

      {/* Real Map Canvas */}
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        <Box
          ref={mapContainerRef}
          sx={{
            width: '100%',
            height: 440,
            backgroundColor: '#E2E8F0',
            borderRadius: 0,
            zIndex: 1,
            '& .leaflet-container': {
              width: '100%',
              height: '100%',
              borderRadius: 0,
              fontFamily: "'Poppins', sans-serif !important",
            },
          }}
        />

        {/* Live Coordinate Badge Overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 14,
            right: 14,
            zIndex: 400,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--mac-border-color)',
            borderRadius: '10px',
            px: 2,
            py: 1,
            boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: '10px', fontWeight: 700, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
              Selected Location
            </Typography>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: 'var(--sakay-orange)', fontFamily: 'monospace' }}>
              {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
            </Typography>
          </Box>
          <Chip
            label="Pinned"
            size="small"
            sx={{
              height: 22,
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: 'var(--sakay-orange-soft)',
              color: 'var(--sakay-orange)',
            }}
          />
        </Box>

        {/* Center Calapan Floating Button */}
        <Button
          size="small"
          variant="contained"
          startIcon={<MyLocationIcon fontSize="small" />}
          onClick={handleResetToCenter}
          sx={{
            position: 'absolute',
            bottom: 14,
            left: 14,
            zIndex: 400,
            backgroundColor: '#FFFFFF',
            color: 'var(--mac-text-primary)',
            border: '1px solid var(--mac-border-color)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            textTransform: 'none',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '8px',
            '&:hover': {
              backgroundColor: 'var(--mac-canvas-bg)',
            },
          }}
        >
          Center Calapan City
        </Button>
      </DialogContent>

      {/* Modal Actions Footer */}
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid var(--mac-border-color)', justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
          Selected coordinates will be automatically populated into the registration form.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              borderColor: 'var(--mac-border-color)',
              color: 'var(--mac-text-primary)',
              fontSize: '13.5px',
              fontWeight: 600,
              px: 2.5,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={handleConfirm}
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              backgroundColor: 'var(--sakay-orange)',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 700,
              px: 3,
              boxShadow: 'var(--mac-shadow-button)',
              '&:hover': {
                backgroundColor: '#E05E00',
              },
            }}
          >
            Confirm Pin Location
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
