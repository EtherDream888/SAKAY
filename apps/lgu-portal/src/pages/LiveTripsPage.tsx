import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import NavigationIcon from '@mui/icons-material/Navigation';
import PersonIcon from '@mui/icons-material/Person';
import RouteIcon from '@mui/icons-material/Route';
import RefreshIcon from '@mui/icons-material/Refresh';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import CenterFocusWeakIcon from '@mui/icons-material/CenterFocusWeak';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import FilterListIcon from '@mui/icons-material/FilterList';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { MOCK_ACTIVE_TRIPS, MOCK_ONLINE_DRIVERS, ActiveTripRecord, OnlineDriverRecord } from '../mockData/adminData';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { TripDetailModal } from '../components/admin/TripDetailModal';

export const LiveTripsPage: React.FC = () => {
  const [activeTrips] = useState<ActiveTripRecord[]>(MOCK_ACTIVE_TRIPS);
  const [onlineDrivers] = useState<OnlineDriverRecord[]>(MOCK_ONLINE_DRIVERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [todaFilter, setTodaFilter] = useState('All');
  const [zoneFilter, setZoneFilter] = useState('All');
  const [lastUpdated, setLastUpdated] = useState('5 seconds ago');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [focusedTripId, setFocusedTripId] = useState<string>('All');

  // Selected Trip for Centered Modal
  const [selectedTrip, setSelectedTrip] = useState<ActiveTripRecord | null>(null);

  // Leaflet Map Reference & Container Ref
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Filter Active Trips
  const filteredTrips = activeTrips.filter((t) => {
    const matchesSearch =
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.bookingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.passengerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchesToda = todaFilter === 'All' || t.todaName === todaFilter;
    const matchesZone = zoneFilter === 'All' || t.currentArea.includes(zoneFilter) || t.pickupArea.includes(zoneFilter);
    const matchesFocus = focusedTripId === 'All' || t.id === focusedTripId;

    return matchesSearch && matchesStatus && matchesToda && matchesZone && matchesFocus;
  });

  const statusOptions: FilterOption[] = [
    { label: 'All Active Statuses', value: 'All' },
    { label: 'Heading to Passenger', value: 'Heading to Passenger' },
    { label: 'Trip Ongoing', value: 'Trip Ongoing' },
  ];

  const todaOptions: FilterOption[] = [
    { label: 'All TODAs', value: 'All' },
    { label: 'Calapan Central TODA', value: 'Calapan Central TODA' },
    { label: 'Ibaba TODA Express', value: 'Ibaba TODA Express' },
    { label: 'Suqui Beach TODA', value: 'Suqui Beach TODA' },
  ];

  const zoneOptions: FilterOption[] = [
    { label: 'All Service Zones', value: 'All' },
    { label: 'Poblacion', value: 'Poblacion' },
    { label: 'Lumangbayan', value: 'Lumangbayan' },
    { label: 'Ibaba', value: 'Ibaba' },
    { label: 'Suqui', value: 'Suqui' },
  ];

  // Listen for Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Invalidate map size whenever fullscreen state changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 250);
    }
  }, [isFullscreen]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [13.4117, 121.1803],
        zoom: 14,
        zoomControl: false,
      });

      // Add Zoom Control at top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // CartoDB Positron clean map tiles for Apple-style high resolution rendering
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers/polylines
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    // Render filtered active trip markers & route lines
    filteredTrips.forEach((trip) => {
      const isOngoing = trip.status === 'Trip Ongoing';
      const isFocused = focusedTripId === trip.id;
      const markerBg = isOngoing ? '#1565C0' : '#FF5500';
      const markerGlow = isOngoing ? 'rgba(21, 101, 192, 0.4)' : 'rgba(255, 85, 0, 0.4)';

      // Custom Apple-styled divIcon with pulse animation ring
      const customIcon = L.divIcon({
        className: 'custom-live-trip-marker',
        html: `
          <div style="position: relative; width: ${isFocused ? 54 : 44}px; height: ${isFocused ? 54 : 44}px; display: flex; align-items: center; justify-content: center;">
            <div style="
              position: absolute;
              width: ${isFocused ? 54 : 44}px;
              height: ${isFocused ? 54 : 44}px;
              border-radius: 50%;
              background: ${markerGlow};
              animation: pulseRing 2s infinite ease-out;
            "></div>
            <div style="
              position: relative;
              width: ${isFocused ? 42 : 34}px;
              height: ${isFocused ? 42 : 34}px;
              border-radius: 50%;
              background: linear-gradient(135deg, ${markerBg} 0%, ${isOngoing ? '#0D47A1' : '#E64A19'} 100%);
              color: #FFFFFF;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: ${isFocused ? 20 : 16}px;
              box-shadow: 0 6px 16px ${markerGlow};
              border: 3px solid #FFFFFF;
              cursor: pointer;
            ">🛺</div>
          </div>
        `,
        iconSize: [isFocused ? 54 : 44, isFocused ? 54 : 44],
        iconAnchor: [isFocused ? 27 : 22, isFocused ? 27 : 22],
      });

      const marker = L.marker([trip.driverLat, trip.driverLng], { icon: customIcon }).addTo(map);

      marker.bindTooltip(
        `<div style="font-family: system-ui, sans-serif; padding: 4px 6px;">
          <div style="font-weight: 700; font-size: 13.5px; color: #111827;">${trip.id}</div>
          <div style="font-size: 12px; color: #4B5563; margin-top: 2px;">Driver: <b>${trip.driverName}</b></div>
          <div style="font-size: 12px; color: ${markerBg}; font-weight: 600; margin-top: 2px;">${trip.status} • ETA: ${trip.eta}</div>
        </div>`,
        { direction: 'top', className: 'apple-map-tooltip' }
      );

      marker.on('click', () => {
        setSelectedTrip(trip);
      });

      // Route Polyline connecting Pickup -> Driver -> Destination
      const routePoints: [number, number][] = [
        [trip.startLat, trip.startLng],
        [trip.driverLat, trip.driverLng],
        [trip.destLat, trip.destLng],
      ];

      L.polyline(routePoints, {
        color: markerBg,
        weight: isFocused ? 6 : 4,
        dashArray: isOngoing ? undefined : '8, 8',
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Pickup Marker Dot
      const pickupIcon = L.divIcon({
        className: 'pickup-dot-icon',
        html: `<div style="width: 14px; height: 14px; border-radius: 50%; background: #34A853; border: 2.5px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([trip.startLat, trip.startLng], { icon: pickupIcon }).addTo(map);

      // Destination Marker Dot
      const destIcon = L.divIcon({
        className: 'dest-dot-icon',
        html: `<div style="width: 16px; height: 16px; border-radius: 50%; background: #EA4335; border: 2.5px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([trip.destLat, trip.destLng], { icon: destIcon }).addTo(map);
    });

    // If focusing on a specific trip, zoom to it
    if (focusedTripId !== 'All') {
      const focusedTrip = activeTrips.find((t) => t.id === focusedTripId);
      if (focusedTrip) {
        map.setView([focusedTrip.driverLat, focusedTrip.driverLng], 16, { animate: true });
      }
    }
  }, [filteredTrips, focusedTripId, activeTrips]);

  // Fit bounds when requested
  const handleFitBounds = () => {
    setFocusedTripId('All');
    if (!mapInstanceRef.current || activeTrips.length === 0) return;
    const bounds = L.latLngBounds(
      activeTrips.map((t) => [t.driverLat, t.driverLng] as [number, number])
    );
    mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60] });
  };

  // Center Calapan City
  const handleCenterCalapan = () => {
    setFocusedTripId('All');
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([13.4117, 121.1803], 14, { animate: true });
  };

  // Toggle legend filter
  const handleToggleLegendFilter = (status: string) => {
    if (statusFilter === status) {
      setStatusFilter('All');
    } else {
      setStatusFilter(status);
    }
  };

  const handleRefresh = () => {
    setLastUpdated('Just now');
    setTimeout(() => setLastUpdated('5 seconds ago'), 5000);
  };

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* Dynamic Keyframe Style Injection for Marker Pulse & Strict Non-Curved Leaflet Corners */}
      <style>{`
        @keyframes pulseRing {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .apple-map-tooltip {
          background: rgba(255, 255, 255, 0.96) !important;
          backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(0, 0, 0, 0.08) !important;
          border-radius: 10px !important;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12) !important;
        }
        /* Ensure Leaflet controls do NOT bleed over map header */
        .leaflet-top, .leaflet-bottom {
          z-index: 900 !important;
        }
        /* STRICT ZERO BORDER RADIUS FOR LEAFLET CONTAINER & CANVAS */
        .leaflet-container {
          border-radius: 0 !important;
        }
      `}</style>

      {/* Top Header & Refresh Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#34A853', boxShadow: '0 0 10px #34A853' }} />
          <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-secondary)', fontWeight: 600 }}>
            Live GPS Telemetry Active • Calapan City Municipal Network
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
            Updated: {lastUpdated}
          </Typography>
          <IconButton size="small" onClick={handleRefresh} sx={{ color: 'var(--sakay-orange)' }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* 1. Surface-Level KPI Summary Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 4,
        }}
      >
        {/* Active Trips */}
        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Active Trips
              </Typography>
              <NavigationIcon sx={{ color: 'var(--sakay-orange)', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              38
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
              Currently ongoing across city
            </Typography>
          </CardContent>
        </Card>

        {/* Heading to Passenger */}
        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Heading to Passenger
              </Typography>
              <RouteIcon sx={{ color: 'var(--sakay-orange)', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              14
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
              En route to pickup location
            </Typography>
          </CardContent>
        </Card>

        {/* Trips Ongoing */}
        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Trips Ongoing
              </Typography>
              <NavigationIcon sx={{ color: 'var(--sakay-orange)', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              24
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
              Passenger onboard in transit
            </Typography>
          </CardContent>
        </Card>

        {/* Online Drivers */}
        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Online Drivers
              </Typography>
              <DirectionsCarIcon sx={{ color: 'var(--sakay-orange)', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              168
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
              Active sessions in service zones
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 2. Filter Toolbar */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search trip ID, driver name, passenger name, or plate..."
        selectFilters={[
          {
            id: 'status',
            label: 'Trip Status',
            value: statusFilter,
            options: statusOptions,
            onChange: setStatusFilter,
          },
          {
            id: 'toda',
            label: 'Accredited TODA',
            value: todaFilter,
            options: todaOptions,
            onChange: setTodaFilter,
          },
          {
            id: 'zone',
            label: 'Service Zone',
            value: zoneFilter,
            options: zoneOptions,
            onChange: setZoneFilter,
          },
        ]}
        onResetFilters={() => {
          setSearchQuery('');
          setStatusFilter('All');
          setTodaFilter('All');
          setZoneFilter('All');
          setFocusedTripId('All');
        }}
      />

      {/* 3. High-Impact Expanded OpenStreetMap Live Map Container (Strict Zero Top Radius & Flush Map Canvas) */}
      <Box
        ref={mapWrapperRef}
        sx={{
          mb: 4,
          borderRadius: 0, // Strict zero radius for outer container top & bottom when windowed
          borderTopLeftRadius: '0 !important',
          borderTopRightRadius: '0 !important',
          borderBottomLeftRadius: isFullscreen ? 0 : 'var(--mac-radius-lg)',
          borderBottomRightRadius: isFullscreen ? 0 : 'var(--mac-radius-lg)',
          border: isFullscreen ? 'none' : '1px solid var(--mac-border-color)',
          boxShadow: isFullscreen ? 'none' : 'var(--mac-shadow-card)',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          position: isFullscreen ? 'fixed' : 'relative',
          top: isFullscreen ? 0 : 'auto',
          left: isFullscreen ? 0 : 'auto',
          right: isFullscreen ? 0 : 'auto',
          bottom: isFullscreen ? 0 : 'auto',
          width: isFullscreen ? '100vw' : '100%',
          height: isFullscreen ? '100vh' : 'auto',
          zIndex: isFullscreen ? 99999 : 1,
          display: isFullscreen ? 'flex' : 'block',
          flexDirection: isFullscreen ? 'column' : 'initial',
          transition: 'all 0.25s ease-out',
        }}
      >
        {/* Map Control Header Bar (Strict Zero Radius on Top Left & Top Right) */}
        <Box
          sx={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--mac-border-color)',
            borderTopLeftRadius: '0 !important',
            borderTopRightRadius: '0 !important',
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFAFC',
            position: 'relative',
            zIndex: 1000,
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ fontSize: '16px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
              Calapan City Live Operations & Telemetry Map
            </Typography>
            <Chip
              label={`${filteredTrips.length} Active Dispatches`}
              size="small"
              sx={{ backgroundColor: 'rgba(255, 107, 26, 0.12)', color: 'var(--sakay-orange)', fontWeight: 700, fontSize: '12px', height: 24 }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Interactive Pressable Legend Chips */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <Chip
                clickable
                onClick={() => handleToggleLegendFilter('All')}
                label="All Trips (38)"
                size="small"
                sx={{
                  fontWeight: 600,
                  fontSize: '12px',
                  backgroundColor: statusFilter === 'All' ? 'var(--sakay-orange)' : '#FFFFFF',
                  color: statusFilter === 'All' ? '#FFFFFF' : 'var(--mac-text-secondary)',
                  border: '1px solid var(--mac-border-color)',
                  height: 28,
                }}
              />
              <Chip
                clickable
                onClick={() => handleToggleLegendFilter('Heading to Passenger')}
                label="● Heading to Passenger (14)"
                size="small"
                sx={{
                  fontWeight: 600,
                  fontSize: '12px',
                  backgroundColor: statusFilter === 'Heading to Passenger' ? '#FF5500' : '#FFFFFF',
                  color: statusFilter === 'Heading to Passenger' ? '#FFFFFF' : '#FF5500',
                  border: '1px solid rgba(255, 85, 0, 0.4)',
                  height: 28,
                }}
              />
              <Chip
                clickable
                onClick={() => handleToggleLegendFilter('Trip Ongoing')}
                label="● Trip Ongoing (24)"
                size="small"
                sx={{
                  fontWeight: 600,
                  fontSize: '12px',
                  backgroundColor: statusFilter === 'Trip Ongoing' ? '#1565C0' : '#FFFFFF',
                  color: statusFilter === 'Trip Ongoing' ? '#FFFFFF' : '#1565C0',
                  border: '1px solid rgba(21, 101, 192, 0.4)',
                  height: 28,
                }}
              />
            </Box>

            {/* Trip Focus Dropdown Selector */}
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <Select
                value={focusedTripId}
                onChange={(e) => setFocusedTripId(e.target.value)}
                displayEmpty
                sx={{
                  height: 32,
                  fontSize: '12.5px',
                  fontWeight: 600,
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--mac-border-color)' },
                }}
              >
                <MenuItem value="All" sx={{ fontSize: '12.5px' }}>
                  🎯 Show All Active Trips
                </MenuItem>
                {activeTrips.map((t) => (
                  <MenuItem key={t.id} value={t.id} sx={{ fontSize: '12.5px' }}>
                    Focus: {t.id} ({t.driverName.split(' ')[0]})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Quick Action Map Controls */}
            <Tooltip title="Fit All Active Trips">
              <IconButton size="small" onClick={handleFitBounds} sx={{ backgroundColor: '#FFFFFF', border: '1px solid var(--mac-border-color)', borderRadius: '8px' }}>
                <CenterFocusWeakIcon fontSize="small" sx={{ color: 'var(--mac-text-primary)' }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Center Calapan City">
              <IconButton size="small" onClick={handleCenterCalapan} sx={{ backgroundColor: '#FFFFFF', border: '1px solid var(--mac-border-color)', borderRadius: '8px' }}>
                <MyLocationIcon fontSize="small" sx={{ color: 'var(--mac-text-primary)' }} />
              </IconButton>
            </Tooltip>

            {/* Full Screen Toggle Button */}
            <Tooltip title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Expand Full Screen'}>
              <Button
                size="small"
                onClick={() => setIsFullscreen(!isFullscreen)}
                startIcon={isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                sx={{
                  backgroundColor: 'var(--sakay-orange)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '13px',
                  borderRadius: '8px',
                  textTransform: 'none',
                  px: 1.8,
                  height: 32,
                  '&:hover': { backgroundColor: 'var(--sakay-orange-hover)' },
                }}
              >
                {isFullscreen ? 'Exit Full Screen (Esc)' : 'Full Screen'}
              </Button>
            </Tooltip>
          </Box>
        </Box>

        {/* Map Viewport Area (Strict Zero Top Radius & Flush Map Canvas) */}
        <Box
          ref={mapContainerRef}
          sx={{
            width: '100%',
            height: isFullscreen ? 'calc(100vh - 65px)' : 580,
            position: 'relative',
            zIndex: 1,
            borderRadius: 0,
            borderTopLeftRadius: '0 !important',
            borderTopRightRadius: '0 !important',
          }}
        />
      </Box>

      {/* 4. Active Trips Table */}
      <Box sx={{ mb: 5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography sx={{ fontSize: '18px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
            Active Trips Telemetry Roster ({filteredTrips.length})
          </Typography>
          <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>
            Showing {filteredTrips.length} of {activeTrips.length} active dispatches
          </Typography>
        </Box>

        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            overflow: 'hidden',
          }}
        >
          <Table>
            <TableHead sx={{ backgroundColor: '#FAFAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2.2, px: 3 }}>TRIP ID</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2.2, px: 3 }}>DRIVER</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2.2, px: 3 }}>TODA</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2.2, px: 3 }}>PASSENGER</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2.2, px: 3 }}>TRIP TYPE</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2.2, px: 3 }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2.2, px: 3 }}>ETA</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2.2, px: 3 }}>CURRENT AREA</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2.2, px: 3 }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTrips.length > 0 ? (
                filteredTrips.map((trip) => (
                  <TableRow
                    key={trip.id}
                    sx={{
                      transition: 'var(--mac-transition-fast)',
                      '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                    }}
                  >
                    <TableCell sx={{ py: 2.4, px: 3, fontWeight: 700, fontSize: '14.5px', color: 'var(--mac-text-primary)' }}>
                      {trip.id}
                    </TableCell>
                    <TableCell sx={{ py: 2.4, px: 3 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '14.5px', color: 'var(--mac-text-primary)' }}>
                        {trip.driverName}
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                        Plate: {trip.vehiclePlate}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '14px', color: 'var(--mac-text-primary)', py: 2.4, px: 3 }}>
                      {trip.todaName}
                    </TableCell>
                    <TableCell sx={{ fontSize: '14px', color: 'var(--mac-text-primary)', py: 2.4, px: 3 }}>
                      {trip.passengerName}
                    </TableCell>
                    <TableCell sx={{ py: 2.4, px: 3 }}>
                      <Chip
                        label={trip.tripType}
                        size="small"
                        sx={{
                          fontSize: '12px',
                          fontWeight: 700,
                          backgroundColor: trip.tripType === 'Shared Trip' ? 'rgba(156, 39, 176, 0.12)' : 'rgba(52, 168, 83, 0.12)',
                          color: trip.tripType === 'Shared Trip' ? '#9C27B0' : '#1E8E3E',
                          height: 24,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 2.4, px: 3 }}>
                      <StatusBadge status={trip.status === 'Trip Ongoing' ? 'Active' : 'Pending'} />
                    </TableCell>
                    <TableCell sx={{ fontSize: '14px', fontWeight: 700, color: 'var(--sakay-orange)', py: 2.4, px: 3 }}>
                      {trip.eta}
                    </TableCell>
                    <TableCell sx={{ fontSize: '13.5px', color: 'var(--mac-text-secondary)', py: 2.4, px: 3 }}>
                      {trip.currentArea}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 2.4, px: 3 }}>
                      <ActionButton
                        label="View Trip"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTrip(trip);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <Typography sx={{ fontSize: '15px', color: 'var(--mac-text-muted)', fontWeight: 500 }}>
                      No active trips found matching your filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* 5. Online Drivers Roster */}
      <Box>
        <Typography sx={{ fontSize: '18px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 2 }}>
          Online Drivers Roster ({onlineDrivers.length})
        </Typography>

        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            overflow: 'hidden',
          }}
        >
          <Table>
            <TableHead sx={{ backgroundColor: '#FAFAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2.2, px: 3 }}>DRIVER</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2.2, px: 3 }}>TODA</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2.2, px: 3 }}>VERIFICATION</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2.2, px: 3 }}>AVAILABILITY</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2.2, px: 3 }}>DPS SCORE</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2.2, px: 3 }}>IDLE DURATION</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2.2, px: 3 }}>CURRENT AREA</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {onlineDrivers.map((driver) => (
                <TableRow key={driver.id} sx={{ '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' } }}>
                  <TableCell sx={{ py: 2.4, px: 3 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '14.5px', color: 'var(--mac-text-primary)' }}>
                      {driver.name}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                      Plate: {driver.vehiclePlate}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: '14px', color: 'var(--mac-text-primary)', py: 2.4, px: 3 }}>
                    {driver.todaName}
                  </TableCell>
                  <TableCell sx={{ py: 2.4, px: 3 }}>
                    <StatusBadge status={driver.verificationStatus} />
                  </TableCell>
                  <TableCell sx={{ py: 2.4, px: 3 }}>
                    <StatusBadge status={driver.availabilityStatus === 'Available' ? 'Active' : driver.availabilityStatus === 'Assigned' ? 'Pending' : 'Suspended'} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '14px', fontWeight: 700, color: 'var(--mac-text-primary)', py: 2.4, px: 3 }}>
                    {driver.dpsScore} / 100
                  </TableCell>
                  <TableCell sx={{ fontSize: '13.5px', color: 'var(--mac-text-secondary)', py: 2.4, px: 3 }}>
                    {driver.idleDuration}
                  </TableCell>
                  <TableCell sx={{ fontSize: '13.5px', color: 'var(--mac-text-secondary)', py: 2.4, px: 3 }}>
                    {driver.currentArea}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* 6. Centered Trip Detail Modal */}
      {selectedTrip && (
        <TripDetailModal
          open={Boolean(selectedTrip)}
          onClose={() => setSelectedTrip(null)}
          trip={selectedTrip}
        />
      )}
    </Box>
  );
};
