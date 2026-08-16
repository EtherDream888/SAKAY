import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Button, IconButton } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import RouteIcon from '@mui/icons-material/Route';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';

import { SYSTEM_DASHBOARD_KPIS, MOCK_ACCREDITED_TODAS } from '../mockData/adminData';
import { WelcomeHeader } from '../components/layout/WelcomeHeader';
import { BookingTrendCard } from '../components/dashboard/BookingTrendCard';
import { DriverVerificationCard } from '../components/dashboard/DriverVerificationCard';
import { LiveTripsMapCard } from '../components/dashboard/LiveTripsMapCard';
import { RecentIncidentReportsCard } from '../components/dashboard/RecentIncidentReportsCard';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const kpis = SYSTEM_DASHBOARD_KPIS;

  // Dismissible alert states
  const [showTodaAlert, setShowTodaAlert] = useState(true);
  const [showOverdueAlert, setShowOverdueAlert] = useState(true);

  // Filter TODAs flagged for supervisory review (3+ confirmed incidents in 60 days)
  const flaggedTodas = MOCK_ACCREDITED_TODAS.filter((t) => t.flaggedForReview);

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto' }}>
      {/* 1. Welcome Greeting Text Header */}
      <WelcomeHeader />

      {/* 2. TODA Supervisory Review Banner */}
      {showTodaAlert && flaggedTodas.length > 0 && (
        <Box
          sx={{
            mb: 3,
            backgroundColor: '#FFF7ED',
            border: '1px solid #FDBA74',
            borderRadius: 'var(--mac-radius-lg)',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--mac-shadow-subtle)',
            position: 'relative',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, pr: 2 }}>
            <WarningAmberIcon sx={{ color: '#EA580C', fontSize: 26, flexShrink: 0 }} />
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#9A3412', mb: '4px' }}>
                TODA Supervisory Review Alert
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: '#C2410C', lineHeight: 1.4 }}>
                {flaggedTodas.length} accredited TODA(s) ({flaggedTodas.map((t) => t.name).join(', ')}) have accumulated 3 or more confirmed incident reports requiring supervisory review.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
            <Button
              onClick={() => navigate('/accredited-todas')}
              endIcon={<ArrowForwardIcon sx={{ fontSize: '16px !important' }} />}
              sx={{
                height: 38,
                padding: '0 18px',
                borderRadius: '8px',
                textTransform: 'none',
                fontSize: '13.5px',
                fontWeight: 600,
                backgroundColor: '#EA580C',
                color: '#FFFFFF',
                whiteSpace: 'nowrap',
                boxShadow: 'var(--mac-shadow-subtle)',
                '&:hover': { backgroundColor: '#C2410C' },
              }}
            >
              Review TODAs
            </Button>
            <IconButton
              onClick={() => setShowTodaAlert(false)}
              aria-label="Dismiss alert"
              size="small"
              sx={{
                color: '#C2410C',
                '&:hover': { backgroundColor: 'rgba(234, 88, 12, 0.12)' },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* 3. Overdue Applications Alert Banner */}
      {showOverdueAlert && kpis.verifications.overdue5Days > 0 && (
        <Box
          sx={{
            mb: 3.5,
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: 'var(--mac-radius-lg)',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--mac-shadow-subtle)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, pr: 2 }}>
            <AccessTimeIcon sx={{ color: '#DC2626', fontSize: 26, flexShrink: 0 }} />
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#991B1B', mb: '4px' }}>
                Overdue Verifications Alert
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: '#B91C1C', lineHeight: 1.4 }}>
                {kpis.verifications.overdue5Days} verification request(s) pending beyond 5 calendar days require immediate review.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
            <Button
              onClick={() => navigate('/toda-applications')}
              endIcon={<ArrowForwardIcon sx={{ fontSize: '16px !important' }} />}
              sx={{
                height: 38,
                padding: '0 18px',
                borderRadius: '8px',
                textTransform: 'none',
                fontSize: '13.5px',
                fontWeight: 600,
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                whiteSpace: 'nowrap',
                boxShadow: 'var(--mac-shadow-subtle)',
                '&:hover': { backgroundColor: '#B91C1C' },
              }}
            >
              View Pending
            </Button>
            <IconButton
              onClick={() => setShowOverdueAlert(false)}
              aria-label="Dismiss alert"
              size="small"
              sx={{
                color: '#B91C1C',
                '&:hover': { backgroundColor: 'rgba(220, 38, 38, 0.12)' },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* 4. Surface-Level KPI Summary Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
          gap: 2.5,
          mb: 4,
        }}
      >
        {/* Passengers */}
        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Passengers
              </Typography>
              <PeopleIcon sx={{ color: 'var(--sakay-orange)', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              {kpis.passengers.total.toLocaleString()}
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
              <span style={{ fontWeight: 600, color: '#1E8E3E' }}>{kpis.passengers.active} Active</span> • {kpis.passengers.inactive} Inactive
            </Typography>
          </CardContent>
        </Card>

        {/* Drivers */}
        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Drivers
              </Typography>
              <DirectionsCarIcon sx={{ color: 'var(--sakay-orange)', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              {kpis.drivers.total.toLocaleString()}
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
              <span style={{ fontWeight: 600, color: '#1E8E3E' }}>{kpis.drivers.active} Active</span> • {kpis.drivers.inactive} Inactive
            </Typography>
          </CardContent>
        </Card>

        {/* Accredited TODAs */}
        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Accredited TODAs
              </Typography>
              <AccountBalanceIcon sx={{ color: 'var(--sakay-orange)', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              {kpis.todas.total}
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
              <span style={{ fontWeight: 600, color: '#1E8E3E' }}>{kpis.todas.active} Active</span> • {kpis.todas.suspended} Suspended
            </Typography>
          </CardContent>
        </Card>

        {/* Trip Stats */}
        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Trips Stats
              </Typography>
              <RouteIcon sx={{ color: '#1565C0', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              {kpis.trips.completed.toLocaleString()}
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
              <span style={{ fontWeight: 600, color: '#1565C0' }}>{kpis.trips.ongoing} Active</span> • {kpis.trips.cancelled} Cancelled
            </Typography>
          </CardContent>
        </Card>

        {/* Pending Verifications */}
        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Pending Review
              </Typography>
              <AccessTimeIcon sx={{ color: '#B06000', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: 'var(--sakay-orange)', mb: 0.5 }}>
              {kpis.verifications.pendingTodas + kpis.verifications.pendingDrivers}
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
              {kpis.verifications.pendingTodas} TODAs • {kpis.verifications.pendingDrivers} Drivers
            </Typography>
          </CardContent>
        </Card>

        {/* Incident Reports */}
        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Incidents
              </Typography>
              <ReportProblemIcon sx={{ color: '#DC2626', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: '#DC2626', mb: 0.5 }}>
              {kpis.incidents.open} Open
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
              <span style={{ fontWeight: 600, color: '#1E8E3E' }}>{kpis.incidents.resolved} Resolved</span>
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 5. Main Dashboard Visualizations Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '8fr 4fr' },
          gap: 3,
          alignItems: 'stretch',
          mb: 4,
        }}
      >
        <BookingTrendCard />
        <DriverVerificationCard />
      </Box>

      {/* 6. Live Trips & Incident Reports Row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' },
          gap: 3,
          alignItems: 'stretch',
        }}
      >
        <LiveTripsMapCard />
        <RecentIncidentReportsCard />
      </Box>
    </Box>
  );
};
