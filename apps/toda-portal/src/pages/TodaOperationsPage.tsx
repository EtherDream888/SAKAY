import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
} from '@mui/material';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import NavigationIcon from '@mui/icons-material/Navigation';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShieldIcon from '@mui/icons-material/Shield';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RefreshIcon from '@mui/icons-material/Refresh';

import { CURRENT_TODA_PROFILE, MOCK_TODA_DRIVERS, MOCK_TODA_BOOKINGS } from '../mockData/todaData';
import { StatusBadge } from '../components/common/StatusBadge';

export const TodaOperationsPage: React.FC = () => {
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString());

  const handleRefresh = () => {
    setLastRefreshed(new Date().toLocaleTimeString());
  };

  // Mock terminal rotation queue
  const terminalQueue = [
    { queueNo: 1, driver: 'Aurelio "Auring" Bautista', plate: '773-MV', status: 'Next in Line', timeInQueue: '12 mins' },
    { queueNo: 2, driver: 'Rogelio "Roger" Ramos', plate: '194-MV', status: 'Queued', timeInQueue: '8 mins' },
    { queueNo: 3, driver: 'Danilo "Danny" Reyes', plate: '809-MV', status: 'Queued', timeInQueue: '4 mins' },
    { queueNo: 4, driver: 'Vicente "Enteng" Sotto', plate: '482-MV', status: 'Queued', timeInQueue: '1 min' },
  ];

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* Supervisory Review Status Banner */}
      <Box sx={{ mb: 3.5 }}>
        {CURRENT_TODA_PROFILE.misteepComplaintsCount >= 3 ? (
          <Box
            sx={{
              p: '16px 20px',
              borderRadius: 'var(--mac-radius-lg)',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--mac-shadow-card)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <WarningAmberIcon sx={{ color: '#DC2626', fontSize: 28 }} />
              <Box>
                <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#991B1B' }}>
                  LGU Supervisory Review Warning Active
                </Typography>
                <Typography sx={{ fontSize: '13px', color: '#B91C1C' }}>
                  {CURRENT_TODA_PROFILE.name} has recorded 3+ verified passenger complaints in the last 60 days. The LGU Franchising Office is monitoring dispatch performance.
                </Typography>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              p: '14px 20px',
              borderRadius: 'var(--mac-radius-lg)',
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--mac-shadow-subtle)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <ShieldIcon sx={{ color: '#059669', fontSize: 24 }} />
              <Box>
                <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#065F46' }}>
                  Good Standing: Accreditation Compliance Active
                </Typography>
                <Typography sx={{ fontSize: '12.5px', color: '#047857' }}>
                  {CURRENT_TODA_PROFILE.name} complaint count ({CURRENT_TODA_PROFILE.misteepComplaintsCount} / 3) is well below the LGU supervisory review threshold.
                </Typography>
              </Box>
            </Box>
            <Button
              size="small"
              onClick={handleRefresh}
              startIcon={<RefreshIcon fontSize="small" />}
              sx={{ textTransform: 'none', color: '#065F46', fontWeight: 600, fontSize: '12px' }}
            >
              Refreshed: {lastRefreshed}
            </Button>
          </Box>
        )}
      </Box>

      {/* 1. Scoped Operations KPIs */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 3.5,
        }}
      >
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Active Online Drivers</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#1E8E3E' }}>18 <span style={{ fontSize: '16px', color: 'var(--mac-text-muted)', fontWeight: 500 }}>/ 24 Units</span></Typography>
          <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: 0.5 }}>75% fleet utilization today</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Ongoing Trips Right Now</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--sakay-orange)' }}>5 Trips</Typography>
          <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: 0.5 }}>In San Vicente & JP Rizal corridor</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Completed Today (CCTODA)</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#1565C0' }}>86 Rides</Typography>
          <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: 0.5 }}>Avg trip fare: ₱22.50</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Est. Daily Gross Fare</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>₱4,820</Typography>
          <Typography sx={{ fontSize: '12px', color: '#1E8E3E', mt: 0.5, fontWeight: 600 }}>+12% vs yesterday</Typography>
        </Box>
      </Box>

      {/* 2. Operations Split View: Terminal Rotation Queue vs Active Bookings */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '5fr 7fr' }, gap: 3, mb: 3.5, alignItems: 'stretch' }}>
        {/* Terminal Dispatch Queue */}
        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', p: '24px', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography sx={{ fontSize: '17px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                Terminal Loading Queue
              </Typography>
              <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
                JP Rizal Central Bay Rotation
              </Typography>
            </Box>
            <Chip label="Live Queue" size="small" sx={{ backgroundColor: '#E6F4EA', color: '#1E8E3E', fontWeight: 700, fontSize: '11px' }} />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
            {terminalQueue.map((item) => (
              <Box
                key={item.queueNo}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--mac-border-color)',
                  backgroundColor: item.queueNo === 1 ? 'var(--sakay-orange-soft)' : '#FAFAFC',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: '12px', fontWeight: 700, backgroundColor: item.queueNo === 1 ? 'var(--sakay-orange)' : '#E0E0E0', color: item.queueNo === 1 ? '#FFFFFF' : '#616161' }}>
                    #{item.queueNo}
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      {item.driver}
                    </Typography>
                    <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)' }}>
                      Plate: {item.plate} • Waiting: {item.timeInQueue}
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={item.status}
                  size="small"
                  sx={{
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: item.queueNo === 1 ? 'var(--sakay-orange)' : '#E0E0E0',
                    color: item.queueNo === 1 ? '#FFFFFF' : '#616161',
                    height: 22,
                  }}
                />
              </Box>
            ))}
          </Box>
        </Card>

        {/* Recent Active Rides */}
        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', p: '24px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography sx={{ fontSize: '17px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                Recent CCTODA Passenger Bookings
              </Typography>
              <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
                Live dispatch transactions across Poblacion and San Vicente
              </Typography>
            </Box>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#FAFAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontSize: '12px', fontWeight: 600, color: 'var(--mac-text-muted)', py: 1.5 }}>BOOKING</TableCell>
                  <TableCell sx={{ fontSize: '12px', fontWeight: 600, color: 'var(--mac-text-muted)', py: 1.5 }}>DRIVER & UNIT</TableCell>
                  <TableCell sx={{ fontSize: '12px', fontWeight: 600, color: 'var(--mac-text-muted)', py: 1.5 }}>ROUTE & MODE</TableCell>
                  <TableCell sx={{ fontSize: '12px', fontWeight: 600, color: 'var(--mac-text-muted)', py: 1.5 }}>FARE</TableCell>
                  <TableCell sx={{ fontSize: '12px', fontWeight: 600, color: 'var(--mac-text-muted)', py: 1.5 }}>STATUS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MOCK_TODA_BOOKINGS.slice(0, 4).map((bkg) => (
                  <TableRow key={bkg.id} sx={{ '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' } }}>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                        {bkg.bookingCode}
                      </Typography>
                      <Typography sx={{ fontSize: '11px', color: 'var(--mac-text-muted)' }}>
                        {bkg.timestamp.split('•')[1]}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-primary)', fontWeight: 500 }}>
                        {bkg.driverName.split(' ')[0]} ({bkg.vehiclePlate})
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-primary)' }}>
                        {bkg.pickupLocation.split(' ')[0]} → {bkg.dropoffLocation.split(' ')[0]}
                      </Typography>
                      <Typography sx={{ fontSize: '11px', color: 'var(--sakay-orange)', fontWeight: 600 }}>
                        {bkg.tripMode}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--sakay-orange)' }}>
                        ₱{bkg.fareAmount.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <StatusBadge status={bkg.status === 'Completed' ? 'Active' : 'Pending'} label={bkg.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>

      {/* 3. Service Coverage Zone Summary */}
      <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', p: '24px' }}>
        <Typography sx={{ fontSize: '16px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 1 }}>
          Calapan Central TODA Service Corridor Parameters
        </Typography>
        <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mb: 2 }}>
          Official municipal coverage coordinates authorized under Permit #{CURRENT_TODA_PROFILE.permitNumber}:
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
          <Box sx={{ p: 2, borderRadius: '10px', backgroundColor: '#F8F9FA', border: '1px solid var(--mac-border-color)' }}>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Primary Terminal</Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>JP Rizal St. (San Vicente)</Typography>
          </Box>
          <Box sx={{ p: 2, borderRadius: '10px', backgroundColor: '#F8F9FA', border: '1px solid var(--mac-border-color)' }}>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Secondary Loading Bays</Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>City Public Market & Pier Gate</Typography>
          </Box>
          <Box sx={{ p: 2, borderRadius: '10px', backgroundColor: '#F8F9FA', border: '1px solid var(--mac-border-color)' }}>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Standard Base Fare</Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 700, color: 'var(--sakay-orange)' }}>₱15.00 (First 2.0 km)</Typography>
          </Box>
        </Box>
      </Card>
    </Box>
  );
};
