import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, IconButton, CircularProgress } from '@mui/material';
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

import { WelcomeHeader } from '../components/layout/WelcomeHeader';
import { BookingTrendCard } from '../components/dashboard/BookingTrendCard';
import { DriverVerificationCard } from '../components/dashboard/DriverVerificationCard';
import { LiveTripsMapCard } from '../components/dashboard/LiveTripsMapCard';
import { RecentIncidentReportsCard } from '../components/dashboard/RecentIncidentReportsCard';
import { RecentTodaApplicationsCard } from '../components/dashboard/RecentTodaApplicationsCard';
import { fetchDashboardStats, DashboardStats } from '../services/adminApiService';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dismissible alert states
  const [showTodaAlert, setShowTodaAlert] = useState(true);
  const [showOverdueAlert, setShowOverdueAlert] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchDashboardStats()
      .then((data) => {
        if (isMounted) {
          setStats(data);
        }
      })
      .catch((err) => {
        console.error('[DashboardPage] Failed to fetch live dashboard stats:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const kpis = stats?.kpis || {
    passengers: { total: 0, active: 0, inactive: 0 },
    drivers: { total: 0, active: 0, inactive: 0 },
    todas: { total: 0, pendingReview: 0 },
    trips: { total: 0, ongoing: 0, allBookings: 0 },
    verifications: { pending: 0, overdue5Days: 0 },
    incidents: { open: 0, total: 0 },
  };

  const flaggedTodas = stats?.flaggedTodas || [];

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* 1. Welcome Greeting Text Header */}
      <WelcomeHeader />

      {/* 2. TODA Supervisory Review Banner (Conditional from live DB) */}
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

      {/* 4. Real Live KPI Summary Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
          gap: 2.5,
          mb: 4,
        }}
      >
        {/* Passengers */}
        <Card
          onClick={() => navigate('/passengers')}
          sx={{
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            backgroundColor: '#FFFFFF',
            cursor: 'pointer',
            transition: 'var(--mac-transition-fast)',
            '&:hover': { transform: 'translateY(-2px)', borderColor: 'var(--sakay-orange)' },
          }}
        >
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Passengers
              </Typography>
              <PeopleIcon sx={{ color: 'var(--sakay-orange)', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              {isLoading ? <CircularProgress size={20} /> : kpis.passengers.total.toLocaleString()}
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
              <span style={{ fontWeight: 600, color: '#1E8E3E' }}>{kpis.passengers.active} Active</span> • {kpis.passengers.inactive} Inactive
            </Typography>
          </CardContent>
        </Card>

        {/* Drivers */}
        <Card
          onClick={() => navigate('/drivers')}
          sx={{
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            backgroundColor: '#FFFFFF',
            cursor: 'pointer',
            transition: 'var(--mac-transition-fast)',
            '&:hover': { transform: 'translateY(-2px)', borderColor: 'var(--sakay-orange)' },
          }}
        >
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Drivers
              </Typography>
              <DirectionsCarIcon sx={{ color: 'var(--sakay-orange)', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              {isLoading ? <CircularProgress size={20} /> : kpis.drivers.total.toLocaleString()}
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
              <span style={{ fontWeight: 600, color: '#1E8E3E' }}>{kpis.drivers.active} Verified</span> • {kpis.drivers.inactive} Other
            </Typography>
          </CardContent>
        </Card>

        {/* Accredited TODAs */}
        <Card
          onClick={() => navigate('/accredited-todas')}
          sx={{
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            backgroundColor: '#FFFFFF',
            cursor: 'pointer',
            transition: 'var(--mac-transition-fast)',
            '&:hover': { transform: 'translateY(-2px)', borderColor: 'var(--sakay-orange)' },
          }}
        >
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Accredited TODAs
              </Typography>
              <AccountBalanceIcon sx={{ color: 'var(--sakay-orange)', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              {isLoading ? <CircularProgress size={20} /> : kpis.todas.total.toLocaleString()}
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
              <span style={{ fontWeight: 600, color: '#1565C0' }}>{kpis.todas.total} Active</span> • {kpis.todas.pendingReview} Pending
            </Typography>
          </CardContent>
        </Card>

        {/* Completed Trips */}
        <Card
          onClick={() => navigate('/live-trips')}
          sx={{
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            backgroundColor: '#FFFFFF',
            cursor: 'pointer',
            transition: 'var(--mac-transition-fast)',
            '&:hover': { transform: 'translateY(-2px)', borderColor: 'var(--sakay-orange)' },
          }}
        >
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Completed Trips
              </Typography>
              <RouteIcon sx={{ color: 'var(--sakay-orange)', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              {isLoading ? <CircularProgress size={20} /> : kpis.trips.total.toLocaleString()}
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
              <span style={{ fontWeight: 600, color: '#1E8E3E' }}>{kpis.trips.ongoing} In Transit</span> • {kpis.trips.allBookings} Total
            </Typography>
          </CardContent>
        </Card>

        {/* Pending Verifications */}
        <Card
          onClick={() => navigate('/toda-applications')}
          sx={{
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            backgroundColor: '#FFFFFF',
            cursor: 'pointer',
            transition: 'var(--mac-transition-fast)',
            '&:hover': { transform: 'translateY(-2px)', borderColor: 'var(--sakay-orange)' },
          }}
        >
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Pending Verifications
              </Typography>
              <AccessTimeIcon sx={{ color: '#EA580C', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: '#EA580C', mb: 0.5 }}>
              {isLoading ? <CircularProgress size={20} /> : kpis.verifications.pending.toLocaleString()}
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
              {kpis.todas.pendingReview} TODA • {kpis.verifications.pending - kpis.todas.pendingReview} Drivers
            </Typography>
          </CardContent>
        </Card>

        {/* Open Incidents */}
        <Card
          onClick={() => navigate('/incident-reports')}
          sx={{
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            backgroundColor: '#FFFFFF',
            cursor: 'pointer',
            transition: 'var(--mac-transition-fast)',
            '&:hover': { transform: 'translateY(-2px)', borderColor: 'var(--sakay-orange)' },
          }}
        >
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Open Incidents
              </Typography>
              <ReportProblemIcon sx={{ color: '#D93025', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: '#D93025', mb: 0.5 }}>
              {isLoading ? <CircularProgress size={20} /> : kpis.incidents.open.toLocaleString()}
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
              {kpis.incidents.total} Total Complaints
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 5. Row 1: Booking Trend Card & Driver Verification Card */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' },
          gap: 3.5,
          mb: 3.5,
        }}
      >
        <BookingTrendCard />
        <DriverVerificationCard data={stats?.driverBreakdown} />
      </Box>

      {/* 6. Row 2: Live Trips Map, Recent TODA Applications & Recent Incident Reports */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' },
          gap: 3.5,
        }}
      >
        <LiveTripsMapCard ongoingTripsCount={kpis.trips.ongoing} />
        <RecentTodaApplicationsCard applications={stats?.recentApplications} />
        <RecentIncidentReportsCard reports={stats?.recentIncidents} />
      </Box>
    </Box>
  );
};
