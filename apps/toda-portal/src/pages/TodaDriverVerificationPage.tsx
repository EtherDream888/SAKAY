import React, { useState } from 'react';
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
  Alert,
  Avatar,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SendIcon from '@mui/icons-material/Send';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import CancelIcon from '@mui/icons-material/Cancel';
import ReplayIcon from '@mui/icons-material/Replay';

import { MOCK_DRIVER_APPLICANTS, CURRENT_TODA_PROFILE } from '../mockData/todaData';
import { DriverApplicant } from '../types/toda';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { MacConfirmDialog } from '../components/admin/MacConfirmDialog';
import { logTodaAction } from '../lib/auditLog';

export const TodaDriverVerificationPage: React.FC = () => {
  const [applicants, setApplicants] = useState<DriverApplicant[]>(MOCK_DRIVER_APPLICANTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [rosterFilter, setRosterFilter] = useState('All');

  // Selected Applicant for Review Modal
  const [selectedApplicant, setSelectedApplicant] = useState<DriverApplicant | null>(null);

  // Review Checkbox States
  const [rosterChecked, setRosterChecked] = useState(false);
  const [photoChecked, setPhotoChecked] = useState(false);

  // Confirmation Dialogs
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [resubmitDialogOpen, setResubmitDialogOpen] = useState(false);

  // Filter Logic
  const filteredApplicants = applicants.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.licenseNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.franchiseNo.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || app.todaStageStatus === statusFilter;
    const matchesRoster =
      rosterFilter === 'All' ||
      (rosterFilter === 'On Roster' && app.onSubmittedRoster) ||
      (rosterFilter === 'Roster Mismatch' && !app.onSubmittedRoster);

    return matchesSearch && matchesStatus && matchesRoster;
  });

  // KPI Counts
  const totalCount = applicants.length;
  const pendingCount = applicants.filter((a) => a.todaStageStatus === 'Submitted' || a.todaStageStatus === 'TODA Review').length;
  const overdueCount = applicants.filter((a) => a.isOverdue).length;
  const endorsedCount = applicants.filter((a) => a.todaStageStatus === 'TODA Endorsed').length;

  const statusOptions: FilterOption[] = [
    { label: 'All Statuses', value: 'All' },
    { label: 'Submitted', value: 'Submitted' },
    { label: 'TODA Review', value: 'TODA Review' },
    { label: 'TODA Endorsed', value: 'TODA Endorsed' },
    { label: 'Rejected', value: 'Rejected' },
    { label: 'Resubmission Required', value: 'Resubmission Required' },
  ];

  const rosterOptions: FilterOption[] = [
    { label: 'All Roster Records', value: 'All' },
    { label: 'On Roster (Matched)', value: 'On Roster' },
    { label: 'Roster Mismatch (Violation Flag)', value: 'Roster Mismatch' },
  ];

  // Open review modal
  const handleOpenReview = (app: DriverApplicant) => {
    setSelectedApplicant(app);
    setRosterChecked(app.rosterVerified);
    setPhotoChecked(app.photoVerified);
  };

  // Action: Forward to LGU
  const handleForwardConfirm = () => {
    if (!selectedApplicant) return;

    setApplicants((prev) =>
      prev.map((a) =>
        a.id === selectedApplicant.id
          ? { ...a, todaStageStatus: 'TODA Endorsed', rosterVerified: true, photoVerified: true }
          : a
      )
    );
    setSelectedApplicant((prev) => (prev ? { ...prev, todaStageStatus: 'TODA Endorsed' } : null));

    logTodaAction({
      actionType: 'DRIVER_ENDORSED_TO_LGU',
      targetId: selectedApplicant.id,
      targetName: selectedApplicant.name,
      details: `Verified master roster membership and tricycle roadworthiness. Forwarded application for ${selectedApplicant.name} (${selectedApplicant.vehiclePlate}) to LGU Administrator for final accreditation.`,
      category: 'Driver Verification',
    });

    setForwardDialogOpen(false);
  };

  // Action: Reject
  const handleRejectConfirm = (reason?: string) => {
    if (!selectedApplicant) return;

    setApplicants((prev) =>
      prev.map((a) =>
        a.id === selectedApplicant.id
          ? { ...a, todaStageStatus: 'Rejected', rejectionReason: reason }
          : a
      )
    );
    setSelectedApplicant((prev) => (prev ? { ...prev, todaStageStatus: 'Rejected', rejectionReason: reason } : null));

    logTodaAction({
      actionType: 'DRIVER_APPLICATION_REJECTED',
      targetId: selectedApplicant.id,
      targetName: selectedApplicant.name,
      details: `Rejected driver applicant ${selectedApplicant.name}. Reason: ${reason || 'Failed TODA screening requirements.'}`,
      category: 'Driver Verification',
    });

    setRejectDialogOpen(false);
  };

  // Action: Request Resubmission
  const handleResubmitConfirm = (reason?: string) => {
    if (!selectedApplicant) return;

    setApplicants((prev) =>
      prev.map((a) =>
        a.id === selectedApplicant.id
          ? { ...a, todaStageStatus: 'Resubmission Required', notes: reason }
          : a
      )
    );
    setSelectedApplicant((prev) => (prev ? { ...prev, todaStageStatus: 'Resubmission Required', notes: reason } : null));

    logTodaAction({
      actionType: 'DRIVER_RESUBMISSION_REQUESTED',
      targetId: selectedApplicant.id,
      targetName: selectedApplicant.name,
      details: `Requested document/photo resubmission for applicant ${selectedApplicant.name}. Reason: ${reason || 'Unclear franchise markings or license photo.'}`,
      category: 'Driver Verification',
    });

    setResubmitDialogOpen(false);
  };

  const isForwardEnabled = rosterChecked && photoChecked && selectedApplicant?.onSubmittedRoster;

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* 1. Summary Information Panels */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 3.5,
        }}
      >
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Total Applications</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>{totalCount}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Awaiting TODA Screening</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--sakay-orange)' }}>{pendingCount}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Overdue SLA (3+ Days)</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#C62828' }}>{overdueCount}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Forwarded / Endorsed to LGU</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#1565C0' }}>{endorsedCount}</Typography>
        </Box>
      </Box>

      {/* 2. Filter Toolbar */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search driver name, plate, franchise, or license..."
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
            label: 'Roster Match',
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

      {/* 3. Driver Applications Table */}
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
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>APPLICANT DRIVER</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>VEHICLE & FRANCHISE</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ROSTER STATUS (RULE 2.4)</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>SLA REVIEW TRACKER</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>STAGE STATUS</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredApplicants.length > 0 ? (
              filteredApplicants.map((app) => (
                <TableRow
                  key={app.id}
                  onClick={() => handleOpenReview(app)}
                  sx={{
                    cursor: 'pointer',
                    transition: 'var(--mac-transition-fast)',
                    '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                  }}
                >
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 36, height: 36, backgroundColor: 'var(--sakay-orange-soft)', color: 'var(--sakay-orange)', fontSize: '13px', fontWeight: 700 }}>
                        {app.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: '14.5px', color: 'var(--mac-text-primary)' }}>
                          {app.name}
                        </Typography>
                        <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                          License: {app.licenseNo} • {app.phone}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      Plate: {app.vehiclePlate}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                      Franchise: {app.franchiseNo}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    {app.onSubmittedRoster ? (
                      <Chip
                        label="Matched on Roster"
                        size="small"
                        icon={<CheckCircleIcon sx={{ fontSize: '14px !important', color: '#1E8E3E !important' }} />}
                        sx={{ backgroundColor: '#E6F4EA', color: '#1E8E3E', fontWeight: 600, fontSize: '12px', height: 24 }}
                      />
                    ) : (
                      <Chip
                        label="Mismatch: Not on Roster"
                        size="small"
                        icon={<WarningAmberIcon sx={{ fontSize: '14px !important', color: '#DC2626 !important' }} />}
                        sx={{ backgroundColor: '#FEE2E2', color: '#DC2626', fontWeight: 700, fontSize: '12px', height: 24 }}
                      />
                    )}
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: app.isOverdue ? '#DC2626' : 'var(--mac-text-primary)' }}>
                        {app.daysPending} {app.daysPending === 1 ? 'day' : 'days'} pending
                      </Typography>
                      {app.isOverdue && (
                        <Chip
                          label={app.daysPending > 5 ? 'SLA Overdue' : 'Approaching SLA'}
                          size="small"
                          sx={{ backgroundColor: '#FEE2E2', color: '#DC2626', fontWeight: 700, fontSize: '11px', height: 20 }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <StatusBadge status={app.todaStageStatus} />
                  </TableCell>
                  <TableCell align="right" sx={{ py: 2.2, px: 3 }}>
                    <ActionButton
                      label="Screen Applicant"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenReview(app);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography sx={{ fontSize: '15px', color: 'var(--mac-text-muted)', fontWeight: 500 }}>
                    No driver applications matching your filter criteria.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 4. Driver Screening & Verification Modal */}
      {selectedApplicant && (
        <MacCenterModal
          open={Boolean(selectedApplicant)}
          onClose={() => setSelectedApplicant(null)}
          title={`Initial Driver Screening — ${selectedApplicant.name}`}
          subtitle={`Affiliation Request for ${CURRENT_TODA_PROFILE.name}`}
          badge={<StatusBadge status={selectedApplicant.todaStageStatus} />}
          maxWidth={760}
        >
          <Box sx={{ mb: 3 }}>
            {/* Rule 2.4 Mismatch Warning Banner */}
            {!selectedApplicant.onSubmittedRoster && (
              <Alert
                severity="error"
                icon={<WarningAmberIcon fontSize="inherit" />}
                sx={{ mb: 3, borderRadius: '10px' }}
              >
                <Typography sx={{ fontSize: '13.5px', fontWeight: 700 }}>
                  Rule 2.4 Compliance Warning: Driver Mismatch Detected
                </Typography>
                <Typography sx={{ fontSize: '12.5px', mt: 0.5 }}>
                  This applicant does <strong>NOT</strong> appear in the official accredited drivers master list submitted by {CURRENT_TODA_PROFILE.acronym} to the LGU. Endorsing a non-roster driver constitutes an accreditation violation and will trigger supervisory review.
                </Typography>
              </Alert>
            )}

            {/* Applicant Details Grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, backgroundColor: '#F8F9FA', padding: '20px', borderRadius: '12px', mb: 3 }}>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Driver License No.</Typography>
                <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedApplicant.licenseNo}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Contact Mobile Number</Typography>
                <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedApplicant.phone}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Vehicle Plate & Franchise</Typography>
                <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  Plate: {selectedApplicant.vehiclePlate} • {selectedApplicant.franchiseNo}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Chassis & Motor Serial</Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 500, color: 'var(--mac-text-primary)' }}>
                  {selectedApplicant.chassisNo} / {selectedApplicant.motorNo}
                </Typography>
              </Box>
            </Box>

            {/* Required TODA Screening Checklist */}
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1.5 }}>
              Mandatory TODA Screening Verification Checklist
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
              {/* Check 1: Roster Match */}
              <Box sx={{ p: '14px 18px', borderRadius: '10px', border: '1px solid var(--mac-border-color)', backgroundColor: selectedApplicant.onSubmittedRoster ? '#FAFAFC' : '#FFF1F2' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rosterChecked}
                      disabled={!selectedApplicant.onSubmittedRoster || selectedApplicant.todaStageStatus === 'TODA Endorsed'}
                      onChange={(e) => setRosterChecked(e.target.checked)}
                      sx={{ color: 'var(--sakay-orange)', '&.Mui-checked': { color: 'var(--sakay-orange)' } }}
                    />
                  }
                  label={
                    <Box>
                      <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                        1. Master Roster Membership Verification
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
                        Confirm applicant holds valid membership in {CURRENT_TODA_PROFILE.name} franchise allocation.
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              {/* Check 2: Tricycle Roadworthiness Photo */}
              <Box sx={{ p: '14px 18px', borderRadius: '10px', border: '1px solid var(--mac-border-color)', backgroundColor: '#FAFAFC' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={photoChecked}
                      disabled={selectedApplicant.todaStageStatus === 'TODA Endorsed'}
                      onChange={(e) => setPhotoChecked(e.target.checked)}
                      sx={{ color: 'var(--sakay-orange)', '&.Mui-checked': { color: 'var(--sakay-orange)' } }}
                    />
                  }
                  label={
                    <Box>
                      <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                        2. Tricycle Photo & Franchise Stencil Inspection
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
                        Verify vehicle photo clearly displays official franchise stencil #{selectedApplicant.franchiseNo} and {CURRENT_TODA_PROFILE.acronym} body sticker.
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </Box>

            {/* Action Buttons Bar */}
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1.5 }}>
              TODA Administrative Decision
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 2, p: 2, borderRadius: '10px', backgroundColor: '#F5F5F7' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<CancelIcon />}
                  disabled={selectedApplicant.todaStageStatus === 'TODA Endorsed'}
                  onClick={() => setRejectDialogOpen(true)}
                  sx={{ height: 38, textTransform: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}
                >
                  Reject Application
                </Button>

                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  startIcon={<ReplayIcon />}
                  disabled={selectedApplicant.todaStageStatus === 'TODA Endorsed'}
                  onClick={() => setResubmitDialogOpen(true)}
                  sx={{ height: 38, textTransform: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}
                >
                  Require Resubmission
                </Button>
              </Box>

              <Button
                variant="contained"
                disabled={!isForwardEnabled || selectedApplicant.todaStageStatus === 'TODA Endorsed'}
                onClick={() => setForwardDialogOpen(true)}
                startIcon={<SendIcon />}
                sx={{
                  height: 38,
                  padding: '0 20px',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  backgroundColor: 'var(--sakay-orange)',
                  color: '#FFFFFF',
                  '&:hover': { backgroundColor: 'var(--sakay-orange-hover)' },
                }}
              >
                {selectedApplicant.todaStageStatus === 'TODA Endorsed' ? 'Endorsed to LGU' : 'Forward to LGU Administrator'}
              </Button>
            </Box>

            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: 1.5, textAlign: 'center' }}>
              <strong>Notice:</strong> Forwarding this application transmits the endorsed driver record to the LGU verification queue. Final credential clearance and mobile app activation is granted exclusively by the LGU Administrator.
            </Typography>
          </Box>
        </MacCenterModal>
      )}

      {/* 5. Forward to LGU Confirmation Dialog */}
      {selectedApplicant && (
        <MacConfirmDialog
          open={forwardDialogOpen}
          onClose={() => setForwardDialogOpen(false)}
          title="Forward Endorsement to LGU Administrator?"
          message={`Are you sure you want to endorse "${selectedApplicant.name}" (${selectedApplicant.vehiclePlate}) for final LGU Administrator review and municipal platform activation?`}
          confirmLabel="Forward to LGU"
          confirmVariant="orange"
          onConfirm={handleForwardConfirm}
        />
      )}

      {/* 6. Reject Confirmation Dialog */}
      {selectedApplicant && (
        <MacConfirmDialog
          open={rejectDialogOpen}
          onClose={() => setRejectDialogOpen(false)}
          title="Reject Driver Application?"
          message={`Reject application for "${selectedApplicant.name}"? This decision is logged in the TODA archive.`}
          confirmLabel="Reject Application"
          confirmVariant="danger"
          requireReason
          reasonPlaceholder="Specify reason for TODA rejection (e.g. Failed background check, non-compliant tricycle)..."
          onConfirm={handleRejectConfirm}
        />
      )}

      {/* 7. Require Resubmission Confirmation Dialog */}
      {selectedApplicant && (
        <MacConfirmDialog
          open={resubmitDialogOpen}
          onClose={() => setResubmitDialogOpen(false)}
          title="Request Resubmission?"
          message={`Notify "${selectedApplicant.name}" to resubmit documents or updated tricycle photos?`}
          confirmLabel="Send Resubmission Request"
          confirmVariant="orange"
          requireReason
          reasonPlaceholder="Specify required corrections (e.g. Unclear franchise photo, expired Barangay clearance)..."
          onConfirm={handleResubmitConfirm}
        />
      )}
    </Box>
  );
};
