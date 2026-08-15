import React, { useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderZipIcon from '@mui/icons-material/FolderZip';

import { MOCK_TODA_APPLICATIONS, TodaApplicationRecord } from '../mockData/adminData';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { MacConfirmDialog } from '../components/admin/MacConfirmDialog';

export const TodaApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<TodaApplicationRecord[]>(MOCK_TODA_APPLICATIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [reminderSent, setReminderSent] = useState<string | null>(null);
  
  // Selected Application for Centered Review Modal
  const [selectedApp, setSelectedApp] = useState<TodaApplicationRecord | null>(null);
  
  // Confirmation Dialog States
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [resubmissionDialogOpen, setResubmissionDialogOpen] = useState(false);

  // Filter logic
  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.representative.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.barangay.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Summary counts
  const pendingCount = applications.filter((a) => a.status === 'Pending').length;
  const underReviewCount = applications.filter((a) => a.status === 'Under Review').length;
  const approvedCount = applications.filter((a) => a.status === 'Approved').length;
  const declinedCount = applications.filter((a) => a.status === 'Declined' || a.status === 'Resubmission Required').length;

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

  // Actions
  const handleApproveConfirm = () => {
    if (!selectedApp) return;
    setApplications((prev) =>
      prev.map((app) => (app.id === selectedApp.id ? { ...app, status: 'Approved' } : app))
    );
    setSelectedApp((prev) => (prev ? { ...prev, status: 'Approved' } : null));
    setApproveDialogOpen(false);
  };

  const handleDeclineConfirm = (reason?: string) => {
    if (!selectedApp) return;
    setApplications((prev) =>
      prev.map((app) =>
        app.id === selectedApp.id ? { ...app, status: 'Declined', declineReason: reason } : app
      )
    );
    setSelectedApp((prev) => (prev ? { ...prev, status: 'Declined', declineReason: reason } : null));
    setDeclineDialogOpen(false);
  };

  const handleResubmissionConfirm = (reason?: string) => {
    if (!selectedApp) return;
    setApplications((prev) =>
      prev.map((app) =>
        app.id === selectedApp.id ? { ...app, status: 'Resubmission Required', resubmissionReason: reason } : app
      )
    );
    setSelectedApp((prev) => (prev ? { ...prev, status: 'Resubmission Required', resubmissionReason: reason } : null));
    setResubmissionDialogOpen(false);
  };

  const handleSendReminder = (todaId: string) => {
    setReminderSent(todaId);
    setTimeout(() => setReminderSent(null), 3000);
  };

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
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Pending Applications</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--sakay-orange)' }}>{pendingCount}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Under Review</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#1565C0' }}>{underReviewCount}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Approved Accreditation</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#2E7D32' }}>{approvedCount}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Declined / Resubmission</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#C62828' }}>{declinedCount}</Typography>
        </Box>
      </Box>

      {/* 2. Filter Toolbar */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by TODA name, representative, or barangay..."
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
        }}
      >
        <Table>
          <TableHead sx={{ backgroundColor: '#FAFAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>TODA NAME</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>REPRESENTATIVE</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>BARANGAY CLEARANCE</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>DATE SUBMITTED</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>STATUS</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredApps.length > 0 ? (
              filteredApps.map((app) => (
                <TableRow
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  sx={{
                    cursor: 'pointer',
                    transition: 'var(--mac-transition-fast)',
                    '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                  }}
                >
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '14.5px', color: 'var(--mac-text-primary)' }}>
                        {app.name}
                      </Typography>
                      {app.isOverdue5Days && (
                        <Chip label="Overdue >5 Days" size="small" sx={{ fontSize: '11px', fontWeight: 600, backgroundColor: '#FEE2E2', color: '#DC2626', height: 22 }} />
                      )}
                    </Box>
                    <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)', mt: '4px' }}>
                      ID: {app.id} • {app.memberCount} Drivers
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: '14px', color: 'var(--mac-text-primary)', py: 2.2, px: 3 }}>
                    {app.representative}
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: app.clearanceStatus === 'Expired' ? '#DC2626' : app.clearanceStatus === 'Expiring Soon' ? '#EA580C' : 'var(--mac-text-primary)' }}>
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
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography sx={{ fontSize: '15px', color: 'var(--mac-text-muted)', fontWeight: 500 }}>
                    No TODA accreditation requests found matching your filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 4. Centered Review Modal */}
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
          onSecondaryAction={() => setDeclineDialogOpen(true)}
        >
          {/* Section 1: Overview */}
          <Box sx={{ mb: 4 }}>
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 2 }}>
              Organization Details & Barangay Clearance Status
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5, backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px' }}>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Representative</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedApp.representative}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Contact Phone</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedApp.phone}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Operating Barangay</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedApp.barangay}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Barangay Clearance Expiry</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedApp.barangayClearanceExpiry}</Typography>
                  <StatusBadge status={selectedApp.clearanceStatus} />
                </Box>
              </Box>
            </Box>

            <Box sx={{ mt: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFAFC', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--mac-border-color)' }}>
              <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-secondary)' }}>
                Send Barangay Clearance renewal reminder to TODA representative.
              </Typography>
              <ActionButton
                label={reminderSent === selectedApp.id ? 'Reminder Sent ✓' : 'Send Reminder'}
                showArrow={false}
                onClick={() => handleSendReminder(selectedApp.id)}
                sx={{ height: 34, fontSize: '13px' }}
              />
            </Box>
          </Box>

          {/* Section 2: Resubmission or Decline Reason Logged */}
          {selectedApp.resubmissionReason && (
            <Box sx={{ mb: 4, backgroundColor: '#FFF7ED', border: '1px solid #FDBA74', padding: '16px 20px', borderRadius: '12px' }}>
              <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: '#EA580C', mb: '4px' }}>
                Resubmission Required Notice Logged:
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#9A3412' }}>{selectedApp.resubmissionReason}</Typography>
            </Box>
          )}

          {/* Section 3: Official Documents */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Required Verification Files ({selectedApp.documents.length})
              </Typography>
              <ActionButton
                label="Request Resubmission"
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

                  <Chip label="View File" size="small" onClick={() => {}} sx={{ fontSize: '12.5px', cursor: 'pointer', backgroundColor: 'var(--mac-canvas-bg)', height: 28 }} />
                </Box>
              ))}
            </Box>
          </Box>
        </MacCenterModal>
      )}

      {/* 5. Approve Confirmation Dialog */}
      {selectedApp && (
        <MacConfirmDialog
          open={approveDialogOpen}
          onClose={() => setApproveDialogOpen(false)}
          title="Approve TODA Accreditation?"
          message={`You are about to issue official LGU accreditation for "${selectedApp.name}". This will authorize their drivers and operating routes in ${selectedApp.barangay}.`}
          confirmLabel="Approve Accreditation"
          confirmVariant="orange"
          onConfirm={handleApproveConfirm}
        />
      )}

      {/* 6. Resubmission Required Dialog */}
      {selectedApp && (
        <MacConfirmDialog
          open={resubmissionDialogOpen}
          onClose={() => setResubmissionDialogOpen(false)}
          title="Request Resubmission?"
          message={`Return application for "${selectedApp.name}" under Resubmission Required status for document corrections without rejecting the organization.`}
          confirmLabel="Request Resubmission"
          confirmVariant="orange"
          requireReason
          reasonPlaceholder="Specify missing or expired documents (e.g. Upload updated Barangay Clearance)..."
          onConfirm={handleResubmissionConfirm}
        />
      )}

      {/* 7. Decline Confirmation Dialog */}
      {selectedApp && (
        <MacConfirmDialog
          open={declineDialogOpen}
          onClose={() => setDeclineDialogOpen(false)}
          title="Decline TODA Accreditation?"
          message={`Are you sure you want to decline the accreditation request for "${selectedApp.name}"?`}
          confirmLabel="Decline Accreditation"
          confirmVariant="danger"
          requireReason
          reasonPlaceholder="Specify reason for permanent rejection..."
          onConfirm={handleDeclineConfirm}
        />
      )}
    </Box>
  );
};
