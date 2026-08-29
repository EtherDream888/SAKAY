import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  MenuItem,
  Select,
  InputBase,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckIcon from '@mui/icons-material/Check';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import { DateCalendarPopover } from '../../../components/common/DateCalendarPopover';
import {
  getCachedLicenseData,
  saveLicenseScanData,
  LicenseExtractedData,
} from '../../../services/driverOnboardingCache';
import { saveDriverLicenseVerification } from '../../../services/driverApiService';
import { splitNameParts } from '../../../services/licenseOcrService';

/**
 * Formats Philippine LTO License Number: A 00-00-000000
 */
export function formatDriverLicenseNumberInput(val: string): string {
  if (!val) return '';
  let cleaned = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length === 0) return '';

  const letter = cleaned.charAt(0);
  const digits = cleaned.slice(1, 11);

  let result = letter;
  if (digits.length > 0) {
    result += ' ' + digits.slice(0, 2);
  }
  if (digits.length > 2) {
    result += '-' + digits.slice(2, 4);
  }
  if (digits.length > 4) {
    result += '-' + digits.slice(4, 10);
  }
  return result;
}

/**
 * Auto-formats Date Input to MM-DD-YYYY (numerical only)
 */
export function formatDateInput(val: string): string {
  if (!val) return '';
  const digits = val.replace(/\D/g, '').slice(0, 8);
  let mm = digits.slice(0, 2);
  let dd = digits.slice(2, 4);
  let yyyy = digits.slice(4, 8);

  let result = mm;
  if (digits.length > 2) {
    result += '-' + dd;
  }
  if (digits.length > 4) {
    result += '-' + yyyy;
  }
  return result;
}

/**
 * Converts ISO YYYY-MM-DD to MM-DD-YYYY format for UI display
 */
export function convertIsoToMmDdYyyy(isoDate: string): string {
  if (!isoDate) return '';
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[2]}-${match[3]}-${match[1]}`;
  }
  return formatDateInput(isoDate);
}

/**
 * Converts MM-DD-YYYY or YYYY-MM-DD back to ISO YYYY-MM-DD for DB
 */
export function convertMmDdYyyyToIso(dateStr: string): string {
  if (!dateStr) return '';
  const mmDdMatch = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (mmDdMatch) {
    return `${mmDdMatch[3]}-${mmDdMatch[1]}-${mmDdMatch[2]}`;
  }
  return dateStr;
}

const LTO_RESTRICTION_CODES = [
  'A1',
  'A',
  'B',
  'B1',
  'B2',
  'C',
  'D',
  'BE',
  'CE',
];

const parseRestrictionList = (raw: string): string[] => {
  if (!raw || !raw.trim()) return ['A1'];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
};

interface SakayFormInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  multiline?: boolean;
  rows?: number;
  isDate?: boolean;
  isGender?: boolean;
  isRestriction?: boolean;
  placeholder?: string;
  onOpenCalendar?: (anchor: HTMLElement) => void;
  error?: boolean;
  helperText?: string;
}

const SakayFormInput: React.FC<SakayFormInputProps> = ({
  label,
  value,
  onChange,
  isDate = false,
  isGender = false,
  isRestriction = false,
  multiline = false,
  rows = 1,
  placeholder,
  onOpenCalendar,
  error,
  helperText,
}) => {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || Boolean(value) || isGender || isRestriction;

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          width: '100%',
          minHeight: isRestriction ? '68px' : multiline ? '84px' : '62px',
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
          py: multiline ? 1.5 : 0,
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
            right: isRestriction || isGender ? '36px' : '16px',
            top: isFloating ? '6px' : '50%',
            transform: isFloating ? 'translateY(0)' : 'translateY(-50%)',
            fontSize: isFloating ? '9.5px' : '14px',
            fontWeight: isFloating ? 700 : 500,
            color: error ? '#DC2626' : focused ? '#FF6B00' : isFloating ? '#64748B' : '#94A3B8',
            letterSpacing: isFloating ? '0.5px' : '0px',
            textTransform: isFloating ? 'uppercase' : 'none',
            userSelect: 'none',
            pointerEvents: 'none',
            whiteSpace: isFloating ? 'normal' : 'nowrap',
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
            mt: isFloating ? (isRestriction ? '24px' : multiline ? '20px' : '16px') : 0,
            transition: 'margin-top 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {isGender ? (
            <Select
              value={value === 'Female' || value === 'Babae' ? 'Babae' : 'Lalaki'}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              fullWidth
              variant="standard"
              disableUnderline
              IconComponent={(props) => (
                <ExpandMoreIcon {...props} sx={{ color: '#64748B', fontSize: 20, right: 0 }} />
              )}
              sx={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#0F172A',
                '& .MuiSelect-select': { py: 0, pr: '24px !important', lineHeight: 1.2 },
              }}
            >
              <MenuItem value="Lalaki" sx={{ fontSize: '15px', fontWeight: 600 }}>Lalaki</MenuItem>
              <MenuItem value="Babae" sx={{ fontSize: '15px', fontWeight: 600 }}>Babae</MenuItem>
            </Select>
          ) : isRestriction ? (
            <Select
              multiple
              value={parseRestrictionList(value)}
              onChange={(e) => {
                const selected = typeof e.target.value === 'string' ? e.target.value.split(', ') : e.target.value;
                onChange((selected as string[]).join(', '));
              }}
              renderValue={(selected) => (
                <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', py: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {(selected as string[]).join(', ') || 'A1'}
                </Typography>
              )}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              fullWidth
              variant="standard"
              disableUnderline
              IconComponent={(props) => (
                <ExpandMoreIcon {...props} sx={{ color: '#64748B', fontSize: 20, right: 0 }} />
              )}
              MenuProps={{
                slotProps: {
                  paper: {
                    sx: {
                      maxHeight: 180,
                      borderRadius: '14px',
                      boxShadow: '0 10px 25px rgba(15, 23, 42, 0.14)',
                      border: '1px solid #E2E8F0',
                    },
                  },
                },
              }}
              sx={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#0F172A',
                '& .MuiSelect-select': { py: 0, pr: '24px !important', lineHeight: 1.2 },
              }}
            >
              {LTO_RESTRICTION_CODES.map((code) => {
                const isChecked = parseRestrictionList(value).includes(code);
                return (
                  <MenuItem
                    key={code}
                    value={code}
                    sx={{
                      fontSize: '14px',
                      fontWeight: 700,
                      py: 1,
                      minHeight: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography sx={{ fontSize: '14px', fontWeight: isChecked ? 800 : 600, color: isChecked ? '#FF6B00' : '#0F172A' }}>
                      {code}
                    </Typography>
                    {isChecked && <CheckIcon sx={{ fontSize: 18, color: '#FF6B00' }} />}
                  </MenuItem>
                );
              })}
            </Select>
          ) : isDate ? (
            <Box
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
            >
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
              multiline={multiline}
              rows={rows}
              placeholder={isFloating ? placeholder : ''}
              fullWidth
              sx={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#0F172A',
                py: 0,
                '& input, & textarea': {
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

export const DriverConfirmLicenseInfo: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    phone?: string;
    driverName?: string;
    extracted?: LicenseExtractedData;
    isEditMode?: boolean;
  } | undefined;

  const isEditMode = Boolean(state?.isEditMode);
  const cached = getCachedLicenseData();
  const initial: LicenseExtractedData = state?.extracted || cached || {
    frontPhoto: '',
    backPhoto: '',
    fullName: state?.driverName || '',
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    dob: '',
    gender: 'Lalaki',
    address: '',
    licenseNumber: '',
    dlCodes: 'A1',
    expirationDate: '',
    scannedAt: new Date().toISOString(),
  };

  if (initial.dob) initial.dob = convertIsoToMmDdYyyy(initial.dob);
  if (initial.expirationDate) initial.expirationDate = convertIsoToMmDdYyyy(initial.expirationDate);
  if (initial.licenseNumber) initial.licenseNumber = formatDriverLicenseNumberInput(initial.licenseNumber);

  const [formData, setFormData] = useState<LicenseExtractedData>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showBackModal, setShowBackModal] = useState(false);

  const isFormValid = Boolean(
    (formData.firstName?.trim() || formData.fullName?.trim()) &&
    formData.lastName?.trim() &&
    formData.licenseNumber?.trim()
  );

  const [activeDateField, setActiveDateField] = useState<'dob' | 'expirationDate' | null>(null);
  const [calendarAnchorEl, setCalendarAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpenCalendar = (field: 'dob' | 'expirationDate', anchor: HTMLElement) => {
    setActiveDateField(field);
    setCalendarAnchorEl(anchor);
  };

  const handleCloseCalendar = () => {
    setActiveDateField(null);
    setCalendarAnchorEl(null);
  };

  const handleSelectCalendarDate = (date: Date) => {
    if (!activeDateField) return;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    setFormData((prev) => ({ ...prev, [activeDateField]: `${mm}-${dd}-${yyyy}` }));
    handleCloseCalendar();
  };

  const handleFieldChange = (field: keyof LicenseExtractedData, value: string) => {
    let finalValue = value;
    if (field === 'licenseNumber') finalValue = formatDriverLicenseNumberInput(value);
    setFormData((prev) => {
      const next = { ...prev, [field]: finalValue };
      if (['firstName', 'middleName', 'lastName', 'suffix'].includes(field)) {
        next.fullName = [next.firstName, next.middleName, next.lastName, next.suffix].filter(Boolean).join(' ');
      }
      return next;
    });
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
    navigate('/driver/review-license-back', { state });
  };

  const parseDateForCalendar = (val: string): Date => {
    if (!val) return new Date();
    const mmDdMatch = val.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (mmDdMatch) {
      return new Date(parseInt(mmDdMatch[3], 10), parseInt(mmDdMatch[1], 10) - 1, parseInt(mmDdMatch[2], 10));
    }
    const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const handleContinue = async () => {
    if (submitting || !isFormValid) return;

    setSubmitting(true);
    setSubmitError(null);

    const payloadToSave: LicenseExtractedData = {
      ...formData,
      dob: convertMmDdYyyyToIso(formData.dob),
      expirationDate: convertMmDdYyyyToIso(formData.expirationDate),
      gender: formData.gender === 'Female' || formData.gender === 'Babae' ? 'Babae' : 'Lalaki',
    };

    const targetPhone = state?.phone || localStorage.getItem('sakay_driver_phone') || '';

    try {
      const saveRes = await saveDriverLicenseVerification(payloadToSave, targetPhone);
      if (saveRes.success) {
        saveLicenseScanData(formData, targetPhone);
        const targetRoute = isEditMode ? '/driver/confirm-all-info' : '/driver/mtop-instructions';
        navigate(targetRoute, {
          replace: true,
          state: {
            ...state,
            extracted: formData,
            driverId: saveRes.driverId,
            verificationId: saveRes.verificationId,
            isEditMode: false,
          },
        });
      } else {
        setSubmitError(saveRes.error || 'May problema sa pag-save ng rekord ng beripikasyon. Pakisubukang muli.');
      }
    } catch (err: any) {
      console.error('[DriverConfirmLicenseInfo] Save error:', err);
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
          Bumalik sa pagkuha ng larawan?
        </DialogTitle>
        <DialogContent sx={{ py: 1 }}>
          <Typography sx={{ fontSize: '14px', color: '#64748B', lineHeight: 1.45 }}>
            Kapag bumalik ka, maaaring kailanganin mong kunan muli ng larawan ang iyong dokumento.
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
          zIndex: 10,
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

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 3,
          pb: 3,
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
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
          {isEditMode ? 'Lisensya sa Pagmamaneho' : 'Kumpirmahin ang Iyong Impormasyon'}
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
          {isEditMode
            ? 'Pakisuri at i-update ang impormasyon ng iyong lisensya.'
            : 'Pakisuri at kumpirmahin ang impormasyon ng iyong lisensya bago magpatuloy.'}
        </Typography>

        {submitError && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }}>
            {submitError}
          </Alert>
        )}
        {/* Directly Editable Form Fields */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* 1. Unang Pangalan (100%) */}
          <SakayFormInput
            label="UNANG PANGALAN"
            value={formData.firstName || ''}
            onChange={(val) => handleFieldChange('firstName', val)}
          />

          {/* 2. Gitnang Pangalan (100%) */}
          <SakayFormInput
            label="GITNANG PANGALAN"
            value={formData.middleName || ''}
            onChange={(val) => handleFieldChange('middleName', val)}
          />

          {/* 3. Apelyido (70%) + Suffix (30%) */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Box sx={{ flex: '7 7 70%', minWidth: 0 }}>
              <SakayFormInput
                label="APELYIDO"
                value={formData.lastName || ''}
                onChange={(val) => handleFieldChange('lastName', val)}
              />
            </Box>
            <Box sx={{ flex: '3 3 30%', minWidth: 0 }}>
              <SakayFormInput
                label="SUFFIX"
                value={formData.suffix || ''}
                onChange={(val) => handleFieldChange('suffix', val)}
              />
            </Box>
          </Box>

          {/* 4. Petsa ng Kapanganakan (70%) + Kasarian (30%) */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Box sx={{ flex: '7 7 70%', minWidth: 0 }}>
              <SakayFormInput
                label="PETSA NG KAPANGANAKAN"
                value={formData.dob}
                onChange={(val) => handleFieldChange('dob', val)}
                isDate
                placeholder="MM-DD-YYYY"
                onOpenCalendar={(anchor) => handleOpenCalendar('dob', anchor)}
              />
            </Box>
            <Box sx={{ flex: '3 3 30%', minWidth: 0 }}>
              <SakayFormInput
                label="KASARIAN"
                value={formData.gender || 'Lalaki'}
                onChange={(val) => handleFieldChange('gender', val)}
                isGender
              />
            </Box>
          </Box>

          {/* 5. Tirahan (100%) */}
          <SakayFormInput
            label="TIRAHAN"
            value={formData.address}
            onChange={(val) => handleFieldChange('address', val)}
            multiline
            rows={2}
          />

          {/* 6. Numero ng Lisensya (100%) */}
          <SakayFormInput
            label="NUMERO NG LISENSYA"
            value={formData.licenseNumber}
            onChange={(val) => handleFieldChange('licenseNumber', val)}
          />

          {/* 7. Restriksyon / Kategorya ng Lisensya (100%) */}
          <SakayFormInput
            label="RESTRIKSYON / KATEGORYA NG LISENSYA"
            value={formData.dlCodes}
            onChange={(val) => handleFieldChange('dlCodes', val)}
            isRestriction
          />

          {/* 8. Petsa ng Pagkapaso (100%) */}
          <SakayFormInput
            label="PETSA NG PAGKAPASO (EXPIRATION)"
            value={formData.expirationDate}
            onChange={(val) => handleFieldChange('expirationDate', val)}
            isDate
            placeholder="MM-DD-YYYY"
            onOpenCalendar={(anchor) => handleOpenCalendar('expirationDate', anchor)}
          />
        </Box>
      </Box>

      <DateCalendarPopover
        open={Boolean(calendarAnchorEl && activeDateField)}
        anchorEl={calendarAnchorEl}
        onClose={handleCloseCalendar}
        selectedDate={parseDateForCalendar(
          activeDateField ? formData[activeDateField] : ''
        )}
        onSelectDate={handleSelectCalendarDate}
      />

      <Box
        sx={{
          padding: '12px 24px calc(var(--safe-area-bottom) + 16px) 24px',
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #F1F5F9',
          flexShrink: 0,
          zIndex: 30,
        }}
      >
        <PrimaryButton
          onClick={handleContinue}
          loading={submitting}
          disabled={!isFormValid || submitting}
          fullWidth
          sx={{
            height: '56px',
            borderRadius: '16px',
            fontSize: '16px',
            fontWeight: 800,
            backgroundColor: isFormValid ? '#FF6B00' : '#E2E8F0',
            color: isFormValid ? '#FFFFFF' : '#94A3B8',
            boxShadow: 'none',
            '&.Mui-disabled': {
              backgroundColor: '#E2E8F0',
              color: '#94A3B8',
            },
            '&:hover': {
              backgroundColor: isFormValid ? '#E66000' : '#E2E8F0',
              boxShadow: 'none',
            },
          }}
        >
          {isEditMode ? 'Kumpirmahin' : 'Magpatuloy'}
        </PrimaryButton>
      </Box>
    </Box>
  );
};

export default DriverConfirmLicenseInfo;
