import React, { useState, useEffect } from 'react';
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
  Button,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';

import { TodaProfile, TodaDriverMember, TodaBooking } from '../types/toda';
import {
  fetchTodaProfile,
  fetchTodaDrivers,
  fetchTodaOperationsTrips,
} from '../services/todaApiService';
import { WelcomeHeader } from '../components/layout/WelcomeHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../contexts/AuthContext';

export const TodaOperationsPage: React.FC = () => {
  const { todaAdminProfile } = useAuth();
  const targetTodaId = todaAdminProfile?.toda_id;

  const [profile, setProfile] = useState<TodaProfile | null>(null);
  const [drivers, setDrivers] = useState<TodaDriverMember[]>([]);
  const [bookings, setBookings] = useState<TodaBooking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prof, drvs, trips] = await Promise.all([
        fetchTodaProfile(targetTodaId),
        fetchTodaDrivers(targetTodaId),
        fetchTodaOperationsTrips(targetTodaId),
      ]);

      if (prof) setProfile(prof);
      setDrivers(drvs || []);

      const mappedBookings: TodaBooking[] = (trips || []).map((b: any) => ({
        id: b.booking_id,
        bookingCode: b.booking_id.slice(0, 8).toUpperCase(),
        passengerName: b.passenger_name || 'Passenger',
        passengerPhone: b.passenger_phone || '+63 900 000 0000',
        driverName: b.driver?.full_name || 'Assigned Driver',
        vehiclePlate: b.driver?.plate_number || 'MV-101',
        pickupLocation: b.pickup_address || 'Pickup Point',
        dropoffLocation: b.dropoff_address || 'Dropoff Point',
        distanceKm: Number(b.estimated_distance_km) || 2.0,
        fareAmount: Number(b.estimated_fare) || 15,
        tripMode: b.is_shared_trip ? 'Shared Ride' : 'Single Commuter',
        status: b.status === 'Completed' ? 'Completed' : b.status === 'Cancelled' ? 'Cancelled' : 'In Progress',
        paymentMethod: 'Cash',
        timestamp: b.created_at ? new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
      }));

      setBookings(mappedBookings);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('[TodaOperations] Error fetching data from database:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [targetTodaId]);

  const totalDrivers = drivers.length;
  const activeDrivers = drivers.filter((d) => d.accountStatus === 'Active').length;
  const activeTrips = bookings.filter((b) => b.status === 'In Progress');

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* 1. Welcome Section Header */}
      <WelcomeHeader
        welcomeText={`Welcome back! 👋`}
        supportingText={`Operational monitoring and fleet availability for ${profile?.name || 'TODA Association'} (${profile?.acronym || 'TODA'})`}
      />



      {/* 3. Supervisory Standing Banner & Compliance Indicators */}
      <Box sx={{ mb: 3.5 }}>
        <Box
          sx={{
            p: '16px 22px',
            borderRadius: 'var(--mac-radius-lg)',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--mac-border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--mac-shadow-card)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ShieldIcon sx={{ color: '#059669', fontSize: 24 }} />
            <Box>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                Accreditation Status — {profile?.name || 'TODA Association'}
              </Typography>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                Accreditation Permit #{profile?.accreditationNo || 'CAL-TODA-2024-001'} is {profile?.accreditationStatus === 'Active' ? 'active' : 'currently pending'}.
              </Typography>
            </Box>
          </Box>
          <Button
            size="small"
            onClick={loadData}
            startIcon={<RefreshIcon fontSize="small" />}
            sx={{
              height: 36,
              px: 2,
              borderRadius: '8px',
              fontSize: '12.5px',
              textTransform: 'none',
              color: 'var(--mac-text-secondary)',
              border: '1px solid var(--mac-border-color)',
              backgroundColor: '#FFFFFF',
              '&:hover': { backgroundColor: 'var(--sakay-orange-soft)', color: 'var(--sakay-orange)' },
            }}
          >
            Refreshed {lastRefreshed}
          </Button>
        </Box>
      </Box>

      {/* 3. Surface-Level Operations KPIs */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 3.5,
        }}
      >
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Accredited Drivers</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>{totalDrivers}</Typography>
          <Typography sx={{ fontSize: '12px', color: '#059669', mt: 0.5, fontWeight: 500 }}>{activeDrivers} Drivers Active</Typography>
        </Box>

        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Active Trips</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--sakay-orange)' }}>{activeTrips.length}</Typography>
          <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: 0.5 }}>Currently in Transit</Typography>
        </Box>

        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Completed Today</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#059669' }}>{bookings.filter((b) => b.status === 'Completed').length}</Typography>
          <Typography sx={{ fontSize: '12px', color: '#059669', mt: 0.5, fontWeight: 500 }}>Logged Trips</Typography>
        </Box>

        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Cancelled Today</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#DC2626' }}>{bookings.filter((b) => b.status === 'Cancelled').length}</Typography>
          <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: 0.5 }}>Total Cancellations</Typography>
        </Box>
      </Box>

      {/* 4. Standard Fare Policy Reminder Card */}
      <Box
        sx={{
          mb: 3.5,
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--mac-border-color)',
          borderRadius: 'var(--mac-radius-lg)',
          padding: '20px 24px',
          boxShadow: 'var(--mac-shadow-card)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 2,
        }}
      >
        <InfoOutlinedIcon sx={{ color: 'var(--sakay-orange)', fontSize: 24, mt: '2px', flexShrink: 0 }} />
        <Box>
          <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)', mb: '4px' }}>
            Standard Fare Policy Reminder
          </Typography>
          <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-secondary)', lineHeight: 1.5 }}>
            SAKAY fares strictly follow the approved city fare matrix (City Ordinance No. 118: ₱15 minimum base fare for first 2.0 km). Charging or applying a fare that does not comply with the approved fare policy is subject to administrative review and applicable sanctions.
          </Typography>
        </Box>
      </Box>

      {/* 5. Driver Roster & Active Trips Tables */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3.5, alignItems: 'flex-start' }}>
        {/* Affiliated Drivers Card */}
        <Box
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography sx={{ fontSize: '17px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                Affiliated Driver Roster
              </Typography>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                Drivers registered with {profile?.name || 'this TODA'}
              </Typography>
            </Box>
            <Chip
              label={`${drivers.length} Drivers`}
              size="small"
              sx={{ backgroundColor: 'var(--sakay-orange-soft)', color: 'var(--sakay-orange)', fontWeight: 600, fontSize: '12px' }}
            />
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid var(--mac-border-color)', borderRadius: '10px' }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#FAFAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: '12px', py: 1.5, px: 2 }}>Driver Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '12px', py: 1.5, px: 2 }}>Franchise Number</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '12px', py: 1.5, px: 2 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} sx={{ color: 'var(--sakay-orange)', mb: 1 }} />
                      <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>Loading drivers...</Typography>
                    </TableCell>
                  </TableRow>
                ) : drivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                      <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)' }}>
                        No registered drivers currently affiliated with this TODA.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  drivers.map((d) => (
                    <TableRow key={d.id} sx={{ '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' } }}>
                      <TableCell sx={{ py: 1.5, px: 2, fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-primary)' }}>
                        {d.name}
                      </TableCell>
                      <TableCell sx={{ py: 1.5, px: 2, fontSize: '13px' }}>
                        <Chip
                          label={d.franchiseNo || 'N/A'}
                          size="small"
                          sx={{
                            backgroundColor: 'var(--sakay-orange-soft)',
                            color: 'var(--sakay-orange)',
                            fontWeight: 600,
                            fontSize: '12px',
                            height: '24px',
                            borderRadius: '6px',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 1.5, px: 2 }}>
                        <StatusBadge status={d.accountStatus} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Active SAKAY Trips Card */}
        <Box
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography sx={{ fontSize: '17px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                Active SAKAY Bookings
              </Typography>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                Ongoing and recent rides involving {profile?.acronym || 'TODA'} drivers
              </Typography>
            </Box>
            <Chip
              label={`${bookings.length} Bookings`}
              size="small"
              sx={{ backgroundColor: '#E8F0FE', color: '#1A73E8', fontWeight: 600, fontSize: '12px' }}
            />
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid var(--mac-border-color)', borderRadius: '10px' }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#FAFAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: '12px', py: 1.5, px: 2 }}>Trip Code</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '12px', py: 1.5, px: 2 }}>Driver & Plate</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '12px', py: 1.5, px: 2 }}>Mode</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '12px', py: 1.5, px: 2 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} sx={{ color: 'var(--sakay-orange)', mb: 1 }} />
                      <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>Loading trips...</Typography>
                    </TableCell>
                  </TableRow>
                ) : bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)' }}>
                        No active bookings recorded at this time.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((bkg) => (
                    <TableRow key={bkg.id} sx={{ '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' } }}>
                      <TableCell sx={{ py: 1.5, px: 2, fontWeight: 600, fontSize: '13px', color: 'var(--sakay-orange)' }}>{bkg.bookingCode}</TableCell>
                      <TableCell sx={{ py: 1.5, px: 2, fontSize: '13px' }}>
                        <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{bkg.driverName}</Typography>
                        <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)' }}>{bkg.vehiclePlate}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5, px: 2, fontSize: '12.5px' }}>{bkg.tripMode}</TableCell>
                      <TableCell sx={{ py: 1.5, px: 2 }}>
                        <StatusBadge status={bkg.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    </Box>
  );
};
