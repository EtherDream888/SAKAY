import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  InputBase,
  Alert,
  Popover,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import { DateCalendarPopover } from '../../../components/common/DateCalendarPopover';
import {
  MtopExtractedData,
  getCachedMtopData,
  saveMtopScanData,
} from '../../../services/driverOnboardingCache';
import { saveDriverMtopVerification } from '../../../services/driverApiService';

interface SakayMtopInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  isDate?: boolean;
  placeholder?: string;
  onOpenCalendar?: (anchor: HTMLElement) => void;
  error?: boolean;
  helperText?: string;
}

const SakayMtopInput: React.FC<SakayMtopInputProps> = ({
  label,
  value,
  onChange,
  isDate = false,
  placeholder,
  onOpenCalendar,
  error,
  helperText,
}) => {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || Boolean(value);

  const formatDateInput = (val: string): string => {
    const digits = val.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 8)}`;
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          width: '100%',
          height: '62px',
          borderRadius: '16px',
          backgroundColor: focused ? '#FFFFFF' : '#F1F3F5',
          border: error
            ? '1.5px solid #DC2626'
            : focused
            ? '1.5px solid #FF6B00'
            : '1.5px solid transparent',
          boxShadow: error
            ? '0 0 0 3px rgba(220, 38, 38, 0.12)'
            : focused
            ? '0 0 0 3px rgba(255, 107, 0, 0.12)'
            : 'none',
          px: 2,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxSizing: 'border-box',
          cursor: 'text',
        }}
      >
        <Typography
          sx={{
            position: 'absolute',
            left: '16px',
            right: '16px',
            top: isFloating ? '8px' : '50%',
            transform: isFloating ? 'translateY(0)' : 'translateY(-50%)',
            fontSize: isFloating ? '9.5px' : '15px',
            fontWeight: isFloating ? 700 : 500,
            color: error ? '#DC2626' : focused ? '#FF6B00' : isFloating ? '#64748B' : '#94A3B8',
            letterSpacing: isFloating ? '0.5px' : '0px',
            textTransform: isFloating ? 'uppercase' : 'none',
            userSelect: 'none',
            pointerEvents: 'none',
            whiteSpace: isFloating ? 'normal' : 'nowrap',
            wordBreak: 'break-word',
            lineHeight: 1.15,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 1,
          }}
        >
          {label}
        </Typography>

        <Box
          sx={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mt: isFloating ? '16px' : 0,
            transition: 'margin-top 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {isDate ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <InputBase
                value={value}
                onChange={(e) => onChange(formatDateInput(e.target.value))}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={isFloating ? (placeholder || 'MM-DD-YYYY') : ''}
                fullWidth
                inputProps={{ inputMode: 'numeric', pattern: '[0-9-]*' }}
                sx={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#0F172A',
                  py: 0,
                  '& input': {
                    py: 0,
                    lineHeight: 1.2,
                    opacity: isFloating ? 1 : 0,
                    transition: 'opacity 0.15s ease-in-out',
                  },
                }}
              />
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCalendar?.(e.currentTarget.parentElement || e.currentTarget);
                }}
                sx={{ p: 0.25, ml: 0.5, color: '#64748B', '&:hover': { color: '#FF6B00' } }}
              >
                <CalendarTodayIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          ) : (
            <InputBase
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={isFloating ? placeholder : ''}
              fullWidth
              sx={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#0F172A',
                py: 0,
                '& input': {
                  py: 0,
                  lineHeight: 1.2,
                  opacity: isFloating ? 1 : 0,
                  transition: 'opacity 0.15s ease-in-out',
                },
              }}
            />
          )}
        </Box>
      </Box>
      {helperText && (
        <Typography sx={{ color: '#DC2626', fontSize: '12px', mt: 0.5, px: 1, fontWeight: 500 }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

export const DriverConfirmMtopInfo: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    phone?: string;
    driverName?: string;
    mtopExtracted?: MtopExtractedData;
    isEditMode?: boolean;
  } | undefined;

  const isEditMode = Boolean(state?.isEditMode);
  const cached = getCachedMtopData();
  const initial: MtopExtractedData = state?.mtopExtracted || cached || {
    photoUrl: '',
    operatorName: state?.driverName || '',
    franchiseNumber: '',
    plateNumber: '',
    chassisNumber: '',
    vehicleMake: '',
    motorNumber: '',
    orNumber: '',
    expirationDate: '',
    authorizedRoute: 'City of Calapan, Oriental Mindoro',
    scannedAt: new Date().toISOString(),
  };

  const [formData, setFormData] = useState<MtopExtractedData>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [showBackModal, setShowBackModal] = useState(false);

  const [calendarAnchorEl, setCalendarAnchorEl] = useState<HTMLElement | null>(null);

  const isFieldEmpty = (val?: string) => !val || !val.trim();

  const isFormValid = Boolean(
    !isFieldEmpty(formData.operatorName) &&
    !isFieldEmpty(formData.franchiseNumber) &&
    !isFieldEmpty(formData.plateNumber) &&
    !isFieldEmpty(formData.chassisNumber) &&
    !isFieldEmpty(formData.vehicleMake) &&
    !isFieldEmpty(formData.motorNumber) &&
    !isFieldEmpty(formData.orNumber) &&
    !isFieldEmpty(formData.expirationDate) &&
    !isFieldEmpty(formData.authorizedRoute)
  );

  const handleFieldChange = (field: keyof MtopExtractedData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenCalendar = (anchor: HTMLElement) => {
    setCalendarAnchorEl(anchor);
  };

  const handleCloseCalendar = () => {
    setCalendarAnchorEl(null);
  };

  const handleBackClick = () => {
    if (isEditMode) {
      navigate('/driver/confirm-all-info', { state });
    } else {
      setShowBackModal(true);
    }
  };

  const handleConfirmBackModal = () => {
    setShowBackModal(false);
    navigate('/driver/mtop-instructions', { state });
  };

  const handleContinue = async () => {
    setHasAttemptedSubmit(true);
    if (submitting || !isFormValid) return;

    setSubmitting(true);
    setSubmitError(null);

    const targetPhone = state?.phone || localStorage.getItem('sakay_driver_phone') || '';

    try {
      const saveRes = await saveDriverMtopVerification(formData, targetPhone);
      if (saveRes.success) {
        saveMtopScanData(formData, targetPhone);
        console.log('[DriverConfirmMtopInfo] MTOP Verification Saved Successfully:', saveRes);
        const targetRoute = isEditMode ? '/driver/confirm-all-info' : '/driver/tricycle-instructions';
        navigate(targetRoute, {
          replace: true,
          state: {
            ...state,
            mtopExtracted: formData,
            driverId: saveRes.driverId,
            verificationId: saveRes.verificationId,
            isEditMode: false,
          },
        });
      } else {
        setSubmitError(saveRes.error || 'May problema sa pag-save ng MTOP. Pakisubukang muli.');
      }
    } catch (err: any) {
      console.error('[DriverConfirmMtopInfo] Save error:', err);
      setSubmitError(err.message || 'May hindi inaasahang problema. Pakisubukang muli.');
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
      {/* Retake Photo Confirmation Modal for Normal Flow */}
      <Dialog
        open={showBackModal}
        onClose={() => setShowBackModal(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '20px',
              p: 1,
              width: '100%',
              maxWidth: '340px',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '18px', color: '#0F172A', pb: 1 }}>
          Bumalik sa Pagkuha ng MTOP?
        </DialogTitle>
        <DialogContent sx={{ py: 1 }}>
          <Typography sx={{ fontSize: '14px', color: '#64748B', lineHeight: 1.45 }}>
            Babalik ka sa pagkuha ng iyong MTOP. Kakailanganin mong kunan muli ang larawan.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, pt: 1, display: 'flex', gap: 1 }}>
          <Button
            onClick={() => setShowBackModal(false)}
            sx={{
              flex: 1,
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#F1F3F5',
              color: '#0F172A',
              fontWeight: 700,
              fontSize: '14px',
              textTransform: 'none',
              '&:hover': { backgroundColor: '#E2E8F0' },
            }}
          >
            Manatili
          </Button>
          <Button
            onClick={handleConfirmBackModal}
            sx={{
              flex: 1,
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#FF6B00',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '14px',
              textTransform: 'none',
              '&:hover': { backgroundColor: '#E05000' },
            }}
          >
            Bumalik
          </Button>
        </DialogActions>
      </Dialog>

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
          onClick={handleBackClick}
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

      {/* 2. Scrollable Form Content */}
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
          {isEditMode ? "Motorized Tricycle Operator's Permit (MTOP)" : "Kumpirmahin ang Iyong Impormasyon"}
        </Typography>

        <Typography
          sx={{
            fontSize: '15px',
            color: '#64748B',
            lineHeight: 1.45,
            fontWeight: 500,
            mb: 2.5,
          }}
        >
          {isEditMode ? "Pakisuri at i-update ang impormasyon ng iyong MTOP." : "Pakisuri kung tama ang lahat ng detalye."}
        </Typography>

        {submitError && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }}>
            {submitError}
          </Alert>
        )}

        {/* Directly Editable MTOP Form Fields */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* ROW 1: REHISTRADONG MAY-ARI / OPERATOR (Full Width) */}
          <SakayMtopInput
            label="REHISTRADONG MAY-ARI / OPERATOR"
            value={formData.operatorName}
            onChange={(val) => handleFieldChange('operatorName', val)}
            error={hasAttemptedSubmit && isFieldEmpty(formData.operatorName)}
            helperText={hasAttemptedSubmit && isFieldEmpty(formData.operatorName) ? 'Kinakailangan ang impormasyong ito.' : ''}
          />

          {/* ROW 2: PRANGKISA (50%) + PLATE NUMBER (50%) */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Box sx={{ flex: '1 1 50%', minWidth: 0 }}>
              <SakayMtopInput
                label="PRANGKISA"
                value={formData.franchiseNumber}
                onChange={(val) => handleFieldChange('franchiseNumber', val.replace(/\D/g, '').slice(0, 4))}
                error={hasAttemptedSubmit && (isFieldEmpty(formData.franchiseNumber) || formData.franchiseNumber.length !== 4)}
                helperText={hasAttemptedSubmit && (isFieldEmpty(formData.franchiseNumber) || formData.franchiseNumber.length !== 4) ? 'Kailangan ng 4 na numero.' : ''}
              />
            </Box>
            <Box sx={{ flex: '1 1 50%', minWidth: 0 }}>
              <SakayMtopInput
                label="PLATE NUMBER"
                value={formData.plateNumber}
                onChange={(val) => handleFieldChange('plateNumber', val.toUpperCase().slice(0, 7))}
                error={hasAttemptedSubmit && isFieldEmpty(formData.plateNumber)}
                helperText={hasAttemptedSubmit && isFieldEmpty(formData.plateNumber) ? 'Kinakailangan ang impormasyong ito.' : ''}
              />
            </Box>
          </Box>

          {/* ROW 3: CHASSIS NUMBER (Full Width) */}
          <SakayMtopInput
            label="CHASSIS NUMBER"
            value={formData.chassisNumber}
            onChange={(val) => handleFieldChange('chassisNumber', val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17))}
            error={hasAttemptedSubmit && isFieldEmpty(formData.chassisNumber)}
            helperText={hasAttemptedSubmit && isFieldEmpty(formData.chassisNumber) ? 'Kinakailangan ang impormasyong ito.' : ''}
          />

          {/* ROW 4: MOTOR NUMBER (Full Width) */}
          <SakayMtopInput
            label="MOTOR NUMBER"
            value={formData.motorNumber}
            onChange={(val) => handleFieldChange('motorNumber', val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
            error={hasAttemptedSubmit && isFieldEmpty(formData.motorNumber)}
            helperText={hasAttemptedSubmit && isFieldEmpty(formData.motorNumber) ? 'Kinakailangan ang impormasyong ito.' : ''}
          />

          {/* ROW 5: VEHICLE MAKE (50%) + OR NUMBER (50%) */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Box sx={{ flex: '1 1 50%', minWidth: 0 }}>
              <SakayMtopInput
                label="VEHICLE MAKE"
                value={formData.vehicleMake}
                onChange={(val) => handleFieldChange('vehicleMake', val)}
                error={hasAttemptedSubmit && isFieldEmpty(formData.vehicleMake)}
                helperText={hasAttemptedSubmit && isFieldEmpty(formData.vehicleMake) ? 'Kinakailangan ang impormasyong ito.' : ''}
              />
            </Box>
            <Box sx={{ flex: '1 1 50%', minWidth: 0 }}>
              <SakayMtopInput
                label="OR NUMBER"
                value={formData.orNumber}
                onChange={(val) => handleFieldChange('orNumber', val.replace(/\D/g, '').slice(0, 7))}
                error={hasAttemptedSubmit && (isFieldEmpty(formData.orNumber) || formData.orNumber.length !== 7)}
                helperText={hasAttemptedSubmit && (isFieldEmpty(formData.orNumber) || formData.orNumber.length !== 7) ? 'Kailangan ng 7 numero.' : ''}
              />
            </Box>
          </Box>

          {/* ROW 6: AUTHORIZED ROUTE / ZONE OF OPERATION (Full Width) */}
          <SakayMtopInput
            label="AUTHORIZED ROUTE / ZONE OF OPERATION"
            value={formData.authorizedRoute}
            onChange={(val) => handleFieldChange('authorizedRoute', val)}
            error={hasAttemptedSubmit && isFieldEmpty(formData.authorizedRoute)}
            helperText={hasAttemptedSubmit && isFieldEmpty(formData.authorizedRoute) ? 'Kinakailangan ang impormasyong ito.' : ''}
          />

          {/* ROW 7: PETSA NG PAGKAPASO (EXPIRATION) (Full Width) */}
          <SakayMtopInput
            label="PETSA NG PAGKAPASO (EXPIRATION)"
            value={formData.expirationDate}
            onChange={(val) => handleFieldChange('expirationDate', val)}
            isDate
            placeholder="MM-DD-YYYY"
            onOpenCalendar={handleOpenCalendar}
            error={hasAttemptedSubmit && isFieldEmpty(formData.expirationDate)}
            helperText={hasAttemptedSubmit && isFieldEmpty(formData.expirationDate) ? 'Kinakailangan ang impormasyong ito.' : ''}
          />
        </Box>
      </Box>

      {/* Calendar Picker Popover */}
      <DateCalendarPopover
        open={Boolean(calendarAnchorEl)}
        anchorEl={calendarAnchorEl}
        onClose={handleCloseCalendar}
        selectedDate={new Date()}
        onSelectDate={(date) => {
          const yyyy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const dd = String(date.getDate()).padStart(2, '0');
          handleFieldChange('expirationDate', `${mm}-${dd}-${yyyy}`);
          handleCloseCalendar();
        }}
      />

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
        <PrimaryButton
          fullWidth
          disabled={submitting || !isFormValid}
          onClick={handleContinue}
        >
          {submitting ? 'Isina-save...' : isEditMode ? 'Kumpirmahin' : 'Magpatuloy'}
        </PrimaryButton>
      </Box>
    </Box>
  );
};

