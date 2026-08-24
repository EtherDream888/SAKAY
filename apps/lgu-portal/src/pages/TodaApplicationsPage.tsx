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
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Button,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

import { TodaApplicationRecord } from '../mockData/adminData';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { MacConfirmDialog } from '../components/admin/MacConfirmDialog';
import { DocumentPreviewModal } from '../components/admin/DocumentPreviewModal';
import {
  fetchTodaApplications,
  approveTodaApplication,
  returnTodaApplicationForCorrection,
  rejectTodaApplication,
  recordAdminAuditAction,
} from '../services/adminApiService';

/**
 * ============================================================================
 * TODA APPLICATIONS MANAGEMENT PAGE
 * ============================================================================
 * Purpose:
 *   Official LGU administrative interface for reviewing, approving,
 *   returning for correction, and rejecting TODA accreditation applications.
 *   Connected 100% directly to the live Supabase PostgreSQL database.
 * ============================================================================
 */
export const TodaApplicationsPage: React.FC = () => {
  // State: Real database records
  const [applications, setApplications] = useState<TodaApplicationRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [reminderSent, setReminderSent] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<{ name: string; type: string } | null>(null);

  // Notification Snackbar
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // Selected Application for Review Modal
  const [selectedApp, setSelectedApp] = useState<TodaApplicationRecord | null>(null);

  // Confirmation Dialog States
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [resubmissionDialogOpen, setResubmissionDialogOpen] = useState(false);

  /**
   * Load TODA applications from Supabase database
   */
  const loadApplications = async () => {
    setIsLoading(true);
    try {
      const data = await fetchTodaApplications();
      setApplications(data);
    } catch (err) {
      console.error('[TodaApplicationsPage] Failed to fetch applications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  // Filter logic: Search query across name, acronym, representative, barangay, or ID
  const filteredApps = applications.filter((app) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      app.name.toLowerCase().includes(q) ||
      (app.acronym && app.acronym.toLowerCase().includes(q)) ||
      app.representative.toLowerCase().includes(q) ||
      app.barangay.toLowerCase().includes(q) ||
      app.id.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Summary counts for KPI header cards
  const pendingCount = applications.filter((a) => a.status === 'Pending').length;
  const underReviewCount = applications.filter((a) => a.status === 'Under Review').length;
  const approvedCount = applications.filter((a) => a.status === 'Approved').length;
  const declinedCount = applications.filter(
    (a) => a.status === 'Declined' || a.status === 'Resubmission Required'
  ).length;

  const statusOptions: FilterOption[] = [
    { label: 'All Statuses', value: 'All' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Under Review', value: 'Under Review' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Declined', value: 'Declined' },
    { label: 'Resubmission Required', value: 'Resubmission Required' },
  ];

  const dateOptions: FilterOption[] = [
    { label: 'All Dates', value: 'All' },
    { label: 'This Week', value: 'This Week' },
    { label: 'This Month', value: 'This Month' },
  ];

  /**
   * Action Handler: Approve TODA Application
   */
  const handleApproveConfirm = async () => {
    if (!selectedApp) return;

    try {
      await approveTodaApplication(selectedApp.id);
      setSnackbarMessage(`Successfully approved accreditation for ${selectedApp.name}.`);
      setApplications((prev) =>
        prev.map((app) => (app.id === selectedApp.id ? { ...app, status: 'Approved' } : app))
      );
      setSelectedApp((prev) => (prev ? { ...prev, status: 'Approved' } : null));
    } catch (err) {
      console.error('[TodaApplications] Approval error:', err);
      setSnackbarMessage(`Error approving application: ${(err as Error).message}`);
    }

    setApproveDialogOpen(false);
  };

  /**
   * Action Handler: Return Application for Correction
   */
  const handleResubmissionConfirm = async (reason?: string) => {
    if (!selectedApp) return;

    const correctionReason = reason || 'Please resubmit updated Barangay Clearance and Officer Roster.';
    try {
      await returnTodaApplicationForCorrection(selectedApp.id, correctionReason);
      setSnackbarMessage(`Application returned for correction: ${selectedApp.name}.`);
      setApplications((prev) =>
        prev.map((app) =>
          app.id === selectedApp.id
            ? { ...app, status: 'Resubmission Required', resubmissionReason: correctionReason }
            : app
        )
      );
      setSelectedApp((prev) =>
        prev ? { ...prev, status: 'Resubmission Required', resubmissionReason: correctionReason } : null
      );
    } catch (err) {
      console.error('[TodaApplications] Return for correction error:', err);
      setSnackbarMessage(`Error: ${(err as Error).message}`);
    }

    setResubmissionDialogOpen(false);
  };

  /**
   * Action Handler: Reject TODA Application
   */
  const handleRejectConfirm = async (reason?: string) => {
    if (!selectedApp) return;

    const rejectReason = reason || 'Non-compliance with municipal franchising requirements.';
    try {
      await rejectTodaApplication(selectedApp.id, rejectReason);
      setSnackbarMessage(`Application permanently declined for ${selectedApp.name}.`);
      setApplications((prev) =>
        prev.map((app) =>
          app.id === selectedApp.id ? { ...app, status: 'Declined', declineReason: rejectReason } : app
        )
      );
      setSelectedApp((prev) =>
        prev ? { ...prev, status: 'Declined', declineReason: rejectReason } : null
      );
    } catch (err) {
      console.error('[TodaApplications] Reject error:', err);
      setSnackbarMessage(`Error declining application: ${(err as Error).message}`);
    }

    setRejectDialogOpen(false);
  };

  /**
   * Action Handler: Send Barangay Clearance Reminder
   */
  const handleSendReminder = (todaId: string) => {
    setReminderSent(todaId);

    recordAdminAuditAction({
      actionType: 'CLEARANCE_REMINDER_SENT',
      targetId: todaId,
      targetName: selectedApp ? selectedApp.name : todaId,
      details: `Dispatched automated Barangay Clearance renewal reminder to TODA leadership.`,
      category: 'Verification',
    });

    setSnackbarMessage('Renewal reminder sent successfully to TODA leadership.');
    setTimeout(() => setReminderSent(null), 3000);
  };

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* 1. Summary Header Panels */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 3.5,
        }}
      >
        <Box
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            padding: '20px 24px',
            boxShadow: 'var(--mac-shadow-card)',
          }}
        >
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>
            Pending Applications
          </Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--sakay-orange)' }}>
            {pendingCount}
          </Typography>
        </Box>
        <Box
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            padding: '20px 24px',
            boxShadow: 'var(--mac-shadow-card)',
          }}
        >
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>
            Under Review
          </Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#1565C0' }}>
            {underReviewCount}
          </Typography>
        </Box>
        <Box
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            padding: '20px 24px',
            boxShadow: 'var(--mac-shadow-card)',
          }}
        >
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>
            Approved Accreditation
          </Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#2E7D32' }}>
            {approvedCount}
          </Typography>
        </Box>
        <Box
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            padding: '20px 24px',
            boxShadow: 'var(--mac-shadow-card)',
          }}
        >
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>
            Declined / Resubmission
          </Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#C62828' }}>
            {declinedCount}
          </Typography>
        </Box>
      </Box>

      {/* 2. Filter Toolbar */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by TODA name, acronym, representative, or barangay..."
        selectFilters={[
          {
            id: 'status',
            label: 'Status',
            value: statusFilter,
            options: statusOptions,
            onChange: setStatusFilter,
          },
          {
            id: 'date',
            label: 'Submission Date',
            value: dateFilter,
            options: dateOptions,
            onChange: setDateFilter,
          },
        ]}
        onResetFilters={() => {
          setSearchQuery('');
          setStatusFilter('All');
          setDateFilter('All');
        }}
      />

      {/* 3. Administrative Table */}
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
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                TODA NAME & ACRONYM
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                REPRESENTATIVE
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                BARANGAY CLEARANCE
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                DATE SUBMITTED
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                STATUS
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                ACTIONS
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <CircularProgress size={32} sx={{ color: 'var(--sakay-orange)', mb: 1.5 }} />
                  <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-muted)' }}>
                    Loading TODA applications...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredApps.length > 0 ? (
              filteredApps.map((app) => (
                <TableRow
                  key={app.id}
                  sx={{
                    transition: 'var(--mac-transition-fast)',
                    '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                  }}
                >
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '14.5px', color: 'var(--mac-text-primary)' }}>
                        {app.name}
                      </Typography>
                      {app.acronym && (
                        <Chip
                          label={app.acronym}
                          size="small"
                          sx={{ fontSize: '11px', fontWeight: 600, backgroundColor: 'rgba(255, 107, 26, 0.1)', color: 'var(--sakay-orange)', height: 22 }}
                        />
                      )}
                      {app.isOverdue5Days && (
                        <Chip
                          label="Overdue >5 Days"
                          size="small"
                          sx={{ fontSize: '11px', fontWeight: 600, backgroundColor: '#FEE2E2', color: '#DC2626', height: 22 }}
                        />
                      )}
                    </Box>
                    <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)', mt: '4px' }}>
                      ID: {app.id.substring(0, 13)}... • {app.memberCount} Drivers • Brgy. {app.barangay}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: '14px', color: 'var(--mac-text-primary)', py: 2.2, px: 3 }}>
                    {app.representative}
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography
                        sx={{
                          fontSize: '13.5px',
                          fontWeight: 600,
                          color:
                            app.clearanceStatus === 'Expired'
                              ? '#DC2626'
                              : app.clearanceStatus === 'Expiring Soon'
                              ? '#EA580C'
                              : 'var(--mac-text-primary)',
                        }}
                      >
                        Expires: {app.barangayClearanceExpiry}
                      </Typography>
                      <StatusBadge status={app.clearanceStatus} />
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: '14px', color: 'var(--mac-text-secondary)', py: 2.2, px: 3 }}>
                    {app.submittedDate}
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <StatusBadge status={app.status} />
                  </TableCell>
                  <TableCell align="right" sx={{ py: 2.2, px: 3 }}>
                    <ActionButton
                      label="Review"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedApp(app);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                    <AccountBalanceIcon sx={{ fontSize: 44, color: 'var(--mac-border-color)' }} />
                    <Typography sx={{ fontSize: '15px', color: 'var(--mac-text-primary)', fontWeight: 600 }}>
                      No TODA accreditation applications found
                    </Typography>
                    <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', maxWidth: 420 }}>
                      {searchQuery || statusFilter !== 'All'
                        ? 'No records match your active search or filter parameters. Try clearing your filters.'
                        : 'There are currently no TODA accreditation requests pending.'}
                    </Typography>
                    <Button
                      onClick={loadApplications}
                      startIcon={<RefreshIcon />}
                      sx={{
                        mt: 1,
                        textTransform: 'none',
                        fontSize: '13.5px',
                        color: 'var(--sakay-orange)',
                        fontWeight: 600,
                      }}
                    >
                      Refresh
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 4. Centered Review Modal (Review Submitted Information & Documents) */}
      {selectedApp && (
        <MacCenterModal
          open={Boolean(selectedApp)}
          onClose={() => setSelectedApp(null)}
          title={`Review TODA Application — ${selectedApp.name}`}
          subtitle={`Application ID: ${selectedApp.id}`}
          badge={<StatusBadge status={selectedApp.status} />}
          primaryActionLabel={selectedApp.status !== 'Approved' ? 'Approve Accreditation' : undefined}
          onPrimaryAction={() => setApproveDialogOpen(true)}
          secondaryActionLabel={selectedApp.status !== 'Declined' ? 'Decline Application' : undefined}
          onSecondaryAction={() => setRejectDialogOpen(true)}
        >
          {/* Section 1: Overview & Organization Information */}
          <Box sx={{ mb: 4 }}>
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 2 }}>
              1. Submitted Organization & Office Information
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2.5,
                backgroundColor: '#F5F5F7',
                padding: '20px',
                borderRadius: '12px',
              }}
            >
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>TODA Official Name</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  {selectedApp.name} {selectedApp.acronym ? `(${selectedApp.acronym})` : ''}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Registration / Ordinance No.</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  {selectedApp.registrationNumber || 'Pending Issuance'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Primary Contact Phone</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedApp.phone}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Contact Email Address</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  {selectedApp.email || 'N/A'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Operating Barangay</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedApp.barangay}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Terminal Location / Corridor</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  {selectedApp.terminalLocation || 'Calapan City Corridor'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Active Driver & Tricycle Count</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  {selectedApp.memberCount} Authorized Drivers
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Barangay Clearance Expiry</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                    {selectedApp.barangayClearanceExpiry}
                  </Typography>
                  <StatusBadge status={selectedApp.clearanceStatus} />
                </Box>
              </Box>
            </Box>

            {/* Section 1.1: Authorized Officers */}
            {selectedApp.officers && (
              <Box sx={{ mt: 2.5 }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1.5 }}>
                  Authorized Officers
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 1.5,
                    backgroundColor: '#FAFAFC',
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1px solid var(--mac-border-color)',
                  }}
                >
                  <Box>
                    <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>President</Typography>
                    <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      {selectedApp.officers.president} ({selectedApp.officers.presidentContact})
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Vice President</Typography>
                    <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      {selectedApp.officers.vicePresident} ({selectedApp.officers.vicePresidentContact})
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Secretary</Typography>
                    <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      {selectedApp.officers.secretary} ({selectedApp.officers.secretaryContact})
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Treasurer</Typography>
                    <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      {selectedApp.officers.treasurer} ({selectedApp.officers.treasurerContact})
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Clearance Renewal Reminder Tool */}
            <Box
              sx={{
                mt: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#FAFAFC',
                padding: '14px 18px',
                borderRadius: '10px',
                border: '1px solid var(--mac-border-color)',
              }}
            >
              <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-secondary)' }}>
                Send automated Barangay Clearance renewal advisory to TODA representative.
              </Typography>
              <ActionButton
                label={reminderSent === selectedApp.id ? 'Reminder Sent ✓' : 'Send Reminder'}
                showArrow={false}
                onClick={() => handleSendReminder(selectedApp.id)}
                sx={{ height: 34, fontSize: '13px' }}
              />
            </Box>
          </Box>

          {/* Section 2: Resubmission / Correction Reason Notice */}
          {selectedApp.resubmissionReason && (
            <Box sx={{ mb: 4, backgroundColor: '#FFF7ED', border: '1px solid #FDBA74', padding: '16px 20px', borderRadius: '12px' }}>
              <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: '#EA580C', mb: '4px' }}>
                Correction / Resubmission Notice Logged:
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#9A3412' }}>{selectedApp.resubmissionReason}</Typography>
            </Box>
          )}

          {/* Section 3: Official Submitted Documents Review */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                2. Submitted Accreditation Documents ({selectedApp.documents.length})
              </Typography>
              <ActionButton
                label="Return for Correction"
                showArrow={false}
                onClick={() => setResubmissionDialogOpen(true)}
                sx={{ height: 32, fontSize: '12.5px' }}
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {selectedApp.documents.map((doc, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: '10px',
                    border: '1px solid var(--mac-border-color)',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {doc.type.includes('ZIP') ? (
                      <FolderZipIcon sx={{ color: '#1565C0', fontSize: 24 }} />
                    ) : (
                      <DescriptionIcon sx={{ color: 'var(--sakay-orange)', fontSize: 24 }} />
                    )}
                    <Box>
                      <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)', lineHeight: 1.2 }}>
                        {doc.name}
                      </Typography>
                      <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)', mt: '3px' }}>
                        {doc.type} • Uploaded {doc.date}
                      </Typography>
                    </Box>
                  </Box>

                  <Chip
                    label="View Document"
                    size="small"
                    onClick={() => setSelectedDoc({ name: doc.name, type: doc.type })}
                    sx={{ fontSize: '12.5px', cursor: 'pointer', backgroundColor: 'var(--mac-canvas-bg)', height: 28 }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        </MacCenterModal>
      )}

      {/* Document Inspection Popover Modal */}
      {selectedDoc && (
        <DocumentPreviewModal
          open={Boolean(selectedDoc)}
          onClose={() => setSelectedDoc(null)}
          documentName={selectedDoc.name}
          documentType={selectedDoc.type}
        />
      )}

      {/* 5. Approve Confirmation Dialog */}
      {selectedApp && (
        <MacConfirmDialog
          open={approveDialogOpen}
          onClose={() => setApproveDialogOpen(false)}
          title="Approve TODA Accreditation?"
          message={`You are about to issue official municipal accreditation for "${selectedApp.name}". This will authorize their drivers and operating routes in ${selectedApp.barangay} with a 3-year certificate.`}
          confirmLabel="Approve & Issue Certificate"
          confirmVariant="orange"
          onConfirm={handleApproveConfirm}
        />
      )}

      {/* 6. Return Application for Correction Dialog */}
      {selectedApp && (
        <MacConfirmDialog
          open={resubmissionDialogOpen}
          onClose={() => setResubmissionDialogOpen(false)}
          title="Return Application for Correction?"
          message={`Return application for "${selectedApp.name}" under Correction Required status. Specify the required adjustments for the TODA leadership.`}
          confirmLabel="Return for Correction"
          confirmVariant="orange"
          requireReason
          reasonPlaceholder="Specify missing or expired documents (e.g. Please upload updated 2026 Barangay Clearance from Barangay San Vicente)..."
          onConfirm={handleResubmissionConfirm}
        />
      )}

      {/* 7. Reject Confirmation Dialog */}
      {selectedApp && (
        <MacConfirmDialog
          open={rejectDialogOpen}
          onClose={() => setRejectDialogOpen(false)}
          title="Decline TODA Accreditation?"
          message={`Are you sure you want to permanently decline the accreditation request for "${selectedApp.name}"?`}
          confirmLabel="Reject Application"
          confirmVariant="danger"
          requireReason
          reasonPlaceholder="Specify mandatory reason for rejection..."
          onConfirm={handleRejectConfirm}
        />
      )}

      {/* Snackbar Feedback Alert */}
      <Snackbar
        open={Boolean(snackbarMessage)}
        autoHideDuration={4000}
        onClose={() => setSnackbarMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarMessage(null)} severity="info" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
