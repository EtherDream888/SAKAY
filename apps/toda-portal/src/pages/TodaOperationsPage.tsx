import React, { useState } from 'react';
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
  Avatar,
} from '@mui/material';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import NavigationIcon from '@mui/icons-material/Navigation';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ShieldIcon from '@mui/icons-material/Shield';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';

import { CURRENT_TODA_PROFILE, CURRENT_TODA_ADMIN, MOCK_TODA_DRIVERS, MOCK_TODA_BOOKINGS } from '../mockData/todaData';
import { WelcomeHeader } from '../components/layout/WelcomeHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';

export const TodaOperationsPage: React.FC = () => {
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  const handleRefresh = () => {
    setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  // Fleet Statistics
  const totalDrivers = MOCK_TODA_DRIVERS.length;
  const activeDrivers = MOCK_TODA_DRIVERS.filter((d) => d.accountStatus === 'Active').length;
  const availableForBooking = 14;
  const currentlyAssigned = 6;
  const averageIdleMinutes = 18;
  const longestIdleMinutes = 42;

  // Drivers Waiting for SAKAY Bookings (Driver Idle Time Data)
  const idleDriversList = [
    { id: 'DRV-001', driver: 'Aurelio "Auring" Bautista', plate: '773-MV', area: 'JP Rizal Terminal', idleTime: '42 mins', status: 'Available' },
    { id: 'DRV-003', driver: 'Rogelio "Roger" Ramos', plate: '194-MV', area: 'San Vicente Corridor', idleTime: '28 mins', status: 'Available' },
    { id: 'DRV-005', driver: 'Danilo "Danny" Reyes', plate: '809-MV', area: 'City Hall Complex', idleTime: '15 mins', status: 'Available' },
    { id: 'DRV-002', driver: 'Vicente "Enteng" Sotto', plate: '482-MV', area: 'Poblacion Core', idleTime: '6 mins', status: 'Assigned (Trip #8641)' },
  ];

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* 1. Welcome Section Header */}
      <WelcomeHeader
        welcomeText={`Welcome back, ${CURRENT_TODA_ADMIN.name}! 👋`}
        supportingText={`Operational monitoring and fleet availability for ${CURRENT_TODA_PROFILE.name} (${CURRENT_TODA_PROFILE.acronym})`}
      />

      {/* 2. Supervisory Standing Banner & Compliance Indicators */}
      <Box sx={{ mb: 3.5 }}>
        {CURRENT_TODA_PROFILE.misteepComplaintsCount >= 3 ? (
          <Box
            sx={{
              p: '18px 24px',
              borderRadius: 'var(--mac-radius-lg)',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--mac-shadow-subtle)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <WarningAmberIcon sx={{ color: '#DC2626', fontSize: 26 }} />
              <Box>
                <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#991B1B' }}>
                  LGU Supervisory Review Warning Active
                </Typography>
                <Typography sx={{ fontSize: '13.5px', color: '#B91C1C', mt: '2px' }}>
                  {CURRENT_TODA_PROFILE.name} has recorded 3+ verified passenger complaints in the last 60 days. The City Franchising Office is monitoring dispatch performance.
                </Typography>
              </Box>
            </Box>
          </Box>
        ) : (
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
                  Accreditation Good Standing — {CURRENT_TODA_PROFILE.name}
                </Typography>
                <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                  Accreditation Permit #{CURRENT_TODA_PROFILE.accreditationNo} is active. Verified complaint count ({CURRENT_TODA_PROFILE.misteepComplaintsCount} / 3) is well below the supervisory review threshold.
                </Typography>
              </Box>
            </Box>
            <Button
              size="small"
              onClick={handleRefresh}
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
        )}
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
          <Typography sx={{ fontSize: '12px', color: '#059669', mt: 0.5, fontWeight: 500 }}>{activeDrivers} Drivers Active in System</Typography>
        </Box>

        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Available for SAKAY</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--sakay-orange)' }}>{availableForBooking}</Typography>
          <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: 0.5 }}>Ready to Accept Rides</Typography>
        </Box>

        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Assigned to Active Bookings</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#1565C0' }}>{currentlyAssigned}</Typography>
          <Typography sx={{ fontSize: '12px', color: '#1565C0', mt: 0.5, fontWeight: 500 }}>En Route or Handling Commuters</Typography>
        </Box>

        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Average Driver Idle Time</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>{averageIdleMinutes} min</Typography>
          <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: 0.5 }}>Longest Idle: {longestIdleMinutes} mins</Typography>
        </Box>
      </Box>

      {/* 4. Standard Fare Policy Compliance Warning Card */}
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

      {/* 5. Driver Idle Time & Availability Section (Replaces Digital Queue) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3.5 }}>
        {/* Driver Idle Time / SAKAY Availability Card */}
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
                Driver Idle Time & Availability
              </Typography>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                Drivers currently available to receive SAKAY bookings
              </Typography>
            </Box>
            <Chip
              label={`${availableForBooking} Available`}
              size="small"
              sx={{ backgroundColor: 'var(--sakay-orange-soft)', color: 'var(--sakay-orange)', fontWeight: 600, fontSize: '12px' }}
            />
          </Box>

          {/* Explicit Physical Terminal Queue Distinction Disclaimer */}
          <Box
            sx={{
              backgroundColor: '#F8F9FA',
              border: '1px solid var(--mac-border-color)',
              borderRadius: '10px',
              padding: '12px 16px',
              mb: 2.5,
            }}
          >
            <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)', lineHeight: 1.4 }}>
              <strong>Physical Terminal Queue Note:</strong> Physical TODA terminal loading lines are managed by the TODA outside SAKAY. SAKAY does not digitize or enforce physical terminal FIFO loading order.
            </Typography>
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid var(--mac-border-color)', borderRadius: '10px' }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#FAFAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: '12px', py: 1.5, px: 2 }}>DRIVER NAME</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '12px', py: 1.5, px: 2 }}>PLATE</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '12px', py: 1.5, px: 2 }}>CURRENT AREA</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '12px', py: 1.5, px: 2 }}>IDLE TIME</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '12px', py: 1.5, px: 2 }}>STATUS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {idleDriversList.map((item) => (
                  <TableRow key={item.id} sx={{ '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' } }}>
                    <TableCell sx={{ py: 1.5, px: 2, fontWeight: 600, fontSize: '13px' }}>{item.driver}</TableCell>
                    <TableCell sx={{ py: 1.5, px: 2, fontSize: '13px', color: 'var(--mac-text-secondary)' }}>{item.plate}</TableCell>
                    <TableCell sx={{ py: 1.5, px: 2, fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>{item.area}</TableCell>
                    <TableCell sx={{ py: 1.5, px: 2, fontSize: '13px', fontWeight: 600, color: 'var(--sakay-orange)' }}>{item.idleTime}</TableCell>
                    <TableCell align="right" sx={{ py: 1.5, px: 2 }}>
                      <Chip
                        label={item.status}
                        size="small"
                        sx={{
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: item.status === 'Available' ? '#E6F4EA' : '#E8F0FE',
                          color: item.status === 'Available' ? '#1E8E3E' : '#1A73E8',
                          height: 22,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
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
                Ongoing rides involving {CURRENT_TODA_PROFILE.acronym} drivers
              </Typography>
            </Box>
            <Chip
              label={`${MOCK_TODA_BOOKINGS.filter((b) => b.status === 'In Progress').length} Active`}
              size="small"
              sx={{ backgroundColor: '#E8F0FE', color: '#1A73E8', fontWeight: 600, fontSize: '12px' }}
            />
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid var(--mac-border-color)', borderRadius: '10px' }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#FAFAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: '12px', py: 1.5, px: 2 }}>TRIP CODE</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '12px', py: 1.5, px: 2 }}>DRIVER & PLATE</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '12px', py: 1.5, px: 2 }}>MODE</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '12px', py: 1.5, px: 2 }}>FARE</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '12px', py: 1.5, px: 2 }}>STATUS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MOCK_TODA_BOOKINGS.map((bkg) => (
                  <TableRow key={bkg.id} sx={{ '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' } }}>
                    <TableCell sx={{ py: 1.5, px: 2, fontWeight: 600, fontSize: '13px', color: 'var(--sakay-orange)' }}>{bkg.bookingCode}</TableCell>
                    <TableCell sx={{ py: 1.5, px: 2, fontSize: '13px' }}>
                      <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{bkg.driverName}</Typography>
                      <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)' }}>{bkg.vehiclePlate}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5, px: 2, fontSize: '12.5px' }}>{bkg.tripMode}</TableCell>
                    <TableCell sx={{ py: 1.5, px: 2, fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>₱{bkg.fareAmount}</TableCell>
                    <TableCell align="right" sx={{ py: 1.5, px: 2 }}>
                      <StatusBadge status={bkg.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    </Box>
  );
};
