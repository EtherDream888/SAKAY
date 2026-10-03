import React, { useState, useEffect } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Avatar, Rating, Chip } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import ShieldIcon from '@mui/icons-material/Shield';

import { PassengerRecord } from '../mockData/adminData';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { MacConfirmDialog } from '../components/admin/MacConfirmDialog';
import { RestrictionBanner } from '../components/admin/RestrictionBanner';
import { SakayToast } from '../components/common/SakayToast';
import { TableEmptyState } from '../components/common/TableEmptyState';
import { useStrikeData } from '../hooks/useStrikeData';
import { getStrikeLevel } from '../utils/strikeLevel';
import {
  fetchPassengers,
  suspendPassenger,
  reactivatePassenger,
  issuePassengerStrike,
} from '../services/adminApiService';

/**
 * ============================================================================
 * PASSENGER MANAGEMENT PAGE COMPONENT
 * ============================================================================
 * Purpose:
 *   Enables LGU Transport Officers to monitor commuter registration, track
 *   ride completion statistics, review ratings, investigate passenger policy
 *   strikes, and enforce temporary suspensions or reactivations.
 * ============================================================================
 */
export const PassengerManagementPage: React.FC = () => {
  // State: Commuter accounts list and filter criteria
  const [passengers, setPassengers] = useState<PassengerRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [verificationFilter, setVerificationFilter] = useState('All');
  const [selectedPassenger, setSelectedPassenger] = useState<PassengerRecord | null>(null);
  const [strikeIssued, setStrikeIssued] = useState(false);

  // Suspension, Reactivation & Strike Dialog States
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [strikeDialogOpen, setStrikeDialogOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  // Authoritative strike ledger + violation catalog for the open passenger
  const strikeData = useStrikeData('passenger', selectedPassenger?.id);
  const activeStrikes = strikeData.activeStrikes ?? selectedPassenger?.strikesCount ?? 0;
  const strikeItems = strikeData.history.length > 0 ? strikeData.history : selectedPassenger?.strikeHistory ?? [];

  /**
   * Effect: Fetch live passenger records on initial mount.
   */
  useEffect(() => {
    let isMounted = true;
    fetchPassengers()
      .then((data) => {
        if (isMounted) {
          setPassengers(data || []);
        }
      })
      .catch((err) => {
        console.warn('[PassengerManagement] Failed to fetch passengers:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter logic: Search by name, phone, or email
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
    { label: 'Deactivated', value: 'Deactivated' },
  ];

  const verificationOptions: FilterOption[] = [
    { label: 'All Verifications', value: 'All' },
    { label: 'Verified', value: 'Verified' },
    { label: 'Unverified', value: 'Unverified' },
  ];

  /**
   * Action Handler: Suspends a passenger account with a mandatory reason.
   */
  const handleSuspendConfirm = async (reason?: string) => {
    if (!selectedPassenger) return;
    const finalReason = reason || 'Violation of Platform Policies';

    // The database engine applies and audits the suspension; failures must be visible.
    try {
      await suspendPassenger(selectedPassenger.id, finalReason, 7);
      await refreshSelectedPassenger(selectedPassenger.id);
      setToast({ message: `${selectedPassenger.name} has been suspended for 7 days.`, severity: 'success' });
    } catch (err) {
      setToast({ message: `Suspension failed: ${(err as Error).message}`, severity: 'error' });
    }

    setSuspendDialogOpen(false);
  };

  /**
   * Action Handler: Reactivates a suspended or deactivated passenger account.
   * Strike counts are kept and age out normally (Rule 22.4).
   */
  const handleReactivateConfirm = async () => {
    if (!selectedPassenger) return;
    const wasDeactivated = selectedPassenger.accountStatus === 'Deactivated';

    try {
      await reactivatePassenger(
        selectedPassenger.id,
        wasDeactivated ? 'Reactivated after manual review of the full violation history' : 'Suspension lifted by LGU Administrator',
        wasDeactivated
      );
      await refreshSelectedPassenger(selectedPassenger.id);
      setToast({ message: `${selectedPassenger.name} has been reactivated.`, severity: 'success' });
    } catch (err) {
      setToast({ message: `Reactivation failed: ${(err as Error).message}`, severity: 'error' });
    }

    setReactivateDialogOpen(false);
  };

  /**
   * Action Handler: Records a catalog violation against a passenger. The engine decides the
   * points, the ladder consequence and the audit entry (nothing is computed here).
   */
  const handleIssueStrike = async (reason?: string, violationCode?: string) => {
    if (!selectedPassenger || !violationCode) return;
    setStrikeDialogOpen(false);

    try {
      const result = await issuePassengerStrike(selectedPassenger.id, violationCode, reason || 'Administrator confirmed');
      await refreshSelectedPassenger(selectedPassenger.id);
      setStrikeIssued(true);
      setTimeout(() => setStrikeIssued(false), 3000);
      const consequence = result.consequence ? ` Consequence: ${result.consequence.replace(/_/g, ' ').toLowerCase()}.` : '';
      setToast({ message: `Recorded for ${selectedPassenger.name}. Active strikes: ${result.active_after ?? '-'}.${consequence}`, severity: 'success' });
    } catch (err) {
      setToast({ message: `Could not record the violation: ${(err as Error).message}`, severity: 'error' });
    }
  };

  /** Re-reads the passenger list and the open ledger so every number comes from the database. */
  const refreshSelectedPassenger = async (passengerId: string) => {
    const fresh = await fetchPassengers();
    setPassengers(fresh);
    setSelectedPassenger(fresh.find((p) => p.id === passengerId) ?? null);
    await strikeData.reload();
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
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>Passenger</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>Phone / Email</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>Verification</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>Bookings</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>Policy Strikes</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>Account Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPassengers.length > 0 ? (
              filteredPassengers.map((passenger) => (
                <TableRow
                  key={passenger.id}
                  sx={{
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
                          fontSize: '13px',
                          fontWeight: 600,
                        }}
                      >
                        {passenger.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-primary)' }}>
                          {passenger.name}
                        </Typography>
                        <Typography sx={{ fontSize: '11.2px', color: 'var(--mac-text-muted)', mt: '3px' }}>
                          Registered: {passenger.registeredDate}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: '13px', color: 'var(--mac-text-primary)', py: 2.2, px: 3 }}>
                    {passenger.phone}
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <StatusBadge status={passenger.verificationStatus} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)', py: 2.2, px: 3 }}>
                    {passenger.totalBookings} Rides
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={`${passenger.strikesCount} Strike(s)`}
                        size="small"
                        sx={{
                          fontSize: '11.2px',
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
              <TableEmptyState
                colSpan={7}
                icon={<PersonIcon />}
                title="No passengers registered yet."
                description="Registered commuter accounts will appear here once passengers begin signing up for SAKAY."
                onRefresh={() => {
                  setIsLoading(true);
                  fetchPassengers().then((data) => { if (data) setPassengers(data || []); }).finally(() => setIsLoading(false));
                }}
                isRefreshing={isLoading}
              />
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
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                {selectedPassenger.rating} / 5
              </Typography>
              <Typography sx={{ fontSize: '11.2px', color: 'var(--mac-text-muted)' }}>
                ({selectedPassenger.ratingCount} passenger ratings)
              </Typography>
            </Box>

            <Typography sx={{ fontSize: '11.2px', fontWeight: 600, color: 'var(--mac-text-secondary)' }}>
              Registered: {selectedPassenger.registeredDate}
            </Typography>
          </Box>

          {/* Section 1: Passenger Strike System & Policy Compliance Log */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <FlashOnIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
                <Typography sx={{ fontSize: '11.2px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Passenger Strike System & Compliance Log (Rolling 90 Days)
                </Typography>
              </Box>
              <Chip
                icon={<ShieldIcon style={{ fontSize: '11.3', color: getStrikeLevel(activeStrikes).color }} />}
                label={getStrikeLevel(activeStrikes).label}
                size="small"
                sx={{
                  backgroundColor: getStrikeLevel(activeStrikes).bg,
                  color: getStrikeLevel(activeStrikes).color,
                  fontWeight: 700,
                  fontSize: '11.2px',
                  height: 26,
                  border: `1px solid ${getStrikeLevel(activeStrikes).border}`,
                }}
              />
            </Box>

            <Box sx={{ backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  Active Strike Count: <span style={{ color: activeStrikes > 0 ? '#DC2626' : '#1E8E3E', fontWeight: 700 }}>{activeStrikes} Strike(s)</span>
                </Typography>
                <ActionButton
                  label={strikeIssued ? 'Violation Recorded ✓' : '+ Record Violation / Strike'}
                  showArrow={false}
                  onClick={() => setStrikeDialogOpen(true)}
                  sx={{ height: 32, fontSize: '11.2px' }}
                />
              </Box>

              {strikeItems.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {strikeItems.map((item) => (
                    <Box
                      key={item.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#FFFFFF',
                        padding: '14px 18px',
                        borderRadius: '9.2px',
                        border: '1px solid var(--mac-border-color)',
                        boxShadow: 'var(--mac-shadow-subtle)',
                      }}
                    >
                      <Box sx={{ pr: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: '4px' }}>
                          <Chip
                            label={`+${item.strikesApplied} Strike`}
                            size="small"
                            sx={{ fontSize: '8.4px', fontWeight: 700, backgroundColor: '#FEE2E2', color: '#DC2626', height: 20 }}
                          />
                          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                            {item.reason}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: '11.2px', color: 'var(--mac-text-muted)' }}>
                          Date: {item.date} • Issued by: {item.issuedBy}
                        </Typography>
                      </Box>

                      <Chip
                        label={item.status}
                        size="small"
                        sx={{ fontSize: '9.3px', fontWeight: 600, backgroundColor: 'rgba(255, 149, 0, 0.12)', color: '#C25E00', height: 24, flexShrink: 0 }}
                      />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ fontSize: '11.2px', color: '#1E8E3E', fontStyle: 'italic', fontWeight: 500 }}>
                  ✓ Clean Record: No policy strikes recorded against this passenger within the current 90-day window.
                </Typography>
              )}
            </Box>
          </Box>

          {/* Suspension / deactivation state, as decided by the database */}
          <RestrictionBanner
            kind={selectedPassenger.restrictionKind}
            suspendedUntil={selectedPassenger.suspendedUntil}
            reason={selectedPassenger.suspensionReason}
          />

          {/* Account Details */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
              <PersonIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
              <Typography sx={{ fontSize: '11.2px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Account & Activity Summary
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5, backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px' }}>
              <Box>
                <Typography sx={{ fontSize: '11.2px', color: 'var(--mac-text-muted)', mb: '4px' }}>Mobile Phone</Typography>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedPassenger.phone}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '11.2px', color: 'var(--mac-text-muted)', mb: '4px' }}>Email Address</Typography>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedPassenger.email}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '11.2px', color: 'var(--mac-text-muted)', mb: '4px' }}>Verification Status</Typography>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: selectedPassenger.verificationStatus === 'Verified' ? '#34A853' : '#FBBC04' }}>
                  {selectedPassenger.verificationStatus} (OTP Verified)
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '11.2px', color: 'var(--mac-text-muted)', mb: '4px' }}>Total Completed Rides</Typography>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedPassenger.totalBookings} Bookings</Typography>
              </Box>
            </Box>
          </Box>

          {/* Passenger Feedback Summary */}
          <Box>
            <Typography sx={{ fontSize: '11.2px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 2 }}>
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
                      <Typography sx={{ fontSize: '11.2px', color: 'var(--mac-text-muted)' }}>{fb.date}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: '11.2px', fontWeight: 600, color: 'var(--sakay-orange)', mb: '4px' }}>
                      Category: {fb.category}
                    </Typography>
                    <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-primary)', lineHeight: 1.4 }}>
                      "{fb.comment}"
                    </Typography>
                    <Typography sx={{ fontSize: '11.2px', color: 'var(--mac-text-muted)', mt: 1 }}>
                      Trip Ref: {fb.tripId}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', fontStyle: 'italic' }}>
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
          message={
            selectedPassenger.accountStatus === 'Deactivated'
              ? `"${selectedPassenger.name}" is deactivated. Confirm that you reviewed the full violation history above. Strike counts are not reset; they age out of the 90-day window.`
              : `Reactivate account access for "${selectedPassenger.name}"? They will regain ability to book rides through the SAKAY Passenger PWA.`
          }
          confirmLabel={selectedPassenger.accountStatus === 'Deactivated' ? 'I Reviewed the History — Reactivate' : 'Reactivate Account'}
          confirmVariant="orange"
          onConfirm={handleReactivateConfirm}
        />
      )}

      {/* 6. Record Violation / Strike Dialog (catalog-driven; the engine applies the ladder) */}
      {selectedPassenger && (
        <MacConfirmDialog
          open={strikeDialogOpen}
          onClose={() => setStrikeDialogOpen(false)}
          title="Record a Policy Violation?"
          message={`Record a confirmed violation against "${selectedPassenger.name}". The platform applies the strike count and any consequence automatically (warning at 1, review at 3, suspension at 5 and 8, deactivation at 10).`}
          confirmLabel="Record Violation"
          confirmVariant="danger"
          options={strikeData.violationOptions}
          optionLabel="Violation"
          requireReason
          reasonPlaceholder="Describe the evidence that confirms this violation..."
          onConfirm={handleIssueStrike}
        />
      )}

      <SakayToast
        open={Boolean(toast)}
        message={toast?.message ?? null}
        severity={toast?.severity ?? 'info'}
        onClose={() => setToast(null)}
      />
    </Box>
  );
};

