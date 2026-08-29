import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Radio,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import { useLanguage } from '../../../utils/LanguageContext';
import {
  getCachedLicenseData,
  saveLicenseScanData,
  LicenseExtractedData,
} from '../../../services/driverOnboardingCache';

export const DriverConfirmLicenseInfo: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const state = location.state as {
    phone?: string;
    driverName?: string;
    extracted?: LicenseExtractedData;
  } | undefined;

  const cached = getCachedLicenseData();
  const initial: LicenseExtractedData = state?.extracted || cached || {
    frontPhoto: '',
    backPhoto: '',
    fullName: state?.driverName || '',
    dob: '',
    gender: 'Male',
    address: '',
    licenseNumber: '',
    dlCodes: '',
    expirationDate: '',
    scannedAt: new Date().toISOString(),
  };

  const [formData, setFormData] = useState<LicenseExtractedData>(initial);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editField, setEditField] = useState<{
    key: keyof LicenseExtractedData;
    label: string;
    value: string;
    type: 'text' | 'date' | 'gender';
  } | null>(null);

  const handleOpenEdit = (
    key: keyof LicenseExtractedData,
    label: string,
    type: 'text' | 'date' | 'gender' = 'text'
  ) => {
    setEditField({ key, label, value: String(formData[key] || ''), type });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editField) {
      setFormData((prev) => ({
        ...prev,
        [editField.key]: editField.value,
      }));
    }
    setEditDialogOpen(false);
    setEditField(null);
  };

  const handleContinue = () => {
    // Persist verified license details into offline cache
    saveLicenseScanData(formData, state?.phone || '');

    // Advance to driver status monitor
    navigate('/driver/status', {
      state: {
        driverName: formData.fullName || state?.driverName || '',
        phone: state?.phone || '09181234567',
        licenseNumber: formData.licenseNumber,
      },
    });
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 1. Top Header Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          pt: 'calc(var(--safe-area-top) + 20px)',
          pb: 2,
          backgroundColor: '#FFFFFF',
          zIndex: 10,
        }}
      >
        <IconButton
          onClick={() => navigate('/driver/review-license-back', { state })}
          sx={{
            width: 44,
            height: 44,
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            '&:hover': { backgroundColor: '#F8FAFC' },
          }}
        >
          <ArrowBackIcon sx={{ color: '#0F172A', fontSize: 22 }} />
        </IconButton>

        <Logo color="orange" width={110} />
      </Box>

      {/* 2. Scrollable Content Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 3,
          pb: 'calc(var(--safe-area-bottom) + 110px)',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {/* Title */}
        <Typography
          sx={{
            fontSize: '26px',
            fontWeight: 800,
            color: '#0F172A',
            lineHeight: 1.2,
            letterSpacing: '-0.5px',
            mt: 1,
            mb: 1.25,
          }}
        >
          {t.confirmInfoTitle}
        </Typography>

        {/* Subtitle */}
        <Typography
          sx={{
            fontSize: '15px',
            color: '#334155',
            lineHeight: 1.45,
            fontWeight: 400,
            mb: 3,
          }}
        >
          {t.confirmInfoSubtitle}
        </Typography>

        {/* Extracted Details Cards List */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Card 1: Full Name */}
          <Box
            onClick={() => handleOpenEdit('fullName', t.labelFullName, 'text')}
            sx={{
              backgroundColor: '#F1F5F9',
              borderRadius: '16px',
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              border: '1px solid #E2E8F0',
              '&:hover': { backgroundColor: '#E2E8F0' },
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography
                sx={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#64748B',
                  letterSpacing: '0.6px',
                  mb: 0.5,
                }}
              >
                {t.labelFullName}
              </Typography>
              <Typography
                sx={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#0F172A',
                  minHeight: '24px',
                }}
              >
                {formData.fullName || ''}
              </Typography>
            </Box>
            <EditOutlinedIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
          </Box>

          {/* Row Card 2: Date of Birth + Gender */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {/* Date of Birth with Calendar Edit */}
            <Box
              onClick={() => handleOpenEdit('dob', t.labelDob, 'date')}
              sx={{
                flex: 1,
                backgroundColor: '#F1F5F9',
                borderRadius: '16px',
                p: 2,
                cursor: 'pointer',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                '&:hover': { backgroundColor: '#E2E8F0' },
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography
                  sx={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: '#64748B',
                    letterSpacing: '0.4px',
                    mb: 0.5,
                  }}
                >
                  {t.labelDob}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#0F172A',
                    minHeight: '22px',
                  }}
                >
                  {formData.dob || ''}
                </Typography>
              </Box>
              <EditOutlinedIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
            </Box>

            {/* Gender with Vertical Selection Edit */}
            <Box
              onClick={() => handleOpenEdit('gender', t.labelGender, 'gender')}
              sx={{
                flex: 1,
                backgroundColor: '#F1F5F9',
                borderRadius: '16px',
                p: 2,
                cursor: 'pointer',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                '&:hover': { backgroundColor: '#E2E8F0' },
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography
                  sx={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: '#64748B',
                    letterSpacing: '0.4px',
                    mb: 0.5,
                  }}
                >
                  {t.labelGender}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#0F172A',
                    minHeight: '22px',
                  }}
                >
                  {formData.gender || 'Male'}
                </Typography>
              </Box>
              <EditOutlinedIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
            </Box>
          </Box>

          {/* Card 3: Address */}
          <Box
            onClick={() => handleOpenEdit('address', t.labelAddress, 'text')}
            sx={{
              backgroundColor: '#F1F5F9',
              borderRadius: '16px',
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              border: '1px solid #E2E8F0',
              '&:hover': { backgroundColor: '#E2E8F0' },
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography
                sx={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#64748B',
                  letterSpacing: '0.6px',
                  mb: 0.5,
                }}
              >
                {t.labelAddress}
              </Typography>
              <Typography
                sx={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#0F172A',
                  lineHeight: 1.35,
                  minHeight: '22px',
                }}
              >
                {formData.address || ''}
              </Typography>
            </Box>
            <EditOutlinedIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
          </Box>

          {/* Card 4: Driver License Number */}
          <Box
            onClick={() => handleOpenEdit('licenseNumber', t.labelLicenseNumber, 'text')}
            sx={{
              backgroundColor: '#F1F5F9',
              borderRadius: '16px',
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              border: '1px solid #E2E8F0',
              '&:hover': { backgroundColor: '#E2E8F0' },
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography
                sx={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#64748B',
                  letterSpacing: '0.6px',
                  mb: 0.5,
                }}
              >
                {t.labelLicenseNumber}
              </Typography>
              <Typography
                sx={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#0F172A',
                  letterSpacing: '0.5px',
                  minHeight: '24px',
                }}
              >
                {formData.licenseNumber || ''}
              </Typography>
            </Box>
            <EditOutlinedIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
          </Box>

          {/* Card 5: RESTRICTIONS (Renamed) */}
          <Box
            onClick={() => handleOpenEdit('dlCodes', t.labelDlCodes, 'text')}
            sx={{
              backgroundColor: '#F1F5F9',
              borderRadius: '16px',
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              border: '1px solid #E2E8F0',
              '&:hover': { backgroundColor: '#E2E8F0' },
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography
                sx={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#64748B',
                  letterSpacing: '0.6px',
                  mb: 0.5,
                }}
              >
                {t.labelDlCodes}
              </Typography>
              <Typography
                sx={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#0F172A',
                  minHeight: '22px',
                }}
              >
                {formData.dlCodes || ''}
              </Typography>
            </Box>
            <EditOutlinedIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
          </Box>

          {/* Card 6: EXPIRATION DATE with Calendar Picker */}
          <Box
            onClick={() => handleOpenEdit('expirationDate', t.labelExpirationDate, 'date')}
            sx={{
              backgroundColor: '#F1F5F9',
              borderRadius: '16px',
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              border: '1px solid #E2E8F0',
              '&:hover': { backgroundColor: '#E2E8F0' },
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography
                sx={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#64748B',
                  letterSpacing: '0.6px',
                  mb: 0.5,
                }}
              >
                {t.labelExpirationDate}
              </Typography>
              <Typography
                sx={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#0F172A',
                  minHeight: '22px',
                }}
              >
                {formData.expirationDate || ''}
              </Typography>
            </Box>
            <EditOutlinedIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
          </Box>
        </Box>
      </Box>

      {/* 3. Sticky Bottom Action Button */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 24px calc(var(--safe-area-bottom) + 16px) 24px',
          background: 'linear-gradient(to top, #FFFFFF 85%, rgba(255, 255, 255, 0.9) 95%, rgba(255, 255, 255, 0) 100%)',
          zIndex: 15,
        }}
      >
        <PrimaryButton
          fullWidth
          onClick={handleContinue}
          sx={{
            height: '56px',
            borderRadius: '16px',
            fontSize: '16px',
            fontWeight: 800,
            backgroundColor: '#FF6B00',
            boxShadow: 'none',
            '&:hover': { backgroundColor: '#E66000', boxShadow: 'none' },
          }}
        >
          {t.continue}
        </PrimaryButton>
      </Box>

      {/* 4. Dynamic Field Edit Dialog (Text / Calendar Date / Vertical Gender Selection) */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '20px',
              p: 1.5,
              width: '90%',
              maxWidth: '380px',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', pb: 1 }}>
          Edit {editField?.label}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {editField?.type === 'date' ? (
            /* Native Calendar Date Picker */
            <TextField
              autoFocus
              fullWidth
              type="date"
              margin="dense"
              value={editField?.value || ''}
              onChange={(e) =>
                setEditField((prev) => (prev ? { ...prev, value: e.target.value } : null))
              }
              slotProps={{
                inputLabel: { shrink: true },
              }}
              sx={{ mt: 1 }}
            />
          ) : editField?.type === 'gender' ? (
            /* Two vertical options: Male / Female */
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              {['Male', 'Female'].map((genderOption) => {
                const isSelected = editField?.value === genderOption;
                return (
                  <Box
                    key={genderOption}
                    onClick={() =>
                      setEditField((prev) => (prev ? { ...prev, value: genderOption } : null))
                    }
                    sx={{
                      p: 2,
                      borderRadius: '14px',
                      border: isSelected ? '2px solid #FF6B00' : '1.5px solid #E2E8F0',
                      backgroundColor: isSelected ? 'rgba(255, 107, 0, 0.05)' : '#F8FAFC',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease-in-out',
                      '&:hover': {
                        borderColor: '#FF6B00',
                        backgroundColor: 'rgba(255, 107, 0, 0.04)',
                      },
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '15px',
                        fontWeight: isSelected ? 800 : 600,
                        color: isSelected ? '#FF6B00' : '#0F172A',
                      }}
                    >
                      {genderOption}
                    </Typography>
                    <Radio
                      checked={isSelected}
                      value={genderOption}
                      sx={{
                        p: 0,
                        color: '#CBD5E1',
                        '&.Mui-checked': { color: '#FF6B00' },
                      }}
                    />
                  </Box>
                );
              })}
            </Box>
          ) : (
            /* Standard Text Field */
            <TextField
              autoFocus
              fullWidth
              margin="dense"
              value={editField?.value || ''}
              onChange={(e) =>
                setEditField((prev) => (prev ? { ...prev, value: e.target.value } : null))
              }
              sx={{ mt: 1 }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 2 }}>
          <Button
            onClick={() => setEditDialogOpen(false)}
            sx={{ color: '#64748B', fontWeight: 600, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            sx={{
              backgroundColor: '#FF6B00',
              fontWeight: 700,
              borderRadius: '12px',
              boxShadow: 'none',
              textTransform: 'none',
              '&:hover': { backgroundColor: '#E66000', boxShadow: 'none' },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DriverConfirmLicenseInfo;
