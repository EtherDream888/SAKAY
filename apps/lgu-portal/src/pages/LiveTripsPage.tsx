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
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import NavigationIcon from '@mui/icons-material/Navigation';
import PersonIcon from '@mui/icons-material/Person';
import RouteIcon from '@mui/icons-material/Route';
import RefreshIcon from '@mui/icons-material/Refresh';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { TripDetailModal } from '../components/admin/TripDetailModal';
import { TableEmptyState } from '../components/common/TableEmptyState';
import { fetchAllBookings, BookingRecordItem } from '../services/adminApiService';

/**
 * ============================================================================
 * LIVE OPERATIONS & TRIP MONITORING PAGE (LiveTripsPage.tsx)
 * ============================================================================
 * Checklist Scope:
 *   ● Monitor Transportation Operations
 *     ○ View active trips
 *     ○ View completed trips
 *     ○ View cancelled bookings
 *     ○ Monitor ongoing trips
 * ============================================================================
 */
export const LiveTripsPage: React.FC = () => {
  const [bookings, setBookings] = useState<BookingRecordItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'Active' | 'Completed' | 'Cancelled' | 'All'>('Active');
  const [searchQuery, setSearchQuery] = useState('');
  const [todaFilter, setTodaFilter] = useState('All');
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const loadTrips = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllBookings();
      setBookings(data);
    } catch (err) {
      console.error('[LiveTripsPage] Failed to fetch bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
    const interval = setInterval(loadTrips, 10000);
    return () => clearInterval(interval);
  }, []);

  // Categorize bookings
  const activeTrips = bookings.filter((b) =>
    ['Driver Assigned', 'Driver En Route', 'Driver Arrived', 'Trip Ongoing', 'Heading to Passenger'].includes(b.status)
  );
  const completedTrips = bookings.filter((b) => b.status === 'Completed');
  const cancelledTrips = bookings.filter((b) => (b.status || '').toLowerCase().includes('cancel') || b.status === 'No Driver Found');

  // Filter based on active tab and search
  const currentList =
    activeTab === 'Active'
      ? activeTrips
      : activeTab === 'Completed'
      ? completedTrips
      : activeTab === 'Cancelled'
      ? cancelledTrips
      : bookings;

  const filteredTrips = currentList.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      t.id.toLowerCase().includes(q) ||
      t.bookingId.toLowerCase().includes(q) ||
      t.driverName.toLowerCase().includes(q) ||
      t.passengerName.toLowerCase().includes(q) ||
      t.vehiclePlate.toLowerCase().includes(q) ||
      t.pickupArea.toLowerCase().includes(q) ||
      t.destinationArea.toLowerCase().includes(q);

    const matchesToda = todaFilter === 'All' || t.todaName === todaFilter;
    return matchesSearch && matchesToda;
  });

  const todaOptions: FilterOption[] = [
    { label: 'All TODAs', value: 'All' },
    { label: 'Calapan Central TODA', value: 'Calapan Central TODA' },
    { label: 'Balite-Lumangbayan TODA', value: 'Balite-Lumangbayan TODA' },
    { label: 'San Vicente East Drivers Association', value: 'San Vicente East Drivers Association' },
  ];

  // Leaflet Map Initialization & Markers
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [13.4117, 121.1803],
        zoom: 14,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing dynamic layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    // Render active trips on map
    activeTrips.forEach((trip) => {
      const isOngoing = trip.status === 'Trip Ongoing';
      const markerBg = isOngoing ? '#1565C0' : '#FF5500';

      const customIcon = L.divIcon({
        className: 'custom-live-trip-marker',
        html: `
          <div style="width: 36px; height: 36px; border-radius: 50%; background: ${markerBg}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2.5px solid #FFFFFF; box-shadow: 0 3px 8px rgba(0,0,0,0.3); cursor: pointer;">
            🛺
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([trip.driverLat, trip.driverLng], { icon: customIcon }).addTo(map);
      marker.bindPopup(`
        <b>${trip.id}</b><br/>
        Driver: ${trip.driverName}<br/>
        Status: <b>${trip.status}</b><br/>
        Route: ${trip.pickupArea} → ${trip.destinationArea}
      `);

      marker.on('click', () => setSelectedTrip(trip));

      // Route line
      L.polyline(
        [
          [trip.startLat, trip.startLng],
          [trip.driverLat, trip.driverLng],
          [trip.destLat, trip.destLng],
        ],
        { color: markerBg, weight: 4, opacity: 0.8, dashArray: isOngoing ? undefined : '6, 6' }
      ).addTo(map);
    });
  }, [activeTrips]);

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* 1. Operational KPI Metric Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 3.5,
        }}
      >
        <Card
          onClick={() => setActiveTab('Active')}
          sx={{
            cursor: 'pointer',
            borderRadius: 'var(--mac-radius-lg)',
            border: activeTab === 'Active' ? '2px solid var(--sakay-orange)' : '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            backgroundColor: '#FFFFFF',
            transition: 'all 0.2s ease',
          }}
        >
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: '10px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Active & Ongoing Trips
              </Typography>
              <NavigationIcon sx={{ color: 'var(--sakay-orange)', fontSize: '16' }} />
            </Box>
            <Typography sx={{ fontSize: '21px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              {activeTrips.length}
            </Typography>
            <Typography sx={{ fontSize: '10px', color: 'var(--mac-text-muted)' }}>
              Currently in transit in Calapan
            </Typography>
          </CardContent>
        </Card>

        <Card
          onClick={() => setActiveTab('Completed')}
          sx={{
            cursor: 'pointer',
            borderRadius: 'var(--mac-radius-lg)',
            border: activeTab === 'Completed' ? '2px solid var(--sakay-orange)' : '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            backgroundColor: '#FFFFFF',
            transition: 'all 0.2s ease',
          }}
        >
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: '10px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Completed Trips
              </Typography>
              <CheckCircleIcon sx={{ color: '#2E7D32', fontSize: '16' }} />
            </Box>
            <Typography sx={{ fontSize: '21px', fontWeight: 700, color: '#2E7D32', mb: 0.5 }}>
              {completedTrips.length}
            </Typography>
            <Typography sx={{ fontSize: '10px', color: 'var(--mac-text-muted)' }}>
              Safely fulfilled ride bookings
            </Typography>
          </CardContent>
        </Card>

        <Card
          onClick={() => setActiveTab('Cancelled')}
          sx={{
            cursor: 'pointer',
            borderRadius: 'var(--mac-radius-lg)',
            border: activeTab === 'Cancelled' ? '2px solid var(--sakay-orange)' : '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            backgroundColor: '#FFFFFF',
            transition: 'all 0.2s ease',
          }}
        >
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: '10px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Cancelled Bookings
              </Typography>
              <CancelIcon sx={{ color: '#DC2626', fontSize: '16' }} />
            </Box>
            <Typography sx={{ fontSize: '21px', fontWeight: 700, color: '#DC2626', mb: 0.5 }}>
              {cancelledTrips.length}
            </Typography>
            <Typography sx={{ fontSize: '10px', color: 'var(--mac-text-muted)' }}>
              Cancelled by passenger/driver
            </Typography>
          </CardContent>
        </Card>

        <Card
          onClick={() => setActiveTab('All')}
          sx={{
            cursor: 'pointer',
            borderRadius: 'var(--mac-radius-lg)',
            border: activeTab === 'All' ? '2px solid var(--sakay-orange)' : '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            backgroundColor: '#FFFFFF',
            transition: 'all 0.2s ease',
          }}
        >
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: '10px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Total Bookings
              </Typography>
              <RouteIcon sx={{ color: '#1565C0', fontSize: '16' }} />
            </Box>
            <Typography sx={{ fontSize: '21px', fontWeight: 700, color: '#1565C0', mb: 0.5 }}>
              {bookings.length}
            </Typography>
            <Typography sx={{ fontSize: '10px', color: 'var(--mac-text-muted)' }}>
              All lifetime system bookings
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 2. Interactive Map of Calapan City Transit Operations */}
      <Box
        sx={{
          mb: 4,
          borderRadius: 'var(--mac-radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--mac-border-color)',
          backgroundColor: '#FFFFFF',
          boxShadow: 'var(--mac-shadow-card)',
        }}
      >
        <Box sx={{ p: '14px 20px', borderBottom: '1px solid var(--mac-border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <NavigationIcon sx={{ color: 'var(--sakay-orange)', fontSize: '16' }} />
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
              Live Calapan City Transportation Transit Map ({activeTrips.length} Active)
            </Typography>
          </Box>
          <Button
            onClick={loadTrips}
            startIcon={<RefreshIcon />}
            size="small"
            sx={{ textTransform: 'none', fontSize: '10px', color: 'var(--sakay-orange)', fontWeight: 600 }}
          >
            Live Refresh
          </Button>
        </Box>
        <div ref={mapContainerRef} style={{ width: '100%', height: '340px' }} />
      </Box>

      {/* 3. Filter Toolbar & Operation Tabs */}
      <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            '& .MuiTabs-indicator': { backgroundColor: 'var(--sakay-orange)', height: 3 },
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '11px' },
            '& .Mui-selected': { color: 'var(--sakay-orange) !important' },
          }}
        >
          <Tab label={`Active Trips (${activeTrips.length})`} value="Active" />
          <Tab label={`Completed Trips (${completedTrips.length})`} value="Completed" />
          <Tab label={`Cancelled Bookings (${cancelledTrips.length})`} value="Cancelled" />
          <Tab label={`All Bookings (${bookings.length})`} value="All" />
        </Tabs>
      </Box>

      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by trip ID, driver, passenger, plate, or corridor..."
        selectFilters={[
          {
            id: 'toda',
            label: 'TODA Affiliation',
            value: todaFilter,
            options: todaOptions,
            onChange: setTodaFilter,
          },
        ]}
        onResetFilters={() => {
          setSearchQuery('');
          setTodaFilter('All');
        }}
      />

      {/* 4. Trips Data Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 'var(--mac-radius-lg)',
          border: '1px solid var(--mac-border-color)',
          boxShadow: 'var(--mac-shadow-card)',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
        }}
      >
        <Table>
          <TableHead sx={{ backgroundColor: '#FAFAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, fontSize: '10px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                TRIP ID & CORRIDOR
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '10px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                DRIVER & UNIT
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '10px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                PASSENGER
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '10px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                TYPE & FARE
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '10px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                STATUS
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '10px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                ACTIONS
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <CircularProgress size={32} sx={{ color: 'var(--sakay-orange)', mb: 1.5 }} />
                  <Typography sx={{ fontSize: '11.3px', color: 'var(--mac-text-muted)' }}>
                    Loading trip records...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredTrips.length > 0 ? (
              filteredTrips.map((trip) => (
                <TableRow
                  key={trip.id}
                  sx={{
                    transition: 'var(--mac-transition-fast)',
                    '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                  }}
                >
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '11px', color: 'var(--mac-text-primary)' }}>
                      {trip.id}
                    </Typography>
                    <Typography sx={{ fontSize: '10px', color: 'var(--mac-text-muted)', mt: '3px' }}>
                      {trip.pickupArea} → {trip.destinationArea}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontSize: '11px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      {trip.driverName}
                    </Typography>
                    <Typography sx={{ fontSize: '9.2px', color: 'var(--mac-text-muted)' }}>
                      {trip.todaName} • {trip.vehiclePlate}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontSize: '11px', color: 'var(--mac-text-primary)' }}>
                      {trip.passengerName}
                    </Typography>
                    <Typography sx={{ fontSize: '9.2px', color: 'var(--mac-text-muted)' }}>
                      {trip.passengerPhone}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontSize: '11px', fontWeight: 700, color: 'var(--sakay-orange)' }}>
                      ₱{trip.estimatedFare}.00
                    </Typography>
                    <Typography sx={{ fontSize: '9.2px', color: 'var(--mac-text-muted)' }}>
                      {trip.tripType} • {trip.distanceKm} km
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <StatusBadge status={trip.status as any} />
                  </TableCell>
                  <TableCell align="right" sx={{ py: 2.2, px: 3 }}>
                    <ActionButton
                      label="View Details"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTrip(trip);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableEmptyState
                colSpan={6}
                icon={<NavigationIcon />}
                title={`No ${activeTab.toLowerCase()} trips recorded.`}
                description={
                  searchQuery || todaFilter !== 'All'
                    ? 'No trips match your active search or filter.'
                    : 'Active transportation trips will appear here when passengers and drivers begin using SAKAY.'
                }
                onRefresh={loadTrips}
                isRefreshing={isLoading}
              />
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 5. Trip Telemetry Inspection Modal */}
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

