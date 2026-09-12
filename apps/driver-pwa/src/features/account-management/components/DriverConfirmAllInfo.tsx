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
import { useLanguage } from '../../../utils/LanguageContext';
import {
  getCachedLicenseData,
  getCachedMtopData,
  getCachedTricycleData,
  LicenseExtractedData,
  MtopExtractedData,
} from '../../../services/driverOnboardingCache';
import { submitFinalDriverRegistration } from '../../../services/driverApiService';
import { fetchAccreditedTodas } from '../../../services/driverApiService';

interface ReviewFieldRowProps {
  label: string;
  value: string;
}

const ReviewFieldRow: React.FC<ReviewFieldRowProps> = ({ label, value }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '16px',
      py: 0.85,
      width: '100%',
    }}
  >
    <Typography
      sx={{
        flex: '0 0 42%',
        minWidth: 0,
        fontSize: '10px',
        fontWeight: 700,
        color: '#64748B',
        letterSpacing: '0.3px',
        textTransform: 'uppercase',
        lineHeight: 1.35,
        pt: '1px',
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        flex: 1,
        minWidth: 0,
        fontSize: '13px',
        fontWeight: 700,
        color: '#0F172A',
        textAlign: 'right',
        lineHeight: 1.35,
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
      }}
    >
      {value || 'N/A'}
    </Typography>
  </Box>
);

export const DriverConfirmAllInfo: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const isTagalog = language === 'tl';

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
    firstName: 'Juan',
    middleName: 'Dela',
    lastName: 'Cruz',
    suffix: '',
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

  // Helper name decomposition if specific fields missing
  const nameParts = (licenseData.fullName || '').trim().split(/\s+/);
  const firstName = licenseData.firstName || (nameParts.length > 0 ? nameParts[0] : '');
  const lastName = licenseData.lastName || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : '');
  const middleName = licenseData.middleName || (nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '');
  const suffix = licenseData.suffix || '';

  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [todaName, setTodaName] = useState<string>('Calapan Central TODA (CCTODA)');

  React.useEffect(() => {
    fetchAccreditedTodas().then((list) => {
      const storedId = localStorage.getItem('sakay_driver_toda_id');
      const matched = list.find((t) => t.id === storedId);
      if (matched) {
        setTodaName(`${matched.name} (${matched.acronym})`);
      } else if (list.length > 0) {
        setTodaName(`${list[0].name} (${list[0].acronym})`);
      }
    });
  }, []);

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
        setSubmitError(
          res.error ||
          (isTagalog
            ? 'Hindi na-proseso ang huling submission. Pakisubukang muli.'
            : 'Could not process final submission. Please try again.')
        );
      }
    } catch (err: any) {
      console.error('[DriverConfirmAllInfo] Exception during submission:', err);
      setSubmitError(
        isTagalog
          ? 'Nagkaroon ng hindi inaasahang problema. Pakisubukang muli.'
          : 'An unexpected error occurred. Please try again.'
      );
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
          onClick={() => navigate('/driver/tricycle-instructions', { state })}
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
            fontSize: '20px',
            fontWeight: 800,
            color: '#0F172A',
            lineHeight: 1.2,
            letterSpacing: '-0.4px',
            mt: 0.5,
            mb: 0.75,
          }}
        >
          {isTagalog ? 'Kumpirmahin ang lahat ng iyong Impormasyon' : 'Confirm All Your Information'}
        </Typography>

        <Typography
          sx={{
            fontSize: '13px',
            color: '#64748B',
            lineHeight: 1.4,
            fontWeight: 500,
            mb: 2.5,
          }}
        >
          {isTagalog
            ? 'Pakisuri kung tama ang lahat ng detalye mula sa bawat hakbang.'
            : 'Please review and ensure all details from each step are correct.'}
        </Typography>

        {/* SECTION A: Personal na Impormasyon */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', mb: 1.5 }}>
            <Typography sx={{ flex: 1, minWidth: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
              {isTagalog ? 'Personal na Impormasyon' : 'Personal Information'}
            </Typography>
            <Typography
              onClick={() => navigate('/driver/confirm-license-info', { state: { ...state, isEditMode: true } })}
              sx={{
                flexShrink: 0,
                whiteSpace: 'nowrap',
                fontSize: '12px',
                fontWeight: 700,
                color: '#FF6B00',
                cursor: 'pointer',
                px: 1.5,
                py: 0.4,
                borderRadius: '6px',
                backgroundColor: '#FFF5EF',
                border: '1px solid #FFD6B8',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                '&:hover': {
                  backgroundColor: '#FFEAD9',
                  borderColor: '#FF6B00',
                },
              }}
            >
              {isTagalog ? 'I-edit' : 'Edit'}
            </Typography>
          </Box>

          <ReviewFieldRow label={isTagalog ? "UNANG PANGALAN" : "FIRST NAME"} value={firstName} />
          <ReviewFieldRow label={isTagalog ? "GITNANG PANGALAN" : "MIDDLE NAME"} value={middleName || 'N/A'} />
          <ReviewFieldRow label={isTagalog ? "APELYIDO" : "LAST NAME"} value={lastName} />
          <ReviewFieldRow label="SUFFIX" value={suffix || 'N/A'} />
          <ReviewFieldRow label={isTagalog ? "PETSA NG KAPANGANAKAN" : "DATE OF BIRTH"} value={licenseData.dob} />
          <ReviewFieldRow label={isTagalog ? "KASARIAN" : "GENDER"} value={licenseData.gender} />
          <ReviewFieldRow label={isTagalog ? "TIRAHAN" : "ADDRESS"} value={licenseData.address} />
          <ReviewFieldRow label={isTagalog ? "KINABABALIKANG TODA" : "AFFILIATED TODA"} value={todaName} />
          <Box sx={{ width: '100%', height: '1px', backgroundColor: '#E2E8F0', mt: 2.25, mb: 1 }} />
        </Box>

        {/* SECTION B: Driver's License */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', mb: 1.5 }}>
            <Typography sx={{ flex: 1, minWidth: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
              Driver's License
            </Typography>
            <Typography
              onClick={() => navigate('/driver/confirm-license-info', { state: { ...state, isEditMode: true } })}
              sx={{
                flexShrink: 0,
                whiteSpace: 'nowrap',
                fontSize: '12px',
                fontWeight: 700,
                color: '#FF6B00',
                cursor: 'pointer',
                px: 1.5,
                py: 0.4,
                borderRadius: '6px',
                backgroundColor: '#FFF5EF',
                border: '1px solid #FFD6B8',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                '&:hover': {
                  backgroundColor: '#FFEAD9',
                  borderColor: '#FF6B00',
                },
              }}
            >
              {isTagalog ? 'I-edit' : 'Edit'}
            </Typography>
          </Box>

          <ReviewFieldRow label={isTagalog ? "NUMERO NG LISENSYA" : "DRIVER'S LICENSE NUMBER"} value={licenseData.licenseNumber} />
          <ReviewFieldRow label="RESTRICTIONS" value={licenseData.dlCodes} />
          <ReviewFieldRow label={isTagalog ? "PETSA NG PAGKAPASO (EXPIRATION)" : "EXPIRATION DATE"} value={licenseData.expirationDate} />
          <Box sx={{ width: '100%', height: '1px', backgroundColor: '#E2E8F0', mt: 2.25, mb: 1 }} />
        </Box>

        {/* SECTION C: Motorcycle Tricycle Operator's Permit */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', mb: 1.5 }}>
            <Typography sx={{ flex: 1, minWidth: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
              {isTagalog ? "Permiso ng Prangkisa (MTOP)" : "Motorized Tricycle Operator's Permit (MTOP)"}
            </Typography>
            <Typography
              onClick={() => navigate('/driver/confirm-mtop-info', { state: { ...state, isEditMode: true } })}
              sx={{
                flexShrink: 0,
                whiteSpace: 'nowrap',
                fontSize: '12px',
                fontWeight: 700,
                color: '#FF6B00',
                cursor: 'pointer',
                px: 1.5,
                py: 0.4,
                borderRadius: '6px',
                backgroundColor: '#FFF5EF',
                border: '1px solid #FFD6B8',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                '&:hover': {
                  backgroundColor: '#FFEAD9',
                  borderColor: '#FF6B00',
                },
              }}
            >
              {isTagalog ? 'I-edit' : 'Edit'}
            </Typography>
          </Box>

          <ReviewFieldRow label={isTagalog ? "REHISTRADONG MAY-ARI / OPERATOR" : "REGISTERED OWNER / OPERATOR"} value={mtopData.operatorName} />
          <ReviewFieldRow label={isTagalog ? "PRANGKISA" : "FRANCHISE NO."} value={mtopData.franchiseNumber} />
          <ReviewFieldRow label="PLATE NUMBER" value={mtopData.plateNumber} />
          <ReviewFieldRow label="CHASSIS NUMBER" value={mtopData.chassisNumber} />
          <ReviewFieldRow label="MOTOR NUMBER" value={mtopData.motorNumber} />
          <ReviewFieldRow label="VEHICLE MAKE" value={mtopData.vehicleMake} />
          <ReviewFieldRow label="YEAR MODEL" value={mtopData.yearModel || 'N/A'} />
          <ReviewFieldRow label={isTagalog ? "AWTORISADONG RUTA / ZONA" : "AUTHORIZED ROUTE / ZONE"} value={mtopData.authorizedRoute} />
          <ReviewFieldRow label={isTagalog ? "PETSA NG PAGKAPASO (EXPIRATION)" : "EXPIRATION DATE"} value={mtopData.expirationDate} />
          <Box sx={{ width: '100%', height: '1px', backgroundColor: '#E2E8F0', mt: 2.25, mb: 1 }} />
        </Box>

        {/* SECTION D: Unit ng Tricycle */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', mb: 1.5 }}>
            <Typography sx={{ flex: 1, minWidth: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
              {isTagalog ? 'Unit ng Tricycle' : 'Tricycle Unit'}
            </Typography>
            <Typography
              onClick={() => navigate('/driver/tricycle-instructions', { state: { ...state, isEditMode: true } })}
              sx={{
                flexShrink: 0,
                whiteSpace: 'nowrap',
                fontSize: '12px',
                fontWeight: 700,
                color: '#FF6B00',
                cursor: 'pointer',
                px: 1.5,
                py: 0.4,
                borderRadius: '6px',
                backgroundColor: '#FFF5EF',
                border: '1px solid #FFD6B8',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                '&:hover': {
                  backgroundColor: '#FFEAD9',
                  borderColor: '#FF6B00',
                },
              }}
            >
              {isTagalog ? 'I-edit' : 'Edit'}
            </Typography>
          </Box>

          <ReviewFieldRow label={isTagalog ? "LARAWAN NG TRICYCLE" : "TRICYCLE PHOTO"} value={isTagalog ? "Nakuha (Na-verify)" : "Captured (Verified)"} />
          <Box sx={{ width: '100%', height: '1px', backgroundColor: '#E2E8F0', mt: 2.25, mb: 1 }} />
        </Box>

        {/* SECTION E: Beripikasyon ng Mukha */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', mb: 1.5 }}>
            <Typography sx={{ flex: 1, minWidth: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
              {isTagalog ? 'Beripikasyon ng Mukha' : 'Face Verification'}
            </Typography>
            <Typography
              onClick={() => navigate('/driver/scan-face', { state: { ...state, isEditMode: true } })}
              sx={{
                flexShrink: 0,
                whiteSpace: 'nowrap',
                fontSize: '12px',
                fontWeight: 700,
                color: '#FF6B00',
                cursor: 'pointer',
                px: 1.5,
                py: 0.4,
                borderRadius: '6px',
                backgroundColor: '#FFF5EF',
                border: '1px solid #FFD6B8',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                '&:hover': {
                  backgroundColor: '#FFEAD9',
                  borderColor: '#FF6B00',
                },
              }}
            >
              {isTagalog ? 'I-edit' : 'Edit'}
            </Typography>
          </Box>

          <ReviewFieldRow label={isTagalog ? "STATUS NG MATCH" : "MATCH STATUS"} value={isTagalog ? "Magkatugma (Na-verify)" : "Matched (Verified)"} />
          <Box sx={{ width: '100%', height: '1px', backgroundColor: '#E2E8F0', mt: 2.25, mb: 1 }} />
        </Box>

        {/* Confirmation Checkbox */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 2, mb: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                sx={{
                  color: '#FF6B00',
                  '&.Mui-checked': { color: '#FF6B00' },
                  '& .MuiSvgIcon-root': { fontSize: 24 },
                  p: 0.5,
                }}
              />
            }
            label={
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A', lineHeight: 1.35 }}>
                {isTagalog
                  ? 'Kinukumpirma kong tama ang lahat ng impormasyong aking isinumite.'
                  : 'I confirm that all the information I submitted is correct.'}
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
          {submitting
            ? (isTagalog ? 'Isina-save...' : 'Saving...')
            : (isTagalog ? 'Magpatuloy' : 'Submit Application')}
        </PrimaryButton>
      </Box>
    </Box>
  );
};

export default DriverConfirmAllInfo;
