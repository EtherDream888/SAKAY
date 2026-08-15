import React, { useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Avatar, Rating, Chip } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import ShieldIcon from '@mui/icons-material/Shield';

import { MOCK_PASSENGERS, PassengerRecord } from '../mockData/adminData';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { MacConfirmDialog } from '../components/admin/MacConfirmDialog';

export const PassengerManagementPage: React.FC = () => {
  const [passengers, setPassengers] = useState<PassengerRecord[]>(MOCK_PASSENGERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [verificationFilter, setVerificationFilter] = useState('All');
  const [selectedPassenger, setSelectedPassenger] = useState<PassengerRecord | null>(null);
  const [strikeIssued, setStrikeIssued] = useState(false);

  // Suspension & Reactivation Dialog States
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);

  const filteredPassengers = passengers.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || p.accountStatus === statusFilter;
    const matchesVerification = verificationFilter === 'All' || p.verificationStatus === verificationFilter;

    return matchesSearch && matchesStatus && matchesVerification;
  });

  const statusOptions: FilterOption[] = [
    { label: 'All Account Statuses', value: 'All' },
    { label: 'Active', value: 'Active' },
    { label: 'Suspended', value: 'Suspended' },
  ];

  const verificationOptions: FilterOption[] = [
    { label: 'All Verifications', value: 'All' },
    { label: 'Verified', value: 'Verified' },
    { label: 'Unverified', value: 'Unverified' },
  ];

  const handleSuspendConfirm = (reason?: string) => {
    if (!selectedPassenger) return;
    setPassengers((prev) =>
      prev.map((p) =>
        p.id === selectedPassenger.id
          ? { ...p, accountStatus: 'Suspended', suspensionReason: reason || 'Violation of Platform Policies' }
          : p
      )
    );
    setSelectedPassenger((prev) =>
      prev ? { ...prev, accountStatus: 'Suspended', suspensionReason: reason || 'Violation of Platform Policies' } : null
    );
    setSuspendDialogOpen(false);
  };

  const handleReactivateConfirm = () => {
    if (!selectedPassenger) return;
    setPassengers((prev) =>
      prev.map((p) => (p.id === selectedPassenger.id ? { ...p, accountStatus: 'Active', suspensionReason: undefined } : p))
    );
    setSelectedPassenger((prev) => (prev ? { ...prev, accountStatus: 'Active', suspensionReason: undefined } : null));
    setReactivateDialogOpen(false);
  };

  const handleIssueStrike = () => {
    setStrikeIssued(true);
    setTimeout(() => setStrikeIssued(false), 3000);
  };

  // Helper for Strike Consequence Level (Rolling 90-Day Window)
  const getStrikeLevel = (count: number) => {
    if (count === 0) return { label: 'Compliant (0 / 10)', color: '#1E8E3E', bg: '#E6F4EA', border: '#A8DADC' };
    if (count < 3) return { label: `Level 1: Warning Issued (${count} / 10)`, color: '#B06000', bg: '#FEF7E0', border: '#FCE8E6' };
    if (count < 5) return { label: `Level 2: Administrative Review (${count} / 10)`, color: '#C2410C', bg: '#FFF7ED', border: '#FDBA74' };
    if (count < 8) return { label: `Level 3: 7-Day Suspension (${count} / 10)`, color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' };
    if (count < 10) return { label: `Level 4: 30-Day Suspension (${count} / 10)`, color: '#B91C1C', bg: '#FEE2E2', border: '#F87171' };
    return { label: `Level 5: Permanent Deactivation (${count} / 10)`, color: '#7F1D1D', bg: '#FEF2F2', border: '#EF4444' };
  };

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* 1. Filter Toolbar */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search passenger by name, phone, or email..."
        selectFilters={[
          {
            id: 'status',
            label: 'Account Status',
            value: statusFilter,
            options: statusOptions,
            onChange: setStatusFilter,
          },
          {
            id: 'verification',
            label: 'Verification',
            value: verificationFilter,
            options: verificationOptions,
            onChange: setVerificationFilter,
          },
        ]}
        onResetFilters={() => {
          setSearchQuery('');
          setStatusFilter('All');
          setStatusFilter('All');
        }}
      />

      {/* 2. Passenger Table */}
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
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>PASSENGER</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>PHONE / EMAIL</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>VERIFICATION</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>BOOKINGS</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>POLICY STRIKES</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACCOUNT STATUS</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPassengers.length > 0 ? (
              filteredPassengers.map((passenger) => (
                <TableRow
                  key={passenger.id}
                  onClick={() => setSelectedPassenger(passenger)}
                  sx={{
                    cursor: 'pointer',
                    transition: 'var(--mac-transition-fast)',
                    '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                  }}
                >
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          backgroundColor: '#E8F0FE',
                          color: '#1A73E8',
                          fontSize: '14px',
                          fontWeight: 600,
                        }}
                      >
                        {passenger.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: '14.5px', color: 'var(--mac-text-primary)' }}>
                          {passenger.name}
                        </Typography>
                        <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)', mt: '3px' }}>
                          Registered: {passenger.registeredDate}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: '14px', color: 'var(--mac-text-primary)', py: 2.2, px: 3 }}>
                    {passenger.phone}
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <StatusBadge status={passenger.verificationStatus} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)', py: 2.2, px: 3 }}>
                    {passenger.totalBookings} Rides
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={`${passenger.strikesCount} Strike(s)`}
                        size="small"
                        sx={{
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: passenger.strikesCount > 0 ? 'rgba(234, 67, 53, 0.12)' : 'rgba(52, 168, 83, 0.12)',
                          color: passenger.strikesCount > 0 ? '#D93025' : '#1E8E3E',
                          height: 24,
                        }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <StatusBadge status={passenger.accountStatus} />
                  </TableCell>
                  <TableCell align="right" sx={{ py: 2.2, px: 3 }}>
                    <ActionButton
                      label="View Account"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPassenger(passenger);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography sx={{ fontSize: '15px', color: 'var(--mac-text-muted)', fontWeight: 500 }}>
                    No passenger records found matching your filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 3. Centered Passenger Account Modal */}
      {selectedPassenger && (
        <MacCenterModal
          open={Boolean(selectedPassenger)}
          onClose={() => setSelectedPassenger(null)}
          title={`Passenger Account — ${selectedPassenger.name}`}
          subtitle={`Passenger ID: ${selectedPassenger.id}`}
          badge={<StatusBadge status={selectedPassenger.accountStatus} />}
          primaryActionLabel={selectedPassenger.accountStatus === 'Active' ? 'Suspend Account' : 'Reactivate Account'}
          onPrimaryAction={() => {
            if (selectedPassenger.accountStatus === 'Active') {
              setSuspendDialogOpen(true);
            } else {
              setReactivateDialogOpen(true);
            }
          }}
          maxWidth={760}
        >
          {/* Account Rating Bar */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFAFC', padding: '16px 20px', borderRadius: '12px', mb: 4, border: '1px solid var(--mac-border-color)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Rating value={selectedPassenger.rating} readOnly precision={0.1} size="small" emptyIcon={<StarIcon fontSize="inherit" />} />
              <Typography sx={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                {selectedPassenger.rating} / 5
              </Typography>
              <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
                ({selectedPassenger.ratingCount} passenger ratings)
              </Typography>
            </Box>

            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-secondary)' }}>
              Registered: {selectedPassenger.registeredDate}
            </Typography>
          </Box>

          {/* Section 1: Passenger Strike System & Policy Compliance Log */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <FlashOnIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Passenger Strike System & Compliance Log (Rolling 90 Days)
                </Typography>
              </Box>
              <Chip
                icon={<ShieldIcon style={{ fontSize: 14, color: getStrikeLevel(selectedPassenger.strikesCount).color }} />}
                label={getStrikeLevel(selectedPassenger.strikesCount).label}
                size="small"
                sx={{
                  backgroundColor: getStrikeLevel(selectedPassenger.strikesCount).bg,
                  color: getStrikeLevel(selectedPassenger.strikesCount).color,
                  fontWeight: 700,
                  fontSize: '12px',
                  height: 26,
                  border: `1px solid ${getStrikeLevel(selectedPassenger.strikesCount).border}`,
                }}
              />
            </Box>

            <Box sx={{ backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  Active Strike Count: <span style={{ color: selectedPassenger.strikesCount > 0 ? '#DC2626' : '#1E8E3E', fontWeight: 700 }}>{selectedPassenger.strikesCount} Strike(s)</span>
                </Typography>
                <ActionButton
                  label={strikeIssued ? 'Administrative Strike Issued ✓' : '+ Issue Manual Strike'}
                  showArrow={false}
                  onClick={handleIssueStrike}
                  sx={{ height: 32, fontSize: '12.5px' }}
                />
              </Box>

              {selectedPassenger.strikeHistory && selectedPassenger.strikeHistory.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {selectedPassenger.strikeHistory.map((item) => (
                    <Box
                      key={item.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#FFFFFF',
                        padding: '14px 18px',
                        borderRadius: '10px',
                        border: '1px solid var(--mac-border-color)',
                        boxShadow: 'var(--mac-shadow-subtle)',
                      }}
                    >
                      <Box sx={{ pr: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: '4px' }}>
                          <Chip
                            label={`+${item.strikesApplied} Strike`}
                            size="small"
                            sx={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#FEE2E2', color: '#DC2626', height: 20 }}
                          />
                          <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                            {item.reason}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
                          Date: {item.date} • Issued by: {item.issuedBy}
                        </Typography>
                      </Box>

                      <Chip
                        label={item.status}
                        size="small"
                        sx={{ fontSize: '11.5px', fontWeight: 600, backgroundColor: 'rgba(255, 149, 0, 0.12)', color: '#C25E00', height: 24, flexShrink: 0 }}
                      />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ fontSize: '13.5px', color: '#1E8E3E', fontStyle: 'italic', fontWeight: 500 }}>
                  ✓ Clean Record: No policy strikes recorded against this passenger within the current 90-day window.
                </Typography>
              )}
            </Box>
          </Box>

          {/* Policy Violation Suspension Reason if Suspended */}
          {selectedPassenger.accountStatus === 'Suspended' && selectedPassenger.suspensionReason && (
            <Box sx={{ mb: 4, backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', padding: '16px 20px', borderRadius: '12px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <ReportProblemIcon sx={{ color: '#DC2626', fontSize: 22 }} />
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#991B1B' }}>
                  Account Suspended — Policy Violation
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '13.5px', color: '#B91C1C', mt: '4px' }}>
                {selectedPassenger.suspensionReason}
              </Typography>
            </Box>
          )}

          {/* Account Details */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
              <PersonIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Account & Activity Summary
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5, backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px' }}>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Mobile Phone</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedPassenger.phone}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Email Address</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedPassenger.email}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Verification Status</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: selectedPassenger.verificationStatus === 'Verified' ? '#34A853' : '#FBBC04' }}>
                  {selectedPassenger.verificationStatus} (OTP Verified)
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Total Completed Rides</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedPassenger.totalBookings} Bookings</Typography>
              </Box>
            </Box>
          </Box>

          {/* Passenger Feedback Summary */}
          <Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 2 }}>
              Recent Passenger Feedback & Complaints Log
            </Typography>

            {selectedPassenger.recentFeedback && selectedPassenger.recentFeedback.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {selectedPassenger.recentFeedback.map((fb, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      padding: '16px 18px',
                      borderRadius: '12px',
                      border: '1px solid var(--mac-border-color)',
                      backgroundColor: '#FFFFFF',
                      boxShadow: 'var(--mac-shadow-subtle)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Rating value={fb.rating} readOnly precision={0.5} size="small" emptyIcon={<StarIcon fontSize="inherit" />} />
                      <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>{fb.date}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--sakay-orange)', mb: '4px' }}>
                      Category: {fb.category}
                    </Typography>
                    <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-primary)', lineHeight: 1.4 }}>
                      "{fb.comment}"
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: 1 }}>
                      Trip Ref: {fb.tripId}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-muted)', fontStyle: 'italic' }}>
                No recent feedback or complaints submitted for this passenger.
              </Typography>
            )}
          </Box>
        </MacCenterModal>
      )}

      {/* 4. Suspend Account Confirmation Dialog */}
      {selectedPassenger && (
        <MacConfirmDialog
          open={suspendDialogOpen}
          onClose={() => setSuspendDialogOpen(false)}
          title="Suspend Passenger Account?"
          message={`Are you sure you want to suspend "${selectedPassenger.name}"? Specify the policy violation reason below.`}
          confirmLabel="Suspend Passenger"
          confirmVariant="danger"
          requireReason
          reasonPlaceholder="Specify violation (e.g. Repeated booking cancellations, abusive conduct)..."
          onConfirm={handleSuspendConfirm}
        />
      )}

      {/* 5. Reactivate Account Confirmation Dialog */}
      {selectedPassenger && (
        <MacConfirmDialog
          open={reactivateDialogOpen}
          onClose={() => setReactivateDialogOpen(false)}
          title="Reactivate Passenger Account?"
          message={`Reactivate account access for "${selectedPassenger.name}"? They will regain ability to book rides through the SAKAY Passenger PWA.`}
          confirmLabel="Reactivate Account"
          confirmVariant="orange"
          onConfirm={handleReactivateConfirm}
        />
      )}
    </Box>
  );
};
