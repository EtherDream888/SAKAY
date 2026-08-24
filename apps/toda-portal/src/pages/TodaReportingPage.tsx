import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Card,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';

import { TodaBooking, TodaIncident } from '../types/toda';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { MacConfirmDialog } from '../components/admin/MacConfirmDialog';
import {
  fetchTodaOperationsTrips,
  fetchTodaIncidents,
  fetchTodaProfile,
  escalateIncidentToLgu,
  submitIncidentRemarks,
  recordTodaAuditAction,
} from '../services/todaApiService';

export const TodaReportingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [bookings, setBookings] = useState<TodaBooking[]>([]);
  const [incidents, setIncidents] = useState<TodaIncident[]>([]);
  const [todaName, setTodaName] = useState<string>('TODA Association');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Booking Filters
  const [bookingSearch, setBookingSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('All');

  // Incident Filters
  const [incidentSearch, setIncidentSearch] = useState('');
  const [incidentStatusFilter, setIncidentStatusFilter] = useState('All');

  // Incident Review Modals & Dialogs
  const [selectedIncident, setSelectedIncident] = useState<TodaIncident | null>(null);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);

  // Report Export Toast Notification with Progress Bar Timer
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [toastProgress, setToastProgress] = useState(100);
  const [isToastHovered, setIsToastHovered] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tripsData, incData, profileData] = await Promise.all([
        fetchTodaOperationsTrips(),
        fetchTodaIncidents(),
        fetchTodaProfile(),
      ]);

      if (profileData) setTodaName(profileData.name);

      const mappedBookings: TodaBooking[] = (tripsData || []).map((b: any) => ({
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

      const mappedIncidents: TodaIncident[] = (incData || []).map((inc: any) => ({
        id: inc.incident_id.slice(0, 8).toUpperCase(),
        bookingId: inc.trip_id || 'BKG-001',
        driverName: inc.driver_name || 'Driver',
        vehiclePlate: inc.vehicle_plate || 'N/A',
        category: inc.category || 'Service Quality',
        description: inc.description || '',
        reporterName: inc.passenger_name || 'Passenger',
        reporterRole: 'Passenger',
        submittedAt: inc.created_at ? new Date(inc.created_at).toLocaleDateString('en-US') : 'Recent',
        status: (inc.status === 'Resolved'
          ? 'Resolved (TODA Level)'
          : inc.status === 'Under Investigation'
          ? 'Under Investigation'
          : 'Pending Review') as any,
        tripId: inc.trip_id || 'TRIP-001',
        evidenceFiles: [],
      }));

      setBookings(mappedBookings);
      setIncidents(mappedIncidents);
    } catch (err) {
      console.error('[TodaReporting] Error loading data from database:', err);
      setBookings([]);
      setIncidents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Toast Auto-Dismissal Timer & Progress Decrement
  useEffect(() => {
    if (!exportNotice) {
      setToastProgress(100);
      return;
    }

    const durationMs = 4000;
    const intervalMs = 40;
    const step = (intervalMs / durationMs) * 100;

    const timer = setInterval(() => {
      if (!isToastHovered) {
        setToastProgress((prev) => {
          if (prev <= 0) {
            clearInterval(timer);
            setExportNotice(null);
            return 100;
          }
          return prev - step;
        });
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [exportNotice, isToastHovered]);

  // Filtered Bookings
  const filteredBookings = bookings.filter((bkg) => {
    const matchesSearch =
      bkg.bookingCode.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      bkg.passengerName.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      bkg.driverName.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      bkg.vehiclePlate.toLowerCase().includes(bookingSearch.toLowerCase());

    const matchesMode = modeFilter === 'All' || bkg.tripMode === modeFilter;
    return matchesSearch && matchesMode;
  });

  // Filtered Incidents
  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      inc.id.toLowerCase().includes(incidentSearch.toLowerCase()) ||
      inc.driverName.toLowerCase().includes(incidentSearch.toLowerCase()) ||
      inc.category.toLowerCase().includes(incidentSearch.toLowerCase()) ||
      inc.description.toLowerCase().includes(incidentSearch.toLowerCase());

    const matchesStatus = incidentStatusFilter === 'All' || inc.status === incidentStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const modeOptions: FilterOption[] = [
    { label: 'All Trip Modes', value: 'All' },
    { label: 'Single Commuter', value: 'Single Commuter' },
    { label: 'Solo Charter', value: 'Solo Charter' },
    { label: 'Shared Ride', value: 'Shared Ride' },
  ];

  const incidentStatusOptions: FilterOption[] = [
    { label: 'All Incident Statuses', value: 'All' },
    { label: 'Pending Review', value: 'Pending Review' },
    { label: 'Under Investigation', value: 'Under Investigation' },
    { label: 'Resolved (TODA Level)', value: 'Resolved (TODA Level)' },
    { label: 'Escalated to LGU', value: 'Escalated to LGU' },
    { label: 'Dismissed', value: 'Dismissed' },
  ];

  // Action: Export Report
  const handleExportReport = (reportName: string, format: 'PDF' | 'Excel') => {
    setExportNotice(`${reportName} exported as ${format}.`);
    setToastProgress(100);

    recordTodaAuditAction({
      actionType: 'REPORT_EXPORTED',
      targetId: 'REPORT-001',
      targetName: reportName,
      details: `Generated and exported ${reportName} in ${format} format for ${todaName}.`,
      category: 'Operations',
    });
  };

  // Incident Handlers
  const handleResolveIncident = async () => {
    if (!selectedIncident) return;

    await submitIncidentRemarks(selectedIncident.id, 'Resolved at TODA administration level.');

    setIncidents((prev) =>
      prev.map((i) =>
        i.id === selectedIncident.id ? { ...i, status: 'Resolved (TODA Level)' } : i
      )
    );

    setResolveDialogOpen(false);
    setSelectedIncident(null);
  };

  const handleEscalateIncident = async () => {
    if (!selectedIncident) return;

    await escalateIncidentToLgu(selectedIncident.id, 'Escalated from TODA portal review.');

    setIncidents((prev) =>
      prev.map((i) =>
        i.id === selectedIncident.id ? { ...i, status: 'Escalated to LGU' } : i
      )
    );

    setEscalateDialogOpen(false);
    setSelectedIncident(null);
  };

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* 1. Page Header & Refresh Control */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '20px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
            TODA Operations Reports & Incident Grievances
          </Typography>
          <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', mt: '3px' }}>
            Official operational trip audits and passenger complaints for {todaName}
          </Typography>
        </Box>
        <Button
          onClick={loadData}
          startIcon={<RefreshIcon />}
          variant="outlined"
          size="small"
          sx={{ textTransform: 'none', borderColor: 'var(--mac-border-color)', color: 'var(--mac-text-primary)' }}
        >
          Refresh
        </Button>
      </Box>

      {/* 2. Top Navigation Tabs */}
      <Box sx={{ borderBottom: '1px solid var(--mac-border-color)', mb: 3.5 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            minHeight: 46,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '15.5px',
              fontWeight: 600,
              minHeight: 46,
              color: 'var(--mac-text-muted)',
              '&.Mui-selected': { color: 'var(--sakay-orange)' },
            },
            '& .MuiTabs-indicator': { backgroundColor: 'var(--sakay-orange)', height: 3 },
          }}
        >
          <Tab icon={<AssessmentIcon sx={{ fontSize: 20 }} />} iconPosition="start" label={`Operations Trip Ledger (${bookings.length})`} />
          <Tab icon={<ReportProblemIcon sx={{ fontSize: 20 }} />} iconPosition="start" label={`Incident Reports & Complaints (${incidents.length})`} />
        </Tabs>
      </Box>

      {/* Active Tab Content */}
      {activeTab === 0 ? (
        <>
          {/* 3. Operational Summary KPI Cards */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2.5,
              mb: 3.5,
            }}
          >
            <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
              <Box sx={{ p: '20px 24px' }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1 }}>Total Dispatched Trips</Typography>
                <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>{bookings.length}</Typography>
                <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)', mt: 0.5 }}>Recorded bookings</Typography>
              </Box>
            </Card>

            <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
              <Box sx={{ p: '20px 24px' }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1 }}>Completed Trips</Typography>
                <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#059669' }}>{bookings.filter((b) => b.status === 'Completed').length}</Typography>
                <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)', mt: 0.5 }}>Successful arrivals</Typography>
              </Box>
            </Card>

            <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
              <Box sx={{ p: '20px 24px' }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1 }}>Shared Rides</Typography>
                <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--sakay-orange)' }}>{bookings.filter((b) => b.tripMode === 'Shared Ride').length}</Typography>
                <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)', mt: 0.5 }}>Multi-passenger carpools</Typography>
              </Box>
            </Card>

            <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
              <Box sx={{ p: '20px 24px' }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1 }}>Cancelled Rides</Typography>
                <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#DC2626' }}>{bookings.filter((b) => b.status === 'Cancelled').length}</Typography>
                <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)', mt: 0.5 }}>Cancelled trips</Typography>
              </Box>
            </Card>
          </Box>

          {/* 4. Filter Toolbar */}
          <FilterToolbar
            searchQuery={bookingSearch}
            onSearchChange={setBookingSearch}
            searchPlaceholder="Search trip code, passenger, driver, or plate..."
            selectFilters={[
              {
                id: 'mode',
                label: 'Trip Mode',
                value: modeFilter,
                options: modeOptions,
                onChange: setModeFilter,
              },
            ]}
            onResetFilters={() => {
              setBookingSearch('');
              setModeFilter('All');
            }}
          />

          {/* 5. Bookings History Table */}
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
                  <TableCell sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>BOOKING CODE</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>PASSENGER</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ASSIGNED DRIVER</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ROUTE DISTANCE</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>TRIP MODE & FARE</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>STATUS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={28} sx={{ color: 'var(--sakay-orange)', mb: 1 }} />
                      <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)' }}>Loading trip records...</Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>No Trip Records Found</Typography>
                      <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mt: 0.5 }}>
                        There are currently no trip records matching your selected filter.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map((bkg) => (
                    <TableRow key={bkg.id} sx={{ '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' } }}>
                      <TableCell sx={{ py: 2, px: 3, fontWeight: 600, fontSize: '14.5px', color: 'var(--sakay-orange)' }}>
                        {bkg.bookingCode}
                      </TableCell>

                      <TableCell sx={{ py: 2, px: 3 }}>
                        <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                          {bkg.passengerName}
                        </Typography>
                        <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>
                          {bkg.passengerPhone}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ py: 2, px: 3 }}>
                        <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                          {bkg.driverName}
                        </Typography>
                        <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>
                          {bkg.vehiclePlate}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ py: 2, px: 3 }}>
                        <Typography sx={{ fontSize: '14.5px', color: 'var(--mac-text-primary)' }}>
                          {bkg.pickupLocation} → {bkg.dropoffLocation}
                        </Typography>
                        <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>
                          {bkg.distanceKm} km
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ py: 2, px: 3 }}>
                        <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                          ₱{bkg.fareAmount}
                        </Typography>
                        <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>
                          {bkg.tripMode} (Cash)
                        </Typography>
                      </TableCell>

                      <TableCell align="right" sx={{ py: 2, px: 3 }}>
                        <StatusBadge status={bkg.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        /* 6. Incident Management Tab */
        <>
          <FilterToolbar
            searchQuery={incidentSearch}
            onSearchChange={setIncidentSearch}
            searchPlaceholder="Search incident ID, driver name, category, or description..."
            selectFilters={[
              {
                id: 'status',
                label: 'Incident Status',
                value: incidentStatusFilter,
                options: incidentStatusOptions,
                onChange: setIncidentStatusFilter,
              },
            ]}
            onResetFilters={() => {
              setIncidentSearch('');
              setIncidentStatusFilter('All');
            }}
          />

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
                  <TableCell sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>INCIDENT ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>INVOLVED DRIVER</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>COMPLAINT CATEGORY</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>DATE SUBMITTED</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>STATUS</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={28} sx={{ color: 'var(--sakay-orange)', mb: 1 }} />
                      <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)' }}>Loading incident reports...</Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredIncidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>No Incident Reports Found</Typography>
                      <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mt: 0.5 }}>
                        There are currently no passenger complaints recorded.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIncidents.map((inc) => (
                    <TableRow key={inc.id} sx={{ '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' } }}>
                      <TableCell sx={{ py: 2, px: 3, fontWeight: 600, fontSize: '14.5px', color: 'var(--sakay-orange)' }}>
                        #{inc.id}
                      </TableCell>

                      <TableCell sx={{ py: 2, px: 3 }}>
                        <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                          {inc.driverName}
                        </Typography>
                        <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>
                          Plate: {inc.vehiclePlate}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ py: 2, px: 3 }}>
                        <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                          {inc.category}
                        </Typography>
                        <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>
                          Reporter: {inc.reporterName} ({inc.reporterRole})
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ py: 2, px: 3, fontSize: '14px', color: 'var(--mac-text-secondary)' }}>
                        {inc.submittedAt}
                      </TableCell>

                      <TableCell sx={{ py: 2, px: 3 }}>
                        <StatusBadge status={inc.status} />
                      </TableCell>

                      <TableCell align="right" sx={{ py: 2, px: 3 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<VisibilityIcon fontSize="small" />}
                          onClick={() => setSelectedIncident(inc)}
                          sx={{
                            height: 36,
                            px: 2,
                            borderRadius: '8px',
                            fontSize: '13.5px',
                            fontWeight: 600,
                            textTransform: 'none',
                            color: 'var(--sakay-orange)',
                            borderColor: 'var(--sakay-orange-border)',
                            backgroundColor: 'var(--sakay-orange-soft)',
                            whiteSpace: 'nowrap',
                            '&:hover': {
                              backgroundColor: 'var(--sakay-orange)',
                              color: '#FFFFFF',
                            },
                          }}
                        >
                          Review Complaint
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Incident Review Detail Modal */}
      {selectedIncident && (
        <MacCenterModal
          open={Boolean(selectedIncident)}
          onClose={() => setSelectedIncident(null)}
          title={`Incident Report #${selectedIncident.id}`}
          subtitle={`Category: ${selectedIncident.category} • Submitted by ${selectedIncident.reporterName}`}
          maxWidth={640}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ backgroundColor: '#F8FAFC', p: 2.5, borderRadius: '12px', border: '1px solid var(--mac-border-color)' }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1 }}>
                Complaint Description
              </Typography>
              <Typography sx={{ fontSize: '14.5px', color: 'var(--mac-text-primary)', lineHeight: 1.6 }}>
                {selectedIncident.description || 'No detailed description provided.'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, pt: 2, borderTop: '1px solid var(--mac-border-color)' }}>
              <Button
                variant="outlined"
                onClick={() => setEscalateDialogOpen(true)}
                sx={{ textTransform: 'none', borderColor: '#DC2626', color: '#DC2626' }}
              >
                Escalate to City LGU
              </Button>
              <Button
                variant="contained"
                onClick={() => setResolveDialogOpen(true)}
                sx={{ textTransform: 'none', backgroundColor: '#059669', color: '#FFFFFF' }}
              >
                Mark Resolved (TODA Level)
              </Button>
            </Box>
          </Box>
        </MacCenterModal>
      )}

      {/* Confirmation Dialogs */}
      <MacConfirmDialog
        open={resolveDialogOpen}
        onClose={() => setResolveDialogOpen(false)}
        onConfirm={handleResolveIncident}
        title="Resolve Incident at TODA Level?"
        message="This will mark the complaint as resolved internally by the TODA administration board."
        confirmLabel="Confirm Resolution"
      />

      <MacConfirmDialog
        open={escalateDialogOpen}
        onClose={() => setEscalateDialogOpen(false)}
        onConfirm={handleEscalateIncident}
        title="Escalate Incident to City LGU?"
        message="This will forward the complaint to the Calapan City Transportation Board for formal municipal investigation."
        confirmLabel="Escalate to LGU"
        confirmVariant="danger"
      />
    </Box>
  );
};
