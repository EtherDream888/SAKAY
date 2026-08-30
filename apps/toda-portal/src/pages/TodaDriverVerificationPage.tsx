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
  Button,
  Chip,
  Checkbox,
  FormControlLabel,
  Avatar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InboxIcon from '@mui/icons-material/Inbox';
import VerifiedIcon from '@mui/icons-material/Verified';
import ShieldIcon from '@mui/icons-material/Shield';

import { DriverApplicant } from '../types/toda';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { MacConfirmDialog } from '../components/admin/MacConfirmDialog';
import { DocumentPreviewModal } from '../components/admin/DocumentPreviewModal';
import {
  fetchDriverApplicants,
  fetchTodaDrivers,
  forwardApplicantToLgu,
  rejectDriverApplicant,
  recordTodaAuditAction,
} from '../services/todaApiService';

// toda driver application screening and lgu endorsement page
export const TodaDriverVerificationPage: React.FC = () => {
  const [applicants, setApplicants] = useState<DriverApplicant[]>([]);
  const [lguVerifiedCount, setLguVerifiedCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [rosterFilter, setRosterFilter] = useState('All');
  
  const [todaStatus, setTodaStatus] = useState<string>('Active');

  // Selected Applicant for Review Modal
  const [selectedApplicant, setSelectedApplicant] = useState<DriverApplicant | null>(null);
  const [previewDocModalOpen, setPreviewDocModalOpen] = useState(false);

  // Review Checkbox States
  const [rosterChecked, setRosterChecked] = useState(false);
  const [photoChecked, setPhotoChecked] = useState(false);

  // Confirmation & Celebratory Dialogs
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [celebrateDialogOpen, setCelebrateDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [resubmitDialogOpen, setResubmitDialogOpen] = useState(false);

  // Rejection Reason Form State
  const [selectedRejectReason, setSelectedRejectReason] = useState<string>('Hindi natagpuan sa Master Roster ng TODA.');
  const [customRejectComment, setCustomRejectComment] = useState<string>('');

  const PREDEFINED_REJECTION_REASONS = [
    'Hindi natagpuan sa Master Roster ng TODA.',
    'Hindi tugma ang impormasyong isinumite sa Master Roster.',
    'Hindi wasto o hindi kumpleto ang impormasyon.',
    'Hindi balido ang Driver\'s License.',
    'Hindi balido o hindi tugma ang MTOP.',
    'Hindi malinaw ang mga isinumiteng dokumento.',
    'Hindi tugma ang impormasyon ng tricycle unit.',
    'Iba pa',
  ];

  const normalizeName = (name: string): string => {
    if (!name) return '';
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const loadApplicants = () => {
    setIsLoading(true);
    import('../services/todaApiService').then(({ fetchTodaProfile }) => {
      fetchTodaProfile().then(profile => {
        if (profile) setTodaStatus(profile.accreditationStatus);
      });
    });

    Promise.all([fetchDriverApplicants(), fetchTodaDrivers()])
      .then(([apps, drvs]) => {
        const rosterNameSet = new Set(
          (drvs || []).map((d) => normalizeName(d.name || (d as any).fullName || ''))
        );

        const crossCheckedApps = (apps || []).map((app) => {
          const normAppName = normalizeName(app.name);
          const isMatched = rosterNameSet.has(normAppName) || (drvs || []).some(d => normalizeName(d.name).includes(normAppName) || normAppName.includes(normalizeName(d.name)));
          return {
            ...app,
            onSubmittedRoster: isMatched,
            rosterVerified: isMatched,
          };
        });

        setApplicants(crossCheckedApps);
        const verified = (drvs || []).filter((d) => d.lguVerificationStatus === 'Verified').length;
        setLguVerifiedCount(verified);
      })
      .catch((err) => {
        console.error('[TodaVerification] Failed to fetch applicants from database:', err);
        setApplicants([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadApplicants();
  }, []);

  // Filter Logic
  const filteredApplicants = applicants.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.licenseNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.franchiseNo.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || app.todaStageStatus === statusFilter;

    let matchesRoster = true;
    if (rosterFilter === 'Matched') matchesRoster = app.onSubmittedRoster;
    if (rosterFilter === 'Mismatch') matchesRoster = !app.onSubmittedRoster;

    return matchesSearch && matchesStatus && matchesRoster;
  });

  // KPI Metrics (Accurate TODA Operational Governance Breakdown)
  const pendingCount = applicants.filter(
    (a) => a.todaStageStatus === 'Awaiting Screening' || a.todaStageStatus === 'Submitted' || a.todaStageStatus === 'TODA Review'
  ).length;

  const overdueCount = applicants.filter(
    (a) => a.isOverdue && (a.todaStageStatus === 'Awaiting Screening' || a.todaStageStatus === 'Submitted' || a.todaStageStatus === 'TODA Review')
  ).length;

  const endorsedCount = applicants.filter(
    (a) => a.todaStageStatus === 'Endorsed to LGU' || a.todaStageStatus === 'TODA Endorsed'
  ).length;

  const statusOptions: FilterOption[] = [
    { label: 'All Stage Statuses', value: 'All' },
    { label: 'Awaiting Screening (Pending TODA)', value: 'Awaiting Screening' },
    { label: 'TODA Review (In Progress)', value: 'TODA Review' },
    { label: 'Endorsed to LGU (Sent to Franchising)', value: 'Endorsed to LGU' },
    { label: 'Resubmission Required', value: 'Resubmission Required' },
    { label: 'Rejected (TODA Level)', value: 'Rejected' },
  ];

  const rosterOptions: FilterOption[] = [
    { label: 'All Roster Records', value: 'All' },
    { label: 'Master Roster Verified', value: 'Matched' },
    { label: 'Roster Mismatch Flag', value: 'Mismatch' },
  ];

  const handleOpenReview = (app: DriverApplicant) => {
    setSelectedApplicant(app);
    setRosterChecked(app.rosterVerified);
    setPhotoChecked(app.photoVerified);
  };

  const handleForwardConfirm = async () => {
    if (!selectedApplicant) return;

    await forwardApplicantToLgu(selectedApplicant.id);
    setApplicants((prev) =>
      prev.map((a) => (a.id === selectedApplicant.id ? { ...a, todaStageStatus: 'Endorsed to LGU', rosterVerified: true, photoVerified: true } : a))
    );

    recordTodaAuditAction({
      actionType: 'DRIVER_APPLICANT_ENDORSED_TO_LGU',
      targetId: selectedApplicant.id,
      targetName: selectedApplicant.name,
      details: `Screened and endorsed driver ${selectedApplicant.name} (${selectedApplicant.vehiclePlate}) to City LGU Franchising Office for official accreditation.`,
      category: 'Driver Verification',
    });

    setForwardDialogOpen(false);
    setCelebrateDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedApplicant) return;

    const finalReason = selectedRejectReason === 'Iba pa' ? (customRejectComment || 'Hindi tinanggap ng TODA Admin.') : selectedRejectReason;
    await rejectDriverApplicant(selectedApplicant.id, finalReason, customRejectComment);

    setApplicants((prev) =>
      prev.map((a) => (a.id === selectedApplicant.id ? { ...a, todaStageStatus: 'Rejected' } : a))
    );

    recordTodaAuditAction({
      actionType: 'DRIVER_APPLICANT_REJECTED',
      targetId: selectedApplicant.id,
      targetName: selectedApplicant.name,
      details: `Rejected driver applicant ${selectedApplicant.name} at TODA level. Reason: ${finalReason}`,
      category: 'Driver Verification',
    });

    setRejectDialogOpen(false);
    setSelectedApplicant(null);
    setCustomRejectComment('');
  };

  const handleResubmitConfirm = () => {
    if (!selectedApplicant) return;

    setApplicants((prev) =>
      prev.map((a) => (a.id === selectedApplicant.id ? { ...a, todaStageStatus: 'Resubmission Required' } : a))
    );

    recordTodaAuditAction({
      actionType: 'DRIVER_RESUBMISSION_REQUESTED',
      targetId: selectedApplicant.id,
      targetName: selectedApplicant.name,
      details: `Requested document resubmission for ${selectedApplicant.name}.`,
      category: 'Driver Verification',
    });

    setResubmitDialogOpen(false);
    setSelectedApplicant(null);
  };

  const canEndorse = rosterChecked && photoChecked;

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {todaStatus === 'Pending Verification' && (
        <Box sx={{ mb: 3.5, backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 'var(--mac-radius-lg)', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 2 }}>
          <WarningAmberIcon sx={{ color: '#DC2626', fontSize: 26, flexShrink: 0 }} />
          <Box>
            <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#991B1B', mb: '3px' }}>
              Pending TODA LGU Accreditation
            </Typography>
            <Typography sx={{ fontSize: '13.5px', color: '#B91C1C', lineHeight: 1.4 }}>
              Your TODA organization is currently under review by the City Transport Office. Driver endorsement tools and membership management features are temporarily locked until your application is approved.
            </Typography>
          </Box>
        </Box>
      )}

      {todaStatus === 'Pending Verification' ? (
        <Box sx={{ mt: 2, textAlign: 'center', p: 6, backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)' }}>
          <ShieldIcon sx={{ fontSize: 48, color: '#D1D5DB', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'var(--mac-text-primary)' }}>Feature Unavailable</Typography>
          <Typography sx={{ color: 'var(--mac-text-secondary)', mt: 1, maxWidth: 500, mx: 'auto' }}>
            This feature will become available once your TODA has been approved and accredited by the LGU.
          </Typography>
        </Box>
      ) : (
        <>
      {/* 1. 3-Day Operational Governance Banner (Simplified Non-Technical Language) */}
      <Box
        sx={{
          mb: 3.5,
          backgroundColor: '#FFF7ED',
          border: '1px solid #FDBA74',
          borderRadius: 'var(--mac-radius-lg)',
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--mac-shadow-subtle)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <WarningAmberIcon sx={{ color: '#EA580C', fontSize: 26, flexShrink: 0 }} />
          <Box>
            <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#9A3412', mb: '3px' }}>
              TODA Operational Governance Rule — 3-Calendar-Day Review Deadline
            </Typography>
            <Typography sx={{ fontSize: '13.5px', color: '#C2410C', lineHeight: 1.4 }}>
              TODA Officers must screen new driver applications against the active TODA Driver Master Roster and endorse or return them within <strong>3 calendar days</strong> of submission. Applications exceeding this 3-day standard processing window are flagged as Overdue.
            </Typography>
          </Box>
        </Box>
        <Chip
          label="3-Day Processing Deadline"
          size="small"
          sx={{ backgroundColor: '#EA580C', color: '#FFFFFF', fontWeight: 700, fontSize: '12.5px', px: 1, height: 26 }}
        />
      </Box>

      {/* 2. Clear KPI Breakdown Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 3.5,
        }}
      >
        {/* Pending TODA Action */}
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', mb: 1 }}>
            Awaiting TODA Screening
          </Typography>
          <Typography sx={{ fontSize: '30px', fontWeight: 700, color: 'var(--sakay-orange)' }}>
            {pendingCount}
          </Typography>
          <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: 0.5 }}>
            Applications requiring TODA manual screening
          </Typography>
        </Box>

        {/* Overdue (>3 Days) */}
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', mb: 1 }}>
            Overdue Screening (&gt;3 Days)
          </Typography>
          <Typography sx={{ fontSize: '30px', fontWeight: 700, color: '#DC2626' }}>
            {overdueCount}
          </Typography>
          <Typography sx={{ fontSize: '12px', color: '#DC2626', fontWeight: 600, mt: 0.5 }}>
            Exceeds 3-day standard processing time
          </Typography>
        </Box>

        {/* Endorsed to LGU */}
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', mb: 1 }}>
            Endorsed to LGU
          </Typography>
          <Typography sx={{ fontSize: '30px', fontWeight: 700, color: '#1565C0' }}>
            {endorsedCount}
          </Typography>
          <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: 0.5 }}>
            Sent to City LGU Franchising Office
          </Typography>
        </Box>

        {/* LGU Verified Drivers Card */}
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)' }}>
              Verified Drivers (LGU Accredited)
            </Typography>
            <VerifiedIcon sx={{ color: '#1E8E3E', fontSize: 18 }} />
          </Box>
          <Typography sx={{ fontSize: '30px', fontWeight: 700, color: '#1E8E3E' }}>
            {lguVerifiedCount}
          </Typography>
          <Typography sx={{ fontSize: '12px', color: '#1E8E3E', fontWeight: 600, mt: 0.5 }}>
            Active & verified by City Franchising Office
          </Typography>
        </Box>
      </Box>

      {/* 3. Floating Filter Toolbar with Rightmost Filter Alignment */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search driver applicant, plate, license, or franchise..."
        selectFilters={[
          {
            id: 'status',
            label: 'Stage Status',
            value: statusFilter,
            options: statusOptions,
            onChange: setStatusFilter,
          },
          {
            id: 'roster',
            label: 'Roster Matching',
            value: rosterFilter,
            options: rosterOptions,
            onChange: setRosterFilter,
          },
        ]}
        onResetFilters={() => {
          setSearchQuery('');
          setStatusFilter('All');
          setRosterFilter('All');
        }}
      />

      {/* 4. Applications Roster Table */}
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
              <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>Driver Applicant</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>Vehicle & Franchise</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>Master Roster Check</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>Submission & Age</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>Stage Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '12px', color: 'var(--mac-text-muted)', py: 2, px: 3, width: 180 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredApplicants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 7 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                    <InboxIcon sx={{ fontSize: 48, color: 'var(--mac-text-tertiary)' }} />
                    <Typography sx={{ fontSize: '16px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                      No Driver Applications Found
                    </Typography>
                    <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)' }}>
                      There are currently no driver applications matching the "{statusFilter !== 'All' ? statusFilter : 'selected'}" filter criteria.
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filteredApplicants.map((app) => (
                <TableRow key={app.id} sx={{ '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' } }}>
                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 38, height: 38, backgroundColor: 'var(--sakay-orange-soft)', color: 'var(--sakay-orange)', fontSize: '14.5px', fontWeight: 700 }}>
                        {app.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                          {app.name}
                        </Typography>
                        <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
                          License: {app.licenseNo} • {app.phone}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      Plate: {app.vehiclePlate}
                    </Typography>
                    <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
                      MTOP: {app.franchiseNo}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ py: 2, px: 3 }}>
                    {app.onSubmittedRoster ? (
                      <Chip
                        icon={<CheckCircleIcon sx={{ fontSize: 15, color: '#1E8E3E' }} />}
                        label="Master Roster Verified"
                        size="small"
                        sx={{ backgroundColor: '#E6F4EA', color: '#1E8E3E', fontWeight: 600, fontSize: '12.5px' }}
                      />
                    ) : (
                      <Chip
                        icon={<WarningAmberIcon sx={{ fontSize: 15, color: '#DC2626' }} />}
                        label="Roster Mismatch Flag"
                        size="small"
                        sx={{ backgroundColor: '#FEF2F2', color: '#DC2626', fontWeight: 600, fontSize: '12.5px' }}
                      />
                    )}
                  </TableCell>

                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-primary)', fontWeight: 500 }}>
                      {app.submittedDate}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: '2px' }}>
                      <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
                        {app.daysPending} day(s) ago
                      </Typography>
                      {app.isOverdue && (app.todaStageStatus === 'Awaiting Screening' || app.todaStageStatus === 'Submitted' || app.todaStageStatus === 'TODA Review') && (
                        <Chip label="Overdue (>3 Days)" size="small" sx={{ backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: '11px', fontWeight: 700, height: 20 }} />
                      )}
                    </Box>
                  </TableCell>

                  <TableCell sx={{ py: 2, px: 3 }}>
                    <StatusBadge status={app.todaStageStatus} />
                  </TableCell>

                  <TableCell align="right" sx={{ py: 2, px: 3 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<VisibilityIcon fontSize="small" />}
                      onClick={() => handleOpenReview(app)}
                      disabled={todaStatus === 'Pending Verification'}
                      sx={{
                        height: 34,
                        px: 2,
                        borderRadius: '8px',
                        fontSize: '13px',
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
                        '&.Mui-disabled': {
                          borderColor: '#E5E5EA',
                          color: '#C7C7CC',
                          backgroundColor: '#F2F2F7',
                        }
                      }}
                    >
                      {app.todaStageStatus === 'Endorsed to LGU' ? 'View Details' : 'Screen Application'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 5. Driver Application Review Centered Modal */}
      {selectedApplicant && (
        <MacCenterModal
          open={Boolean(selectedApplicant)}
          onClose={() => setSelectedApplicant(null)}
          title={`Screen Driver Application — ${selectedApplicant.name}`}
          subtitle={`Submitted: ${selectedApplicant.submittedDate} • ${selectedApplicant.daysPending} days pending`}
          badge={<StatusBadge status={selectedApplicant.todaStageStatus} />}
          maxWidth={760}
          primaryActionLabel={selectedApplicant.todaStageStatus !== 'Endorsed to LGU' ? "Endorse to City LGU" : undefined}
          onPrimaryAction={selectedApplicant.todaStageStatus !== 'Endorsed to LGU' && canEndorse ? () => setForwardDialogOpen(true) : undefined}
          secondaryActionLabel="Close"
          onSecondaryAction={() => setSelectedApplicant(null)}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Master Roster Cross-Check Badge Banner */}
            {selectedApplicant.onSubmittedRoster ? (
              <Alert severity="success" sx={{ borderRadius: '12px', fontWeight: 600 }}>
                <strong>Natagpuan sa Master Roster:</strong> Ang pangalan ng aplikante ({selectedApplicant.name}) ay nakatala sa opisyal na Master Roster ng TODA.
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ borderRadius: '12px', fontWeight: 600 }}>
                <strong>Hindi natagpuan sa Master Roster:</strong> Hindi natagpuan ang aplikante sa Master Roster ng TODA na ito. Pakisuri at gumawa ng naaangkop na desisyon.
              </Alert>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, backgroundColor: '#F8F9FA', p: 2.5, borderRadius: '12px' }}>
              <Box>
                <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>Driver License No.</Typography>
                <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedApplicant.licenseNo}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>Vehicle Plate Number</Typography>
                <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedApplicant.vehiclePlate}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>Chassis Number</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedApplicant.chassisNo}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>Motor Number</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedApplicant.motorNo}</Typography>
              </Box>
            </Box>

            {/* Checklist items */}
            <Typography sx={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
              TODA Officer Screening Checklist
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rosterChecked}
                    onChange={(e) => setRosterChecked(e.target.checked)}
                    sx={{ color: 'var(--sakay-orange)', '&.Mui-checked': { color: 'var(--sakay-orange)' } }}
                  />
                }
                label={
                  <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                    Verify membership against active TODA Driver Roster
                  </Typography>
                }
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={photoChecked}
                    onChange={(e) => setPhotoChecked(e.target.checked)}
                    sx={{ color: 'var(--sakay-orange)', '&.Mui-checked': { color: 'var(--sakay-orange)' } }}
                  />
                }
                label={
                  <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                    Inspect tricycle unit photograph & plate specifications
                  </Typography>
                }
              />
            </Box>

            {/* Supporting Evidence View */}
            <Box sx={{ p: 2, borderRadius: '10px', backgroundColor: '#FAFAFC', border: '1px solid var(--mac-border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar src={selectedApplicant.tricyclePhotoUrl} variant="rounded" sx={{ width: 44, height: 44 }} />
                <Box>
                  <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                    Tricycle Unit Inspection Photo
                  </Typography>
                  <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
                    Plate: {selectedApplicant.vehiclePlate}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<VisibilityIcon fontSize="small" />}
                onClick={() => setPreviewDocModalOpen(true)}
                sx={{
                  height: 34,
                  px: 2,
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'none',
                  color: 'var(--sakay-orange)',
                  borderColor: 'var(--sakay-orange-border)',
                  backgroundColor: 'var(--sakay-orange-soft)',
                }}
              >
                View Photo
              </Button>
            </Box>

            {/* Rejection Option inside modal */}
            {selectedApplicant.todaStageStatus !== 'Endorsed to LGU' && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => setRejectDialogOpen(true)}
                  sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
                >
                  Reject Application
                </Button>
              </Box>
            )}
          </Box>
        </MacCenterModal>
      )}

      {/* Confirmation Dialogs */}
      <MacConfirmDialog
        open={forwardDialogOpen}
        onClose={() => setForwardDialogOpen(false)}
        title="Endorse ang Aplikasyon?"
        message={`Kumpirmahin ang pag-endorse sa aplikasyon ni ${selectedApplicant?.name} (${selectedApplicant?.vehiclePlate}). Ang aplikasyong ito ay ipapasa sa LGU para sa susunod na pagsusuri.`}
        confirmLabel="Kumpirmahin ang Endorsement"
        confirmVariant="primary"
        onConfirm={handleForwardConfirm}
      />

      {/* Celebratory Endorsement Popup Modal */}
      <Dialog
        open={celebrateDialogOpen}
        onClose={() => {
          setCelebrateDialogOpen(false);
          setSelectedApplicant(null);
        }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '24px',
              p: 3,
              maxWidth: 420,
              textAlign: 'center',
            },
          },
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            backgroundColor: '#ECFDF5',
            color: '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.2)',
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 44 }} />
        </Box>
        <Typography sx={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', mb: 1 }}>
          Matagumpay na na-endorse!
        </Typography>
        <Typography sx={{ fontSize: '14px', color: '#64748B', lineHeight: 1.45, mb: 3 }}>
          Naipasa na ang aplikasyon sa LGU para sa susunod na pagsusuri.
        </Typography>
        <Button
          fullWidth
          variant="contained"
          onClick={() => {
            setCelebrateDialogOpen(false);
            setSelectedApplicant(null);
          }}
          sx={{
            borderRadius: '14px',
            backgroundColor: '#FF6B00',
            fontWeight: 700,
            py: 1.25,
            textTransform: 'none',
            fontSize: '15px',
            '&:hover': { backgroundColor: '#E05D00' },
          }}
        >
          Okay
        </Button>
      </Dialog>

      {/* Rejection Modal with Predefined Reasons */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '20px',
              p: 2.5,
              maxWidth: 460,
              width: '100%',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '18px', p: 0, mb: 1, color: '#0F172A' }}>
          Reject ang Aplikasyon
        </DialogTitle>
        <DialogContent sx={{ p: 0, pt: 1 }}>
          <Typography sx={{ fontSize: '14px', color: '#64748B', mb: 2 }}>
            Pumili ng dahilan sa pagtanggi sa aplikasyon ni <strong>{selectedApplicant?.name}</strong>:
          </Typography>

          <TextField
            select
            fullWidth
            label="Dahilan ng Pagtanggi"
            value={selectedRejectReason}
            onChange={(e) => setSelectedRejectReason(e.target.value)}
            sx={{ mb: 2 }}
          >
            {PREDEFINED_REJECTION_REASONS.map((reason) => (
              <MenuItem key={reason} value={reason}>
                {reason}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Karagdagang Paliwanag (Comment)"
            placeholder="Ilagay ang detalyadong paliwanag para sa drayber..."
            value={customRejectComment}
            onChange={(e) => setCustomRejectComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 0, pt: 3, display: 'flex', gap: 1.5 }}>
          <Button
            onClick={() => setRejectDialogOpen(false)}
            sx={{
              flex: 1,
              borderRadius: '12px',
              backgroundColor: '#F1F3F5',
              color: '#0F172A',
              fontWeight: 700,
              textTransform: 'none',
            }}
          >
            Kanselahin
          </Button>
          <Button
            onClick={handleRejectConfirm}
            variant="contained"
            color="error"
            disabled={selectedRejectReason === 'Iba pa' && !customRejectComment.trim()}
            sx={{
              flex: 1,
              borderRadius: '12px',
              fontWeight: 700,
              textTransform: 'none',
            }}
          >
            Kumpirmahin ang Pagtanggi
          </Button>
        </DialogActions>
      </Dialog>

      {/* Photo Preview Modal */}
      {previewDocModalOpen && selectedApplicant && (
        <DocumentPreviewModal
          open={previewDocModalOpen}
          onClose={() => setPreviewDocModalOpen(false)}
          documentName={`Tricycle_Unit_Inspection_${selectedApplicant.vehiclePlate}.png`}
          documentType="image"
        />
      )}
      </>
      )}
    </Box>
  );
};
