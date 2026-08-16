import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Chip,
  Divider,
  Avatar,
  IconButton,
  InputAdornment,
  MenuItem,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import GroupsIcon from '@mui/icons-material/Groups';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import EditIcon from '@mui/icons-material/Edit';
import LockResetIcon from '@mui/icons-material/LockReset';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import DescriptionIcon from '@mui/icons-material/Description';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import { CURRENT_TODA_PROFILE, CURRENT_TODA_ADMIN } from '../mockData/todaData';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { MacConfirmDialog } from '../components/admin/MacConfirmDialog';
import { DocumentPreviewModal } from '../components/admin/DocumentPreviewModal';
import { logTodaAction } from '../lib/auditLog';

export const TodaAccountManagementPage: React.FC = () => {
  const [profile, setProfile] = useState(CURRENT_TODA_PROFILE);

  // Modals & Dialogs
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [relocateTerminalModalOpen, setRelocateTerminalModalOpen] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [uploadDocModalOpen, setUploadDocModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ name: string; type: string } | null>(null);

  // Edit Profile Form State
  const [editContact, setEditContact] = useState(profile.contactNumber);
  const [editEmail, setEditEmail] = useState(profile.email);
  const [editPresident, setEditPresident] = useState(profile.officers.president);
  const [newPassword, setNewPassword] = useState('');

  // Terminal Relocation State
  const [newTerminalAddress, setNewTerminalAddress] = useState('');
  const [relocationReason, setRelocationReason] = useState('');

  // OTP Verification State
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState(false);

  // Document Upload State
  const [docCategory, setDocCategory] = useState<'Barangay Clearance' | 'Driver Master List'>('Barangay Clearance');
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Handle Edit Profile
  const handleEditProfileSubmit = () => {
    setProfile((prev) => ({
      ...prev,
      contactNumber: editContact,
      email: editEmail,
      officers: { ...prev.officers, president: editPresident },
    }));

    logTodaAction({
      actionType: 'TODA_PROFILE_UPDATED',
      targetId: profile.id,
      targetName: profile.name,
      details: `Updated TODA contact details (${editContact}) and administrative officer information.`,
      category: 'Account',
    });

    setEditProfileModalOpen(false);
  };

  // Handle Terminal Relocation Request (Rule: Enters Pending LGU Re-approval, does NOT overwrite immediately)
  const handleRelocateSubmit = () => {
    if (!newTerminalAddress.trim()) return;

    setProfile((prev) => ({
      ...prev,
      pendingTerminalLocation: newTerminalAddress.trim(),
    }));

    logTodaAction({
      actionType: 'TERMINAL_RELOCATION_REQUESTED',
      targetId: profile.id,
      targetName: profile.name,
      details: `Submitted terminal relocation request for "${newTerminalAddress}". Status set to Pending LGU Re-approval. Reason: ${relocationReason || 'Terminal modernization / capacity expansion.'}`,
      category: 'Account',
    });

    setNewTerminalAddress('');
    setRelocationReason('');
    setRelocateTerminalModalOpen(false);
  };

  // Handle OTP Verification
  const handleSendOtp = () => {
    setOtpSent(true);
    setOtpError(false);
  };

  const handleVerifyOtp = () => {
    if (otpCode.length === 6) {
      setProfile((prev) => ({ ...prev, isOtpVerified: true }));
      logTodaAction({
        actionType: 'MOBILE_OTP_VERIFIED',
        targetId: profile.id,
        targetName: profile.contactNumber,
        details: `Completed mobile OTP verification for official TODA administrator contact line (${profile.contactNumber}).`,
        category: 'Account',
      });
      setOtpModalOpen(false);
      setOtpCode('');
      setOtpSent(false);
    } else {
      setOtpError(true);
    }
  };

  // Handle Document Upload
  const handleDocumentUploadSubmit = () => {
    const filename = uploadedFileName.trim() || `${profile.acronym}_${docCategory.replace(/\s+/g, '_')}_2026.pdf`;
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    if (docCategory === 'Barangay Clearance') {
      setProfile((prev) => ({
        ...prev,
        barangayClearanceFile: { name: filename, date: today },
      }));
    } else {
      setProfile((prev) => ({
        ...prev,
        rosterFile: { name: filename, date: today, count: prev.rosterFile.count },
      }));
    }

    logTodaAction({
      actionType: 'COMPLIANCE_DOCUMENT_UPLOADED',
      targetId: profile.id,
      targetName: filename,
      details: `Uploaded new ${docCategory} compliance archive to LGU verification registry.`,
      category: 'Account',
    });

    setUploadDocModalOpen(false);
    setUploadedFileName('');
  };

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* 1. Top Accreditation Status Tracker Card */}
      <Card
        sx={{
          borderRadius: 'var(--mac-radius-lg)',
          border: '1px solid var(--mac-border-color)',
          boxShadow: 'var(--mac-shadow-card)',
          backgroundColor: '#FFFFFF',
          mb: 3.5,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ background: 'linear-gradient(135deg, rgba(255, 107, 26, 0.08) 0%, rgba(255, 255, 255, 0.8) 100%)', p: '24px 28px', borderBottom: '1px solid var(--mac-border-color)' }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                sx={{
                  width: 52,
                  height: 52,
                  backgroundColor: 'var(--sakay-orange)',
                  color: '#FFFFFF',
                  fontSize: '20px',
                  fontWeight: 700,
                  boxShadow: '0 8px 18px rgba(255, 107, 26, 0.25)',
                }}
              >
                {profile.acronym.substring(0, 2)}
              </Avatar>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography sx={{ fontSize: '22px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                    {profile.name} ({profile.acronym})
                  </Typography>
                  <StatusBadge status={profile.accreditationStatus} />
                </Box>
                <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                  LGU Permit No: <strong style={{ color: 'var(--mac-text-primary)' }}>{profile.permitNumber}</strong> • Valid until {profile.accreditationExpiry}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                onClick={() => setEditProfileModalOpen(true)}
                startIcon={<EditIcon fontSize="small" />}
                variant="outlined"
                sx={{
                  height: 40,
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  borderColor: 'var(--mac-border-color)',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--mac-text-primary)',
                  '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                }}
              >
                Edit TODA Profile
              </Button>
              <Button
                onClick={() => setUploadDocModalOpen(true)}
                startIcon={<UploadFileIcon fontSize="small" />}
                variant="contained"
                sx={{
                  height: 40,
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  backgroundColor: 'var(--sakay-orange)',
                  color: '#FFFFFF',
                  '&:hover': { backgroundColor: 'var(--sakay-orange-hover)' },
                }}
              >
                Upload Compliance Files
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Quick Compliance Checks Bar */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, p: '18px 28px', backgroundColor: '#FAFAFC', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CheckCircleIcon sx={{ color: '#1E8E3E', fontSize: 22 }} />
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>LGU Accreditation</Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>Fully Accredited (Q2 2026)</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {profile.isOtpVerified ? (
              <CheckCircleIcon sx={{ color: '#1E8E3E', fontSize: 22 }} />
            ) : (
              <WarningAmberIcon sx={{ color: 'var(--sakay-orange)', fontSize: 22 }} />
            )}
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Admin Mobile Phone</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  {profile.isOtpVerified ? 'OTP Verified' : 'Unverified'}
                </Typography>
                {!profile.isOtpVerified && (
                  <Chip
                    label="Verify Now"
                    size="small"
                    onClick={() => setOtpModalOpen(true)}
                    sx={{ height: 20, fontSize: '11px', cursor: 'pointer', backgroundColor: 'var(--sakay-orange-soft)', color: 'var(--sakay-orange)' }}
                  />
                )}
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CheckCircleIcon sx={{ color: '#1E8E3E', fontSize: 22 }} />
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Driver Roster Record</Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>24 Registered Franchise Units</Typography>
            </Box>
          </Box>
        </Box>
      </Card>

      {/* 2. Grid of Information Sections */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' }, gap: 3, mb: 3 }}>
        {/* Left Column: Organization & Office Details */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Org & Office Info */}
          <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', p: '24px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <BusinessIcon sx={{ color: 'var(--sakay-orange)', fontSize: 22 }} />
              <Typography sx={{ fontSize: '17px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                Organization & Office Information
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5, backgroundColor: '#F8F9FA', padding: '18px', borderRadius: '12px', mb: 2.5 }}>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '3px' }}>Official Registration No.</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{profile.registrationNumber}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '3px' }}>Date Established</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{profile.dateEstablished}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '3px' }}>Jurisdiction / Barangay</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{profile.barangay}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '3px' }}>Contact Hotline</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{profile.contactNumber}</Typography>
              </Box>
              <Box sx={{ gridColumn: 'span 2' }}>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '3px' }}>Authorized Service Zone</Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 500, color: 'var(--mac-text-primary)' }}>{profile.serviceCoverageArea}</Typography>
              </Box>
            </Box>

            {/* Terminal Location with Relocation State */}
            <Box sx={{ border: '1px solid var(--mac-border-color)', borderRadius: '12px', p: 2, backgroundColor: '#FFFFFF' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOnIcon sx={{ color: 'var(--sakay-orange)', fontSize: 20 }} />
                  <Typography sx={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                    Active Terminal Location
                  </Typography>
                </Box>
                <Button
                  size="small"
                  onClick={() => setRelocateTerminalModalOpen(true)}
                  sx={{ fontSize: '12px', textTransform: 'none', color: 'var(--sakay-orange)', fontWeight: 600 }}
                >
                  Request Relocation
                </Button>
              </Box>
              <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-primary)', mb: 1, pl: 3.5 }}>
                {profile.terminalLocation}
              </Typography>

              {/* Pending LGU Re-approval Banner */}
              {profile.pendingTerminalLocation && (
                <Box sx={{ mt: 1.5, p: '12px 16px', borderRadius: '8px', backgroundColor: 'rgba(21, 101, 192, 0.08)', border: '1px solid rgba(21, 101, 192, 0.3)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <PendingIcon sx={{ color: '#1565C0', fontSize: 18 }} />
                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#1565C0' }}>
                      Relocation Pending LGU Re-approval
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-secondary)' }}>
                    Requested site: <strong>{profile.pendingTerminalLocation}</strong>. The active terminal above remains in effect until the LGU Franchising Office completes ocular inspection.
                  </Typography>
                </Box>
              )}
            </Box>
          </Card>
        </Box>

        {/* Right Column: Officers & Document Archives */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Officers Board */}
          <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', p: '24px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <GroupsIcon sx={{ color: 'var(--sakay-orange)', fontSize: 22 }} />
              <Typography sx={{ fontSize: '17px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                TODA Executive Officers
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '10px 14px', borderRadius: '8px', backgroundColor: '#FAFAFC', border: '1px solid var(--mac-border-color)' }}>
                <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>President</Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>{profile.officers.president}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '10px 14px', borderRadius: '8px', backgroundColor: '#FAFAFC', border: '1px solid var(--mac-border-color)' }}>
                <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>Vice President</Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{profile.officers.vicePresident}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '10px 14px', borderRadius: '8px', backgroundColor: '#FAFAFC', border: '1px solid var(--mac-border-color)' }}>
                <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>Secretary</Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{profile.officers.secretary}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '10px 14px', borderRadius: '8px', backgroundColor: '#FAFAFC', border: '1px solid var(--mac-border-color)' }}>
                <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>Treasurer</Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{profile.officers.treasurer}</Typography>
              </Box>
            </Box>
          </Card>

          {/* Compliance Documents */}
          <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', p: '24px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <DescriptionIcon sx={{ color: 'var(--sakay-orange)', fontSize: 22 }} />
                <Typography sx={{ fontSize: '17px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                  Accreditation Documents
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* Barangay Clearance File */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '12px 14px', borderRadius: '8px', border: '1px solid var(--mac-border-color)', backgroundColor: '#FAFAFC' }}>
                <Box>
                  <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                    Barangay Clearance
                  </Typography>
                  <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)' }}>
                    {profile.barangayClearanceFile.name} • Uploaded {profile.barangayClearanceFile.date}
                  </Typography>
                </Box>
                <ActionButton
                  label="View File"
                  showArrow={false}
                  onClick={() => setSelectedDoc({ name: profile.barangayClearanceFile.name, type: 'PDF Document' })}
                  sx={{ height: 30, fontSize: '12px' }}
                />
              </Box>

              {/* Master Roster File */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '12px 14px', borderRadius: '8px', border: '1px solid var(--mac-border-color)', backgroundColor: '#FAFAFC' }}>
                <Box>
                  <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                    Accredited Drivers Roster ({profile.rosterFile.count} Units)
                  </Typography>
                  <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)' }}>
                    {profile.rosterFile.name} • Updated {profile.rosterFile.date}
                  </Typography>
                </Box>
                <ActionButton
                  label="View File"
                  showArrow={false}
                  onClick={() => setSelectedDoc({ name: profile.rosterFile.name, type: 'PDF Document' })}
                  sx={{ height: 30, fontSize: '12px' }}
                />
              </Box>
            </Box>
          </Card>
        </Box>
      </Box>

      {/* 3. Edit TODA Profile Modal */}
      <MacCenterModal
        open={editProfileModalOpen}
        onClose={() => setEditProfileModalOpen(false)}
        title="Edit TODA Administrative Profile"
        subtitle="Update contact phone, email, and executive officer names."
        maxWidth={600}
        primaryActionLabel="Save Profile Changes"
        onPrimaryAction={handleEditProfileSubmit}
        secondaryActionLabel="Cancel"
        onSecondaryAction={() => setEditProfileModalOpen(false)}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            fullWidth
            label="TODA President Full Name"
            value={editPresident}
            onChange={(e) => setEditPresident(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />

          <TextField
            fullWidth
            label="Official Contact Hotline"
            value={editContact}
            onChange={(e) => setEditContact(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />

          <TextField
            fullWidth
            label="Official Email Address"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />

          <TextField
            fullWidth
            label="Administrative Password Reset"
            type="password"
            placeholder="Leave blank to keep existing password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />
        </Box>
      </MacCenterModal>

      {/* 4. Terminal Relocation Request Modal */}
      <MacCenterModal
        open={relocateTerminalModalOpen}
        onClose={() => setRelocateTerminalModalOpen(false)}
        title="Request Terminal Relocation"
        subtitle="Submits a relocation application to the LGU Franchising Office for review."
        maxWidth={620}
        primaryActionLabel="Submit Relocation Request"
        onPrimaryAction={handleRelocateSubmit}
        secondaryActionLabel="Cancel"
        onSecondaryAction={() => setRelocateTerminalModalOpen(false)}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box sx={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', padding: '14px 18px', borderRadius: '10px' }}>
            <Typography sx={{ fontSize: '13px', color: '#0369A1', lineHeight: 1.4 }}>
              <strong>Municipal Transport Policy Rule:</strong> Terminal relocations cannot take effect immediately. Submitting this request will flag the new location as <em>Pending LGU Re-approval</em> while drivers continue operating from the current approved site.
            </Typography>
          </Box>

          <TextField
            fullWidth
            label="Proposed New Terminal Address"
            placeholder="e.g. San Vicente Diversion Road Plaza, Calapan City"
            value={newTerminalAddress}
            onChange={(e) => setNewTerminalAddress(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Operational Justification / Rationale"
            placeholder="Describe the reason for relocation (e.g. increased passenger throughput, DPWH construction)..."
            value={relocationReason}
            onChange={(e) => setRelocationReason(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />
        </Box>
      </MacCenterModal>

      {/* 5. Mobile OTP Verification Modal */}
      <MacCenterModal
        open={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        title="Mobile OTP Security Verification"
        subtitle={`Verify ownership of TODA admin hotline (${profile.contactNumber})`}
        maxWidth={480}
        primaryActionLabel="Verify Code"
        onPrimaryAction={handleVerifyOtp}
        secondaryActionLabel="Cancel"
        onSecondaryAction={() => setOtpModalOpen(false)}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, textAlign: 'center', py: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <PhoneIphoneIcon sx={{ fontSize: 48, color: 'var(--sakay-orange)' }} />
          </Box>

          <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-secondary)' }}>
            {otpSent
              ? `We sent a 6-digit code to ${profile.contactNumber}. (Demo: Enter any 6 digits e.g. 123456)`
              : `Click "Send OTP" to transmit a verification code to ${profile.contactNumber}.`}
          </Typography>

          {!otpSent ? (
            <Button
              variant="contained"
              onClick={handleSendOtp}
              sx={{
                backgroundColor: 'var(--sakay-orange)',
                '&:hover': { backgroundColor: 'var(--sakay-orange-hover)' },
                textTransform: 'none',
                borderRadius: '10px',
                height: 42,
                fontWeight: 600,
              }}
            >
              Send OTP Code
            </Button>
          ) : (
            <Box>
              <TextField
                fullWidth
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                error={otpError}
                helperText={otpError ? 'Please enter a valid 6-digit code' : ''}
                slotProps={{
                  htmlInput: {
                    style: { textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 700 },
                  },
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
              <Button
                onClick={handleSendOtp}
                size="small"
                sx={{ mt: 1, textTransform: 'none', color: 'var(--sakay-orange)', fontSize: '12px' }}
              >
                Resend OTP Code
              </Button>
            </Box>
          )}
        </Box>
      </MacCenterModal>

      {/* 6. Upload Document Modal */}
      <MacCenterModal
        open={uploadDocModalOpen}
        onClose={() => setUploadDocModalOpen(false)}
        title="Upload Compliance File"
        subtitle="Submit updated accreditation files to the LGU administrative repository."
        maxWidth={540}
        primaryActionLabel="Confirm & Upload"
        onPrimaryAction={handleDocumentUploadSubmit}
        secondaryActionLabel="Cancel"
        onSecondaryAction={() => setUploadDocModalOpen(false)}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            select
            fullWidth
            label="Document Category"
            value={docCategory}
            onChange={(e) => setDocCategory(e.target.value as any)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          >
            <MenuItem value="Barangay Clearance">Barangay Clearance for TODA Accreditation</MenuItem>
            <MenuItem value="Driver Master List">List of Accredited Drivers & Franchise Numbers</MenuItem>
          </TextField>

          <TextField
            fullWidth
            label="File Name / Reference"
            placeholder="e.g. CCTODA_BarangayClearance_Q3_2026.pdf"
            value={uploadedFileName}
            onChange={(e) => setUploadedFileName(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />

          <Box
            sx={{
              p: 3,
              border: '2px dashed var(--mac-border-color)',
              borderRadius: '10px',
              backgroundColor: '#FAFAFC',
              textAlign: 'center',
            }}
          >
            <UploadFileIcon sx={{ fontSize: 36, color: 'var(--mac-text-muted)', mb: 1 }} />
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
              Mock PDF Upload Ready
            </Typography>
            <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)' }}>
              Files will be cryptographically hashed for LGU verification.
            </Typography>
          </Box>
        </Box>
      </MacCenterModal>

      {/* 7. Document Preview Modal */}
      {selectedDoc && (
        <DocumentPreviewModal
          open={Boolean(selectedDoc)}
          onClose={() => setSelectedDoc(null)}
          documentName={selectedDoc.name}
          documentType={selectedDoc.type}
        />
      )}
    </Box>
  );
};
