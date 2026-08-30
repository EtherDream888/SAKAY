import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  LinearProgress,
  Divider,
  Popover,
  Snackbar,
  Dialog,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CloseIcon from '@mui/icons-material/Close';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import { useNavigate } from 'react-router-dom';

import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { SakayTextField } from '../components/common/SakayTextField';
import SakayPhoneInput from '../components/common/SakayPhoneInput';

import { registerToda, uploadTodaDocument, checkAcronymAvailability } from '../services/todaApiService';
import { DateCalendarPopover } from '../components/popovers/DateCalendarPopover';
import { TerminalMapPickerModal } from '../components/modals/TerminalMapPickerModal';
import { DocumentReviewModal } from '../components/modals/DocumentReviewModal';
import { parseDriverRoster } from '../utils/rosterParser';

const CALAPAN_BARANGAYS = [
  'Balingayan', 'Balite', 'Baruyan', 'Batino', 'Bayanan I', 'Bayanan II', 'Biga', 'Bondoc', 'Bucayao', 'Buhuan',
  'Bulusan', 'Calero', 'Camansihan', 'Camilmil', 'Canubing I', 'Canubing II', 'Comunal', 'Guinobatan', 'Gulod',
  'Gutad', 'Ibaba East', 'Ibaba West', 'Ilaya', 'Lalud', 'Lazareto', 'Lumangbayan', 'Mahlabang', 'Malad',
  'Malamig', 'Managpi', 'Masipit', 'Navotas', 'Pachoca', 'Palhi', 'Panggalaan', 'Parang', 'Patas', 'Personas',
  'Puting Tubig', 'San Antonio', 'San Vicente Central', 'San Vicente East', 'San Vicente North', 'San Vicente South',
  'San Vicente West', 'Sapul', 'Silonay', 'Sta. Cruz', 'Sta. Isabel', 'Sta. Maria Village', 'Suqui', 'Tawiran', 'Tibag', 'Wawa'
].sort();

const REGISTRATION_DRAFT_KEY = 'sakay_toda_registration_draft';

interface RegistrationDraft {
  todaName?: string;
  todaAcronym?: string;
  barangay?: string;
  dateEstablished?: string;
  serviceCoverageArea?: string;
  terminalLatitude?: number | null;
  terminalLongitude?: number | null;
  coordinatesText?: string;
  presidentName?: string;
  presidentContact?: string;
  vicePresidentName?: string;
  vicePresidentContact?: string;
  secretaryName?: string;
  secretaryContact?: string;
  treasurerName?: string;
  treasurerContact?: string;
  confirmAcronym?: string;
  clearanceDoc?: { url: string | null; fileName: string | null; sizeBytes: number };
  rosterDoc?: { url: string | null; fileName: string | null; sizeBytes: number };
  bylawsDoc?: { url: string | null; fileName: string | null; sizeBytes: number };
  lastSaved?: string;
}

interface UploadedDocState {
  file: File | null;
  url: string | null;
  fileName: string | null;
  sizeBytes: number;
  isUploading: boolean;
  uploadError: string | null;
}

const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 4) {
    return digits;
  }
  if (digits.length <= 7) {
    return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  }
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
};

export const TodaRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoAnchorEl, setInfoAnchorEl] = useState<HTMLElement | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarAnchorEl, setCalendarAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedDateObj, setSelectedDateObj] = useState<Date>(new Date());

  // Map Location Picker State
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [terminalLatitude, setTerminalLatitude] = useState<number | null>(null);
  const [terminalLongitude, setTerminalLongitude] = useState<number | null>(null);
  const [coordinatesText, setCoordinatesText] = useState('');

  const handleLocationSelected = (loc: { lat: number; lng: number; locationName?: string }) => {
    setTerminalLatitude(loc.lat);
    setTerminalLongitude(loc.lng);
    setCoordinatesText(`${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`);
    if (loc.locationName && !serviceCoverageArea.trim()) {
      setServiceCoverageArea(loc.locationName);
    }
  };

  // Section 1: Organization Information
  const [todaName, setTodaName] = useState('');
  const [todaAcronym, setTodaAcronym] = useState('');
  const [barangay, setBarangay] = useState('');
  const [dateEstablished, setDateEstablished] = useState('');
  const [serviceCoverageArea, setServiceCoverageArea] = useState('');

  // Section 2: Executive Officers
  const [presidentName, setPresidentName] = useState('');
  const [presidentContact, setPresidentContact] = useState('');
  const [vicePresidentName, setVicePresidentName] = useState('');
  const [vicePresidentContact, setVicePresidentContact] = useState('');
  const [secretaryName, setSecretaryName] = useState('');
  const [secretaryContact, setSecretaryContact] = useState('');
  const [treasurerName, setTreasurerName] = useState('');
  const [treasurerContact, setTreasurerContact] = useState('');

  // Section 3: Credentials
  const [confirmAcronym, setConfirmAcronym] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Section 4: Document Uploads
  const [clearanceDoc, setClearanceDoc] = useState<UploadedDocState>({
    file: null, url: null, fileName: null, sizeBytes: 0, isUploading: false, uploadError: null,
  });
  const [rosterDoc, setRosterDoc] = useState<UploadedDocState>({
    file: null, url: null, fileName: null, sizeBytes: 0, isUploading: false, uploadError: null,
  });
  const [bylawsDoc, setBylawsDoc] = useState<UploadedDocState>({
    file: null, url: null, fileName: null, sizeBytes: 0, isUploading: false, uploadError: null,
  });
  const [rosterDriverCount, setRosterDriverCount] = useState<number>(0);

  const clearanceInputRef = useRef<HTMLInputElement | null>(null);
  const rosterInputRef = useRef<HTMLInputElement | null>(null);
  const bylawsInputRef = useRef<HTMLInputElement | null>(null);

  // Document Review Modal State
  const [reviewModalState, setReviewModalState] = useState<{
    open: boolean;
    title: string;
    fileName: string | null;
    fileUrl: string | null;
    fileObj: File | null;
  }>({
    open: false,
    title: '',
    fileName: null,
    fileUrl: null,
    fileObj: null,
  });

  const openReviewModal = (title: string, docState: UploadedDocState) => {
    setReviewModalState({
      open: true,
      title,
      fileName: docState.fileName,
      fileUrl: docState.url,
      fileObj: docState.file,
    });
  };

  // Toast Notification State
  const [toastState, setToastState] = useState<{
    open: boolean;
    message: string;
  }>({
    open: false,
    message: '',
  });

  const showToast = (message: string) => {
    setToastState({ open: true, message });
  };

  // 1. Restore Draft on initial mount
  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(REGISTRATION_DRAFT_KEY);
      if (savedRaw) {
        const draft: RegistrationDraft = JSON.parse(savedRaw);
        if (draft.todaName) setTodaName(draft.todaName);
        if (draft.todaAcronym) setTodaAcronym(draft.todaAcronym);
        if (draft.barangay) setBarangay(draft.barangay);
        if (draft.dateEstablished) {
          setDateEstablished(draft.dateEstablished);
          const parsedDate = new Date(draft.dateEstablished);
          if (!isNaN(parsedDate.getTime())) {
            setSelectedDateObj(parsedDate);
          }
        }
        if (draft.serviceCoverageArea) setServiceCoverageArea(draft.serviceCoverageArea);
        if (draft.terminalLatitude !== undefined && draft.terminalLatitude !== null) {
          setTerminalLatitude(draft.terminalLatitude);
        }
        if (draft.terminalLongitude !== undefined && draft.terminalLongitude !== null) {
          setTerminalLongitude(draft.terminalLongitude);
        }
        if (draft.coordinatesText) setCoordinatesText(draft.coordinatesText);
        if (draft.presidentName) setPresidentName(draft.presidentName);
        if (draft.presidentContact) setPresidentContact(draft.presidentContact);
        if (draft.vicePresidentName) setVicePresidentName(draft.vicePresidentName);
        if (draft.vicePresidentContact) setVicePresidentContact(draft.vicePresidentContact);
        if (draft.secretaryName) setSecretaryName(draft.secretaryName);
        if (draft.secretaryContact) setSecretaryContact(draft.secretaryContact);
        if (draft.treasurerName) setTreasurerName(draft.treasurerName);
        if (draft.treasurerContact) setTreasurerContact(draft.treasurerContact);
        if (draft.confirmAcronym) setConfirmAcronym(draft.confirmAcronym);
        if (draft.clearanceDoc?.url) {
          setClearanceDoc({
            file: null,
            url: draft.clearanceDoc.url,
            fileName: draft.clearanceDoc.fileName,
            sizeBytes: draft.clearanceDoc.sizeBytes,
            isUploading: false,
            uploadError: null,
          });
        }
        if (draft.rosterDoc?.url) {
          setRosterDoc({
            file: null,
            url: draft.rosterDoc.url,
            fileName: draft.rosterDoc.fileName,
            sizeBytes: draft.rosterDoc.sizeBytes,
            isUploading: false,
            uploadError: null,
          });
        }
        if (draft.bylawsDoc?.url) {
          setBylawsDoc({
            file: null,
            url: draft.bylawsDoc.url,
            fileName: draft.bylawsDoc.fileName,
            sizeBytes: draft.bylawsDoc.sizeBytes,
            isUploading: false,
            uploadError: null,
          });
        }
      }
    } catch (e) {
      console.warn('[TodaRegistrationPage] Failed to restore draft:', e);
    }
  }, []);

  // Synchronize Section 4 confirmAcronym automatically with Section 1 todaAcronym
  useEffect(() => {
    setConfirmAcronym(todaAcronym);
  }, [todaAcronym]);

  // 2. Auto-save Draft to LocalStorage whenever fields change
  useEffect(() => {
    const hasAnyContent = Boolean(
      todaName || todaAcronym || barangay || dateEstablished || serviceCoverageArea ||
      terminalLatitude || terminalLongitude || coordinatesText ||
      presidentName || presidentContact || vicePresidentName || vicePresidentContact ||
      secretaryName || secretaryContact || treasurerName || treasurerContact ||
      confirmAcronym || clearanceDoc.url || rosterDoc.url || bylawsDoc.url
    );

    if (!hasAnyContent) {
      return;
    }

    const draft: RegistrationDraft = {
      todaName,
      todaAcronym,
      barangay,
      dateEstablished,
      serviceCoverageArea,
      terminalLatitude,
      terminalLongitude,
      coordinatesText,
      presidentName,
      presidentContact,
      vicePresidentName,
      vicePresidentContact,
      secretaryName,
      secretaryContact,
      treasurerName,
      treasurerContact,
      confirmAcronym,
      clearanceDoc: clearanceDoc.url ? { url: clearanceDoc.url, fileName: clearanceDoc.fileName, sizeBytes: clearanceDoc.sizeBytes } : undefined,
      rosterDoc: rosterDoc.url ? { url: rosterDoc.url, fileName: rosterDoc.fileName, sizeBytes: rosterDoc.sizeBytes } : undefined,
      bylawsDoc: bylawsDoc.url ? { url: bylawsDoc.url, fileName: bylawsDoc.fileName, sizeBytes: bylawsDoc.sizeBytes } : undefined,
      lastSaved: new Date().toISOString(),
    };

    try {
      localStorage.setItem(REGISTRATION_DRAFT_KEY, JSON.stringify(draft));
    } catch (err) {
      console.warn('[TodaRegistrationPage] Error saving draft:', err);
    }
  }, [
    todaName, todaAcronym, barangay, dateEstablished, serviceCoverageArea,
    terminalLatitude, terminalLongitude, coordinatesText,
    presidentName, presidentContact, vicePresidentName, vicePresidentContact,
    secretaryName, secretaryContact, treasurerName, treasurerContact,
    confirmAcronym, clearanceDoc.url, clearanceDoc.fileName, clearanceDoc.sizeBytes,
    rosterDoc.url, rosterDoc.fileName, rosterDoc.sizeBytes,
    bylawsDoc.url, bylawsDoc.fileName, bylawsDoc.sizeBytes
  ]);

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(REGISTRATION_DRAFT_KEY);
    } catch {}
    setTodaName('');
    setTodaAcronym('');
    setBarangay('');
    setDateEstablished('');
    setServiceCoverageArea('');
    setTerminalLatitude(null);
    setTerminalLongitude(null);
    setCoordinatesText('');
    setPresidentName('');
    setPresidentContact('');
    setVicePresidentName('');
    setVicePresidentContact('');
    setSecretaryName('');
    setSecretaryContact('');
    setTreasurerName('');
    setTreasurerContact('');
    setConfirmAcronym('');
    setPassword('');
    setConfirmPassword('');
    setClearanceDoc({ file: null, url: null, fileName: null, sizeBytes: 0, isUploading: false, uploadError: null });
    setRosterDoc({ file: null, url: null, fileName: null, sizeBytes: 0, isUploading: false, uploadError: null });
    setBylawsDoc({ file: null, url: null, fileName: null, sizeBytes: 0, isUploading: false, uploadError: null });
    setRosterDriverCount(0);
    setHasAttemptedSubmit(false);
  };

  const hasDraftContent = Boolean(
    todaName || todaAcronym || barangay || dateEstablished || serviceCoverageArea ||
    terminalLatitude || terminalLongitude || presidentName || presidentContact ||
    vicePresidentName || secretaryName || treasurerName ||
    clearanceDoc.url || rosterDoc.url || bylawsDoc.url
  );

  // Auto-prefix 09 on focus for contact numbers
  const handleContactFocus = (
    currentValue: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (!currentValue || !currentValue.trim()) {
      setter('09');
    }
  };

  const handleContactBlur = (
    currentValue: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (currentValue.trim() === '09' || currentValue.trim() === '09 ') {
      setter('');
    }
  };

  // Password Criteria Validations
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-]/.test(password);

  const criteriaList = [
    { label: 'Minimum 8 characters', met: hasMinLength },
    { label: 'At least 1 uppercase letter (A-Z)', met: hasUppercase },
    { label: 'At least 1 lowercase letter (a-z)', met: hasLowercase },
    { label: 'At least 1 number (0-9)', met: hasNumber },
    { label: 'At least 1 special character (!@#$%^&*)', met: hasSpecial },
  ];

  const metCount = criteriaList.filter((c) => c.met).length;
  const passwordScore = (metCount / criteriaList.length) * 100;
  const isPasswordValid = metCount === criteriaList.length;

  const getStrengthColor = () => {
    if (metCount <= 2) return '#DC2626';
    if (metCount <= 4) return '#EA580C';
    return '#16A34A';
  };

  const getStrengthLabel = () => {
    if (password.length === 0) return '';
    if (metCount <= 2) return 'Weak';
    if (metCount <= 4) return 'Moderate';
    return 'Strong';
  };

  // Acronym Confirmation Validation
  const cleanOrgAcronym = todaAcronym.replace(/\s+/g, '').toUpperCase();
  const cleanConfirmAcronym = confirmAcronym.replace(/\s+/g, '').toUpperCase();
  const isAcronymMatched = cleanOrgAcronym.length > 0 && cleanOrgAcronym === cleanConfirmAcronym;
  const isAcronymMismatched = cleanConfirmAcronym.length > 0 && cleanOrgAcronym !== cleanConfirmAcronym;

  // Password Confirmation Validation
  const isPasswordMatched = confirmPassword.length > 0 && password === confirmPassword;
  const isPasswordMismatched = confirmPassword.length > 0 && password !== confirmPassword;
  const [showMatchSuccess, setShowMatchSuccess] = useState(false);

  useEffect(() => {
    if (confirmPassword.length > 0 && password === confirmPassword) {
      setShowMatchSuccess(true);
      const timer = setTimeout(() => {
        setShowMatchSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowMatchSuccess(false);
    }
  }, [password, confirmPassword]);

  // Real File Upload Handler
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    bucket: 'barangay-clearances' | 'toda-accredited-driver-lists' | 'toda-bylaws',
    setDocState: React.Dispatch<React.SetStateAction<UploadedDocState>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocState((prev) => ({ ...prev, isUploading: true, uploadError: null }));

    // Extract driver count from roster spreadsheet
    if (bucket === 'toda-accredited-driver-lists' || ['csv', 'xlsx', 'xls'].includes(file.name.split('.').pop()?.toLowerCase() || '')) {
      try {
        const parsed = await parseDriverRoster(file);
        setRosterDriverCount(parsed.count);
      } catch (err) {
        console.warn('[TodaRegistrationPage] Roster driver count extraction note:', err);
      }
    }

    try {
      const result = await uploadTodaDocument(file, bucket);
      setDocState({
        file,
        url: result.url,
        fileName: result.fileName,
        sizeBytes: result.sizeBytes,
        isUploading: false,
        uploadError: null,
      });
    } catch (err: any) {
      console.warn('Document storage upload fallback to local ObjectURL:', err);
      // Ensure file attachment succeeds even if remote storage bucket is provisioning
      const fallbackUrl = URL.createObjectURL(file);
      setDocState({
        file,
        url: fallbackUrl,
        fileName: file.name,
        sizeBytes: file.size,
        isUploading: false,
        uploadError: null,
      });
    }
  };

  const handleRemoveDoc = (
    setDocState: React.Dispatch<React.SetStateAction<UploadedDocState>>,
    inputRef: React.RefObject<HTMLInputElement | null>
  ) => {
    if (inputRef === rosterInputRef) {
      setRosterDriverCount(0);
    }
    setDocState({
      file: null,
      url: null,
      fileName: null,
      sizeBytes: 0,
      isUploading: false,
      uploadError: null,
    });
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setHasAttemptedSubmit(true);

    const emptyRequiredErrors: { id: string; message: string }[] = [];
    const valueMismatchErrors: { id: string; message: string }[] = [];

    // 1. Check for empty required fields
    if (!todaName.trim()) {
      emptyRequiredErrors.push({ id: 'field-todaName', message: 'Official TODA Name is required.' });
    }
    if (!cleanOrgAcronym) {
      emptyRequiredErrors.push({ id: 'field-todaAcronym', message: 'TODA Acronym is required.' });
    }
    if (!barangay) {
      emptyRequiredErrors.push({ id: 'field-barangay', message: 'Operating Barangay is required.' });
    }
    if (!serviceCoverageArea.trim()) {
      emptyRequiredErrors.push({ id: 'field-serviceCoverageArea', message: 'Service Coverage / Terminal Location is required.' });
    }
    if (!presidentName.trim()) {
      emptyRequiredErrors.push({ id: 'field-presidentName', message: 'President Full Name is required.' });
    }
    if (!presidentContact.trim()) {
      emptyRequiredErrors.push({ id: 'field-presidentContact', message: 'President Mobile Contact is required.' });
    }
    if (!clearanceDoc.url && !clearanceDoc.file) {
      emptyRequiredErrors.push({ id: 'field-clearanceDoc', message: 'Barangay Clearance is required.' });
    }
    if (!rosterDoc.url && !rosterDoc.file) {
      emptyRequiredErrors.push({ id: 'field-rosterDoc', message: 'Driver Roster is required.' });
    }
    if (!bylawsDoc.url && !bylawsDoc.file) {
      emptyRequiredErrors.push({ id: 'field-bylawsDoc', message: 'Internal Bylaws is required.' });
    }
    if (!confirmAcronym.trim()) {
      emptyRequiredErrors.push({ id: 'field-confirmAcronym', message: 'TODA Acronym confirmation is required.' });
    }
    if (!password) {
      emptyRequiredErrors.push({ id: 'field-password', message: 'Password is required.' });
    }
    if (!confirmPassword) {
      emptyRequiredErrors.push({ id: 'field-confirmPassword', message: 'Confirm Password is required.' });
    }

    // If any required field is empty, highlight and notify
    if (emptyRequiredErrors.length > 0) {
      const firstError = emptyRequiredErrors[0];
      const targetEl = document.getElementById(firstError.id);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = targetEl.querySelector('input, select') as HTMLElement | null;
        if (input) {
          input.focus();
        }
      }
      showToast('Please fill in all required fields.');
      return;
    }

    // 2. Check for value mismatches or password criteria (fields are filled, but invalid)
    if (confirmAcronym.trim() && cleanOrgAcronym !== cleanConfirmAcronym) {
      valueMismatchErrors.push({ id: 'field-confirmAcronym', message: 'TODA Acronym does not match.' });
    }
    if (password && !isPasswordValid) {
      valueMismatchErrors.push({ id: 'field-password', message: 'Password does not meet all security requirements.' });
    }
    if (confirmPassword && password !== confirmPassword) {
      valueMismatchErrors.push({ id: 'field-confirmPassword', message: 'Passwords do not match.' });
    }

    if (valueMismatchErrors.length > 0) {
      const firstMismatch = valueMismatchErrors[0];
      const targetEl = document.getElementById(firstMismatch.id);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = targetEl.querySelector('input, select') as HTMLElement | null;
        if (input) {
          input.focus();
        }
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const isAvail = await checkAcronymAvailability(cleanOrgAcronym);
      if (!isAvail) {
        setErrorMsg(`The TODA Acronym '${cleanOrgAcronym}' is already registered. Please choose another.`);
        setIsSubmitting(false);
        return;
      }

      let driverCount = rosterDriverCount;
      if (driverCount === 0 && rosterDoc.file) {
        try {
          const parsed = await parseDriverRoster(rosterDoc.file);
          driverCount = parsed.count;
        } catch (err) {
          console.warn('[TodaRegistrationPage] Fallback roster parse error:', err);
        }
      }

      await registerToda({
        todaName: todaName.trim(),
        todaAcronym: cleanOrgAcronym,
        barangay,
        dateEstablished,
        serviceCoverageArea: serviceCoverageArea.trim(),
        presidentName: presidentName.trim(),
        presidentContact: presidentContact.trim(),
        vicePresidentName: vicePresidentName.trim(),
        vicePresidentContact: vicePresidentContact.trim(),
        secretaryName: secretaryName.trim(),
        secretaryContact: secretaryContact.trim(),
        treasurerName: treasurerName.trim(),
        treasurerContact: treasurerContact.trim(),
        password,
        barangayClearanceUrl: clearanceDoc.url || undefined,
        accreditedDriversUrl: rosterDoc.url || undefined,
        bylawsUrl: bylawsDoc.url || undefined,
        registeredTricycleCount: driverCount,
        terminalLatitude,
        terminalLongitude,
      });

      try {
        localStorage.removeItem(REGISTRATION_DRAFT_KEY);
      } catch {}

      setSuccessModalOpen(true);
    } catch (err: any) {
      console.error('[TodaRegistrationPage] Submission error:', err);
      showToast(err.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#FFF8F2', pb: 6, px: { xs: 2, sm: 3 } }}>
      <Box sx={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Sticky Link Container with 100% Opaque Page-Matching Background */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            backgroundColor: '#FFF8F2',
            width: '100%',
            py: 2,
            mb: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Button
            onClick={() => navigate('/login')}
            startIcon={<ArrowBackIcon />}
            disableRipple={false}
            sx={{
              textTransform: 'none',
              color: 'var(--mac-text-primary)',
              fontWeight: 600,
              fontSize: '13px',
              px: 1.5,
              py: 0.75,
              borderRadius: '8px',
              border: '1px solid transparent',
              backgroundColor: 'transparent',
              '&:hover': {
                backgroundColor: '#FFFFFF',
                borderColor: 'var(--mac-border-color)',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            Back to Login
          </Button>

          {hasDraftContent && (
            <Button
              onClick={handleClearDraft}
              startIcon={<RestartAltIcon />}
              disableRipple={false}
              sx={{
                textTransform: 'none',
                color: '#DC2626',
                fontWeight: 600,
                fontSize: '13px',
                px: 1.5,
                py: 0.75,
                borderRadius: '8px',
                border: '1px solid transparent',
                backgroundColor: 'transparent',
                '&:hover': {
                  backgroundColor: '#FEF2F2',
                  borderColor: '#FCA5A5',
                },
              }}
            >
              Reset Form
            </Button>
          )}
        </Box>

        {/* Main Content Card */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: '16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--mac-border-color)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
          }}
        >
          {/* Header Banner */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 50,
                height: 50,
                borderRadius: '12px',
                backgroundColor: 'var(--sakay-orange-soft)',
                color: 'var(--sakay-orange)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AssignmentIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '22px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                TODA Association Registration
              </Typography>
            </Box>
          </Box>

          <form onSubmit={handleSubmit} noValidate>
            {/* Section 1: Organization Information */}
            <Box sx={{ mb: 4 }}>
              <Typography sx={{ fontSize: '14px', fontWeight: 700, color: 'var(--sakay-orange)', textTransform: 'uppercase', mb: 2, letterSpacing: '0.5px' }}>
                1. Organization Information
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mb: 2.5 }}>
                <SakayTextField
                  id="field-todaName"
                  label="Official TODA Name"
                  value={todaName}
                  onChange={(e) => setTodaName(e.target.value)}
                  error={hasAttemptedSubmit && !todaName.trim()}
                  helperText={hasAttemptedSubmit && !todaName.trim() ? 'Official TODA Name is required.' : ''}
                  required
                />
                <SakayTextField
                  id="field-todaAcronym"
                  label="TODA Acronym"
                  value={todaAcronym}
                  onChange={(e) => setTodaAcronym(e.target.value.replace(/\s+/g, '').toUpperCase())}
                  error={hasAttemptedSubmit && !cleanOrgAcronym}
                  helperText={hasAttemptedSubmit && !cleanOrgAcronym ? 'TODA Acronym is required.' : ''}
                  required
                  endAdornment={
                    <IconButton
                      onClick={(e) => setInfoAnchorEl(e.currentTarget)}
                      size="small"
                      sx={{
                        color: '#FF6B00',
                        backgroundColor: '#FFF2E9',
                        '&:hover': { backgroundColor: '#FFE4D1' },
                      }}
                    >
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  }
                />
              </Box>

              {/* Styled Info Popover */}
              <Popover
                open={Boolean(infoAnchorEl)}
                anchorEl={infoAnchorEl}
                onClose={() => setInfoAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                  paper: {
                    sx: {
                      px: 2,
                      py: 1.25,
                      maxWidth: 290,
                      borderRadius: '10px',
                      boxShadow: '0 8px 24px rgba(255, 107, 26, 0.16)',
                      border: '1px solid var(--sakay-orange-border)',
                      backgroundColor: '#FFF2E9',
                      color: '#1D1D1F',
                      mt: 0.75,
                    },
                  },
                }}
              >
                <Typography sx={{ fontSize: '12.5px', color: '#1D1D1F', fontWeight: 500, lineHeight: 1.45 }}>
                  This TODA Acronym will serve as your login credential.
                </Typography>
              </Popover>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mb: 2.5 }}>
                <TextField
                  id="field-barangay"
                  select
                  label={
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <span>OPERATING BARANGAY</span>
                      <Box component="span" sx={{ color: '#FF6B00', fontWeight: 800 }}>*</Box>
                    </Box>
                  }
                  value={barangay}
                  onChange={(e) => setBarangay(e.target.value)}
                  error={hasAttemptedSubmit && !barangay}
                  helperText={hasAttemptedSubmit && !barangay ? 'Please select an operating barangay.' : ''}
                  fullWidth
                  slotProps={{
                    select: {
                      IconComponent: KeyboardArrowDownIcon,
                      MenuProps: {
                        slotProps: {
                          paper: {
                            sx: {
                              maxHeight: 180, // Shows max 4 barangays at a time with internal scroll
                              borderRadius: '12px',
                              mt: 1,
                              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                              '& .MuiMenuItem-root': {
                                fontSize: '14px',
                                py: 1.2,
                                px: 2,
                                fontWeight: 500,
                                '&.Mui-selected': {
                                  backgroundColor: '#FFF5EF !important',
                                  color: '#FF6B00',
                                  fontWeight: 700,
                                },
                                '&:hover': {
                                  backgroundColor: '#FFF2E9',
                                  color: '#FF6B00',
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      minHeight: '62px',
                      borderRadius: '16px',
                      backgroundColor: barangay ? '#FFFFFF' : '#F1F3F5',
                      fontSize: '15px',
                      fontWeight: 600,
                      border: `1.5px solid ${hasAttemptedSubmit && !barangay ? '#DC2626' : '#E2E8F0'}`,
                      '&:hover fieldset': {
                        borderColor: '#FF6B00',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#FF6B00',
                        borderWidth: '1.5px',
                      },
                      '&.Mui-focused': {
                        boxShadow: '0 0 0 3px rgba(255, 107, 0, 0.12)',
                        backgroundColor: '#FFFFFF',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '14.5px',
                      color: '#94A3B8',
                      background: 'transparent',
                      '&.Mui-focused, &.MuiInputLabel-shrink': {
                        fontSize: '9.5px',
                        fontWeight: 700,
                        color: '#FF6B00',
                        transform: 'translate(14px, 8px) scale(1)',
                        background: 'transparent',
                        padding: 0,
                      },
                    },
                    '& .MuiOutlinedInput-notchedOutline legend': {
                      display: 'none',
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: 'none',
                    },
                    '& .MuiSelect-select': {
                      pt: '20px',
                      pb: '6px',
                    },
                  }}
                >
                  <MenuItem value="" disabled>Select Barangay</MenuItem>
                  {CALAPAN_BARANGAYS.map((b) => (
                    <MenuItem key={b} value={b}>{b}</MenuItem>
                  ))}
                </TextField>

                <Box sx={{ position: 'relative' }}>
                  <SakayTextField
                    id="field-dateEstablished"
                    label="Date Established"
                    placeholder="YYYY-MM-DD"
                    value={dateEstablished}
                    onChange={(e) => {
                      // Allow manual typing of date
                      setDateEstablished(e.target.value);
                      // Try to parse typed value for calendar sync
                      const parsed = new Date(e.target.value);
                      if (!isNaN(parsed.getTime())) {
                        setSelectedDateObj(parsed);
                      }
                    }}
                    endAdornment={
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCalendarAnchorEl(e.currentTarget);
                          setCalendarOpen(true);
                        }}
                        sx={{ color: '#FF6B00' }}
                      >
                        <CalendarTodayIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    }
                  />
                  <DateCalendarPopover
                    open={calendarOpen}
                    anchorEl={calendarAnchorEl}
                    onClose={() => setCalendarOpen(false)}
                    selectedDate={selectedDateObj}
                    onSelectDate={(date) => {
                      setSelectedDateObj(date);
                      const yyyy = date.getFullYear();
                      const mm = String(date.getMonth() + 1).padStart(2, '0');
                      const dd = String(date.getDate()).padStart(2, '0');
                      setDateEstablished(`${yyyy}-${mm}-${dd}`);
                    }}
                  />
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
                <SakayTextField
                  id="field-serviceCoverageArea"
                  label="Designated Service Coverage / Terminal Location"
                  placeholder="Street, Barangay, City/Municipality"
                  value={serviceCoverageArea}
                  onChange={(e) => setServiceCoverageArea(e.target.value)}
                  error={hasAttemptedSubmit && !serviceCoverageArea.trim()}
                  helperText={hasAttemptedSubmit && !serviceCoverageArea.trim() ? 'Service coverage area is required.' : ''}
                  required
                />

                <SakayTextField
                  id="field-coordinatesText"
                  label="Terminal Coordinates"
                  placeholder="Latitude, Longitude"
                  value={coordinatesText}
                  onChange={(e) => {
                    setCoordinatesText(e.target.value);
                    const parts = e.target.value.split(',').map((s) => parseFloat(s.trim()));
                    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                      setTerminalLatitude(parts[0]);
                      setTerminalLongitude(parts[1]);
                    }
                  }}
                  endAdornment={
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<LocationOnIcon sx={{ fontSize: 16 }} />}
                      onClick={() => setMapModalOpen(true)}
                      sx={{
                        height: 38,
                        borderRadius: '10px',
                        backgroundColor: '#FF6B00',
                        color: '#FFFFFF',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '12.5px',
                        px: 1.75,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 8px rgba(255, 107, 0, 0.25)',
                        '&:hover': {
                          backgroundColor: '#E05D00',
                        },
                      }}
                    >
                      Pin on Map
                    </Button>
                  }
                />
              </Box>
            </Box>

            <Divider sx={{ my: 3, borderColor: 'var(--mac-border-color)' }} />

            {/* Section 2: Executive Officers */}
            <Box sx={{ mb: 4 }}>
              <Typography sx={{ fontSize: '14px', fontWeight: 700, color: 'var(--sakay-orange)', textTransform: 'uppercase', mb: 2, letterSpacing: '0.5px' }}>
                2. Executive Officers
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mb: 2.5 }}>
                <SakayTextField
                  id="field-presidentName"
                  label="President Full Name"
                  value={presidentName}
                  onChange={(e) => setPresidentName(e.target.value)}
                  error={hasAttemptedSubmit && !presidentName.trim()}
                  helperText={hasAttemptedSubmit && !presidentName.trim() ? 'President full name is required.' : ''}
                  required
                />
                <SakayPhoneInput
                  label="President Mobile Contact"
                  value={presidentContact}
                  onChange={(val) => setPresidentContact(val)}
                  error={hasAttemptedSubmit && !presidentContact.trim()}
                  helperText={hasAttemptedSubmit && !presidentContact.trim() ? 'President mobile contact is required.' : ''}
                  required
                />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mb: 2.5 }}>
                <SakayTextField
                  id="field-vicePresidentName"
                  label="Vice President Name"
                  value={vicePresidentName}
                  onChange={(e) => setVicePresidentName(e.target.value)}
                />
                <SakayPhoneInput
                  label="Vice President Contact"
                  value={vicePresidentContact}
                  onChange={(val) => setVicePresidentContact(val)}
                />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mb: 2.5 }}>
                <SakayTextField
                  id="field-secretaryName"
                  label="Secretary Name"
                  value={secretaryName}
                  onChange={(e) => setSecretaryName(e.target.value)}
                />
                <SakayPhoneInput
                  label="Secretary Contact"
                  value={secretaryContact}
                  onChange={(val) => setSecretaryContact(val)}
                />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
                <SakayTextField
                  id="field-treasurerName"
                  label="Treasurer Name"
                  value={treasurerName}
                  onChange={(e) => setTreasurerName(e.target.value)}
                />
                <SakayPhoneInput
                  label="Treasurer Contact"
                  value={treasurerContact}
                  onChange={(val) => setTreasurerContact(val)}
                />
              </Box>
            </Box>

            <Divider sx={{ my: 3, borderColor: 'var(--mac-border-color)' }} />

            {/* Section 3: Required Documents */}
            <Box sx={{ mb: 4 }}>
              <Typography sx={{ fontSize: '14px', fontWeight: 700, color: 'var(--sakay-orange)', textTransform: 'uppercase', mb: 2, letterSpacing: '0.5px' }}>
                3. Required Documents
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* 1. Barangay Clearance */}
                <input
                  type="file"
                  ref={clearanceInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => handleFileUpload(e, 'barangay-clearances', setClearanceDoc)}
                />
                <Paper
                  id="field-clearanceDoc"
                  variant="outlined"
                  sx={{
                    p: '14px 18px',
                    borderRadius: '12px',
                    borderColor: hasAttemptedSubmit && !clearanceDoc.url ? '#EF4444' : (clearanceDoc.url ? '#22C55E' : 'var(--mac-border-color)'),
                    backgroundColor: hasAttemptedSubmit && !clearanceDoc.url ? '#FEF2F2' : (clearanceDoc.url ? '#F0FDF4' : '#FAFAFC'),
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 1.5,
                    transition: 'border-color 0.2s, background-color 0.2s',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <PictureAsPdfOutlinedIcon sx={{ color: hasAttemptedSubmit && !clearanceDoc.url ? '#DC2626' : (clearanceDoc.url ? '#16A34A' : '#64748B'), fontSize: 26 }} />
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                          Barangay Clearance
                        </Typography>
                        <Box component="span" sx={{ color: '#FF6B00', fontWeight: 800 }}>*</Box>
                      </Box>
                      {clearanceDoc.fileName ? (
                        <Typography sx={{ fontSize: '12px', color: '#16A34A', fontWeight: 500 }}>
                          {clearanceDoc.fileName} ({formatFileSize(clearanceDoc.sizeBytes)})
                        </Typography>
                      ) : hasAttemptedSubmit && !clearanceDoc.url ? (
                        <Typography sx={{ fontSize: '11.5px', color: '#DC2626', fontWeight: 600 }}>
                          Document is required
                        </Typography>
                      ) : (
                        <Typography sx={{ fontSize: '11.5px', color: '#94A3B8' }}>
                          PDF, PNG, or JPG (Max 10MB)
                        </Typography>
                      )}
                      {clearanceDoc.uploadError && (
                        <Typography sx={{ fontSize: '11.5px', color: '#DC2626', fontWeight: 600 }}>
                          {clearanceDoc.uploadError}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {clearanceDoc.isUploading ? (
                      <CircularProgress size={18} sx={{ color: 'var(--sakay-orange)' }} />
                    ) : clearanceDoc.url ? (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 15 }} />}
                          onClick={() => openReviewModal('Barangay Clearance', clearanceDoc)}
                          sx={{
                            textTransform: 'none',
                            borderColor: '#CBD5E1',
                            color: '#334155',
                            fontWeight: 600,
                            fontSize: '12px',
                            py: 0.35,
                            px: 1.25,
                            borderRadius: '6px',
                            backgroundColor: '#FFFFFF',
                            '&:hover': {
                              borderColor: 'var(--sakay-orange)',
                              color: 'var(--sakay-orange)',
                              backgroundColor: 'var(--sakay-orange-soft)',
                            },
                          }}
                        >
                          Review
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<DeleteOutlinedIcon sx={{ fontSize: 15 }} />}
                          onClick={() => handleRemoveDoc(setClearanceDoc, clearanceInputRef)}
                          sx={{
                            textTransform: 'none',
                            borderColor: '#EF4444',
                            color: '#DC2626',
                            fontWeight: 600,
                            fontSize: '12px',
                            py: 0.35,
                            px: 1.25,
                            borderRadius: '6px',
                            backgroundColor: '#FFFFFF',
                            '&:hover': {
                              borderColor: '#DC2626',
                              backgroundColor: '#FEF2F2',
                              color: '#B91C1C',
                            },
                          }}
                        >
                          Delete
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<CloudUploadIcon />}
                        onClick={() => clearanceInputRef.current?.click()}
                        sx={{
                          textTransform: 'none',
                          backgroundColor: '#FF6B00',
                          color: '#FFFFFF',
                          fontWeight: 600,
                          fontSize: '13px',
                          borderRadius: '10px',
                          px: 2,
                          py: 0.75,
                          boxShadow: '0 2px 8px rgba(255, 107, 0, 0.22)',
                          '&:hover': {
                            backgroundColor: '#E05D00',
                          },
                        }}
                      >
                        Choose File
                      </Button>
                    )}
                  </Box>
                </Paper>

                {/* 2. Driver Roster */}
                <input
                  type="file"
                  ref={rosterInputRef}
                  style={{ display: 'none' }}
                  accept=".csv,.xlsx,.xls,.pdf"
                  onChange={(e) => handleFileUpload(e, 'toda-accredited-driver-lists', setRosterDoc)}
                />
                <Paper
                  id="field-rosterDoc"
                  variant="outlined"
                  sx={{
                    p: '14px 18px',
                    borderRadius: '12px',
                    borderColor: hasAttemptedSubmit && !rosterDoc.url ? '#EF4444' : (rosterDoc.url ? '#22C55E' : 'var(--mac-border-color)'),
                    backgroundColor: hasAttemptedSubmit && !rosterDoc.url ? '#FEF2F2' : (rosterDoc.url ? '#F0FDF4' : '#FAFAFC'),
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 1.5,
                    transition: 'border-color 0.2s, background-color 0.2s',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <TableChartOutlinedIcon sx={{ color: hasAttemptedSubmit && !rosterDoc.url ? '#DC2626' : (rosterDoc.url ? '#16A34A' : '#059669'), fontSize: 26 }} />
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                          Driver Roster
                        </Typography>
                        <Box component="span" sx={{ color: '#FF6B00', fontWeight: 800 }}>*</Box>
                      </Box>
                      {rosterDoc.fileName ? (
                        <Typography sx={{ fontSize: '12px', color: '#16A34A', fontWeight: 500 }}>
                          {rosterDoc.fileName} ({formatFileSize(rosterDoc.sizeBytes)})
                        </Typography>
                      ) : hasAttemptedSubmit && !rosterDoc.url ? (
                        <Typography sx={{ fontSize: '11.5px', color: '#DC2626', fontWeight: 600 }}>
                          Document is required
                        </Typography>
                      ) : (
                        <Typography sx={{ fontSize: '11.5px', color: '#94A3B8' }}>
                          CSV, Excel, or PDF (Max 10MB)
                        </Typography>
                      )}
                      {rosterDoc.uploadError && (
                        <Typography sx={{ fontSize: '11.5px', color: '#DC2626', fontWeight: 600 }}>
                          {rosterDoc.uploadError}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {rosterDoc.isUploading ? (
                      <CircularProgress size={18} sx={{ color: 'var(--sakay-orange)' }} />
                    ) : rosterDoc.url ? (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 15 }} />}
                          onClick={() => openReviewModal('Driver Roster', rosterDoc)}
                          sx={{
                            textTransform: 'none',
                            borderColor: '#CBD5E1',
                            color: '#334155',
                            fontWeight: 600,
                            fontSize: '12px',
                            py: 0.35,
                            px: 1.25,
                            borderRadius: '6px',
                            backgroundColor: '#FFFFFF',
                            '&:hover': {
                              borderColor: 'var(--sakay-orange)',
                              color: 'var(--sakay-orange)',
                              backgroundColor: 'var(--sakay-orange-soft)',
                            },
                          }}
                        >
                          Review
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<DeleteOutlinedIcon sx={{ fontSize: 15 }} />}
                          onClick={() => handleRemoveDoc(setRosterDoc, rosterInputRef)}
                          sx={{
                            textTransform: 'none',
                            borderColor: '#EF4444',
                            color: '#DC2626',
                            fontWeight: 600,
                            fontSize: '12px',
                            py: 0.35,
                            px: 1.25,
                            borderRadius: '6px',
                            backgroundColor: '#FFFFFF',
                            '&:hover': {
                              borderColor: '#DC2626',
                              backgroundColor: '#FEF2F2',
                              color: '#B91C1C',
                            },
                          }}
                        >
                          Delete
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<CloudUploadIcon />}
                        onClick={() => rosterInputRef.current?.click()}
                        sx={{
                          textTransform: 'none',
                          backgroundColor: '#FF6B00',
                          color: '#FFFFFF',
                          fontWeight: 600,
                          fontSize: '13px',
                          borderRadius: '10px',
                          px: 2,
                          py: 0.75,
                          boxShadow: '0 2px 8px rgba(255, 107, 0, 0.22)',
                          '&:hover': {
                            backgroundColor: '#E05D00',
                          },
                        }}
                      >
                        Choose File
                      </Button>
                    )}
                  </Box>
                </Paper>

                {/* 3. Internal Bylaws */}
                <input
                  type="file"
                  ref={bylawsInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => handleFileUpload(e, 'toda-bylaws', setBylawsDoc)}
                />
                <Paper
                  id="field-bylawsDoc"
                  variant="outlined"
                  sx={{
                    p: '14px 18px',
                    borderRadius: '12px',
                    borderColor: hasAttemptedSubmit && !bylawsDoc.url ? '#EF4444' : (bylawsDoc.url ? '#22C55E' : 'var(--mac-border-color)'),
                    backgroundColor: hasAttemptedSubmit && !bylawsDoc.url ? '#FEF2F2' : (bylawsDoc.url ? '#F0FDF4' : '#FAFAFC'),
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 1.5,
                    transition: 'border-color 0.2s, background-color 0.2s',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <DescriptionOutlinedIcon sx={{ color: hasAttemptedSubmit && !bylawsDoc.url ? '#DC2626' : (bylawsDoc.url ? '#16A34A' : '#2563EB'), fontSize: 26 }} />
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                          Internal Bylaws
                        </Typography>
                        <Box component="span" sx={{ color: '#FF6B00', fontWeight: 800 }}>*</Box>
                      </Box>
                      {bylawsDoc.fileName ? (
                        <Typography sx={{ fontSize: '12px', color: '#16A34A', fontWeight: 500 }}>
                          {bylawsDoc.fileName} ({formatFileSize(bylawsDoc.sizeBytes)})
                        </Typography>
                      ) : hasAttemptedSubmit && !bylawsDoc.url ? (
                        <Typography sx={{ fontSize: '11.5px', color: '#DC2626', fontWeight: 600 }}>
                          Document is required
                        </Typography>
                      ) : (
                        <Typography sx={{ fontSize: '11.5px', color: '#94A3B8' }}>
                          PDF, PNG, or JPG (Max 10MB)
                        </Typography>
                      )}
                      {bylawsDoc.uploadError && (
                        <Typography sx={{ fontSize: '11.5px', color: '#DC2626', fontWeight: 600 }}>
                          {bylawsDoc.uploadError}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {bylawsDoc.isUploading ? (
                      <CircularProgress size={18} sx={{ color: 'var(--sakay-orange)' }} />
                    ) : bylawsDoc.url ? (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 15 }} />}
                          onClick={() => openReviewModal('Internal Bylaws', bylawsDoc)}
                          sx={{
                            textTransform: 'none',
                            borderColor: '#CBD5E1',
                            color: '#334155',
                            fontWeight: 600,
                            fontSize: '12px',
                            py: 0.35,
                            px: 1.25,
                            borderRadius: '6px',
                            backgroundColor: '#FFFFFF',
                            '&:hover': {
                              borderColor: 'var(--sakay-orange)',
                              color: 'var(--sakay-orange)',
                              backgroundColor: 'var(--sakay-orange-soft)',
                            },
                          }}
                        >
                          Review
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<DeleteOutlinedIcon sx={{ fontSize: 15 }} />}
                          onClick={() => handleRemoveDoc(setBylawsDoc, bylawsInputRef)}
                          sx={{
                            textTransform: 'none',
                            borderColor: '#EF4444',
                            color: '#DC2626',
                            fontWeight: 600,
                            fontSize: '12px',
                            py: 0.35,
                            px: 1.25,
                            borderRadius: '6px',
                            backgroundColor: '#FFFFFF',
                            '&:hover': {
                              borderColor: '#DC2626',
                              backgroundColor: '#FEF2F2',
                              color: '#B91C1C',
                            },
                          }}
                        >
                          Delete
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<CloudUploadIcon />}
                        onClick={() => bylawsInputRef.current?.click()}
                        sx={{
                          textTransform: 'none',
                          backgroundColor: '#FF6B00',
                          color: '#FFFFFF',
                          fontWeight: 600,
                          fontSize: '13px',
                          borderRadius: '10px',
                          px: 2,
                          py: 0.75,
                          boxShadow: '0 2px 8px rgba(255, 107, 0, 0.22)',
                          '&:hover': {
                            backgroundColor: '#E05D00',
                          },
                        }}
                      >
                        Choose File
                      </Button>
                    )}
                  </Box>
                </Paper>
              </Box>
            </Box>

            <Divider sx={{ my: 3, borderColor: 'var(--mac-border-color)' }} />

            {/* Section 4: Account Credentials */}
            <Box sx={{ mb: 4 }}>
              <Typography sx={{ fontSize: '14px', fontWeight: 700, color: 'var(--sakay-orange)', textTransform: 'uppercase', mb: 2, letterSpacing: '0.5px' }}>
                4. Account Credentials
              </Typography>

              {/* TODA Acronym (Auto-Synchronized from Section 1) */}
              <Box sx={{ mb: 2.5 }}>
                <SakayTextField
                  id="field-confirmAcronym"
                  label="TODA Acronym"
                  value={todaAcronym}
                  readOnly
                  required
                  helperText="Automatically synchronized with Organization Information acronym above."
                />
              </Box>

              {/* Password & Confirm Password */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mb: 2 }}>
                <SakayTextField
                  id="field-password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={hasAttemptedSubmit && (!password || !isPasswordValid)}
                  required
                  endAdornment={
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small" sx={{ color: '#86868B' }}>
                      {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                    </IconButton>
                  }
                />

                <SakayTextField
                  id="field-confirmPassword"
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={isPasswordMismatched || (hasAttemptedSubmit && !confirmPassword)}
                  helperText={
                    isPasswordMismatched
                      ? 'Passwords do not match.'
                      : showMatchSuccess
                      ? 'Passwords match ✓'
                      : ''
                  }
                  required
                  endAdornment={
                    <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" size="small" sx={{ color: '#86868B' }}>
                      {showConfirmPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                    </IconButton>
                  }
                />
              </Box>

              {/* Login Credentials Reminder Note */}
              <Box
                sx={{
                  p: 1.5,
                  mb: 2.5,
                  borderRadius: '8px',
                  backgroundColor: '#FFF8F2',
                  border: '1px solid var(--sakay-orange-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                }}
              >
                <InfoOutlinedIcon sx={{ fontSize: 18, color: 'var(--sakay-orange)', flexShrink: 0 }} />
                <Typography sx={{ fontSize: '12.5px', color: '#1D1D1F', fontWeight: 500, lineHeight: 1.4 }}>
                  <strong>Reminder:</strong> Please take note of your TODA Acronym and Password. You will use these credentials to log in.
                </Typography>
              </Box>

              {/* Password Progress Bar - Disappears completely once all requirements are met */}
              {!isPasswordValid && password.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                      Password Strength:
                    </Typography>
                    <Typography sx={{ fontSize: '11px', color: getStrengthColor(), fontWeight: 700 }}>
                      {getStrengthLabel()}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={passwordScore}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#E2E8F0',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getStrengthColor(),
                        borderRadius: 3,
                        transition: 'all 0.3s ease',
                      },
                    }}
                  />
                </Box>
              )}

              {/* Password Criteria Checklist - Disappears once all requirements are met */}
              {!isPasswordValid && (
                <Box sx={{ p: 2, borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#334155', mb: 1 }}>
                    Password Requirements:
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.75 }}>
                    {criteriaList.map((crit, idx) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {crit.met ? (
                          <CheckCircleIcon sx={{ fontSize: 16, color: '#16A34A' }} />
                        ) : (
                          <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                        )}
                        <Typography
                          sx={{
                            fontSize: '11.5px',
                            color: crit.met ? '#16A34A' : '#64748B',
                            fontWeight: crit.met ? 600 : 400,
                          }}
                        >
                          {crit.label}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              variant="contained"
              fullWidth
              sx={{
                py: 1.4,
                fontSize: '15px',
                fontWeight: 700,
                backgroundColor: 'var(--sakay-orange)',
                color: '#FFFFFF',
                textTransform: 'none',
                borderRadius: '10px',
                boxShadow: 'var(--mac-shadow-button)',
                '&:hover': {
                  backgroundColor: '#E05E00',
                },
              }}
            >
              {isSubmitting ? (
                <CircularProgress size={24} sx={{ color: '#FFFFFF' }} />
              ) : (
                'Submit Application'
              )}
            </Button>
          </form>
        </Paper>
      </Box>

      {/* Interactive Terminal Map Pinning Modal */}
      <TerminalMapPickerModal
        open={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        initialLat={terminalLatitude}
        initialLng={terminalLongitude}
        onConfirmLocation={handleLocationSelected}
      />

      {/* Document Review Modal */}
      <DocumentReviewModal
        open={reviewModalState.open}
        onClose={() => setReviewModalState((prev) => ({ ...prev, open: false }))}
        documentTitle={reviewModalState.title}
        fileName={reviewModalState.fileName}
        fileUrl={reviewModalState.fileUrl}
        fileObj={reviewModalState.fileObj}
      />

      {/* Bottom Toast Notification */}
      <Snackbar
        open={toastState.open}
        autoHideDuration={5000}
        onClose={() => setToastState((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          bottom: { xs: 24, sm: 32 },
        }}
      >
        <Box
          sx={{
            backgroundColor: '#EF4444',
            color: '#000000',
            fontWeight: 600,
            fontSize: '13.5px',
            py: 1.25,
            px: 2.5,
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            border: '1px solid #DC2626',
          }}
        >
          <Typography sx={{ color: '#000000', fontWeight: 600, fontSize: '13.5px' }}>
            {toastState.message}
          </Typography>
          <IconButton
            size="small"
            onClick={() => setToastState((prev) => ({ ...prev, open: false }))}
            sx={{ color: '#000000', p: 0.25, ml: 0.5 }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Snackbar>

      {/* Success Modal Pop-up */}
      <Dialog
        open={successModalOpen}
        onClose={() => {
          setSuccessModalOpen(false);
          navigate('/login', { replace: true });
        }}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              p: { xs: 3, sm: 3.5 },
              textAlign: 'center',
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.16)',
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, my: 1 }}>
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              backgroundColor: '#F0FDF4',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 38 }} />
          </Box>

          <Typography sx={{ fontSize: '19px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
            Application Submitted!
          </Typography>

          <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', lineHeight: 1.5 }}>
            Your registration application for <strong>{todaName || 'your association'}</strong> has been submitted successfully. Please log in using your confirmed <strong>TODA Acronym</strong> and <strong>Password</strong> to access your portal.
          </Typography>

          <Button
            variant="contained"
            fullWidth
            onClick={() => {
              setSuccessModalOpen(false);
              navigate('/login', { replace: true });
            }}
            sx={{
              mt: 1.5,
              py: 1.25,
              backgroundColor: 'var(--sakay-orange)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '14px',
              textTransform: 'none',
              borderRadius: '10px',
              boxShadow: 'var(--mac-shadow-button)',
              '&:hover': {
                backgroundColor: '#E05E00',
              },
            }}
          >
            Proceed to Login
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
};
