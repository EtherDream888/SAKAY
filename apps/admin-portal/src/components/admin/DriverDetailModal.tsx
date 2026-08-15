import React, { useState } from 'react';
import { Box, Typography, Avatar, Rating, Button, Chip } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import PersonIcon from '@mui/icons-material/Person';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import ShieldIcon from '@mui/icons-material/Shield';
import GavelIcon from '@mui/icons-material/Gavel';

import { DriverRecord } from '../../mockData/adminData';
import { MacCenterModal } from './MacCenterModal';
import { StatusBadge } from '../common/StatusBadge';
import { ActionButton } from './ActionButton';
import { DocumentPreviewModal } from './DocumentPreviewModal';

interface DriverDetailModalProps {
  open: boolean;
  onClose: () => void;
  driver: DriverRecord | null;
  onStatusChange?: (driverId: string, newStatus: 'Active' | 'Inactive') => void;
}

export const DriverDetailModal: React.FC<DriverDetailModalProps> = ({
  open,
  onClose,
  driver,
  onStatusChange,
}) => {
  const [selectedDoc, setSelectedDoc] = useState<{ name: string; type: string } | null>(null);
  const [reminderSent, setReminderSent] = useState(false);
  const [strikeIssued, setStrikeIssued] = useState(false);

  if (!driver) return null;

  const isAccountActive = driver.accountStatus === 'Active';

  const handleToggleStatus = () => {
    if (onStatusChange) {
      onStatusChange(driver.id, isAccountActive ? 'Inactive' : 'Active');
    }
  };

  const handleSendReminder = () => {
    setReminderSent(true);
    setTimeout(() => setReminderSent(false), 3000);
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

  const strikeLevel = getStrikeLevel(driver.strikesCount);

  return (
    <>
      <MacCenterModal
        open={open}
        onClose={onClose}
        title={driver.name}
        subtitle={`License No: ${driver.licenseNo} • ${driver.todaName}`}
        badge={<StatusBadge status={driver.accountStatus} />}
        maxWidth={820}
        primaryActionLabel={isAccountActive ? 'Suspend Driver' : 'Reactivate Driver'}
        onPrimaryAction={handleToggleStatus}
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
                fontSize: '22px',
                fontWeight: 700,
                boxShadow: 'var(--mac-shadow-subtle)',
              }}
            >
              {driver.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: '19px', fontWeight: 700, color: 'var(--mac-text-primary)', lineHeight: 1.2 }}>
                {driver.name}
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', mt: '4px' }}>
                Affiliated with <span style={{ fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.todaName}</span>
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.8 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <Rating value={driver.rating} readOnly precision={0.1} size="small" emptyIcon={<StarIcon fontSize="inherit" />} />
              <Typography sx={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                {driver.rating} / 5
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
              Based on {driver.ratingCount} passenger ratings
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: driver.onlineStatus === 'Online' ? '#34A853' : '#9AA0A6' }} />
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: driver.onlineStatus === 'Online' ? '#1E8E3E' : 'var(--mac-text-muted)' }}>
                Session: {driver.onlineStatus}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Section 1: Strike System & Policy Compliance Log */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <FlashOnIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Driver Strike System & Policy Compliance Log (Rolling 90 Days)
              </Typography>
            </Box>
            <Chip
              icon={<ShieldIcon style={{ fontSize: 14, color: strikeLevel.color }} />}
              label={strikeLevel.label}
              size="small"
              sx={{
                backgroundColor: strikeLevel.bg,
                color: strikeLevel.color,
                fontWeight: 700,
                fontSize: '12px',
                height: 26,
                border: `1px solid ${strikeLevel.border}`,
              }}
            />
          </Box>

          <Box sx={{ backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                Active Strike Count: <span style={{ color: driver.strikesCount > 0 ? '#DC2626' : '#1E8E3E', fontWeight: 700 }}>{driver.strikesCount} Strike(s)</span>
              </Typography>
              <ActionButton
                label={strikeIssued ? 'Administrative Strike Issued ✓' : '+ Issue Manual Strike'}
                showArrow={false}
                onClick={handleIssueStrike}
                sx={{ height: 32, fontSize: '12.5px' }}
              />
            </Box>

            {driver.strikeHistory && driver.strikeHistory.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {driver.strikeHistory.map((item) => (
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
                ✓ Clean Record: No policy strikes recorded against this driver within the current 90-day window.
              </Typography>
            )}
          </Box>
        </Box>

        {/* Section 2: Personal Information */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
            <PersonIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Personal Information
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2.5, backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px' }}>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Full Name</Typography>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.name}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Age / Date of Birth</Typography>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>42 yrs old • Aug 14, 1984</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Mobile Number</Typography>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.phone}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Residential Barangay</Typography>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.barangay}</Typography>
            </Box>
          </Box>
        </Box>

        {/* Section 3: TODA / Membership Information */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
            <AccountBalanceIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              TODA Membership & Terminal
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2.5, backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px' }}>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Affiliated TODA</Typography>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.todaName}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>TODA Endorsement Status</Typography>
              <StatusBadge status={driver.todaVerificationStatus} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Assigned Terminal</Typography>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>Calapan Main Market Terminal</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Service Area</Typography>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>Poblacion 1–3</Typography>
            </Box>
          </Box>
        </Box>

        {/* Section 4: Driver & Vehicle Credentials (City Ord. No. 118, Series of 2022) */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
            <DirectionsCarIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Driver Credentials & MTOP Franchise (City Ord. No. 118, Series of 2022)
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2.5, backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px' }}>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>LTO Driver's License No.</Typography>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.licenseNo}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>License Expiration</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.licenseExpiry}</Typography>
                <StatusBadge status={driver.licenseStatus} />
              </Box>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>MTOP Permit No.</Typography>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.mtopNo}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>MTOP Expiration</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.mtopExpiry}</Typography>
                <StatusBadge status={driver.mtopStatus} />
              </Box>
            </Box>
            <Box sx={{ gridColumn: 'span 2' }}>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Registered MTOP Operator</Typography>
              <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--sakay-orange)' }}>
                {driver.mtopOperatorName}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFAFC', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--mac-border-color)' }}>
            <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-secondary)' }}>
              Send Driver's License & MTOP Permit renewal reminder to driver.
            </Typography>
            <ActionButton
              label={reminderSent ? 'Reminder Sent ✓' : 'Send Renewal Reminder'}
              showArrow={false}
              onClick={handleSendReminder}
              sx={{ height: 34, fontSize: '13px' }}
            />
          </Box>
        </Box>

        {/* Section 5: Verification Information */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
            <VerifiedUserIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              LGU Verification Status
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2.5, backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px' }}>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>TODA Endorsement</Typography>
              <StatusBadge status={driver.todaVerificationStatus} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>LGU Final Approval</Typography>
              <StatusBadge status={driver.lguVerificationStatus} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Account Access Status</Typography>
              <StatusBadge status={driver.accountStatus} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Approval Date</Typography>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>Jan 15, 2026</Typography>
            </Box>
          </Box>
        </Box>

        {/* Section 6: Supporting Verification Documents */}
        <Box>
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 2, letterSpacing: '0.3px' }}>
            Submitted Verification Credentials ({driver.documents.length})
          </Typography>
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
                  <VerifiedUserIcon sx={{ color: doc.status === 'Verified' ? '#34A853' : '#FBBC04', fontSize: 22 }} />
                  <Box>
                    <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      {doc.name}
                    </Typography>
                    <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)', mt: '3px' }}>
                      {doc.type} • Status: <span style={{ fontWeight: 600, color: doc.status === 'Verified' ? '#1E8E3E' : '#B06000' }}>{doc.status}</span>
                    </Typography>
                  </Box>
                </Box>
                <ActionButton label="Inspect File" showArrow={false} onClick={() => setSelectedDoc({ name: doc.name, type: doc.type })} sx={{ height: 34, fontSize: '13px' }} />
              </Box>
            ))}
          </Box>
        </Box>
      </MacCenterModal>

      {/* Document Inspection Popover */}
      {selectedDoc && (
        <DocumentPreviewModal
          open={Boolean(selectedDoc)}
          onClose={() => setSelectedDoc(null)}
          documentName={selectedDoc.name}
          documentType={selectedDoc.type}
        />
      )}
    </>
  );
};
