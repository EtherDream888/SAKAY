import React, { useState } from 'react';
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
  TextField,
  Alert,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';

import { MOCK_TODA_BOOKINGS, MOCK_TODA_INCIDENTS, CURRENT_TODA_PROFILE } from '../mockData/todaData';
import { TodaBooking, TodaIncident } from '../types/toda';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { MacConfirmDialog } from '../components/admin/MacConfirmDialog';
import { logTodaAction } from '../lib/auditLog';

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

  // Incident Triage Modals & Dialogs
  const [selectedIncident, setSelectedIncident] = useState<TodaIncident | null>(null);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);

  // Export Feedback Notification
  const [exportNotice, setExportNotice] = useState<string | null>(null);

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
    { label: 'Solo Charter (4 Seats)', value: 'Solo Charter' },
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

  // Export Action Mock Handler
  const handleExport = (reportName: string, format: 'PDF' | 'Excel') => {
    setExportNotice(`Generated ${reportName} in ${format} format. Download initiated.`);
    logTodaAction({
      actionType: 'REPORT_EXPORTED',
      targetId: reportName,
      targetName: `${reportName} (${format})`,
      details: `Exported ${reportName} for ${CURRENT_TODA_PROFILE.name}.`,
      category: 'Operations',
    });
    setTimeout(() => setExportNotice(null), 4000);
  };

  // Action: Escalate Incident to LGU
  const handleEscalateConfirm = (reason?: string) => {
    if (!selectedIncident) return;
    const finalReason = reason || 'Misconduct exceeds TODA local jurisdiction. Forwarded for official LGU franchise review.';

    setIncidents((prev) =>
      prev.map((i) =>
        i.id === selectedIncident.id
          ? {
              ...i,
              status: 'Escalated to LGU',
              escalationReason: finalReason,
              escalatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + ' • ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            }
          : i
      )
    );
    setSelectedIncident((prev) => (prev ? { ...prev, status: 'Escalated to LGU', escalationReason: finalReason } : null));

    logTodaAction({
      actionType: 'INCIDENT_ESCALATED_TO_LGU',
      targetId: selectedIncident.id,
      targetName: `Incident #${selectedIncident.id} (${selectedIncident.driverName})`,
      details: `Escalated incident to LGU Administrator. Escalation Rationale: ${finalReason}.`,
      category: 'Incident',
    });

    setEscalateDialogOpen(false);
  };

  // Action: Resolve Incident at TODA Level
  const handleResolveConfirm = (reason?: string) => {
    if (!selectedIncident) return;
    const finalFindings = reason || 'Case mediated and resolved at TODA level with driver corrective action.';

    setIncidents((prev) =>
      prev.map((i) =>
        i.id === selectedIncident.id
          ? { ...i, status: 'Resolved (TODA Level)', findings: finalFindings }
          : i
      )
    );
    setSelectedIncident((prev) => (prev ? { ...prev, status: 'Resolved (TODA Level)', findings: finalFindings } : null));

    logTodaAction({
      actionType: 'INCIDENT_RESOLVED_TODA_LEVEL',
      targetId: selectedIncident.id,
      targetName: `Incident #${selectedIncident.id} (${selectedIncident.driverName})`,
      details: `Resolved incident at TODA level. Findings: ${finalFindings}.`,
      category: 'Incident',
    });

    setResolveDialogOpen(false);
  };

  // Action: Dismiss Incident
  const handleDismissConfirm = (reason?: string) => {
    if (!selectedIncident) return;
    const finalFindings = reason || 'Unsubstantiated report dismissed following initial TODA inquiry.';

    setIncidents((prev) =>
      prev.map((i) =>
        i.id === selectedIncident.id
          ? { ...i, status: 'Dismissed', findings: finalFindings }
          : i
      )
    );
    setSelectedIncident((prev) => (prev ? { ...prev, status: 'Dismissed', findings: finalFindings } : null));

    logTodaAction({
      actionType: 'INCIDENT_DISMISSED',
      targetId: selectedIncident.id,
      targetName: `Incident #${selectedIncident.id}`,
      details: `Dismissed complaint after preliminary review. Notes: ${finalFindings}.`,
      category: 'Incident',
    });

    setDismissDialogOpen(false);
  };

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* Export Notification Toast */}
      {exportNotice && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: '10px' }} onClose={() => setExportNotice(null)}>
          {exportNotice}
        </Alert>
      )}

      {/* 1. Export Action Cards Bar */}
      <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', p: '24px', mb: 3.5, backgroundColor: '#FFFFFF' }}>
        <Typography sx={{ fontSize: '16px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 1 }}>
          TODA Compliance & Operations Report Generation
        </Typography>
        <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mb: 2.5 }}>
          Export localized datasets for TODA board reviews, Sangguniang Barangay audits, or LGU quarterly submissions:
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => handleExport('Daily Booking & Passenger Ledger', 'PDF')}
            startIcon={<PictureAsPdfIcon sx={{ color: '#DC2626' }} />}
            sx={{ height: 42, textTransform: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, borderColor: 'var(--mac-border-color)', color: 'var(--mac-text-primary)' }}
          >
            Booking Ledger (PDF)
          </Button>

          <Button
            variant="outlined"
            onClick={() => handleExport('Driver Trip Volume & Activity', 'Excel')}
            startIcon={<TableViewIcon sx={{ color: '#1E8E3E' }} />}
            sx={{ height: 42, textTransform: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, borderColor: 'var(--mac-border-color)', color: 'var(--mac-text-primary)' }}
          >
            Driver Trip Volume (Excel)
          </Button>

          <Button
            variant="outlined"
            onClick={() => handleExport('Estimated Gross Fare Value Report', 'PDF')}
            startIcon={<PictureAsPdfIcon sx={{ color: '#DC2626' }} />}
            sx={{ height: 42, textTransform: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, borderColor: 'var(--mac-border-color)', color: 'var(--mac-text-primary)' }}
          >
            Gross Fare Report (PDF)
          </Button>

          <Button
            variant="outlined"
            onClick={() => handleExport('TODA Incident Triage Summary', 'PDF')}
            startIcon={<PictureAsPdfIcon sx={{ color: '#DC2626' }} />}
            sx={{ height: 42, textTransform: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, borderColor: 'var(--mac-border-color)', color: 'var(--mac-text-primary)' }}
          >
            Incident Summary (PDF)
          </Button>
        </Box>
      </Card>

      {/* 2. Navigation Tabs */}
      <Box sx={{ borderBottom: '1px solid var(--mac-border-color)', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '14.5px',
              fontWeight: 600,
              color: 'var(--mac-text-muted)',
              minHeight: 48,
              '&.Mui-selected': { color: 'var(--sakay-orange)' },
            },
            '& .MuiTabs-indicator': { backgroundColor: 'var(--sakay-orange)' },
          }}
        >
          <Tab label={`Bookings Ledger (${bookings.length} Records)`} />
          <Tab label={`TODA Incident Review & Escalation (${incidents.length})`} />
        </Tabs>
      </Box>

      {/* TAB 0: Scoped Bookings Ledger */}
      {activeTab === 0 && (
        <Box>
          <FilterToolbar
            searchQuery={bookingSearch}
            onSearchChange={setBookingSearch}
            searchPlaceholder="Search booking code, passenger, driver, or plate..."
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
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>BOOKING CODE & TIME</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>COMMUTER / PASSENGER</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ASSIGNED CCTODA DRIVER</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>SERVICE ROUTE</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>TRIP MODE</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>FARE AMOUNT</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>STATUS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredBookings.map((bkg) => (
                  <TableRow key={bkg.id} sx={{ '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' } }}>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-primary)' }}>
                        {bkg.bookingCode}
                      </Typography>
                      <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                        {bkg.timestamp}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-primary)', fontWeight: 500 }}>
                        {bkg.passengerName}
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
                        {bkg.passengerPhone}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-primary)', fontWeight: 600 }}>
                        {bkg.driverName}
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
                        Plate: {bkg.vehiclePlate}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-primary)' }}>
                        {bkg.pickupLocation} → {bkg.dropoffLocation}
                      </Typography>
                      <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)' }}>
                        Distance: {bkg.distanceKm.toFixed(1)} km
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <Chip
                        label={bkg.tripMode}
                        size="small"
                        sx={{ fontSize: '12px', fontWeight: 600, backgroundColor: 'rgba(255, 107, 26, 0.12)', color: 'var(--sakay-orange)', height: 26 }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <Typography sx={{ fontSize: '15px', fontWeight: 700, color: 'var(--sakay-orange)' }}>
                        ₱{bkg.fareAmount.toFixed(2)}
                      </Typography>
                      <Typography sx={{ fontSize: '11px', color: 'var(--mac-text-muted)' }}>
                        {bkg.paymentMethod}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 2.2, px: 3 }}>
                      <StatusBadge status={bkg.status === 'Completed' ? 'Active' : 'Pending'} label={bkg.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* TAB 1: TODA-Scoped Incident Queue */}
      {activeTab === 1 && (
        <Box>
          <FilterToolbar
            searchQuery={incidentSearch}
            onSearchChange={setIncidentSearch}
            searchPlaceholder="Search incident ID, driver, category, or description..."
            selectFilters={[
              {
                id: 'incidentStatus',
                label: 'Status',
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
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>INCIDENT ID & TIME</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>CCTODA DRIVER</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>CATEGORY & REPORT BODY</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>REPORTER</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>STATUS</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredIncidents.map((inc) => (
                  <TableRow
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    sx={{
                      cursor: 'pointer',
                      transition: 'var(--mac-transition-fast)',
                      '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                    }}
                  >
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-primary)' }}>
                        {inc.id}
                      </Typography>
                      <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)' }}>
                        {inc.submittedAt}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-primary)' }}>
                        {inc.driverName}
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
                        Plate: {inc.vehiclePlate}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3, maxWidth: 360 }}>
                      <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--sakay-orange)' }}>
                        {inc.category}
                      </Typography>
                      <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-secondary)', mt: '3px' }}>
                        {inc.description}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-primary)', fontWeight: 500 }}>
                        {inc.reporterName}
                      </Typography>
                      <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)' }}>
                        {inc.reporterRole}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <StatusBadge status={inc.status as any} />
                    </TableCell>
                    <TableCell align="right" sx={{ py: 2.2, px: 3 }}>
                      <ActionButton
                        label="Triage"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIncident(inc);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* 3. Incident Review & Escalation Modal */}
      {selectedIncident && (
        <MacCenterModal
          open={Boolean(selectedIncident)}
          onClose={() => setSelectedIncident(null)}
          title={`TODA Incident Triage — ${selectedIncident.id}`}
          subtitle={`Driver: ${selectedIncident.driverName} (${selectedIncident.vehiclePlate})`}
          badge={<StatusBadge status={selectedIncident.status as any} />}
          maxWidth={680}
        >
          <Box sx={{ mb: 3 }}>
            <Box sx={{ backgroundColor: '#F8F9FA', p: 2, borderRadius: '10px', mb: 3 }}>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Incident Complaint Summary:</Typography>
              <Typography sx={{ fontSize: '14.5px', color: 'var(--mac-text-primary)', lineHeight: 1.6 }}>
                "{selectedIncident.description}"
              </Typography>
            </Box>

            {selectedIncident.findings && (
              <Box sx={{ backgroundColor: '#FAFAFC', p: 2, borderRadius: '10px', border: '1px solid var(--mac-border-color)', mb: 3 }}>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>TODA Investigation Findings:</Typography>
                <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-primary)' }}>
                  {selectedIncident.findings}
                </Typography>
              </Box>
            )}

            {selectedIncident.escalationReason && (
              <Box sx={{ backgroundColor: 'rgba(255, 107, 26, 0.08)', p: 2, borderRadius: '10px', border: '1px solid var(--sakay-orange-border)', mb: 3 }}>
                <Typography sx={{ fontSize: '12px', color: 'var(--sakay-orange)', fontWeight: 700, mb: '4px' }}>LGU Escalation Rationale:</Typography>
                <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-primary)' }}>
                  {selectedIncident.escalationReason}
                </Typography>
                <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)', mt: 0.5 }}>
                  Escalated on: {selectedIncident.escalatedAt}
                </Typography>
              </Box>
            )}

            {/* Triage Action Controls */}
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1.5 }}>
              TODA Administrative Triage Decision
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, justifyContent: 'space-between', p: 2, borderRadius: '10px', backgroundColor: '#F5F5F7' }}>
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                disabled={selectedIncident.status === 'Escalated to LGU'}
                onClick={() => setDismissDialogOpen(true)}
                sx={{ textTransform: 'none', borderRadius: '8px', fontSize: '13px' }}
              >
                Dismiss Case
              </Button>

              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SendIcon />}
                  disabled={selectedIncident.status === 'Escalated to LGU'}
                  onClick={() => setEscalateDialogOpen(true)}
                  sx={{
                    textTransform: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderColor: 'var(--sakay-orange-border)',
                    color: 'var(--sakay-orange)',
                    '&:hover': { backgroundColor: 'var(--sakay-orange-soft)' },
                  }}
                >
                  {selectedIncident.status === 'Escalated to LGU' ? 'Escalated to LGU' : 'Escalate to LGU Administrator'}
                </Button>

                <Button
                  variant="contained"
                  size="small"
                  startIcon={<CheckCircleIcon />}
                  disabled={selectedIncident.status === 'Escalated to LGU' || selectedIncident.status === 'Resolved (TODA Level)'}
                  onClick={() => setResolveDialogOpen(true)}
                  sx={{
                    textTransform: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: '#1E8E3E',
                    '&:hover': { backgroundColor: '#137333' },
                  }}
                >
                  Resolve at TODA Level
                </Button>
              </Box>
            </Box>
          </Box>
        </MacCenterModal>
      )}

      {/* 4. Escalate to LGU Confirmation Dialog */}
      {selectedIncident && (
        <MacConfirmDialog
          open={escalateDialogOpen}
          onClose={() => setEscalateDialogOpen(false)}
          title="Escalate Incident to LGU Administrator?"
          message={`Forward this complaint involving "${selectedIncident.driverName}" directly to the LGU Franchising Office for official disciplinary investigation.`}
          confirmLabel="Escalate to LGU"
          confirmVariant="orange"
          requireReason
          reasonPlaceholder="Specify escalation reason (e.g. Harassment, physical threat, or unresolved strike dispute)..."
          onConfirm={handleEscalateConfirm}
        />
      )}

      {/* 5. Resolve Confirmation Dialog */}
      {selectedIncident && (
        <MacConfirmDialog
          open={resolveDialogOpen}
          onClose={() => setResolveDialogOpen(false)}
          title="Resolve Incident at TODA Level?"
          message={`Mark this case as resolved under TODA mediation for "${selectedIncident.driverName}".`}
          confirmLabel="Resolve Case"
          confirmVariant="primary"
          requireReason
          reasonPlaceholder="Document TODA mediation findings (e.g. Fare reimbursed, passenger apologized to)..."
          onConfirm={handleResolveConfirm}
        />
      )}

      {/* 6. Dismiss Confirmation Dialog */}
      {selectedIncident && (
        <MacConfirmDialog
          open={dismissDialogOpen}
          onClose={() => setDismissDialogOpen(false)}
          title="Dismiss Incident Report?"
          message={`Dismiss complaint for "${selectedIncident.driverName}"?`}
          confirmLabel="Dismiss Report"
          confirmVariant="danger"
          requireReason
          reasonPlaceholder="Specify reason for dismissal..."
          onConfirm={handleDismissConfirm}
        />
      )}
    </Box>
  );
};
