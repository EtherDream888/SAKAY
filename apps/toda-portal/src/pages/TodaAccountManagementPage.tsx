import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  Button,
  TextField,
  Chip,
  Avatar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  CircularProgress,
  Divider,
  Paper,
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
import LocationOnIcon from '@mui/icons-material/LocationOn';

import { TodaProfile } from '../types/toda';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { DocumentReviewModal } from '../components/modals/DocumentReviewModal';
import {
  fetchTodaProfile,
  updateTodaProfile,
  recordTodaAuditAction,
  uploadTodaDocument,
} from '../services/todaApiService';
import { useAuth } from '../contexts/AuthContext';

const CALAPAN_BARANGAYS = [
  'Balingayan', 'Balite', 'Baruyan', 'Batino', 'Bayanan I', 'Bayanan II', 'Biga', 'Bondoc', 'Bucayao', 'Buhuan',
  'Bulusan', 'Calero', 'Camansihan', 'Camilmil', 'Canubing I', 'Canubing II', 'Comunal', 'Guinobatan', 'Gulod',
  'Gutad', 'Ibaba East', 'Ibaba West', 'Ilaya', 'Lalud', 'Lazareto', 'Lumangbayan', 'Mahlabang', 'Malad',
  'Malamig', 'Managpi', 'Masipit', 'Navotas', 'Pachoca', 'Palhi', 'Panggalaan', 'Parang', 'Patas', 'Personas',
  'Puting Tubig', 'San Antonio', 'San Vicente Central', 'San Vicente East', 'San Vicente North', 'San Vicente South',
  'San Vicente West', 'Sapul', 'Silonay', 'Sta. Cruz', 'Sta. Isabel', 'Sta. Maria Village', 'Suqui', 'Tawiran', 'Tibag', 'Wawa'
].sort();

const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
};

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

export const TodaAccountManagementPage: React.FC = () => {
  const { todaAdminProfile } = useAuth();
  const targetTodaId = todaAdminProfile?.toda_id;

  const [profile, setProfile] = useState<TodaProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [logoImage, setLogoImage] = useState<string | null>(null);

  // Modals & Dialogs
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [uploadDocModalOpen, setUploadDocModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Document Review Modal State (Identical to TodaRegistrationPage review display)
  const [reviewModalState, setReviewModalState] = useState<{
    open: boolean;
    title: string;
    fileName: string;
    fileUrl: string;
  }>({
    open: false,
    title: '',
    fileName: '',
    fileUrl: '',
  });

  // Organizational Profile Form State
  const [editTodaName, setEditTodaName] = useState('');
  const [editTodaAcronym, setEditTodaAcronym] = useState('');
  const [editBarangay, setEditBarangay] = useState('');
  const [editDateEst, setEditDateEst] = useState('');
  const [editTerminalLoc, setEditTerminalLoc] = useState('');
  const [editTerminalCoordinates, setEditTerminalCoordinates] = useState('');

  // Officers Form State
  const [editPresident, setEditPresident] = useState('');
  const [editPresidentContact, setEditPresidentContact] = useState('');
  const [editVicePresident, setEditVicePresident] = useState('');
  const [editVicePresidentContact, setEditVicePresidentContact] = useState('');
  const [editSecretary, setEditSecretary] = useState('');
  const [editSecretaryContact, setEditSecretaryContact] = useState('');
  const [editTreasurer, setEditTreasurer] = useState('');
  const [editTreasurerContact, setEditTreasurerContact] = useState('');

  // Document Upload Form State (Real File Picker)
  const [docCategory, setDocCategory] = useState<'Barangay Clearance' | 'Driver Roster' | 'Internal Bylaws'>('Barangay Clearance');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const getCategoryFileSupport = () => {
    switch (docCategory) {
      case 'Barangay Clearance':
        return {
          accept: '.pdf,.png,.jpg,.jpeg',
          text: 'Supports PDF, PNG, or JPG (Max 10MB)',
        };
      case 'Driver Roster':
        return {
          accept: '.csv,.xlsx,.xls,.pdf',
          text: 'Supports CSV, Excel, or PDF (Max 10MB)',
        };
      case 'Internal Bylaws':
        return {
          accept: '.pdf,.png,.jpg,.jpeg',
          text: 'Supports PDF, PNG, or JPG (Max 10MB)',
        };
      default:
        return {
          accept: '.pdf,.png,.jpg,.jpeg',
          text: 'Supports PDF, PNG, or JPG (Max 10MB)',
        };
    }
  };

  const populateFormFields = (p: TodaProfile) => {
    setEditTodaName(p.name || '');
    setEditTodaAcronym(p.acronym || '');
    setEditBarangay(p.barangay || 'San Vicente Central');
    setEditDateEst(p.dateEstablished || '');
    setEditTerminalLoc(p.terminalLocation || '');
    setEditTerminalCoordinates(
      p.terminalLatitude && p.terminalLongitude
        ? `${p.terminalLatitude}, ${p.terminalLongitude}`
        : ''
    );
    setEditPresident(p.officers?.president || '');
    setEditPresidentContact(p.officers?.presidentContact || '');
    setEditVicePresident(p.officers?.vicePresident || '');
    setEditVicePresidentContact(p.officers?.vicePresidentContact || '');
    setEditSecretary(p.officers?.secretary || '');
    setEditSecretaryContact(p.officers?.secretaryContact || '');
    setEditTreasurer(p.officers?.treasurer || '');
    setEditTreasurerContact(p.officers?.treasurerContact || '');
  };

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const p = await fetchTodaProfile(targetTodaId);
      if (p) {
        setProfile(p);
        populateFormFields(p);
      }
    } catch (err) {
      console.error('[TodaAccount] Error fetching TODA profile from database:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [targetTodaId]);

  // Logo Change Handler
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setLogoImage(imageUrl);

      if (profile) {
        recordTodaAuditAction({
          actionType: 'TODA_PROFILE_UPDATED',
          targetId: profile.id,
          targetName: profile.name,
          details: `Updated TODA Organization logo icon (${file.name}).`,
          category: 'Account',
        });
      }
    }
  };

  // File Picker Handler for Document Renewal
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds the 10MB limit. Please upload a file smaller than 10MB.');
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
    }
  };

  // Submit Organizational Profile Edit
  const handleEditProfileSubmit = async () => {
    if (!profile) return;
    setIsSavingEdit(true);

    let lat: number | null = null;
    let lng: number | null = null;
    if (editTerminalCoordinates.trim()) {
      const parts = editTerminalCoordinates.split(',').map((s) => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        lat = parts[0];
        lng = parts[1];
      }
    }

    try {
      await updateTodaProfile(profile.id, {
        name: editTodaName.trim(),
        acronym: editTodaAcronym.trim(),
        barangay: editBarangay,
        dateEstablished: editDateEst,
        terminalLocation: editTerminalLoc.trim(),
        terminalLatitude: lat,
        terminalLongitude: lng,
        serviceArea: editTerminalLoc.trim(),
        officers: {
          president: editPresident.trim(),
          presidentContact: editPresidentContact.trim(),
          vicePresident: editVicePresident.trim(),
          vicePresidentContact: editVicePresidentContact.trim(),
          secretary: editSecretary.trim(),
          secretaryContact: editSecretaryContact.trim(),
          treasurer: editTreasurer.trim(),
          treasurerContact: editTreasurerContact.trim(),
        },
      });

      await loadProfile();
      setEditProfileModalOpen(false);
    } catch (err) {
      console.error('[TodaAccount] Error updating profile in database:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Submit Annual Compliance Document Renewal Upload
  const handleDocumentUploadSubmit = async () => {
    if (!selectedFile || !profile) return;
    setIsUploadingDoc(true);

    try {
      const targetBucket =
        docCategory === 'Barangay Clearance'
          ? 'barangay-clearances'
          : docCategory === 'Driver Roster'
          ? 'toda-accredited-driver-lists'
          : 'toda-bylaws';

      await uploadTodaDocument(selectedFile, targetBucket as any);

      await recordTodaAuditAction({
        actionType: 'COMPLIANCE_DOCUMENT_UPLOADED',
        targetId: profile.id,
        targetName: selectedFile.name,
        details: `Uploaded annual accreditation renewal document (${docCategory}: ${selectedFile.name}) for LGU review.`,
        category: 'Account',
      });

      await loadProfile();
      setSelectedFile(null);
      setUploadDocModalOpen(false);
    } catch (err) {
      console.error('[TodaAccount] Error uploading compliance document:', err);
    } finally {
      setIsUploadingDoc(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={36} sx={{ color: 'var(--sakay-orange)', mb: 2 }} />
          <Typography sx={{ fontSize: '14.5px', color: 'var(--mac-text-muted)', fontWeight: 500 }}>
            Loading association account records...
          </Typography>
        </Box>
      </Box>
    );
  }

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
                {!logoImage && (profile.acronym ? profile.acronym.charAt(0) : 'T')}
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
                  icon={<VerifiedIcon sx={{ fontSize: 18, color: profile.accreditationStatus === 'Active' ? '#1E8E3E' : '#B06000' }} />}
                  label={profile.accreditationStatus === 'Active' ? 'Accredited Active' : 'Pending Verification'}
                  size="small"
                  sx={{
                    backgroundColor: profile.accreditationStatus === 'Active' ? '#E6F4EA' : '#FEF3C7',
                    color: profile.accreditationStatus === 'Active' ? '#1E8E3E' : '#B06000',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                />
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => {
                populateFormFields(profile);
                setEditProfileModalOpen(true);
              }}
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
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, alignItems: 'flex-start' }}>
        {/* Left Column: TODA Organization Information */}
        <Card
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            backgroundColor: '#FFFFFF',
            boxShadow: 'var(--mac-shadow-card)',
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

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.2 }}>
            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>Official TODA Name</Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                {profile.name}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>Date Established</Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                {formatDisplayDate(profile.dateEstablished)}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>Terminal Location</Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                {profile.terminalLocation || 'Calapan City Terminal'}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>Terminal Coordinates</Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                {profile.terminalLatitude && profile.terminalLongitude
                  ? `${profile.terminalLatitude}, ${profile.terminalLongitude}`
                  : 'None specified'}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>Operating Barangay</Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                {profile.barangay || 'San Vicente Central'}
              </Typography>
            </Box>
          </Box>
        </Card>

        {/* Right Column: Authorized Officers & Accreditation Documents */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                  {profile.officers?.president || 'N/A'}
                </Typography>
                {profile.officers?.presidentContact && (
                  <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
                    {profile.officers.presidentContact}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>Vice President</Typography>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  {profile.officers?.vicePresident || 'N/A'}
                </Typography>
                {profile.officers?.vicePresidentContact && (
                  <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
                    {profile.officers.vicePresidentContact}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>Secretary</Typography>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  {profile.officers?.secretary || 'N/A'}
                </Typography>
                {profile.officers?.secretaryContact && (
                  <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
                    {profile.officers.secretaryContact}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>Treasurer</Typography>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  {profile.officers?.treasurer || 'N/A'}
                </Typography>
                {profile.officers?.treasurerContact && (
                  <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
                    {profile.officers.treasurerContact}
                  </Typography>
                )}
              </Box>
            </Box>
          </Card>

          {/* Annual Accreditation Compliance Documents with Review Modals */}
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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <ShieldIcon sx={{ color: '#059669', fontSize: 24 }} />
                <Typography sx={{ fontSize: '18px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  Annual Compliance & Accreditation Renewal
                </Typography>
              </Box>
              <Chip
                label={profile.accreditationStatus === 'Active' ? 'Active Accreditation' : 'Pending Review'}
                size="small"
                sx={{
                  backgroundColor: profile.accreditationStatus === 'Active' ? '#E6F4EA' : '#FEF3C7',
                  color: profile.accreditationStatus === 'Active' ? '#1E8E3E' : '#B06000',
                  fontWeight: 600,
                  fontSize: '12.5px',
                }}
              />
            </Box>

            <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-muted)', mb: 2 }}>
              Documented annual requirements submitted for City LGU Franchising Office accreditation review.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* Document 1: Barangay Clearance */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: '10px',
                  backgroundColor: '#FAFAFC',
                  border: '1px solid var(--mac-border-color)',
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
                  onClick={() =>
                    setReviewModalState({
                      open: true,
                      title: 'Barangay Clearance for TODA Accreditation',
                      fileName: profile.barangayClearanceFile.name,
                      fileUrl: profile.barangayClearanceFile.url || '',
                    })
                  }
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
                    '&:hover': {
                      backgroundColor: 'rgba(255, 107, 26, 0.16)',
                      borderColor: 'var(--sakay-orange)',
                    },
                  }}
                >
                  View
                </Button>
              </Box>

              {/* Document 2: Driver Roster */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: '10px',
                  backgroundColor: '#FAFAFC',
                  border: '1px solid var(--mac-border-color)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <DescriptionIcon sx={{ color: '#1565C0', fontSize: 22 }} />
                  <Box>
                    <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      Driver Roster
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
                  onClick={() =>
                    setReviewModalState({
                      open: true,
                      title: 'Driver Roster',
                      fileName: profile.rosterFile.name,
                      fileUrl: profile.rosterFile.url || '',
                    })
                  }
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
                    '&:hover': {
                      backgroundColor: 'rgba(255, 107, 26, 0.16)',
                      borderColor: 'var(--sakay-orange)',
                    },
                  }}
                >
                  View
                </Button>
              </Box>

              {/* Document 3: Internal TODA Bylaws */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: '10px',
                  backgroundColor: '#FAFAFC',
                  border: '1px solid var(--mac-border-color)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <DescriptionIcon sx={{ color: '#059669', fontSize: 22 }} />
                  <Box>
                    <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      Internal TODA Bylaws & Constitution
                    </Typography>
                    <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>
                      {profile.bylawsFile?.name || 'TODA_Bylaws.pdf'} • Submitted {profile.bylawsFile?.date || 'Recent'}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<VisibilityIcon fontSize="small" />}
                  onClick={() =>
                    setReviewModalState({
                      open: true,
                      title: 'Internal TODA Bylaws & Constitution',
                      fileName: profile.bylawsFile?.name || 'TODA_Bylaws.pdf',
                      fileUrl: profile.bylawsFile?.url || '',
                    })
                  }
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
                    '&:hover': {
                      backgroundColor: 'rgba(255, 107, 26, 0.16)',
                      borderColor: 'var(--sakay-orange)',
                    },
                  }}
                >
                  View
                </Button>
              </Box>
            </Box>
          </Card>
        </Box>
      </Box>

      {/* 3. Edit TODA Organizational Profile Centered Modal (Exact TODA Registration Labels & Layout) */}
      <MacCenterModal
        open={editProfileModalOpen}
        onClose={() => setEditProfileModalOpen(false)}
        title="Edit TODA Organizational Profile"
        subtitle={`Update official TODA records and authorized officers for ${profile.name}`}
        maxWidth={780}
        primaryActionLabel={isSavingEdit ? 'Saving...' : 'Save Organizational Profile'}
        onPrimaryAction={handleEditProfileSubmit}
        secondaryActionLabel="Cancel"
        onSecondaryAction={() => setEditProfileModalOpen(false)}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          {/* Section 1: Association Information */}
          <Box>
            <Typography sx={{ fontSize: '14px', fontWeight: 700, color: 'var(--sakay-orange)', textTransform: 'uppercase', mb: 2, letterSpacing: '0.5px' }}>
              1. Association Information
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mb: 2.5 }}>
              <TextField
                label="Official Association / TODA Name *"
                placeholder="e.g. Calapan Central Tricycle Operators & Drivers Association"
                value={editTodaName}
                onChange={(e) => setEditTodaName(e.target.value)}
                required
                fullWidth
                size="small"
              />
              <TextField
                label="TODA Acronym *"
                placeholder="e.g. CCTODA"
                value={editTodaAcronym}
                onChange={(e) => setEditTodaAcronym(e.target.value.toUpperCase())}
                required
                fullWidth
                size="small"
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mb: 2.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="edit-barangay-label">Operating Barangay *</InputLabel>
                <Select
                  labelId="edit-barangay-label"
                  label="Operating Barangay *"
                  value={editBarangay}
                  onChange={(e) => setEditBarangay(e.target.value)}
                >
                  {CALAPAN_BARANGAYS.map((brgy) => (
                    <MenuItem key={brgy} value={brgy}>
                      {brgy}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Date Established *"
                type="date"
                value={editDateEst}
                onChange={(e) => setEditDateEst(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                required
                fullWidth
                size="small"
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
              <TextField
                label="Terminal Location *"
                placeholder="e.g. Calapan Public Market, J.P. Rizal St."
                value={editTerminalLoc}
                onChange={(e) => setEditTerminalLoc(e.target.value)}
                required
                fullWidth
                size="small"
              />
              <TextField
                label="Terminal Coordinates"
                placeholder="Latitude, Longitude"
                value={editTerminalCoordinates}
                onChange={(e) => setEditTerminalCoordinates(e.target.value)}
                fullWidth
                size="small"
              />
            </Box>
          </Box>

          <Divider sx={{ borderColor: 'var(--mac-border-color)' }} />

          {/* Section 2: Authorized Association Officers */}
          <Box>
            <Typography sx={{ fontSize: '14px', fontWeight: 700, color: 'var(--sakay-orange)', textTransform: 'uppercase', mb: 2, letterSpacing: '0.5px' }}>
              2. Executive Officers
            </Typography>

            {/* President */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mb: 2.5 }}>
              <TextField
                label="President Full Name *"
                placeholder="e.g. Roberto Alcantara"
                value={editPresident}
                onChange={(e) => setEditPresident(e.target.value)}
                required
                fullWidth
                size="small"
              />
              <TextField
                label="President Mobile Contact *"
                placeholder="e.g. 0917 555 1001"
                value={editPresidentContact}
                onChange={(e) => setEditPresidentContact(formatPhoneNumber(e.target.value))}
                required
                fullWidth
                size="small"
              />
            </Box>

            {/* Vice President */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mb: 2.5 }}>
              <TextField
                label="Vice President Name"
                placeholder="e.g. Eduardo Perez"
                value={editVicePresident}
                onChange={(e) => setEditVicePresident(e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Vice President Contact"
                placeholder="e.g. 0917 555 1002"
                value={editVicePresidentContact}
                onChange={(e) => setEditVicePresidentContact(formatPhoneNumber(e.target.value))}
                fullWidth
                size="small"
              />
            </Box>

            {/* Secretary */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mb: 2.5 }}>
              <TextField
                label="Secretary Name"
                placeholder="e.g. Leticia Cruz"
                value={editSecretary}
                onChange={(e) => setEditSecretary(e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Secretary Contact"
                placeholder="e.g. 0917 555 1003"
                value={editSecretaryContact}
                onChange={(e) => setEditSecretaryContact(formatPhoneNumber(e.target.value))}
                fullWidth
                size="small"
              />
            </Box>

            {/* Treasurer */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
              <TextField
                label="Treasurer Name"
                placeholder="e.g. Mario Hernandez"
                value={editTreasurer}
                onChange={(e) => setEditTreasurer(e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Treasurer Contact"
                placeholder="e.g. 0917 555 1004"
                value={editTreasurerContact}
                onChange={(e) => setEditTreasurerContact(formatPhoneNumber(e.target.value))}
                fullWidth
                size="small"
              />
            </Box>
          </Box>
        </Box>
      </MacCenterModal>

      {/* 4. Upload Annual Compliance Document Centered Modal */}
      <MacCenterModal
        open={uploadDocModalOpen}
        onClose={() => setUploadDocModalOpen(false)}
        title="Annual Accreditation Document Upload"
        subtitle="Submit updated accreditation compliance files for City LGU review"
        maxWidth={660}
        primaryActionLabel={isUploadingDoc ? 'Uploading...' : selectedFile ? 'Submit Document for LGU Review' : undefined}
        onPrimaryAction={selectedFile && !isUploadingDoc ? handleDocumentUploadSubmit : undefined}
        secondaryActionLabel="Cancel"
        onSecondaryAction={() => setUploadDocModalOpen(false)}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="doc-select-label" sx={{ fontSize: '15px', color: 'var(--mac-text-secondary)' }}>
              Document
            </InputLabel>
            <Select
              labelId="doc-select-label"
              label="Document"
              value={docCategory}
              onChange={(e) => {
                setDocCategory(e.target.value as any);
                setSelectedFile(null);
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
              }}
            >
              <MenuItem value="Barangay Clearance" sx={{ fontSize: '15px', py: 1.2 }}>
                Barangay Clearance
              </MenuItem>
              <MenuItem value="Driver Roster" sx={{ fontSize: '15px', py: 1.2 }}>
                Driver Roster
              </MenuItem>
              <MenuItem value="Internal Bylaws" sx={{ fontSize: '15px', py: 1.2 }}>
                Internal Bylaws
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
                accept={getCategoryFileSupport().accept}
                onChange={handleFileSelect}
              />
              <UploadFileIcon sx={{ fontSize: 40, color: 'var(--sakay-orange)', mb: 1 }} />
              <Typography sx={{ fontSize: '15px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                {selectedFile ? selectedFile.name : 'Click or Drag File to Attach'}
              </Typography>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mt: 0.5 }}>
                {selectedFile
                  ? `${(selectedFile.size / 1024).toFixed(1)} KB • Ready for upload`
                  : getCategoryFileSupport().text}
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

      {/* Document Review Modal (Identical to TODA Registration Review Modal) */}
      <DocumentReviewModal
        open={reviewModalState.open}
        onClose={() => setReviewModalState((prev) => ({ ...prev, open: false }))}
        documentTitle={reviewModalState.title}
        fileName={reviewModalState.fileName}
        fileUrl={reviewModalState.fileUrl}
      />
    </Box>
  );
};
