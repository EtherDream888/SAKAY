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
  getResubmissionSession,
  clearResubmissionSession,
  getRegisteredNameParts,
  LicenseExtractedData,
  MtopExtractedData,
  type FaultyDocType,
} from '../../../services/driverOnboardingCache';
import { submitFinalDriverRegistration } from '../../../services/driverApiService';
import { fetchAccreditedTodas } from '../../../services/driverApiService';
import { splitNameParts } from '../../../services/licenseOcrService';

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
    firstName?: string;
    middleName?: string;
    lastName?: string;
    suffix?: string;
    extracted?: LicenseExtractedData;
    mtopExtracted?: MtopExtractedData;
    isResubmission?: boolean;
    faultyDocuments?: FaultyDocType[];
    issues?: any[];
  } | undefined;

  const resubSession = getResubmissionSession();
  const isResubmission = Boolean(state?.isResubmission || resubSession?.isResubmission);
  const faultyDocuments: FaultyDocType[] =
    (state?.faultyDocuments as FaultyDocType[]) ||
    resubSession?.faultyDocuments ||
    [];

  const resolvedFaultyDocs: FaultyDocType[] = isResubmission
    ? (faultyDocuments.length > 0 ? faultyDocuments : ['license'])
    : ['license', 'mtop', 'tricycle', 'selfie'];

  const showLicenseSections = resolvedFaultyDocs.includes('license');
  const showMtopSection = resolvedFaultyDocs.includes('mtop');
  const showTricycleSection = resolvedFaultyDocs.includes('tricycle');
  const showFaceSection = resolvedFaultyDocs.includes('selfie');

  const cachedLicense = getCachedLicenseData();
  const cachedMtop = getCachedMtopData();
  const registered = getRegisteredNameParts();

  const licenseData: LicenseExtractedData = state?.extracted || cachedLicense || {
    frontPhoto: '',
    backPhoto: '',
    fullName: state?.driverName || registered.fullName || 'Juan Dela Cruz',
    firstName: state?.firstName || registered.firstName || 'Juan',
    middleName: state?.middleName ?? registered.middleName ?? '',
    lastName: state?.lastName || registered.lastName || 'Dela Cruz',
    suffix: state?.suffix || registered.suffix || '',
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

  // Prioritize explicit name parts, registered name parts, or smart compound-aware name splitting
  let firstName = licenseData.firstName || registered.firstName || '';
  let middleName = (licenseData.middleName !== undefined && licenseData.middleName !== '')
    ? licenseData.middleName
    : (registered.middleName || '');
  let lastName = licenseData.lastName || registered.lastName || '';
  let suffix = licenseData.suffix || registered.suffix || '';

  if ((!firstName || !lastName) && licenseData.fullName) {
    const parsed = splitNameParts(licenseData.fullName);
    if (!firstName) firstName = parsed.firstName;
    if (!middleName) middleName = parsed.middleName;
    if (!lastName) lastName = parsed.lastName;
    if (!suffix) suffix = parsed.suffix;
  }

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
        clearResubmissionSession();
        console.log('[DriverConfirmAllInfo] Registration submitted successfully!');
        navigate('/driver/registration-complete', {
          replace: true,
          state: { isResubmission },
        });
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
          onClick={() => {
            if (isResubmission) {
              navigate(-1);
            } else {
              navigate('/driver/tricycle-instructions', { state });
            }
          }}
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
          {isResubmission
            ? (isTagalog ? 'Kumpirmahin ang mga Iniwasang Dokumento' : 'Confirm Resubmitted Information')
            : (isTagalog ? 'Kumpirmahin ang lahat ng iyong Impormasyon' : 'Confirm All Your Information')}
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
          {isResubmission
            ? (isTagalog
                ? 'Pakisuri ang mga binagong impormasyon bago muling isumite ang iyong aplikasyon.'
                : 'Please review your corrected information before resubmitting your application.')
            : (isTagalog
                ? 'Pakisuri kung tama ang lahat ng detalye mula sa bawat hakbang.'
                : 'Please review and ensure all details from each step are correct.')}
        </Typography>

        {isResubmission && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '10px',
              p: '12px 16px',
              mb: 2.5,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#F59E0B',
                flexShrink: 0,
              }}
            />
            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#92400E', lineHeight: 1.4 }}>
              {isTagalog
                ? 'Ipinapakita lamang ang mga dokumentong hiniling na iwasto at muling isumite.'
                : 'Showing only the documents requested for correction and resubmission.'}
            </Typography>
          </Box>
        )}

        {/* SECTION A & B: Personal Details & Driver's License */}
        {showLicenseSections && (
          <>
            {/* SECTION A: Personal na Impormasyon */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', mb: 1.5 }}>
                <Typography sx={{ flex: 1, minWidth: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
                  {isTagalog ? 'Personal na Impormasyon' : 'Personal Information'}
                </Typography>
                <Typography
                  onClick={() =>
                    navigate('/driver/confirm-license-info', {
                      state: {
                        ...state,
                        extracted: {
                          ...licenseData,
                          firstName,
                          middleName,
                          lastName,
                          suffix,
                        },
                        isEditMode: true,
                        isResubmission,
                        faultyDocuments,
                      },
                    })
                  }
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

              <ReviewFieldRow label={isTagalog ? "UNANG PANGALAN" : "FIRST NAME"} value={firstName || 'Juan'} />
              <ReviewFieldRow label={isTagalog ? "GITNANG PANGALAN" : "MIDDLE NAME"} value={middleName?.trim() ? middleName : 'N/A'} />
              <ReviewFieldRow label={isTagalog ? "APELYIDO" : "LAST NAME"} value={lastName || 'Dela Cruz'} />
              <ReviewFieldRow label="SUFFIX" value={suffix?.trim() ? suffix : 'N/A'} />
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
                  onClick={() => navigate('/driver/confirm-license-info', { state: { ...state, isEditMode: true, isResubmission, faultyDocuments } })}
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
          </>
        )}

        {/* SECTION C: Motorcycle Tricycle Operator's Permit */}
        {showMtopSection && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', mb: 1.5 }}>
              <Typography sx={{ flex: 1, minWidth: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
                {isTagalog ? "Permiso ng Prangkisa (MTOP)" : "Motorized Tricycle Operator's Permit (MTOP)"}
              </Typography>
              <Typography
                onClick={() => navigate('/driver/confirm-mtop-info', { state: { ...state, isEditMode: true, isResubmission, faultyDocuments } })}
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
        )}

        {/* SECTION D: Unit ng Tricycle */}
        {showTricycleSection && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', mb: 1.5 }}>
              <Typography sx={{ flex: 1, minWidth: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
                {isTagalog ? 'Unit ng Tricycle' : 'Tricycle Unit'}
              </Typography>
              <Typography
                onClick={() => navigate('/driver/scan-tricycle', { state: { ...state, isEditMode: true, isResubmission, faultyDocuments } })}
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
        )}

        {/* SECTION E: Beripikasyon ng Mukha */}
        {showFaceSection && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', mb: 1.5 }}>
              <Typography sx={{ flex: 1, minWidth: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
                {isTagalog ? 'Beripikasyon ng Mukha' : 'Face Verification'}
              </Typography>
              <Typography
                onClick={() => navigate('/driver/scan-face', { state: { ...state, isEditMode: true, isResubmission, faultyDocuments } })}
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
        )}

        {/* Confirmation Checkbox */}
        <Box
          onClick={() => setConfirmed(!confirmed)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mt: 2,
            mb: 1,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <Checkbox
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            sx={{
              color: '#FF6B00',
              '&.Mui-checked': { color: '#FF6B00' },
              '& .MuiSvgIcon-root': { fontSize: 22 },
              p: 0,
              flexShrink: 0,
            }}
          />
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', lineHeight: 1.35 }}>
            {isResubmission
              ? (isTagalog
                  ? 'Kinukumpirma kong tama ang lahat ng mga binagong impormasyong aking isinumite.'
                  : 'I confirm that all the corrected information I submitted is accurate.')
              : (isTagalog
                  ? 'Kinukumpirma kong tama ang lahat ng impormasyong aking isinumite.'
                  : 'I confirm that all the information I submitted is correct.')}
          </Typography>
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
            : isResubmission
            ? (isTagalog ? 'Muling Isumite ang Aplikasyon' : 'Resubmit Application')
            : (isTagalog ? 'Magpatuloy' : 'Submit Application')}
        </PrimaryButton>
      </Box>
    </Box>
  );
};

export default DriverConfirmAllInfo;
