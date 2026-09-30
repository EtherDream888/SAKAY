import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, IconButton, CircularProgress, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import RouteIcon from '@mui/icons-material/Route';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FlagIcon from '@mui/icons-material/Flag';
import { useNavigate } from 'react-router-dom';

import { WelcomeHeader } from '../components/layout/WelcomeHeader';
import { BookingTrendCard } from '../components/dashboard/BookingTrendCard';
import { DriverVerificationCard } from '../components/dashboard/DriverVerificationCard';
import { LiveTripsMapCard } from '../components/dashboard/LiveTripsMapCard';
import { RecentIncidentReportsCard } from '../components/dashboard/RecentIncidentReportsCard';
import { RecentTodaApplicationsCard } from '../components/dashboard/RecentTodaApplicationsCard';
import { fetchDashboardStats, DashboardStats, fetchAdminReviewFlags, resolveAdminReviewFlag } from '../services/adminApiService';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dismissible alert states
  const [showTodaAlert, setShowTodaAlert] = useState(true);
  const [showOverdueAlert, setShowOverdueAlert] = useState(true);

  // Administrative review flags (Rules 2.4, 2.5, 3.7)
  const [adminFlags, setAdminFlags] = useState<any[]>([]);
  const [selectedFlag, setSelectedFlag] = useState<any | null>(null);
  const [flagResolutionText, setFlagResolutionText] = useState('');
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);

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

    fetchAdminReviewFlags()
      .then((flags) => {
        if (isMounted) setAdminFlags(flags || []);
      })
      .catch((err) => {
        console.warn('[DashboardPage] Failed to fetch admin flags:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleResolveFlag = async () => {
    if (!selectedFlag) return;
    try {
      await resolveAdminReviewFlag(selectedFlag.flag_id, flagResolutionText || 'Resolved by LGU Administrator');
      setAdminFlags((prev) =>
        prev.map((f) =>
          f.flag_id === selectedFlag.flag_id
            ? { ...f, status: 'Resolved', resolution: flagResolutionText || 'Resolved' }
            : f
        )
      );
      setFlagDialogOpen(false);
      setSelectedFlag(null);
      setFlagResolutionText('');
    } catch (err) {
      console.error('[DashboardPage] Flag resolve error:', err);
    }
  };

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

      {/* 3B. Administrative Review Flags Card (Rules 2.4, 2.5, 3.7) */}
      {adminFlags.some((f) => f.status === 'Pending') && (
        <Card
          sx={{
            mb: 3.5,
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid #CBD5E1',
            backgroundColor: '#F8FAFC',
            boxShadow: 'var(--mac-shadow-subtle)',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              p: '16px 20px',
              backgroundColor: '#EDE9FE',
              borderBottom: '1px solid #DDD6FE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <FlagIcon sx={{ color: '#6D28D9', fontSize: 22 }} />
              <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#4C1D95' }}>
                Administrative Review Flags ({adminFlags.filter((f) => f.status === 'Pending').length} Pending Action)
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '12px', color: '#6D28D9', fontWeight: 500 }}>
              Batch 1 Governance (Rules 2.4, 2.5, 3.7)
            </Typography>
          </Box>
          <CardContent sx={{ p: '16px 20px !important' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {adminFlags
                .filter((f) => f.status === 'Pending')
                .slice(0, 5)
                .map((flag) => (
                  <Box
                    key={flag.flag_id}
                    sx={{
                      p: 1.5,
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 1.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Chip
                        label={flag.type}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '11px',
                          backgroundColor:
                            flag.type === 'ROSTER_MISMATCH'
                              ? '#FEE2E2'
                              : flag.type === 'TERMINAL_RELOCATION_PENDING'
                              ? '#FEF3C7'
                              : '#FFEDD5',
                          color:
                            flag.type === 'ROSTER_MISMATCH'
                              ? '#DC2626'
                              : flag.type === 'TERMINAL_RELOCATION_PENDING'
                              ? '#D97706'
                              : '#EA580C',
                        }}
                      />
                      <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                        {flag.subject_type}: <span style={{ fontFamily: 'monospace' }}>{flag.subject_id}</span>
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
                        Rule {flag.source_rule} • {new Date(flag.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>

                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => {
                        setSelectedFlag(flag);
                        setFlagDialogOpen(true);
                      }}
                      sx={{
                        backgroundColor: '#6D28D9',
                        '&:hover': { backgroundColor: '#5B21B6' },
                        fontSize: '12px',
                        textTransform: 'none',
                        fontWeight: 600,
                        height: 30,
                      }}
                    >
                      Resolve Flag
                    </Button>
                  </Box>
                ))}
            </Box>
          </CardContent>
        </Card>
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
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Passengers
              </Typography>
              <PeopleIcon sx={{ color: 'var(--sakay-orange)', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '25px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              {isLoading ? <CircularProgress size={20} /> : kpis.passengers.total.toLocaleString()}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
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
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Drivers
              </Typography>
              <DirectionsCarIcon sx={{ color: 'var(--sakay-orange)', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '25px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              {isLoading ? <CircularProgress size={20} /> : kpis.drivers.total.toLocaleString()}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
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
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Accredited TODAs
              </Typography>
              <AccountBalanceIcon sx={{ color: 'var(--sakay-orange)', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '25px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              {isLoading ? <CircularProgress size={20} /> : kpis.todas.total.toLocaleString()}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
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
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Completed Trips
              </Typography>
              <RouteIcon sx={{ color: 'var(--sakay-orange)', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '25px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              {isLoading ? <CircularProgress size={20} /> : kpis.trips.total.toLocaleString()}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
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
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Pending Verifications
              </Typography>
              <AccessTimeIcon sx={{ color: '#EA580C', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '25px', fontWeight: 700, color: '#EA580C', mb: 0.5 }}>
              {isLoading ? <CircularProgress size={20} /> : kpis.verifications.pending.toLocaleString()}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
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
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Open Incidents
              </Typography>
              <ReportProblemIcon sx={{ color: '#D93025', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '25px', fontWeight: 700, color: '#D93025', mb: 0.5 }}>
              {isLoading ? <CircularProgress size={20} /> : kpis.incidents.open.toLocaleString()}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
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

      {/* Flag Resolution Dialog */}
      <Dialog open={flagDialogOpen} onClose={() => setFlagDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '16px' }}>
          Resolve Administrative Flag ({selectedFlag?.type})
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-secondary)', mb: 2 }}>
            Provide resolution notes for {selectedFlag?.subject_type} {selectedFlag?.subject_id} (Rule {selectedFlag?.source_rule}).
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Resolution Notes"
            value={flagResolutionText}
            onChange={(e) => setFlagResolutionText(e.target.value)}
            placeholder="e.g. Verified with manual certificate, franchise validated, or inspection completed..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setFlagDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleResolveFlag}
            variant="contained"
            sx={{ backgroundColor: '#6D28D9', '&:hover': { backgroundColor: '#5B21B6' }, textTransform: 'none', fontWeight: 600 }}
          >
            Mark Resolved
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
