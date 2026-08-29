import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Checkbox,
  FormControlLabel,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import {
  getCachedLicenseData,
  getCachedMtopData,
  LicenseExtractedData,
  MtopExtractedData,
} from '../../../services/driverOnboardingCache';
import { submitFinalDriverRegistration } from '../../../services/driverApiService';

interface ReviewFieldRowProps {
  label: string;
  value: string;
}

const ReviewFieldRow: React.FC<ReviewFieldRowProps> = ({ label, value }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      py: 0.75,
      gap: 2,
    }}
  >
    <Typography
      sx={{
        fontSize: '10px',
        fontWeight: 700,
        color: '#64748B',
        letterSpacing: '0.4px',
        textTransform: 'uppercase',
        flexShrink: 0,
        maxWidth: '45%',
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontSize: '14px',
        fontWeight: 600,
        color: '#0F172A',
        textAlign: 'right',
        wordBreak: 'break-word',
      }}
    >
      {value || 'N/A'}
    </Typography>
  </Box>
);

export const DriverConfirmAllInfo: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    phone?: string;
    driverName?: string;
    extracted?: LicenseExtractedData;
    mtopExtracted?: MtopExtractedData;
  } | undefined;

  const cachedLicense = getCachedLicenseData();
  const cachedMtop = getCachedMtopData();

  const licenseData: LicenseExtractedData = state?.extracted || cachedLicense || {
    frontPhoto: '',
    backPhoto: '',
    fullName: state?.driverName || 'Juan Dela Cruz',
    dob: '1987-05-21',
    gender: 'Lalaki',
    address: 'Calapan City, Oriental Mindoro',
    licenseNumber: 'N03-12-123456',
    dlCodes: 'A, A1',
    expirationDate: '2027-01-01',
    scannedAt: new Date().toISOString(),
  };

  const mtopData: MtopExtractedData = state?.mtopExtracted || cachedMtop || {
    photoUrl: '',
    operatorName: licenseData.fullName || 'Juan Dela Cruz',
    franchiseNumber: 'N03-12-123456',
    plateNumber: 'ABC 123',
    chassisNumber: 'AB1CDEFGHIJK23456',
    vehicleMake: 'Yamaha',
    motorNumber: 'A1B2345678',
    orNumber: '1234567',
    expirationDate: '2027-01-01',
    authorizedRoute: 'Calapan City, Oriental Mindoro',
    scannedAt: new Date().toISOString(),
  };

  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleFinalSubmit = async () => {
    if (!confirmed || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    const targetPhone = state?.phone || localStorage.getItem('sakay_driver_phone') || '';

    try {
      const res = await submitFinalDriverRegistration(targetPhone);
      if (res.success) {
        console.log('[DriverConfirmAllInfo] Registration submitted successfully!');
        navigate('/driver/registration-complete', { replace: true });
      } else {
        setSubmitError(res.error || 'Hindi na-proseso ang huling submission. Pakisubukang muli.');
      }
    } catch (err: any) {
      console.error('[DriverConfirmAllInfo] Exception during submission:', err);
      setSubmitError('Nagkaroon ng hindi inaasahang problema. Pakisubukang muli.');
    } finally {
      setSubmitting(false);
    }
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
      {/* 1. Header Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          pt: 'calc(var(--safe-area-top) + 20px)',
          pb: 2,
          backgroundColor: '#FFFFFF',
          flexShrink: 0,
        }}
      >
        <IconButton
          onClick={() => navigate('/driver/confirm-mtop-info', { state })}
          sx={{
            width: 44,
            height: 44,
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            '&:hover': { backgroundColor: '#F8FAFC' },
          }}
        >
          <ArrowBackIcon sx={{ color: '#0F172A', fontSize: 20 }} />
        </IconButton>

        <Logo color="orange" width={110} />
      </Box>

      {/* 2. Scrollable Content */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 3,
          pb: 3,
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
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
          Kumpirmahin ang lahat ng iyong Impormasyon
        </Typography>

        <Typography
          sx={{
            fontSize: '15px',
            color: '#64748B',
            lineHeight: 1.45,
            fontWeight: 500,
            mb: 3,
          }}
        >
          Pakisuri kung tama ang lahat ng detalye.
        </Typography>

        {/* SECTION A: Personal na Impormasyon */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
              Personal na Impormasyon
            </Typography>
            <Typography
              onClick={() => navigate('/driver/confirm-license-info', { state: { ...state, isEditMode: true } })}
              sx={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#FF6B00',
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              I-edit
            </Typography>
          </Box>

          <ReviewFieldRow label="BUONG PANGALAN" value={licenseData.fullName} />
          <ReviewFieldRow label="PETSA NG KAPANGANAKAN" value={licenseData.dob} />
          <ReviewFieldRow label="KASARIAN" value={licenseData.gender} />
          <ReviewFieldRow label="TIRAHAN" value={licenseData.address} />
          <Box sx={{ width: '100%', height: 1, backgroundColor: '#E2E8F0', mt: 1.5 }} />
        </Box>

        {/* SECTION B: Driver's License */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
              Driver's License
            </Typography>
            <Typography
              onClick={() => navigate('/driver/confirm-license-info', { state: { ...state, isEditMode: true } })}
              sx={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#FF6B00',
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              I-edit
            </Typography>
          </Box>

          <ReviewFieldRow label="NUMERO NG DRIVER'S LICENSE" value={licenseData.licenseNumber} />
          <ReviewFieldRow label="DL CODES / RESTRICTIONS" value={licenseData.dlCodes} />
          <ReviewFieldRow label="EXPIRATION DATE" value={licenseData.expirationDate} />
          <Box sx={{ width: '100%', height: 1, backgroundColor: '#E2E8F0', mt: 1.5 }} />
        </Box>

        {/* SECTION C: Motorcycle Tricycle Operator's Permit */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
              Motorcycle Tricycle Operator's Permit
            </Typography>
            <Typography
              onClick={() => navigate('/driver/confirm-mtop-info', { state: { ...state, isEditMode: true } })}
              sx={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#FF6B00',
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              I-edit
            </Typography>
          </Box>

          <ReviewFieldRow label="NUMERO NG PRANGKISA" value={mtopData.franchiseNumber} />
          <ReviewFieldRow label="PLATE NUMBER" value={mtopData.plateNumber} />
          <ReviewFieldRow label="CHASSIS NUMBER" value={mtopData.chassisNumber} />
          <ReviewFieldRow label="VEHICLE MAKE" value={mtopData.vehicleMake} />
          <ReviewFieldRow label="MOTOR NUMBER" value={mtopData.motorNumber} />
          <ReviewFieldRow label="OR NUMBER" value={mtopData.orNumber} />
          <ReviewFieldRow label="EXPIRATION DATE" value={mtopData.expirationDate} />
          <ReviewFieldRow label="AUTHORIZED ROUTE" value={mtopData.authorizedRoute} />
          <Box sx={{ width: '100%', height: 1, backgroundColor: '#E2E8F0', mt: 1.5 }} />
        </Box>

        {/* SECTION D: Beripikasyon ng Mukha */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
              Beripikasyon ng Mukha
            </Typography>
            <Typography
              onClick={() => navigate('/driver/scan-face', { state: { ...state, isEditMode: true } })}
              sx={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#FF6B00',
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              I-edit
            </Typography>
          </Box>

          <ReviewFieldRow label="STATUS NG MATCH" value="Magkatugma (Na-verify)" />
          <Box sx={{ width: '100%', height: 1, backgroundColor: '#E2E8F0', mt: 1.5 }} />
        </Box>

        {/* SECTION D: Confirmation Checkbox */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 2, mb: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                sx={{
                  color: '#CBD5E1',
                  '&.Mui-checked': { color: '#FF6B00' },
                  p: 0.5,
                }}
              />
            }
            label={
              <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', lineHeight: 1.35 }}>
                Kinukumpirma kong tama ang lahat ng impormasyong aking isinumite.
              </Typography>
            }
            sx={{ m: 0, alignItems: 'flex-start' }}
          />
        </Box>
      </Box>

      {/* 3. Pinned Action Button */}
      <Box
        sx={{
          p: 3,
          pt: 1.5,
          pb: 'calc(var(--safe-area-bottom) + 20px)',
          backgroundColor: '#FFFFFF',
          flexShrink: 0,
        }}
      >
        {submitError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
            {submitError}
          </Alert>
        )}

        <PrimaryButton
          fullWidth
          disabled={!confirmed || submitting}
          onClick={handleFinalSubmit}
        >
          {submitting ? 'Isina-save...' : 'Magpatuloy'}
        </PrimaryButton>
      </Box>
    </Box>
  );
};

export default DriverConfirmAllInfo;
