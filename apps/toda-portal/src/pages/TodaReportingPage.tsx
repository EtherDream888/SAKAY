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
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';

import { MOCK_TODA_BOOKINGS, MOCK_TODA_INCIDENTS, CURRENT_TODA_PROFILE } from '../mockData/todaData';
import { TodaBooking, TodaIncident } from '../types/toda';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { MacConfirmDialog } from '../components/admin/MacConfirmDialog';
import { recordTodaAuditAction } from '../services/todaApiService';

export const TodaReportingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [bookings, setBookings] = useState<TodaBooking[]>(MOCK_TODA_BOOKINGS);
  const [incidents, setIncidents] = useState<TodaIncident[]>(MOCK_TODA_INCIDENTS);

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
      details: `Generated and exported ${reportName} in ${format} format for ${CURRENT_TODA_PROFILE.name}.`,
      category: 'Operations',
    });
  };

  // Incident Handlers
  const handleResolveIncident = () => {
    if (!selectedIncident) return;

    setIncidents((prev) =>
      prev.map((i) =>
        i.id === selectedIncident.id ? { ...i, status: 'Resolved (TODA Level)' } : i
      )
    );

    recordTodaAuditAction({
      actionType: 'INCIDENT_RESOLVED_TODA_LEVEL',
      targetId: selectedIncident.id,
      targetName: selectedIncident.driverName,
      details: `Resolved incident #${selectedIncident.id} at TODA level. Drivers advised on fare compliance.`,
      category: 'Incident',
    });

    setResolveDialogOpen(false);
    setSelectedIncident(null);
  };

  const handleEscalateIncident = () => {
    if (!selectedIncident) return;

    setIncidents((prev) =>
      prev.map((i) =>
        i.id === selectedIncident.id ? { ...i, status: 'Escalated to LGU' } : i
      )
    );

    recordTodaAuditAction({
      actionType: 'INCIDENT_ESCALATED_TO_LGU',
      targetId: selectedIncident.id,
      targetName: selectedIncident.driverName,
      details: `Escalated incident #${selectedIncident.id} to City LGU Franchising Board. Reason: Exceeds TODA level jurisdiction threshold.`,
      category: 'Incident',
    });

    setEscalateDialogOpen(false);
    setSelectedIncident(null);
  };

  const isIncidentPending = selectedIncident?.status === 'Pending Review' || selectedIncident?.status === 'Under Investigation';

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6, position: 'relative' }}>
      {/* 1. Visible Toast Notification with Decrementing Progress Timer */}
      {exportNotice && (
        <Box
          onMouseEnter={() => setIsToastHovered(true)}
          onMouseLeave={() => setIsToastHovered(false)}
          sx={{
            position: 'fixed',
            bottom: 28,
            right: 32,
            zIndex: 1000,
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid var(--sakay-orange-border)',
            boxShadow: 'var(--mac-shadow-popover)',
            width: 400,
            overflow: 'hidden',
            transition: 'all 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <Box sx={{ p: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CheckCircleIcon sx={{ color: '#059669', fontSize: 26 }} />
              <Box>
                <Typography sx={{ fontSize: '15px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                  Report Generated Successfully
                </Typography>
                <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', mt: 0.25 }}>
                  {exportNotice} Your download is ready.
                </Typography>
              </Box>
            </Box>
            <Button
              size="small"
              onClick={() => setExportNotice(null)}
              sx={{ minWidth: 28, p: 0.5, color: 'var(--mac-text-muted)', '&:hover': { color: 'var(--mac-text-primary)' } }}
            >
              <CloseIcon fontSize="small" />
            </Button>
          </Box>
          <LinearProgress
            variant="determinate"
            value={toastProgress}
            sx={{
              height: 4,
              backgroundColor: 'rgba(255, 107, 26, 0.14)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: 'var(--sakay-orange)',
                transition: 'none',
              },
            }}
          />
        </Box>
      )}

      {/* 2. Top Sub-Header Navigation Tabs */}
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
          <Tab icon={<AssessmentIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="TODA Operational Reports & Trips" />
          <Tab icon={<ReportProblemIcon sx={{ fontSize: 20 }} />} iconPosition="start" label={`Incident Reports & Complaints (${incidents.length})`} />
        </Tabs>
      </Box>

      {activeTab === 0 ? (
        <>
          {/* 3. Export Preset Action Bar */}
          <Card
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 'var(--mac-radius-lg)',
              border: '1px solid var(--mac-border-color)',
              backgroundColor: '#FFFFFF',
              boxShadow: 'var(--mac-shadow-card)',
              mb: 3.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '18px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                Export Scoped TODA Operational Summaries
              </Typography>
              <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                Download compiled trip volume and gross fare reports for {CURRENT_TODA_PROFILE.name}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<PictureAsPdfIcon sx={{ color: '#D93025' }} />}
                onClick={() => handleExportReport('Daily TODA Booking Report', 'PDF')}
                sx={{
                  height: 40,
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--mac-text-primary)',
                  borderColor: 'var(--mac-border-color)',
                  '&:hover': { backgroundColor: 'var(--sakay-orange-soft)', borderColor: 'var(--sakay-orange-border)' },
                }}
              >
                Daily Trip Summary (PDF)
              </Button>

              <Button
                variant="outlined"
                startIcon={<TableViewIcon sx={{ color: '#1E8E3E' }} />}
                onClick={() => handleExportReport('Weekly TODA Driver Activity Report', 'Excel')}
                sx={{
                  height: 40,
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--mac-text-primary)',
                  borderColor: 'var(--mac-border-color)',
                  '&:hover': { backgroundColor: 'var(--sakay-orange-soft)', borderColor: 'var(--sakay-orange-border)' },
                }}
              >
                Weekly Driver Activity (Excel)
              </Button>
            </Box>
          </Card>

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
                {filteredBookings.map((bkg) => (
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
                        {bkg.pickupLocation} $\rightarrow$ {bkg.dropoffLocation}
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
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        /* 6. Incident Management Tab (Replaces Triage Terminology) */
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
                {filteredIncidents.map((inc) => (
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
                            borderColor: 'var(--sakay-orange)',
                          },
                        }}
                      >
                        Review Incident
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Incident Review Centered Modal */}
      {selectedIncident && (
        <MacCenterModal
          open={Boolean(selectedIncident)}
          onClose={() => setSelectedIncident(null)}
          title={`Review Incident Report — #${selectedIncident.id}`}
          subtitle={`Reported: ${selectedIncident.submittedAt} • TODA Board Review`}
          badge={<StatusBadge status={selectedIncident.status} />}
          maxWidth={720}
          primaryActionLabel={isIncidentPending ? "Resolve at TODA Level" : undefined}
          onPrimaryAction={isIncidentPending ? () => setResolveDialogOpen(true) : undefined}
          secondaryActionLabel={isIncidentPending ? "Escalate to LGU" : "Close"}
          onSecondaryAction={() => {
            if (isIncidentPending) {
              setEscalateDialogOpen(true);
            } else {
              setSelectedIncident(null);
            }
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ backgroundColor: '#F5F5F7', padding: '18px 20px', borderRadius: '12px' }}>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mb: '4px' }}>Involved Driver & Vehicle</Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                {selectedIncident.driverName} ({selectedIncident.vehiclePlate})
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mb: '4px' }}>Complaint Category</Typography>
              <Typography sx={{ fontSize: '15.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                {selectedIncident.category}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mb: '4px' }}>Detailed Complaint Description</Typography>
              <Typography sx={{ fontSize: '15px', color: 'var(--mac-text-primary)', lineHeight: 1.5, backgroundColor: '#FFFFFF', border: '1px solid var(--mac-border-color)', padding: '14px 18px', borderRadius: '10px' }}>
                "{selectedIncident.description}"
              </Typography>
            </Box>
          </Box>
        </MacCenterModal>
      )}

      {/* Confirmation Dialogs */}
      <MacConfirmDialog
        open={resolveDialogOpen}
        onClose={() => setResolveDialogOpen(false)}
        title="Resolve Incident at TODA Level?"
        message={`Mark incident #${selectedIncident?.id} as resolved. Confirm that driver has been advised on fare compliance.`}
        confirmLabel="Confirm Resolution"
        confirmVariant="primary"
        onConfirm={handleResolveIncident}
      />

      <MacConfirmDialog
        open={escalateDialogOpen}
        onClose={() => setEscalateDialogOpen(false)}
        title="Escalate Incident to City LGU?"
        message={`Escalate incident #${selectedIncident?.id} to the City LGU Franchising Office for formal investigation.`}
        confirmLabel="Confirm Escalation"
        confirmVariant="danger"
        onConfirm={handleEscalateIncident}
      />
    </Box>
  );
};
