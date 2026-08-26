import React, { useState } from 'react';
import { Box, Typography, Avatar, Rating, Button, Chip, Snackbar, Alert } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import PersonIcon from '@mui/icons-material/Person';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import ShieldIcon from '@mui/icons-material/Shield';

import { DriverRecord } from '../../mockData/adminData';
import { MacCenterModal } from './MacCenterModal';
import { MacConfirmDialog } from './MacConfirmDialog';
import { StatusBadge } from '../common/StatusBadge';
import { ActionButton } from './ActionButton';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import {
  verifyDriver,
  suspendDriver,
  reactivateDriver,
  issueDriverStrike,
  recordAdminAuditAction,
} from '../../services/adminApiService';

interface DriverDetailModalProps {
  open: boolean;
  onClose: () => void;
  driver: DriverRecord | null;
  onStatusChange?: (driverId: string, newStatus: 'Active' | 'Inactive') => void;
  onDriverUpdated?: (updatedDriver: DriverRecord) => void;
}

export const DriverDetailModal: React.FC<DriverDetailModalProps> = ({
  open,
  onClose,
  driver,
  onStatusChange,
  onDriverUpdated,
}) => {
  const [selectedDoc, setSelectedDoc] = useState<{ name: string; type: string } | null>(null);
  const [reminderSent, setReminderSent] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);

  // Dialog states
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [strikeDialogOpen, setStrikeDialogOpen] = useState(false);

  if (!driver) return null;

  const isAccountActive = driver.accountStatus === 'Active';
  const isVerified = driver.verificationStatus === 'Verified';

  /**
   * Action Handler: Approve Stage 2 LGU Verification
   */
  const handleVerifyConfirm = async () => {
    try {
      await verifyDriver(driver.id);
      setSnackbarMsg(`Driver ${driver.name} successfully verified and accredited.`);
      const updated: DriverRecord = {
        ...driver,
        verificationStatus: 'Verified',
        lguVerificationStatus: 'Verified',
        accountStatus: 'Active',
      };
      if (onDriverUpdated) onDriverUpdated(updated);
      if (onStatusChange) onStatusChange(driver.id, 'Active');
    } catch (err) {
      console.error('[DriverDetailModal] Verification error:', err);
      setSnackbarMsg(`Error: ${(err as Error).message}`);
    }
    setVerifyDialogOpen(false);
  };

  /**
   * Action Handler: Suspend Driver Account
   */
  const handleSuspendConfirm = async (reason?: string) => {
    const finalReason = reason || 'Administrative policy suspension';
    try {
      await suspendDriver(driver.id, finalReason, 7);
      setSnackbarMsg(`Driver ${driver.name} has been suspended.`);
      const updated: DriverRecord = {
        ...driver,
        accountStatus: 'Inactive',
        verificationStatus: 'Suspended',
      };
      if (onDriverUpdated) onDriverUpdated(updated);
      if (onStatusChange) onStatusChange(driver.id, 'Inactive');
    } catch (err) {
      console.error('[DriverDetailModal] Suspension error:', err);
      setSnackbarMsg(`Error: ${(err as Error).message}`);
    }
    setSuspendDialogOpen(false);
  };

  /**
   * Action Handler: Reactivate Driver Account
   */
  const handleReactivateConfirm = async () => {
    try {
      await reactivateDriver(driver.id);
      setSnackbarMsg(`Driver ${driver.name} account has been reactivated.`);
      const updated: DriverRecord = {
        ...driver,
        accountStatus: 'Active',
        verificationStatus: 'Verified',
      };
      if (onDriverUpdated) onDriverUpdated(updated);
      if (onStatusChange) onStatusChange(driver.id, 'Active');
    } catch (err) {
      console.error('[DriverDetailModal] Reactivation error:', err);
      setSnackbarMsg(`Error: ${(err as Error).message}`);
    }
    setReactivateDialogOpen(false);
  };

  /**
   * Action Handler: Issue Policy Strike
   */
  const handleStrikeConfirm = async (reason?: string) => {
    const finalReason = reason || 'Operational non-compliance violation';
    try {
      await issueDriverStrike(driver.id, finalReason, 'Operational');
      setSnackbarMsg(`Administrative policy strike issued to ${driver.name}.`);
      const newStrikesCount = driver.strikesCount + 1;
      const updated: DriverRecord = {
        ...driver,
        strikesCount: newStrikesCount,
        accountStatus: newStrikesCount >= 3 ? 'Inactive' : driver.accountStatus,
        verificationStatus: newStrikesCount >= 3 ? 'Suspended' : driver.verificationStatus,
      };
      if (onDriverUpdated) onDriverUpdated(updated);
    } catch (err) {
      console.error('[DriverDetailModal] Strike error:', err);
      setSnackbarMsg(`Error: ${(err as Error).message}`);
    }
    setStrikeDialogOpen(false);
  };

  /**
   * Action Handler: Send Renewal Reminder Alert
   */
  const handleSendReminder = () => {
    setReminderSent(true);
    recordAdminAuditAction({
      actionType: 'DRIVER_PERMIT_REMINDER_SENT',
      targetId: driver.id,
      targetName: driver.name,
      details: `Dispatched MTOP and License renewal alert to driver mobile (${driver.phone}).`,
      category: 'Verification',
    });
    setSnackbarMsg(`Renewal alert sent to ${driver.name}.`);
    setTimeout(() => setReminderSent(false), 3000);
  };

  // Strike level calculation
  const getStrikeLevel = (count: number) => {
    if (count === 0) return { label: 'Compliant (0 Strikes)', color: '#1E8E3E', bg: '#E6F4EA', border: '#A8DADC' };
    if (count === 1) return { label: 'Level 1 Warning (1 Strike)', color: '#B06000', bg: '#FEF7E0', border: '#FCE8E6' };
    if (count === 2) return { label: 'Level 2 Warning (2 Strikes)', color: '#C2410C', bg: '#FFF7ED', border: '#FDBA74' };
    return { label: `Suspended (${count} Strikes)`, color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' };
  };

  const strikeLevel = getStrikeLevel(driver.strikesCount);

  return (
    <>
      <MacCenterModal
        open={open}
        onClose={onClose}
        title={driver.name}
        subtitle={`License No: ${driver.licenseNo} • ${driver.todaName}`}
        badge={<StatusBadge status={driver.accountStatus as any} />}
        maxWidth={840}
        primaryActionLabel={
          !isVerified
            ? 'Approve Stage 2 Verification'
            : isAccountActive
            ? 'Suspend Driver'
            : 'Reactivate Driver'
        }
        onPrimaryAction={() => {
          if (!isVerified) setVerifyDialogOpen(true);
          else if (isAccountActive) setSuspendDialogOpen(true);
          else setReactivateDialogOpen(true);
        }}
      >
        {/* Header Profile Summary Bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFAFC',
            padding: '18px 24px',
            borderRadius: '12px',
            border: '1px solid var(--mac-border-color)',
            mb: 4,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                backgroundColor: 'var(--sakay-orange)',
                color: '#FFFFFF',
                fontSize: '17.6px',
                fontWeight: 700,
                boxShadow: 'var(--mac-shadow-subtle)',
              }}
            >
              {driver.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: '15.3px', fontWeight: 700, color: 'var(--mac-text-primary)', lineHeight: 1.2 }}>
                {driver.name}
              </Typography>
              <Typography sx={{ fontSize: '10.8px', color: 'var(--mac-text-muted)', mt: '4px' }}>
                Affiliated with <span style={{ fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.todaName}</span>
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.8 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <Rating value={driver.rating} readOnly precision={0.1} size="small" emptyIcon={<StarIcon fontSize="inherit" />} />
              <Typography sx={{ fontSize: '11.6px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                {driver.rating} / 5
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: driver.onlineStatus === 'Online' ? '#34A853' : '#9AA0A6' }} />
              <Typography sx={{ fontSize: '10.4px', fontWeight: 600, color: driver.onlineStatus === 'Online' ? '#1E8E3E' : 'var(--mac-text-muted)' }}>
                Session: {driver.onlineStatus}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Section 1: Strike System & Policy Compliance */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <FlashOnIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
              <Typography sx={{ fontSize: '10.4px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Policy Strikes & Disciplinary Status
              </Typography>
            </Box>
            <Chip
              icon={<ShieldIcon style={{ fontSize: '11.3', color: strikeLevel.color }} />}
              label={strikeLevel.label}
              size="small"
              sx={{
                backgroundColor: strikeLevel.bg,
                color: strikeLevel.color,
                fontWeight: 700,
                fontSize: '9.6px',
                height: 26,
                border: `1px solid ${strikeLevel.border}`,
              }}
            />
          </Box>

          <Box sx={{ backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: '11.3px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                Active Strikes: <span style={{ color: driver.strikesCount > 0 ? '#DC2626' : '#1E8E3E', fontWeight: 700 }}>{driver.strikesCount} Strike(s)</span>
              </Typography>
              <ActionButton
                label="+ Issue Administrative Strike"
                showArrow={false}
                onClick={() => setStrikeDialogOpen(true)}
                sx={{ height: 32, fontSize: '10px' }}
              />
            </Box>
          </Box>
        </Box>

        {/* Section 2: Personal Information */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
            <PersonIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
            <Typography sx={{ fontSize: '10.4px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              1. Personal Details
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px' }}>
            <Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>Full Name</Typography>
              <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.name}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>Contact Phone</Typography>
              <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.phone}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>Residential Barangay</Typography>
              <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.barangay}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>Account Status</Typography>
              <StatusBadge status={driver.accountStatus as any} />
            </Box>
          </Box>
        </Box>

        {/* Section 3: TODA Affiliation */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
            <AccountBalanceIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
            <Typography sx={{ fontSize: '10.4px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              2. TODA Affiliation & Endorsement
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px' }}>
            <Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>Affiliated TODA</Typography>
              <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.todaName}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>TODA Stage 1 Endorsement</Typography>
              <StatusBadge status={driver.todaVerificationStatus as any} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>TODA Membership No.</Typography>
              <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                {driver.mtopNo ? `MEM-${driver.mtopNo}` : 'MEM-2026-01'}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>Assigned Corridor</Typography>
              <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.barangay}</Typography>
            </Box>
          </Box>
        </Box>

        {/* Section 4: Vehicle & License Credentials */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
            <DirectionsCarIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
            <Typography sx={{ fontSize: '10.4px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              3. Vehicle Credentials & MTOP Franchise (City Ord. No. 118)
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px' }}>
            <Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>Professional Driver's License</Typography>
              <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.licenseNo}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>License Expiry</Typography>
              <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.licenseExpiry}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>MTOP Franchise No.</Typography>
              <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.mtopNo}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>Tricycle Vehicle Plate</Typography>
              <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.vehiclePlate}</Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFAFC', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--mac-border-color)' }}>
            <Typography sx={{ fontSize: '10.8px', color: 'var(--mac-text-secondary)' }}>
              Send License & Franchise renewal advisory to driver.
            </Typography>
            <ActionButton
              label={reminderSent ? 'Alert Sent ✓' : 'Send Renewal Alert'}
              showArrow={false}
              onClick={handleSendReminder}
              sx={{ height: 34, fontSize: '10.4px' }}
            />
          </Box>
        </Box>

        {/* Section 5: Verification Credentials */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
            <VerifiedUserIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
            <Typography sx={{ fontSize: '10.4px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              4. Verification Documents ({driver.documents.length})
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {driver.documents.map((doc, idx) => (
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
                  <VerifiedUserIcon sx={{ color: doc.status === 'Verified' ? '#34A853' : '#FBBC04', fontSize: '17.6' }} />
                  <Box>
                    <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      {doc.name}
                    </Typography>
                    <Typography sx={{ fontSize: '10px', color: 'var(--mac-text-muted)', mt: '3px' }}>
                      {doc.type} • Status: <span style={{ fontWeight: 600, color: '#1E8E3E' }}>{doc.status}</span>
                    </Typography>
                  </Box>
                </Box>
                <ActionButton
                  label="Inspect File"
                  showArrow={false}
                  onClick={() => setSelectedDoc({ name: doc.name, type: doc.type })}
                  sx={{ height: 34, fontSize: '10.4px' }}
                />
              </Box>
            ))}
          </Box>
        </Box>
      </MacCenterModal>

      {/* Confirmation Dialogs */}
      <MacConfirmDialog
        open={verifyDialogOpen}
        onClose={() => setVerifyDialogOpen(false)}
        title="Approve Stage 2 Driver Verification?"
        message={`Authorize driver "${driver.name}" (${driver.todaName}) for official franchise operations in Calapan City.`}
        confirmLabel="Approve Driver"
        confirmVariant="orange"
        onConfirm={handleVerifyConfirm}
      />

      <MacConfirmDialog
        open={suspendDialogOpen}
        onClose={() => setSuspendDialogOpen(false)}
        title="Suspend Driver Account?"
        message={`Enact an administrative suspension on "${driver.name}". The driver will be barred from accepting booking dispatches.`}
        confirmLabel="Suspend Driver"
        confirmVariant="danger"
        requireReason
        reasonPlaceholder="Specify mandatory suspension reason..."
        onConfirm={handleSuspendConfirm}
      />

      <MacConfirmDialog
        open={reactivateDialogOpen}
        onClose={() => setReactivateDialogOpen(false)}
        title="Reactivate Driver Account?"
        message={`Reactivate "${driver.name}" to active status. The driver will immediately become eligible to receive ride bookings.`}
        confirmLabel="Reactivate Account"
        confirmVariant="orange"
        onConfirm={handleReactivateConfirm}
      />

      <MacConfirmDialog
        open={strikeDialogOpen}
        onClose={() => setStrikeDialogOpen(false)}
        title="Issue Administrative Policy Strike?"
        message={`Issue +1 policy violation strike to "${driver.name}". Note: 3 strikes trigger automated platform suspension.`}
        confirmLabel="Issue Strike"
        confirmVariant="danger"
        requireReason
        reasonPlaceholder="Specify violation details (e.g. Overcharging, Route Deviation)..."
        onConfirm={handleStrikeConfirm}
      />

      {/* Document Inspection Popover */}
      {selectedDoc && (
        <DocumentPreviewModal
          open={Boolean(selectedDoc)}
          onClose={() => setSelectedDoc(null)}
          documentName={selectedDoc.name}
          documentType={selectedDoc.type}
        />
      )}

      {/* Snackbar Alert */}
      <Snackbar
        open={Boolean(snackbarMsg)}
        autoHideDuration={4000}
        onClose={() => setSnackbarMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarMsg(null)} severity="info" sx={{ width: '100%' }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </>
  );
};
