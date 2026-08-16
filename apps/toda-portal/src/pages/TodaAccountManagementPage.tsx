import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  Button,
  TextField,
  Chip,
  Divider,
  Avatar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import BusinessIcon from '@mui/icons-material/Business';
import GroupsIcon from '@mui/icons-material/Groups';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import EditIcon from '@mui/icons-material/Edit';
import DescriptionIcon from '@mui/icons-material/Description';
import ShieldIcon from '@mui/icons-material/Shield';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

import { CURRENT_TODA_PROFILE } from '../mockData/todaData';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { DocumentPreviewModal } from '../components/admin/DocumentPreviewModal';
import { recordTodaAuditAction } from '../services/todaApiService';

export const TodaAccountManagementPage: React.FC = () => {
  const [profile, setProfile] = useState(CURRENT_TODA_PROFILE);
  const [logoImage, setLogoImage] = useState<string | null>(null);

  // Modals & Dialogs
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [uploadDocModalOpen, setUploadDocModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ name: string; type: string } | null>(null);

  // Organizational Profile Form State
  const [editTodaName, setEditTodaName] = useState(profile.name);
  const [editTodaAcronym, setEditTodaAcronym] = useState(profile.acronym);
  const [editRegNum, setEditRegNum] = useState(profile.registrationNumber);
  const [editDateEst, setEditDateEst] = useState(profile.dateEstablished);
  const [editTerminalLoc, setEditTerminalLoc] = useState(profile.terminalLocation);
  const [editBarangay, setEditBarangay] = useState(profile.barangay);
  const [editCoverage, setEditCoverage] = useState(profile.serviceCoverageArea);

  // Officers Form State
  const [editPresident, setEditPresident] = useState(profile.officers.president);
  const [editVicePresident, setEditVicePresident] = useState(profile.officers.vicePresident);
  const [editSecretary, setEditSecretary] = useState(profile.officers.secretary);
  const [editTreasurer, setEditTreasurer] = useState(profile.officers.treasurer);

  // Document Upload Form State (Real File Picker)
  const [docCategory, setDocCategory] = useState<'Barangay Clearance' | 'Driver Master List'>('Barangay Clearance');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Logo Change Handler
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setLogoImage(imageUrl);

      recordTodaAuditAction({
        actionType: 'TODA_PROFILE_UPDATED',
        targetId: profile.id,
        targetName: profile.name,
        details: `Updated TODA Organization logo icon (${file.name}).`,
        category: 'Account',
      });
    }
  };

  // File Picker Handler for Document Renewal
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Submit Organizational Profile Edit
  const handleEditProfileSubmit = () => {
    setProfile((prev) => ({
      ...prev,
      name: editTodaName,
      acronym: editTodaAcronym,
      registrationNumber: editRegNum,
      dateEstablished: editDateEst,
      terminalLocation: editTerminalLoc,
      barangay: editBarangay,
      serviceCoverageArea: editCoverage,
      officers: {
        president: editPresident,
        vicePresident: editVicePresident,
        secretary: editSecretary,
        treasurer: editTreasurer,
      },
    }));

    recordTodaAuditAction({
      actionType: 'TODA_PROFILE_UPDATED',
      targetId: profile.id,
      targetName: editTodaName,
      details: `Updated TODA organizational details, office location (${editTerminalLoc}), and authorized officer roster.`,
      category: 'Account',
    });

    setEditProfileModalOpen(false);
  };

  // Submit Annual Compliance Document Renewal Upload
  const handleDocumentUploadSubmit = () => {
    if (!selectedFile) return;

    const fileName = selectedFile.name;
    if (docCategory === 'Barangay Clearance') {
      setProfile((prev) => ({
        ...prev,
        barangayClearanceFile: {
          name: fileName,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        },
      }));
    } else {
      setProfile((prev) => ({
        ...prev,
        rosterFile: {
          name: fileName,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          count: prev.rosterFile.count,
        },
      }));
    }

    recordTodaAuditAction({
      actionType: 'COMPLIANCE_DOCUMENT_UPLOADED',
      targetId: profile.id,
      targetName: fileName,
      details: `Uploaded annual accreditation renewal document (${docCategory}: ${fileName}) for LGU review.`,
      category: 'Account',
    });

    setSelectedFile(null);
    setUploadDocModalOpen(false);
  };

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* 1. Header Banner & Status Summary with Interactive TODA Logo Upload */}
      <Card
        elevation={0}
        sx={{
          p: 3.5,
          borderRadius: 'var(--mac-radius-lg)',
          border: '1px solid var(--mac-border-color)',
          backgroundColor: '#FFFFFF',
          boxShadow: 'var(--mac-shadow-card)',
          mb: 3.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            {/* Interactive TODA Avatar Logo with Upload Overlay */}
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={logoImage || undefined}
                sx={{
                  width: 72,
                  height: 72,
                  background: 'linear-gradient(135deg, var(--sakay-orange) 0%, #ff8a47 100%)',
                  fontSize: '28px',
                  fontWeight: 700,
                  boxShadow: '0 10px 24px rgba(255, 107, 26, 0.22)',
                }}
              >
                {!logoImage && profile.acronym.charAt(0)}
              </Avatar>
              <IconButton
                component="label"
                size="small"
                sx={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--mac-border-color)',
                  boxShadow: 'var(--mac-shadow-subtle)',
                  p: 0.75,
                  color: 'var(--sakay-orange)',
                  '&:hover': { backgroundColor: 'var(--sakay-orange-soft)' },
                }}
              >
                <PhotoCameraIcon sx={{ fontSize: 16 }} />
                <input type="file" hidden accept="image/*" onChange={handleLogoChange} />
              </IconButton>
            </Box>

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontSize: '24px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                  {profile.name}
                </Typography>
                <Chip
                  icon={<VerifiedIcon sx={{ fontSize: 18, color: '#1E8E3E' }} />}
                  label={`Permit #${profile.accreditationNo}`}
                  size="small"
                  sx={{ backgroundColor: '#E6F4EA', color: '#1E8E3E', fontWeight: 600, fontSize: '13px' }}
                />
              </Box>
              <Typography sx={{ fontSize: '14.5px', color: 'var(--mac-text-muted)', mt: '4px' }}>
                Registration No: {profile.registrationNumber} • Established: {profile.dateEstablished}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => setEditProfileModalOpen(true)}
              sx={{
                height: 42,
                px: 2.5,
                borderRadius: '10px',
                fontSize: '14.5px',
                fontWeight: 600,
                textTransform: 'none',
                backgroundColor: 'var(--sakay-orange)',
                '&:hover': { backgroundColor: 'var(--sakay-orange-hover)' },
              }}
            >
              Edit TODA Profile
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => setUploadDocModalOpen(true)}
              sx={{
                height: 42,
                px: 2.5,
                borderRadius: '10px',
                fontSize: '14.5px',
                fontWeight: 600,
                textTransform: 'none',
                color: 'var(--mac-text-primary)',
                borderColor: 'var(--mac-border-color)',
                '&:hover': { backgroundColor: 'var(--sakay-orange-soft)', borderColor: 'var(--sakay-orange-border)' },
              }}
            >
              Annual Compliance Upload
            </Button>
          </Box>
        </Box>
      </Card>

      {/* 2. Balanced 2-Column Grid Layout for TODA Information */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* Left Column: TODA Organization Information (Renamed per directive, contact info removed) */}
        <Card
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            backgroundColor: '#FFFFFF',
            boxShadow: 'var(--mac-shadow-card)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
            <BusinessIcon sx={{ color: 'var(--sakay-orange)', fontSize: 24 }} />
            <Typography sx={{ fontSize: '18px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
              TODA Organization Information
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.2, flex: 1 }}>
            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>Official TODA Name</Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                {profile.name} ({profile.acronym})
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>LGU Registration Number</Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                {profile.registrationNumber}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>Date Established</Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                {profile.dateEstablished}
              </Typography>
            </Box>

            <Divider sx={{ my: 0.5 }} />

            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>Terminal Address / Location</Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                {profile.terminalLocation}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>Barangay Jurisdiction</Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                {profile.barangay}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>Service Coverage Route</Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                {profile.serviceCoverageArea}
              </Typography>
            </Box>
          </Box>
        </Card>

        {/* Right Column: Authorized Officers & Accreditation Documents */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
          {/* Officers Card */}
          <Card
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 'var(--mac-radius-lg)',
              border: '1px solid var(--mac-border-color)',
              backgroundColor: '#FFFFFF',
              boxShadow: 'var(--mac-shadow-card)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <GroupsIcon sx={{ color: 'var(--sakay-orange)', fontSize: 24 }} />
              <Typography sx={{ fontSize: '18px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                Authorized TODA Officers
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>President</Typography>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  {profile.officers.president}
                </Typography>
              </Box>

              <Box>
                <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>Vice President</Typography>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  {profile.officers.vicePresident}
                </Typography>
              </Box>

              <Box>
                <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>Secretary</Typography>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  {profile.officers.secretary}
                </Typography>
              </Box>

              <Box>
                <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>Treasurer</Typography>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  {profile.officers.treasurer}
                </Typography>
              </Box>
            </Box>
          </Card>

          {/* Annual Accreditation Compliance Documents with Explicit View Buttons */}
          <Card
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 'var(--mac-radius-lg)',
              border: '1px solid var(--mac-border-color)',
              backgroundColor: '#FFFFFF',
              boxShadow: 'var(--mac-shadow-card)',
              flex: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <ShieldIcon sx={{ color: '#059669', fontSize: 24 }} />
                <Typography sx={{ fontSize: '18px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  Annual Compliance & Accreditation Renewal
                </Typography>
              </Box>
              <Chip label="Active Accreditation" size="small" sx={{ backgroundColor: '#E6F4EA', color: '#1E8E3E', fontWeight: 600, fontSize: '12.5px' }} />
            </Box>

            <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-muted)', mb: 2 }}>
              Documented annual requirements submitted for City LGU Franchising Office accreditation review.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box
                onClick={() => setSelectedDoc({ name: profile.barangayClearanceFile.name, type: 'pdf' })}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: '10px',
                  backgroundColor: '#FAFAFC',
                  border: '1px solid var(--mac-border-color)',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'var(--sakay-orange-soft)', borderColor: 'var(--sakay-orange-border)' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <DescriptionIcon sx={{ color: 'var(--sakay-orange)', fontSize: 22 }} />
                  <Box>
                    <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      Barangay Clearance for TODA Accreditation
                    </Typography>
                    <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>
                      {profile.barangayClearanceFile.name} • Submitted {profile.barangayClearanceFile.date}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<VisibilityIcon fontSize="small" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDoc({ name: profile.barangayClearanceFile.name, type: 'pdf' });
                  }}
                  sx={{
                    height: 34,
                    px: 2,
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    textTransform: 'none',
                    color: 'var(--sakay-orange)',
                    borderColor: 'var(--sakay-orange-border)',
                    backgroundColor: 'var(--sakay-orange-soft)',
                  }}
                >
                  View
                </Button>
              </Box>

              <Box
                onClick={() => setSelectedDoc({ name: profile.rosterFile.name, type: 'pdf' })}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: '10px',
                  backgroundColor: '#FAFAFC',
                  border: '1px solid var(--mac-border-color)',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'var(--sakay-orange-soft)', borderColor: 'var(--sakay-orange-border)' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <DescriptionIcon sx={{ color: '#1565C0', fontSize: 22 }} />
                  <Box>
                    <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      Accredited Master Driver Roster
                    </Typography>
                    <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>
                      {profile.rosterFile.name} • {profile.rosterFile.count} Accredited Members
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<VisibilityIcon fontSize="small" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDoc({ name: profile.rosterFile.name, type: 'pdf' });
                  }}
                  sx={{
                    height: 34,
                    px: 2,
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    textTransform: 'none',
                    color: 'var(--sakay-orange)',
                    borderColor: 'var(--sakay-orange-border)',
                    backgroundColor: 'var(--sakay-orange-soft)',
                  }}
                >
                  View
                </Button>
              </Box>
            </Box>
          </Card>
        </Box>
      </Box>

      {/* 3. Edit TODA Organizational Profile Centered Modal */}
      <MacCenterModal
        open={editProfileModalOpen}
        onClose={() => setEditProfileModalOpen(false)}
        title="Edit TODA Organizational Profile"
        subtitle={`Update official TODA records and authorized officers for ${profile.name}`}
        maxWidth={760}
        primaryActionLabel="Save Organizational Profile"
        onPrimaryAction={handleEditProfileSubmit}
        secondaryActionLabel="Cancel"
        onSecondaryAction={() => setEditProfileModalOpen(false)}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Typography sx={{ fontSize: '15px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
            TODA Organization Information
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
            <TextField
              label="Official TODA Name"
              value={editTodaName}
              onChange={(e) => setEditTodaName(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
            <TextField
              label="TODA Acronym"
              value={editTodaAcronym}
              onChange={(e) => setEditTodaAcronym(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
            <TextField
              label="Registration Number"
              value={editRegNum}
              onChange={(e) => setEditRegNum(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
            <TextField
              label="Date Established"
              value={editDateEst}
              onChange={(e) => setEditDateEst(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
          </Box>

          <TextField
            label="Terminal Address / Location"
            value={editTerminalLoc}
            onChange={(e) => setEditTerminalLoc(e.target.value)}
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
            <TextField
              label="Barangay Jurisdiction"
              value={editBarangay}
              onChange={(e) => setEditBarangay(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
            <TextField
              label="Service Coverage Area"
              value={editCoverage}
              onChange={(e) => setEditCoverage(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
          </Box>

          <Divider sx={{ my: 1 }} />

          <Typography sx={{ fontSize: '15px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
            Authorized Officers Roster
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
            <TextField
              label="President"
              value={editPresident}
              onChange={(e) => setEditPresident(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
            <TextField
              label="Vice President"
              value={editVicePresident}
              onChange={(e) => setEditVicePresident(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
            <TextField
              label="Secretary"
              value={editSecretary}
              onChange={(e) => setEditSecretary(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
            <TextField
              label="Treasurer"
              value={editTreasurer}
              onChange={(e) => setEditTreasurer(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
          </Box>
        </Box>
      </MacCenterModal>

      {/* 4. Upload Annual Compliance Document Centered Modal with SAKAY Orange MUI Select & Drag/Drop File Attachment Zone */}
      <MacCenterModal
        open={uploadDocModalOpen}
        onClose={() => setUploadDocModalOpen(false)}
        title="Annual Barangay Clearance & Master Roster Upload"
        subtitle="Submit updated accreditation compliance files for City LGU review"
        maxWidth={660}
        primaryActionLabel={selectedFile ? "Submit Document for LGU Review" : undefined}
        onPrimaryAction={selectedFile ? handleDocumentUploadSubmit : undefined}
        secondaryActionLabel="Cancel"
        onSecondaryAction={() => setUploadDocModalOpen(false)}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Styled SAKAY Orange MUI Select Dropdown (Fixes Photo 3 bug) */}
          <FormControl fullWidth size="small">
            <InputLabel id="doc-category-label" sx={{ fontSize: '15px', color: 'var(--mac-text-secondary)' }}>
              Document Category
            </InputLabel>
            <Select
              labelId="doc-category-label"
              label="Document Category"
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value as any)}
              MenuProps={{
                slotProps: {
                  paper: {
                    sx: {
                      borderRadius: '12px',
                      boxShadow: 'var(--mac-shadow-popover)',
                      border: '1px solid var(--mac-border-color)',
                      mt: 1,
                    },
                  },
                },
              }}
              sx={{
                borderRadius: '10px',
                backgroundColor: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 600,
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--sakay-orange) !important',
                  borderWidth: '2px',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--sakay-orange-border)',
                },
              }}
            >
              <MenuItem value="Barangay Clearance" sx={{ fontSize: '15px', py: 1.2 }}>
                Annual Barangay Clearance for Accreditation
              </MenuItem>
              <MenuItem value="Driver Master List" sx={{ fontSize: '15px', py: 1.2 }}>
                Updated Accredited Driver Master Roster
              </MenuItem>
            </Select>
          </FormControl>

          {/* Real Drag & Drop File Upload Zone */}
          <Box>
            <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)', mb: 1 }}>
              Attach Compliance Document File
            </Typography>

            <Box
              component="label"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '28px 20px',
                borderRadius: '12px',
                border: '2px dashed var(--sakay-orange-border)',
                backgroundColor: 'var(--sakay-orange-soft)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255, 107, 26, 0.12)',
                  borderColor: 'var(--sakay-orange)',
                },
              }}
            >
              <input
                type="file"
                hidden
                accept=".pdf,.doc,.docx,.png,.jpg"
                onChange={handleFileSelect}
              />
              <UploadFileIcon sx={{ fontSize: 40, color: 'var(--sakay-orange)', mb: 1 }} />
              <Typography sx={{ fontSize: '15px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                {selectedFile ? selectedFile.name : 'Click or Drag File to Attach'}
              </Typography>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mt: 0.5 }}>
                {selectedFile
                  ? `${(selectedFile.size / 1024).toFixed(1)} KB • Ready for upload`
                  : 'Supports PDF, DOCX, PNG, JPG (Max 25MB)'}
              </Typography>
            </Box>

            {selectedFile && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mt: 1.5,
                  p: 1.5,
                  borderRadius: '10px',
                  backgroundColor: '#F5F5F7',
                  border: '1px solid var(--mac-border-color)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <InsertDriveFileIcon sx={{ color: 'var(--sakay-orange)' }} />
                  <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                    {selectedFile.name}
                  </Typography>
                </Box>
                <Chip label="Selected File" size="small" color="primary" sx={{ fontSize: '12px', fontWeight: 600 }} />
              </Box>
            )}
          </Box>

          <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', lineHeight: 1.4 }}>
            Submitted compliance files will be transmitted directly to the City LGU Franchising Office for annual accreditation renewal verification.
          </Typography>
        </Box>
      </MacCenterModal>

      {/* Document Preview Modal */}
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
