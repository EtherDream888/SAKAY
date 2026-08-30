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
  Divider,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

import { TodaApplicationRecord } from '../mockData/adminData';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { MacConfirmDialog } from '../components/admin/MacConfirmDialog';
import { DocumentReviewModal } from '../components/modals/DocumentReviewModal';
import { TableEmptyState } from '../components/common/TableEmptyState';
import {
  fetchTodaApplications,
  approveTodaApplication,
  returnTodaApplicationForCorrection,
  rejectTodaApplication,
  recordAdminAuditAction,
} from '../services/adminApiService';

const formatDisplayDate = (dateStr?: string | null): string => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

export const TodaApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<TodaApplicationRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [reminderSent, setReminderSent] = useState<string | null>(null);

  // Document Review Modal (Spreadsheet Parser, PDF & Image Viewer with blurred backdrop)
  const [reviewDoc, setReviewDoc] = useState<{
    name: string;
    type: string;
    url?: string | null;
  } | null>(null);

  // Notification Snackbar
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // Selected Application for Review Modal
  const [selectedApp, setSelectedApp] = useState<TodaApplicationRecord | null>(null);

  // Specific document target for correction
  const [targetCorrectionDoc, setTargetCorrectionDoc] = useState<{ name: string; type: string } | null>(null);

  // Confirmation Dialog States
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [resubmissionDialogOpen, setResubmissionDialogOpen] = useState(false);

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

  const handleResubmissionConfirm = async (reason?: string) => {
    if (!selectedApp) return;

    const filePrefix = targetCorrectionDoc ? `[${targetCorrectionDoc.name}] ` : '';
    const correctionReason = `${filePrefix}${reason || 'Document requires correction or resubmission.'}`;

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

    setTargetCorrectionDoc(null);
    setResubmissionDialogOpen(false);
  };

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
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 3.5,
        }}
      >
        <Box
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            padding: '24px',
          }}
        >
          <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            Pending Applications
          </Typography>
          <Typography sx={{ fontSize: '24px', fontWeight: 700, color: 'var(--mac-text-primary)', mt: 1 }}>
            {isLoading ? <CircularProgress size={24} sx={{ color: 'var(--sakay-orange)' }} /> : pendingCount}
          </Typography>
          <Typography sx={{ fontSize: '10.8px', color: 'var(--mac-text-muted)', mt: 0.5 }}>
            Awaiting initial LGU review
          </Typography>
        </Box>

        <Box
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            padding: '24px',
          }}
        >
          <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            Under Review
          </Typography>
          <Typography sx={{ fontSize: '24px', fontWeight: 700, color: '#1565C0', mt: 1 }}>
            {isLoading ? <CircularProgress size={24} sx={{ color: '#1565C0' }} /> : underReviewCount}
          </Typography>
          <Typography sx={{ fontSize: '10.8px', color: 'var(--mac-text-muted)', mt: 0.5 }}>
            Background and document verification
          </Typography>
        </Box>

        <Box
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            padding: '24px',
          }}
        >
          <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            Accredited TODAs
          </Typography>
          <Typography sx={{ fontSize: '24px', fontWeight: 700, color: '#1E8E3E', mt: 1 }}>
            {isLoading ? <CircularProgress size={24} sx={{ color: '#1E8E3E' }} /> : approvedCount}
          </Typography>
          <Typography sx={{ fontSize: '10.8px', color: 'var(--mac-text-muted)', mt: 0.5 }}>
            Approved and operational
          </Typography>
        </Box>

        <Box
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            padding: '24px',
          }}
        >
          <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            Needs Correction
          </Typography>
          <Typography sx={{ fontSize: '24px', fontWeight: 700, color: 'var(--sakay-orange)', mt: 1 }}>
            {isLoading ? <CircularProgress size={24} sx={{ color: 'var(--sakay-orange)' }} /> : declinedCount}
          </Typography>
          <Typography sx={{ fontSize: '10.8px', color: 'var(--mac-text-muted)', mt: 0.5 }}>
            Returned for missing documents
          </Typography>
        </Box>
      </Box>

      {/* 2. Search and Filtering Controls */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search TODA name, acronym, representative, or barangay..."
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
            label: 'Date',
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

      {/* 3. Primary Data Table */}
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
                TODA Name & Acronym
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                Representative
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                Date Submitted
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                Status
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                  <CircularProgress size={32} sx={{ color: 'var(--sakay-orange)', mb: 1.5 }} />
                  <Typography sx={{ fontSize: '11.3px', color: 'var(--mac-text-muted)' }}>
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
                  {/* TODA Name & Acronym only */}
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--mac-text-primary)' }}>
                        {app.name}
                      </Typography>
                      {app.acronym && (
                        <Chip
                          label={app.acronym}
                          size="small"
                          sx={{ fontSize: '12px', fontWeight: 600, backgroundColor: 'rgba(255, 107, 26, 0.1)', color: 'var(--sakay-orange)', height: 22 }}
                        />
                      )}
                      {app.isOverdue5Days && (
                        <Chip
                          label="Overdue >5 Days"
                          size="small"
                          sx={{ fontSize: '9px', fontWeight: 600, backgroundColor: '#FEE2E2', color: '#DC2626', height: 22 }}
                        />
                      )}
                    </Box>
                  </TableCell>

                  <TableCell sx={{ fontSize: '12px', color: 'var(--mac-text-primary)', py: 2.2, px: 3 }}>
                    {app.representative}
                  </TableCell>

                  <TableCell sx={{ fontSize: '12px', color: 'var(--mac-text-secondary)', py: 2.2, px: 3 }}>
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
              <TableEmptyState
                colSpan={5}
                icon={<AccountBalanceIcon />}
                title="No TODA accreditation applications found"
                description={
                  searchQuery || statusFilter !== 'All'
                    ? 'No records match your active search or filter parameters. Try clearing your filters.'
                    : 'New TODA accreditation applications will appear here once organizations submit their applications.'
                }
                onRefresh={loadApplications}
              />
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 4. Official Accreditation Review Modal */}
      {selectedApp && (
        <MacCenterModal
          open={Boolean(selectedApp)}
          onClose={() => setSelectedApp(null)}
          title="TODA Accreditation Application Review"
          subtitle={`Submitted association records and compliance files for ${selectedApp.name}`}
          badge={<StatusBadge status={selectedApp.status} />}
          maxWidth={820}
          primaryActionLabel={selectedApp.status === 'Approved' ? undefined : 'Approve & Issue Accreditation'}
          onPrimaryAction={selectedApp.status === 'Approved' ? undefined : () => setApproveDialogOpen(true)}
          secondaryActionLabel={selectedApp.status === 'Approved' ? 'Close' : 'Decline Application'}
          onSecondaryAction={selectedApp.status === 'Approved' ? () => setSelectedApp(null) : () => setRejectDialogOpen(true)}
          secondaryActionColor={selectedApp.status === 'Approved' ? undefined : 'error'}
        >
          {/* Section 1: Organization Information (Matches TODA Registration Layout) */}
          <Box sx={{ mb: 3.5 }}>
            <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--sakay-orange)', textTransform: 'uppercase', mb: 2, letterSpacing: '0.5px' }}>
              1. Organization Information
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2.5,
                backgroundColor: '#F8FAFC',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid var(--mac-border-color)',
              }}
            >
              <Box>
                <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mb: '4px' }}>Official Association / TODA Name</Typography>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  {selectedApp.name}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mb: '4px' }}>TODA Acronym</Typography>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  {selectedApp.acronym || 'N/A'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mb: '4px' }}>Operating Barangay</Typography>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  {selectedApp.barangay}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mb: '4px' }}>Date Established</Typography>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  {formatDisplayDate(selectedApp.dateEstablished)}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mb: '4px' }}>Terminal Location</Typography>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  {selectedApp.terminalLocation || 'Calapan City Terminal'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mb: '4px' }}>Terminal Coordinates</Typography>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  {selectedApp.terminalLatitude && selectedApp.terminalLongitude
                    ? `${selectedApp.terminalLatitude}, ${selectedApp.terminalLongitude}`
                    : 'None specified'}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Section 2: Executive Officers */}
          {selectedApp.officers && (
            <Box sx={{ mb: 3.5 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--sakay-orange)', textTransform: 'uppercase', mb: 2, letterSpacing: '0.5px' }}>
                2. Executive Officers
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                  backgroundColor: '#F8FAFC',
                  padding: '18px 20px',
                  borderRadius: '12px',
                  border: '1px solid var(--mac-border-color)',
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mb: '3px' }}>President</Typography>
                  <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                    {selectedApp.officers.president || 'N/A'}
                  </Typography>
                  {selectedApp.officers.presidentContact && (
                    <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)' }}>
                      {selectedApp.officers.presidentContact}
                    </Typography>
                  )}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mb: '3px' }}>Vice President</Typography>
                  <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                    {selectedApp.officers.vicePresident || 'N/A'}
                  </Typography>
                  {selectedApp.officers.vicePresidentContact && (
                    <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)' }}>
                      {selectedApp.officers.vicePresidentContact}
                    </Typography>
                  )}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mb: '3px' }}>Secretary</Typography>
                  <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                    {selectedApp.officers.secretary || 'N/A'}
                  </Typography>
                  {selectedApp.officers.secretaryContact && (
                    <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)' }}>
                      {selectedApp.officers.secretaryContact}
                    </Typography>
                  )}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mb: '3px' }}>Treasurer</Typography>
                  <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                    {selectedApp.officers.treasurer || 'N/A'}
                  </Typography>
                  {selectedApp.officers.treasurerContact && (
                    <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)' }}>
                      {selectedApp.officers.treasurerContact}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          )}

          {/* Section 3: Required Documents with Per-File Return for Correction */}
          <Box sx={{ mb: 3.5 }}>
            <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--sakay-orange)', textTransform: 'uppercase', mb: 2, letterSpacing: '0.5px' }}>
              3. Required Documents ({selectedApp.documents.length})
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {selectedApp.documents.map((doc, idx) => {
                const isRoster = doc.name.toLowerCase().includes('roster') || doc.type.toLowerCase().includes('spreadsheet') || doc.type.toLowerCase().includes('csv') || doc.type.toLowerCase().includes('excel');
                const isPdf = doc.type.toLowerCase().includes('pdf');

                return (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 2,
                      padding: '16px 20px',
                      borderRadius: '12px',
                      border: '1px solid var(--mac-border-color)',
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {isRoster ? (
                        <TableChartOutlinedIcon sx={{ color: '#16A34A', fontSize: 28 }} />
                      ) : isPdf ? (
                        <PictureAsPdfOutlinedIcon sx={{ color: '#DC2626', fontSize: 28 }} />
                      ) : (
                        <DescriptionIcon sx={{ color: 'var(--sakay-orange)', fontSize: 28 }} />
                      )}
                      <Box>
                        <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)', lineHeight: 1.2 }}>
                          {doc.name}
                        </Typography>
                        <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mt: '3px' }}>
                          {doc.type} • Uploaded {doc.date}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Actions per file container */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<VisibilityIcon fontSize="small" />}
                        onClick={() => setReviewDoc({ name: doc.name, type: doc.type, url: doc.url })}
                        sx={{
                          height: 32,
                          px: 1.75,
                          fontSize: '12px',
                          fontWeight: 600,
                          textTransform: 'none',
                          color: 'var(--sakay-orange)',
                          borderColor: 'var(--sakay-orange-border)',
                          backgroundColor: 'var(--sakay-orange-soft)',
                          borderRadius: '8px',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 107, 26, 0.16)',
                            borderColor: 'var(--sakay-orange)',
                          },
                        }}
                      >
                        View
                      </Button>

                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AssignmentReturnIcon fontSize="small" />}
                        onClick={() => {
                          setTargetCorrectionDoc(doc);
                          setResubmissionDialogOpen(true);
                        }}
                        sx={{
                          height: 32,
                          px: 1.75,
                          fontSize: '12px',
                          fontWeight: 600,
                          textTransform: 'none',
                          color: '#DC2626',
                          borderColor: '#FECACA',
                          backgroundColor: '#FEF2F2',
                          borderRadius: '8px',
                          '&:hover': {
                            backgroundColor: '#FEE2E2',
                            borderColor: '#DC2626',
                          },
                        }}
                      >
                        Return for Correction
                      </Button>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Resubmission Reason Notice if already logged */}
          {selectedApp.resubmissionReason && (
            <Box sx={{ mb: 3, backgroundColor: '#FFF7ED', border: '1px solid #FDBA74', padding: '16px 20px', borderRadius: '12px' }}>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#EA580C', mb: '4px' }}>
                Correction / Resubmission Notice Logged:
              </Typography>
              <Typography sx={{ fontSize: '12px', color: '#9A3412' }}>{selectedApp.resubmissionReason}</Typography>
            </Box>
          )}

          {/* Section 4: Automated Clearance Renewal Advisory Banner (Placed at the very bottom) */}
          <Divider sx={{ my: 2.5, borderColor: 'var(--mac-border-color)' }} />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F8FAFC',
              padding: '16px 20px',
              borderRadius: '12px',
              border: '1px solid var(--mac-border-color)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <NotificationsActiveIcon sx={{ color: 'var(--sakay-orange)', fontSize: 22 }} />
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-secondary)', fontWeight: 500 }}>
                Send automated Barangay Clearance renewal advisory to TODA representative.
              </Typography>
            </Box>
            <ActionButton
              label={reminderSent === selectedApp.id ? 'Advisory Sent ✓' : 'Send Advisory'}
              showArrow={false}
              onClick={() => handleSendReminder(selectedApp.id)}
              sx={{ height: 34, fontSize: '11.5px' }}
            />
          </Box>
        </MacCenterModal>
      )}

      {/* Document Review Modal (Identical to TODA Registration Review with blurred backdrop) */}
      {reviewDoc && (
        <DocumentReviewModal
          open={Boolean(reviewDoc)}
          onClose={() => setReviewDoc(null)}
          documentTitle={reviewDoc.name}
          fileName={reviewDoc.name}
          fileUrl={reviewDoc.url || null}
        />
      )}

      {/* Approve Confirmation Dialog */}
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

      {/* Return for Correction Dialog (Per-File or General) */}
      {selectedApp && (
        <MacConfirmDialog
          open={resubmissionDialogOpen}
          onClose={() => {
            setTargetCorrectionDoc(null);
            setResubmissionDialogOpen(false);
          }}
          title={
            targetCorrectionDoc
              ? `Return ${targetCorrectionDoc.name} for Correction?`
              : 'Return Application for Correction?'
          }
          message={
            targetCorrectionDoc
              ? `Specify the corrections required for "${targetCorrectionDoc.name}". The TODA representative will be notified to re-upload this file.`
              : `Return application for "${selectedApp.name}" under Correction Required status. Specify the required adjustments for the TODA leadership.`
          }
          confirmLabel="Send Return Notice"
          confirmVariant="orange"
          requireReason
          reasonPlaceholder={
            targetCorrectionDoc
              ? `Specify issue with ${targetCorrectionDoc.name} (e.g. Document is expired, please upload current 2026 certification)...`
              : 'Specify missing or invalid documents (e.g. Please upload updated 2026 Barangay Clearance)...'
          }
          onConfirm={handleResubmissionConfirm}
        />
      )}

      {/* Reject Confirmation Dialog */}
      {selectedApp && (
        <MacConfirmDialog
          open={rejectDialogOpen}
          onClose={() => setRejectDialogOpen(false)}
          title="Decline TODA Accreditation?"
          message={`Are you sure you want to permanently decline the accreditation request for "${selectedApp.name}"?`}
          confirmLabel="Decline Application"
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
