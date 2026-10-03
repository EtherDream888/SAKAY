import React, { useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Rating,
  Button,
  Chip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  Select,
  MenuItem,
  IconButton,
  Badge,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import PersonIcon from '@mui/icons-material/Person';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import ShieldIcon from '@mui/icons-material/Shield';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export type FaultyDocumentType = 'license' | 'mtop' | 'tricycle' | 'selfie';

export interface ReturnIssueItem {
  id: string;
  documentType: FaultyDocumentType;
  grounds: string;
  notes: string;
}

const DOCUMENT_TYPE_OPTIONS: { value: FaultyDocumentType; label: string; desc: string }[] = [
  { value: 'license', label: "Driver's License (Lisensya)", desc: 'Harap at likod ng lisensya' },
  { value: 'mtop', label: 'MTOP / Franchise Document', desc: 'Permit at prangkisa mula sa LGU/TODA' },
  { value: 'tricycle', label: 'Photo of Tricycle Unit', desc: 'Larawan ng buong tricycle at body number' },
  { value: 'selfie', label: 'Driver Photo / Selfie', desc: 'Malinaw na larawan ng mukha' },
];

const GROUNDS_BY_DOC_TYPE: Record<FaultyDocumentType, string[]> = {
  license: [
    'Illegible / Blurry Scans (Malabo o hindi mabasa)',
    'Documentary Issue (Kulang o may depekto)',
    'Expired License (Paso na ang lisensya)',
    'Data Mismatch (TODA Roster vs License)',
    'Cut-off / Incomplete Edges',
    'Iba pa / Other Grounds',
  ],
  mtop: [
    'Illegible / Blurry Document (Hindi mabasa ang prangkisa)',
    'Expired MTOP / Franchise',
    'Franchise Number / Plate Mismatch',
    'Missing Operator / Signature Details',
    'Iba pa / Other Grounds',
  ],
  tricycle: [
    'Unclear Tricycle Unit Photo (Malabo ang kuha ng tricycle)',
    'Body Number / Sidecar Plate Not Visible',
    'Wrong Color Scheme / Toda Decal Missing',
    'Unit Does Not Match Registered Specs',
    'Iba pa / Other Grounds',
  ],
  selfie: [
    'Face Not Clear / Lighting Issue (Madilim o malabo)',
    'Face Cut-off / Not Centered',
    'Face Does Not Match ID Photo',
    'Wearing Sunglasses / Face Obstructed',
    'Iba pa / Other Grounds',
  ],
};

const DEFAULT_NOTES_BY_DOC_TYPE: Record<FaultyDocumentType, string> = {
  license: 'Clearer license scan required',
  mtop: 'Please provide a clear copy showing the franchise number and validity date',
  tricycle: 'Tricycle unit photo must clearly show the sidecar body number',
  selfie: 'Please take selfie in a well-lit area without sunglasses or cap',
};

export function getDocumentType(doc: {
  docType?: FaultyDocumentType | string;
  name?: string;
  type?: string;
  id?: string;
}): FaultyDocumentType {
  if (doc.docType && (['license', 'mtop', 'tricycle', 'selfie'] as string[]).includes(doc.docType)) {
    return doc.docType as FaultyDocumentType;
  }
  const idLower = (doc.id || '').toLowerCase();
  if (idLower.includes('license')) return 'license';
  if (idLower.includes('mtop')) return 'mtop';
  if (idLower.includes('tricycle')) return 'tricycle';
  if (idLower.includes('selfie')) return 'selfie';

  const nameLower = (doc.name || '').toLowerCase();
  const typeLower = (doc.type || '').toLowerCase();
  const combined = `${nameLower} ${typeLower}`;

  if (combined.includes('license') || combined.includes('lisensya') || combined.includes('identification')) {
    return 'license';
  }
  if (combined.includes('mtop') || combined.includes('franchise') || combined.includes('prangkisa') || combined.includes('permit')) {
    return 'mtop';
  }
  if (combined.includes('tricycle') || combined.includes('trike') || combined.includes('unit') || combined.includes('vehicle')) {
    return 'tricycle';
  }
  if (combined.includes('selfie') || combined.includes('face') || combined.includes('biometric') || combined.includes('mukha')) {
    return 'selfie';
  }
  return 'license';
}

import { DriverRecord } from '../../mockData/adminData';
import { MacCenterModal } from './MacCenterModal';
import { MacConfirmDialog } from './MacConfirmDialog';
import { StatusBadge } from '../common/StatusBadge';
import { ActionButton } from './ActionButton';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import {
  verifyDriver,
  rejectDriver,
  returnDriverForCorrection,
  suspendDriver,
  reactivateDriver,
  issueDriverStrike,
  recordAdminAuditAction,
  verifyDriverRenewal,
  updateDriverDocumentReview,
} from '../../services/adminApiService';

interface DriverDetailModalProps {
  open: boolean;
  onClose: () => void;
  driver: DriverRecord | null;
  onStatusChange?: (driverId: string, newStatus: 'Active' | 'Inactive') => void;
  onDriverUpdated?: (updatedDriver: DriverRecord) => void;
}

export const DriverDetailModal: React.FC<DriverDetailModalProps> = ({
  open,
  onClose,
  driver,
  onStatusChange,
  onDriverUpdated,
}) => {
  const [docList, setDocList] = useState(driver?.documents || []);
  const [selectedDoc, setSelectedDoc] = useState<{ doc: DriverRecord['documents'][number]; index: number } | null>(null);
  const [reminderSent, setReminderSent] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);

  // Dialog states
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [returnSummaryDialogOpen, setReturnSummaryDialogOpen] = useState(false);
  const [configureDocIssue, setConfigureDocIssue] = useState<{
    docType: FaultyDocumentType;
    docName: string;
    grounds: string;
    notes: string;
  } | null>(null);
  const [returnIssues, setReturnIssues] = useState<ReturnIssueItem[]>([]);
  const [noDocForReturnDialogOpen, setNoDocForReturnDialogOpen] = useState<boolean>(false);
  const [unsubmittedExitDialogOpen, setUnsubmittedExitDialogOpen] = useState<boolean>(false);
  const prevModalDriverIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (driver && open) {
      const isNewModalSession = prevModalDriverIdRef.current !== driver.id;
      if (!isNewModalSession) return;
      prevModalDriverIdRef.current = driver.id;

      let initialIssues: ReturnIssueItem[] = [];
      let faultyList: FaultyDocumentType[] = [];
      let verifiedList: FaultyDocumentType[] = [];

      if (driver.rejectionComment && driver.rejectionComment.startsWith('{')) {
        try {
          const parsed = JSON.parse(driver.rejectionComment);
          if (Array.isArray(parsed.issues) && parsed.issues.length > 0) {
            initialIssues = parsed.issues.map((i: any) => ({
              id: i.id || i.documentType,
              documentType: i.documentType as FaultyDocumentType,
              grounds: i.grounds || GROUNDS_BY_DOC_TYPE[i.documentType as FaultyDocumentType]?.[0] || 'Documentary Issue',
              notes: i.notes || DEFAULT_NOTES_BY_DOC_TYPE[i.documentType as FaultyDocumentType] || 'Resubmission required',
            }));
            faultyList = parsed.issues.map((i: any) => i.documentType as FaultyDocumentType);
          } else if (Array.isArray(parsed.faultyDocuments)) {
            faultyList = parsed.faultyDocuments as FaultyDocumentType[];
            initialIssues = parsed.faultyDocuments.map((docKey: string, idx: number) => ({
              id: String(idx + 1),
              documentType: docKey as FaultyDocumentType,
              grounds: parsed.displayReason || GROUNDS_BY_DOC_TYPE[docKey as FaultyDocumentType]?.[0] || 'Documentary Issue',
              notes: parsed.displayNotes || DEFAULT_NOTES_BY_DOC_TYPE[docKey as FaultyDocumentType] || 'Resubmission required',
            }));
          }
          if (Array.isArray(parsed.verifiedDocuments)) {
            verifiedList = parsed.verifiedDocuments as FaultyDocumentType[];
          }
        } catch {}
      }


      const rawDocs = driver.documents || [];
      const isResub = Boolean(driver.isResubmitted);
      const isFullyApproved = driver.verificationStatus === 'Verified' || driver.lguVerificationStatus === 'Verified';

      const normalizedDocs = rawDocs.map((d) => {
        const dType = getDocumentType(d);
        let status = d.status;
        if (isFullyApproved) {
          status = 'Verified';
        } else if (verifiedList.includes(dType) || d.status === 'Verified') {
          status = 'Verified';
        } else if (isResub && faultyList.includes(dType)) {
          // Document was flagged in past rejection and has now been resubmitted
          status = 'Resubmitted (Awaiting Review)';
        } else if (faultyList.includes(dType) && !isResub) {
          status = 'Resubmission Required';
        }
        return {
          ...d,
          docType: dType,
          status,
        };
      });

      setDocList(normalizedDocs);

      // ONLY populate returnIssues if the driver is currently sitting in 'Resubmission Required' (unresubmitted).
      // If the driver has resubmitted (or is newly endorsed/pending), start fresh with [] so previously approved documents (like MTOP) NEVER reappear!
      if (!isResub && driver.verificationStatus === 'Resubmission Required') {
        setReturnIssues(initialIssues);
      } else {
        setReturnIssues([]);
      }
    } else if (!open) {
      prevModalDriverIdRef.current = null;
    }
  }, [driver, open]);

  const handleApproveDocument = async (index: number) => {
    if (!driver || index < 0 || index >= docList.length) return;
    const targetDoc = docList[index];
    const docType = getDocumentType(targetDoc);
    const updated = [...docList];
    updated[index] = { ...targetDoc, docType, status: 'Verified' };
    setDocList(updated);

    const newReturnIssues = returnIssues.filter((i) => i.documentType !== docType);
    setReturnIssues(newReturnIssues);
    setSelectedDoc(null);
    setSnackbarMsg(`"${targetDoc.name}" has been inspected and marked as Verified.`);

    const currentVerified = updated
      .filter((d) => d.status === 'Verified')
      .map((d) => getDocumentType(d));


    const updatedDriver: DriverRecord = {
      ...driver,
      documents: updated,
    };
    if (onDriverUpdated) onDriverUpdated(updatedDriver);

    try {
      await updateDriverDocumentReview(driver.id, currentVerified);
    } catch (err) {
      console.warn('[DriverDetailModal] Error updating doc approval in backend:', err);
    }
  };

  const handleStartResubmitForDoc = (doc: DriverRecord['documents'][number]) => {
    const docType: FaultyDocumentType = getDocumentType(doc);
    const existing = returnIssues.find((i) => i.documentType === docType);
    setConfigureDocIssue({
      docType,
      docName: doc.name,
      grounds: existing?.grounds || GROUNDS_BY_DOC_TYPE[docType][0],
      notes: existing?.notes || DEFAULT_NOTES_BY_DOC_TYPE[docType] || '',
    });
    setSelectedDoc(null);
  };

  const handleSaveDocIssue = async () => {
    if (!driver || !configureDocIssue) return;
    const { docType, grounds, notes } = configureDocIssue;

    const updatedDocs = docList.map((d) =>
      getDocumentType(d) === docType
        ? { ...d, docType, status: 'Resubmission Required' as const }
        : d
    );
    setDocList(updatedDocs);

    const newReturnIssues = [
      ...returnIssues.filter((i) => i.documentType !== docType),
      {
        id: docType,
        documentType: docType,
        grounds,
        notes,
      },
    ];
    setReturnIssues(newReturnIssues);

    const currentVerified = updatedDocs
      .filter((d) => d.status === 'Verified')
      .map((d) => getDocumentType(d));


    const updatedDriver: DriverRecord = {
      ...driver,
      documents: updatedDocs,
    };
    if (onDriverUpdated) onDriverUpdated(updatedDriver);

    try {
      await updateDriverDocumentReview(driver.id, currentVerified);
    } catch (err) {
      console.warn('[DriverDetailModal] Error updating doc issue in backend:', err);
    }

    setSnackbarMsg(`"${configureDocIssue.docName}" marked as Resubmission Required.`);
    setConfigureDocIssue(null);
  };

  const handleEditIssueFromSummary = (issue: ReturnIssueItem) => {
    const doc = docList.find((d) => getDocumentType(d) === issue.documentType);
    setConfigureDocIssue({
      docType: issue.documentType,
      docName: doc?.name || DOCUMENT_TYPE_OPTIONS.find((o) => o.value === issue.documentType)?.label || issue.documentType,
      grounds: issue.grounds,
      notes: issue.notes,
    });
  };
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [strikeDialogOpen, setStrikeDialogOpen] = useState(false);
  const [renewalApproveDialogOpen, setRenewalApproveDialogOpen] = useState(false);
  const [renewalRejectDialogOpen, setRenewalRejectDialogOpen] = useState(false);

  if (!driver) return null;

  const isAccountActive = driver.accountStatus === 'Active';
  const isVerified = driver.verificationStatus === 'Verified';

  /**
   * Action Handler: Approve Stage 2 LGU Verification
   */
  const handleVerifyConfirm = async () => {
    try {
      await verifyDriver(driver.id);
      setSnackbarMsg(`Driver ${driver.name} successfully verified and accredited.`);
      const updated: DriverRecord = {
        ...driver,
        verificationStatus: 'Verified',
        lguVerificationStatus: 'Verified',
        accountStatus: 'Active',
      };
      if (onDriverUpdated) onDriverUpdated(updated);
      if (onStatusChange) onStatusChange(driver.id, 'Active');
    } catch (err) {
      console.error('[DriverDetailModal] Verification error:', err);
      setSnackbarMsg(`Error: ${(err as Error).message}`);
    }
    setVerifyDialogOpen(false);
  };

  /**
   * Action Handler: Reject Driver Application
   */
  const handleRejectConfirm = async (reason?: string) => {
    const finalReason = reason || 'Non-compliance with LGU franchise documentary guidelines.';
    try {
      await rejectDriver(driver.id, finalReason);
      setSnackbarMsg(`Driver application for ${driver.name} has been rejected.`);
      const updated: DriverRecord = {
        ...driver,
        accountStatus: 'Inactive',
        verificationStatus: 'Rejected',
        lguVerificationStatus: 'Rejected',
      };
      if (onDriverUpdated) onDriverUpdated(updated);
      if (onStatusChange) onStatusChange(driver.id, 'Inactive');
    } catch (err) {
      console.error('[DriverDetailModal] Rejection error:', err);
      setSnackbarMsg(`Error: ${(err as Error).message}`);
    }
    setRejectDialogOpen(false);
  };

  /**
   * Action Handler: Return Driver Application for Resubmission (Rule 3.8)
   */
  const handleReturnConfirm = async () => {
    try {
      const summaryReason = returnIssues
        .map((i) => {
          const docLabel = DOCUMENT_TYPE_OPTIONS.find((d) => d.value === i.documentType)?.label || i.documentType;
          return `${docLabel}: ${i.grounds}`;
        })
        .join('; ');

      const summaryNotes = returnIssues
        .map((i) => {
          const docLabel = DOCUMENT_TYPE_OPTIONS.find((d) => d.value === i.documentType)?.label || i.documentType;
          return `${docLabel}: ${i.notes}`;
        })
        .join('; ');

      const ORDERED_TYPES: FaultyDocumentType[] = ['license', 'mtop', 'tricycle', 'selfie'];
      const faultyDocuments = ORDERED_TYPES.filter((t) => returnIssues.some((i) => i.documentType === t));

      const currentVerified = docList
        .filter((d) => d.status === 'Verified' && !faultyDocuments.includes(getDocumentType(d)))
        .map((d) => getDocumentType(d));

      const structuredPayload = {
        faultyDocuments,
        verifiedDocuments: currentVerified,
        issues: returnIssues.map((i) => ({
          documentType: i.documentType,
          grounds: i.grounds,
          notes: i.notes,
        })),
        displayReason: summaryReason,
        displayNotes: summaryNotes,
        returnedAt: new Date().toISOString(),
      };
      const finalCommentJson = JSON.stringify(structuredPayload);

      await returnDriverForCorrection(
        driver.id,
        summaryReason,
        summaryNotes,
        returnIssues.map((i) => ({
          documentType: i.documentType,
          grounds: i.grounds,
          notes: i.notes,
        })),
        currentVerified
      );

      const updatedDocuments = docList.map((d) => {
        const dType = getDocumentType(d);
        if (faultyDocuments.includes(dType)) {
          return { ...d, docType: dType, status: 'Resubmission Required' as const };
        }
        return { ...d, docType: dType };
      });

      setDocList(updatedDocuments);
      setSnackbarMsg(`Driver application for ${driver.name} returned for resubmission.`);
      const updated: DriverRecord = {
        ...driver,
        accountStatus: 'Inactive',
        verificationStatus: 'Resubmission Required',
        lguVerificationStatus: 'Resubmission Required',
        documents: updatedDocuments,
        rejectionReason: summaryReason,
        rejectionComment: finalCommentJson,
        isResubmitted: false,
      };
      if (onDriverUpdated) onDriverUpdated(updated);
      if (onStatusChange) onStatusChange(driver.id, 'Inactive');
    } catch (err) {
      console.error('[DriverDetailModal] Return error:', err);
      setSnackbarMsg(`Error: ${(err as Error).message}`);
    }
    setReturnIssues([]);
    setReturnSummaryDialogOpen(false);
  };

  /**
   * Action Handler: Suspend Driver Account
   */
  const handleSuspendConfirm = async (reason?: string) => {
    const finalReason = reason || 'Administrative policy suspension';
    try {
      await suspendDriver(driver.id, finalReason, 7);
      setSnackbarMsg(`Driver ${driver.name} has been suspended.`);
      const updated: DriverRecord = {
        ...driver,
        accountStatus: 'Inactive',
        verificationStatus: 'Suspended',
      };
      if (onDriverUpdated) onDriverUpdated(updated);
      if (onStatusChange) onStatusChange(driver.id, 'Inactive');
    } catch (err) {
      console.error('[DriverDetailModal] Suspension error:', err);
      setSnackbarMsg(`Error: ${(err as Error).message}`);
    }
    setSuspendDialogOpen(false);
  };

  /**
   * Action Handler: Reactivate Driver Account
   */
  const handleReactivateConfirm = async () => {
    try {
      await reactivateDriver(driver.id);
      setSnackbarMsg(`Driver ${driver.name} account has been reactivated.`);
      const updated: DriverRecord = {
        ...driver,
        accountStatus: 'Active',
        verificationStatus: 'Verified',
      };
      if (onDriverUpdated) onDriverUpdated(updated);
      if (onStatusChange) onStatusChange(driver.id, 'Active');
    } catch (err) {
      console.error('[DriverDetailModal] Reactivation error:', err);
      setSnackbarMsg(`Error: ${(err as Error).message}`);
    }
    setReactivateDialogOpen(false);
  };

  /**
   * Action Handler: Issue Policy Strike
   */
  const handleStrikeConfirm = async (reason?: string) => {
    const finalReason = reason || 'Operational non-compliance violation';
    try {
      await issueDriverStrike(driver.id, finalReason, 'Operational');
      setSnackbarMsg(`Administrative policy strike issued to ${driver.name}.`);
      const newStrikesCount = driver.strikesCount + 1;
      const updated: DriverRecord = {
        ...driver,
        strikesCount: newStrikesCount,
        accountStatus: newStrikesCount >= 3 ? 'Inactive' : driver.accountStatus,
        verificationStatus: newStrikesCount >= 3 ? 'Suspended' : driver.verificationStatus,
      };
      if (onDriverUpdated) onDriverUpdated(updated);
    } catch (err) {
      console.error('[DriverDetailModal] Strike error:', err);
      setSnackbarMsg(`Error: ${(err as Error).message}`);
    }
    setStrikeDialogOpen(false);
  };

  /**
   * Action Handler: Send Renewal Reminder Alert
   */
  const handleSendReminder = () => {
    setReminderSent(true);
    recordAdminAuditAction({
      actionType: 'DRIVER_PERMIT_REMINDER_SENT',
      targetId: driver.id,
      targetName: driver.name,
      details: `Dispatched MTOP and License renewal alert to driver mobile (${driver.phone}).`,
      category: 'Verification',
    });
    setSnackbarMsg(`Renewal alert sent to ${driver.name}.`);
    setTimeout(() => setReminderSent(false), 3000);
  };

  /**
   * Action Handler: Approve Driver Document Renewal (Rule 24.2)
   */
  const handleRenewalApproveConfirm = async () => {
    try {
      await verifyDriverRenewal(driver.id, true);
      setSnackbarMsg(`Driver ${driver.name} document renewal approved.`);
      const updated: DriverRecord = {
        ...driver,
        renewalStatus: 'Approved',
        licenseExpiry: driver.pendingLicenseExpiry || driver.licenseExpiry,
        mtopExpiry: driver.pendingMtopExpiry || driver.mtopExpiry,
        pendingLicenseExpiry: undefined,
        pendingMtopExpiry: undefined,
      };
      if (onDriverUpdated) onDriverUpdated(updated);
    } catch (err) {
      console.error('[DriverDetailModal] Renewal approval error:', err);
      setSnackbarMsg(`Error: ${(err as Error).message}`);
    }
    setRenewalApproveDialogOpen(false);
  };

  /**
   * Action Handler: Reject Driver Document Renewal (Rule 24.2)
   */
  const handleRenewalRejectConfirm = async (reason?: string) => {
    const finalReason = reason || 'Non-compliant renewed documents.';
    try {
      await verifyDriverRenewal(driver.id, false, finalReason);
      setSnackbarMsg(`Driver ${driver.name} document renewal rejected.`);
      const updated: DriverRecord = {
        ...driver,
        renewalStatus: 'Rejected',
        pendingLicenseExpiry: undefined,
        pendingMtopExpiry: undefined,
      };
      if (onDriverUpdated) onDriverUpdated(updated);
    } catch (err) {
      console.error('[DriverDetailModal] Renewal rejection error:', err);
      setSnackbarMsg(`Error: ${(err as Error).message}`);
    }
    setRenewalRejectDialogOpen(false);
  };

  // Strike level calculation
  const getStrikeLevel = (count: number) => {
    if (count === 0) return { label: 'Compliant (0 Strikes)', color: '#1E8E3E', bg: '#E6F4EA', border: '#A8DADC' };
    if (count === 1) return { label: 'Level 1 Warning (1 Strike)', color: '#B06000', bg: '#FEF7E0', border: '#FCE8E6' };
    if (count === 2) return { label: 'Level 2 Warning (2 Strikes)', color: '#C2410C', bg: '#FFF7ED', border: '#FDBA74' };
    return { label: `Suspended (${count} Strikes)`, color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' };
  };

  const strikeLevel = getStrikeLevel(driver.strikesCount);

  const pendingReturnCount = returnIssues.length;
  const hasResubmissionIssues = pendingReturnCount > 0 || docList.some((d) => d.status === 'Resubmission Required');
  const allDocumentsVerified = docList.length > 0 && docList.every((d) => d.status === 'Verified');

  const handleRequestClose = () => {
    if (pendingReturnCount > 0) {
      setUnsubmittedExitDialogOpen(true);
    } else {
      onClose();
    }
  };

  const handleReturnForResubmissionClick = () => {
    if (pendingReturnCount === 0) {
      setNoDocForReturnDialogOpen(true);
    } else {
      setReturnSummaryDialogOpen(true);
    }
  };

  let primaryActionLabel = '';
  let primaryActionColor: 'primary' | 'warning' | 'error' = 'primary';
  let primaryActionDisabled = false;
  let onPrimaryAction: () => void = () => {};

  if (!isVerified) {
    primaryActionLabel = 'Approve Stage 2 Verification';
    primaryActionColor = 'primary';
    primaryActionDisabled = !allDocumentsVerified || pendingReturnCount > 0;
    onPrimaryAction = () => setVerifyDialogOpen(true);
  } else {
    primaryActionLabel = isAccountActive ? 'Suspend Driver' : 'Reactivate Driver';
    primaryActionColor = isAccountActive ? 'error' : 'primary';
    onPrimaryAction = isAccountActive ? () => setSuspendDialogOpen(true) : () => setReactivateDialogOpen(true);
  }

  return (
    <>
      <MacCenterModal
        open={open}
        onClose={handleRequestClose}
        title={driver.name}
        subtitle={`License No: ${driver.licenseNo} • ${driver.todaName}`}
        badge={<StatusBadge status={(driver.verificationStatus && driver.verificationStatus !== 'Verified' ? driver.verificationStatus : driver.accountStatus) as any} />}
        maxWidth={840}
        primaryActionLabel={primaryActionLabel}
        primaryActionColor={primaryActionColor}
        primaryActionDisabled={primaryActionDisabled}
        onPrimaryAction={onPrimaryAction}
        secondaryActionLabel={!isVerified ? 'Reject Application' : 'Close'}
        secondaryActionColor={!isVerified ? 'error' : 'inherit'}
        onSecondaryAction={!isVerified ? () => setRejectDialogOpen(true) : handleRequestClose}
        extraActions={
          !isVerified ? (
            <Badge
              badgeContent={pendingReturnCount}
              color="error"
              invisible={pendingReturnCount === 0}
              sx={{
                '& .MuiBadge-badge': {
                  right: 4,
                  top: 4,
                  fontWeight: 700,
                  fontSize: '11px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  boxShadow: '0 0 0 2px #FFFFFF',
                },
              }}
            >
              <Button
                variant={pendingReturnCount > 0 ? 'contained' : 'outlined'}
                onClick={handleReturnForResubmissionClick}
                sx={{
                  height: 40,
                  padding: '0 20px',
                  borderRadius: '8px',
                  fontSize: '11.6px',
                  fontWeight: 700,
                  textTransform: 'none',
                  ...(pendingReturnCount > 0
                    ? {
                        backgroundColor: '#D97706',
                        color: '#FFFFFF',
                        border: '1.5px solid #D97706',
                        '&:hover': { backgroundColor: '#B45309', borderColor: '#B45309' },
                      }
                    : {
                        backgroundColor: '#FFFFFF',
                        color: '#475569',
                        border: '1.5px solid #CBD5E1',
                        '&:hover': { backgroundColor: '#F8FAFC', borderColor: '#94A3B8', color: '#1E293B' },
                      }),
                }}
              >
                Return for Resubmission
              </Button>
            </Badge>
          ) : undefined
        }
      >
        {/* Resubmission Required Alert Banner */}
        {driver.verificationStatus === 'Resubmission Required' && (() => {
          let displayReason = driver.rejectionReason || 'Documentary Issue';
          let displayNotes = driver.rejectionComment || 'Clearer license scan required';
          let faultyList: string[] = [];

          if (driver.rejectionComment && driver.rejectionComment.startsWith('{')) {
            try {
              const parsed = JSON.parse(driver.rejectionComment);
              if (parsed.displayReason) displayReason = parsed.displayReason;
              if (parsed.displayNotes) displayNotes = parsed.displayNotes;
              if (Array.isArray(parsed.faultyDocuments)) {
                faultyList = parsed.faultyDocuments;
              } else if (Array.isArray(parsed.issues)) {
                faultyList = parsed.issues.map((i: any) => i.documentType);
              }
            } catch {}
          }

          const docLabels: Record<string, string> = {
            license: "Driver's License",
            mtop: 'MTOP / Franchise',
            tricycle: 'Photo ng Tricycle',
            selfie: 'Photo / Selfie',
          };

          return (
            <Box
              sx={{
                backgroundColor: '#FFFBEB',
                border: '1.5px solid #F59E0B',
                borderRadius: '12px',
                p: '16px 20px',
                mb: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <Chip
                    label="Resubmission Required"
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      color: '#B45309',
                      fontWeight: 700,
                      fontSize: '11px',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                    }}
                  />
                  <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#92400E' }}>
                    Application Returned for Resubmission
                  </Typography>
                </Box>
              </Box>

              {faultyList.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#78350F' }}>
                    Faulty Document(s):
                  </Typography>
                  {faultyList.map((docKey) => (
                    <Chip
                      key={docKey}
                      label={docLabels[docKey] || docKey}
                      size="small"
                      sx={{
                        backgroundColor: '#FEF3C7',
                        color: '#92400E',
                        fontWeight: 600,
                        fontSize: '11px',
                        border: '1px solid #FDE68A',
                      }}
                    />
                  ))}
                </Box>
              )}

              <Typography sx={{ fontSize: '12.5px', color: '#78350F', mt: 0.5, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700 }}>Grounds:</span> {displayReason}
              </Typography>
              <Typography sx={{ fontSize: '12.5px', color: '#78350F', mt: 0.5, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700 }}>Reviewer Notes:</span> {displayNotes}
              </Typography>
            </Box>
          );
        })()}

        {/* Resubmission Received Alert Banner (Awaiting LGU Review) */}
        {(driver.isResubmitted || driver.verificationStatus === 'Resubmitted (Awaiting Review)') && !isVerified && driver.verificationStatus !== 'Resubmission Required' && (() => {
          let faultyList: string[] = [];
          if (driver.rejectionComment && driver.rejectionComment.startsWith('{')) {
            try {
              const parsed = JSON.parse(driver.rejectionComment);
              if (Array.isArray(parsed.faultyDocuments)) {
                faultyList = parsed.faultyDocuments;
              } else if (Array.isArray(parsed.issues)) {
                faultyList = parsed.issues.map((i: any) => i.documentType);
              }
            } catch {}
          }

          const docLabels: Record<string, string> = {
            license: "Driver's License",
            mtop: 'MTOP / Franchise',
            tricycle: 'Photo ng Tricycle',
            selfie: 'Photo / Selfie',
          };

          return (
            <Box
              sx={{
                backgroundColor: '#EFF6FF',
                border: '1.5px solid #3B82F6',
                borderRadius: '12px',
                p: '16px 20px',
                mb: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <Chip
                    label="Resubmission Received"
                    size="small"
                    sx={{
                      backgroundColor: '#DBEAFE',
                      color: '#1D4ED8',
                      fontWeight: 700,
                      fontSize: '11px',
                      border: '1px solid #93C5FD',
                    }}
                  />
                  <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#1E40AF' }}>
                    Updated Documents Awaiting LGU Re-inspection
                  </Typography>
                </Box>
                {driver.resubmittedAt && (
                  <Typography sx={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>
                    Resubmitted: {new Date(driver.resubmittedAt).toLocaleDateString()} {new Date(driver.resubmittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                )}
              </Box>

              {faultyList.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#1E3A8A' }}>
                    Corrected Document(s):
                  </Typography>
                  {faultyList.map((docKey) => (
                    <Chip
                      key={docKey}
                      label={docLabels[docKey] || docKey}
                      size="small"
                      sx={{
                        backgroundColor: '#BFDBFE',
                        color: '#1E40AF',
                        fontWeight: 600,
                        fontSize: '11px',
                        border: '1px solid #93C5FD',
                      }}
                    />
                  ))}
                </Box>
              )}

              <Typography sx={{ fontSize: '12.5px', color: '#1E3A8A', lineHeight: 1.5 }}>
                Driver <strong>{driver.name}</strong> has submitted corrected documents following the previous return. Please inspect the updated document(s) below to proceed with Stage 2 verification approval.
              </Typography>
            </Box>
          );
        })()}

        {/* Header Profile Summary Bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFAFC',
            padding: '18px 24px',
            borderRadius: '12px',
            border: '1px solid var(--mac-border-color)',
            mb: 4,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                backgroundColor: 'var(--sakay-orange)',
                color: '#FFFFFF',
                fontSize: '17.6px',
                fontWeight: 700,
                boxShadow: 'var(--mac-shadow-subtle)',
              }}
            >
              {driver.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: '15.3px', fontWeight: 700, color: 'var(--mac-text-primary)', lineHeight: 1.2 }}>
                {driver.name}
              </Typography>
              <Typography sx={{ fontSize: '12.8px', color: 'var(--mac-text-muted)', mt: '4px' }}>
                Affiliated with <span style={{ fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.todaName}</span>
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.8 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <Rating value={driver.rating} readOnly precision={0.1} size="small" emptyIcon={<StarIcon fontSize="inherit" />} />
              <Typography sx={{ fontSize: '13.6px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                {driver.rating} / 5
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: driver.onlineStatus === 'Online' ? '#34A853' : '#9AA0A6' }} />
              <Typography sx={{ fontSize: '12.4px', fontWeight: 600, color: driver.onlineStatus === 'Online' ? '#1E8E3E' : 'var(--mac-text-muted)' }}>
                Session: {driver.onlineStatus}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Section 1: Strike System & Policy Compliance */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <FlashOnIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
              <Typography sx={{ fontSize: '12.4px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Policy Strikes & Disciplinary Status
              </Typography>
            </Box>
            <Chip
              icon={<ShieldIcon style={{ fontSize: '11.3', color: strikeLevel.color }} />}
              label={strikeLevel.label}
              size="small"
              sx={{
                backgroundColor: strikeLevel.bg,
                color: strikeLevel.color,
                fontWeight: 700,
                fontSize: '13.6px',
                height: 26,
                border: `1px solid ${strikeLevel.border}`,
              }}
            />
          </Box>

          <Box sx={{ backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: '11.3px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                Active Strikes: <span style={{ color: driver.strikesCount > 0 ? '#DC2626' : '#1E8E3E', fontWeight: 700 }}>{driver.strikesCount} Strike(s)</span>
              </Typography>
              <ActionButton
                label="+ Issue Administrative Strike"
                showArrow={false}
                onClick={() => setStrikeDialogOpen(true)}
                sx={{ height: 32, fontSize: '12px' }}
              />
            </Box>
          </Box>
        </Box>

        {/* Section 2: Personal Information */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
            <PersonIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
            <Typography sx={{ fontSize: '12.4px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              1. Personal Details
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px' }}>
            <Box>
              <Typography sx={{ fontSize: '13.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>Full Name</Typography>
              <Typography sx={{ fontSize: '13.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.name}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '13.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>Contact Phone</Typography>
              <Typography sx={{ fontSize: '13.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.phone}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '13.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>Residential Barangay</Typography>
              <Typography sx={{ fontSize: '13.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.barangay}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '13.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>Account Status</Typography>
              <StatusBadge status={driver.accountStatus as any} />
            </Box>
          </Box>
        </Box>

        {/* Section 3: TODA Affiliation */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
            <AccountBalanceIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
            <Typography sx={{ fontSize: '12.4px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              2. TODA Affiliation & Endorsement
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px' }}>
            <Box>
              <Typography sx={{ fontSize: '13.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>Affiliated TODA</Typography>
              <Typography sx={{ fontSize: '13.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.todaName}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '13.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>TODA Stage 1 Endorsement</Typography>
              <StatusBadge status={driver.todaVerificationStatus as any} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '13.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>TODA Membership No.</Typography>
              <Typography sx={{ fontSize: '13.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                {driver.mtopNo ? `MEM-${driver.mtopNo}` : 'MEM-2026-01'}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '13.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>Assigned Corridor</Typography>
              <Typography sx={{ fontSize: '13.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.barangay}</Typography>
            </Box>
          </Box>
        </Box>

        {/* Section 4: Vehicle & License Credentials */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
            <DirectionsCarIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
            <Typography sx={{ fontSize: '12.4px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              3. Vehicle Credentials & MTOP Franchise (City Ord. No. 118)
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px' }}>
            <Box>
              <Typography sx={{ fontSize: '13.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>Professional Driver's License</Typography>
              <Typography sx={{ fontSize: '13.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.licenseNo}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '13.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>License Expiry</Typography>
              <Typography sx={{ fontSize: '13.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.licenseExpiry}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '13.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>MTOP Franchise No.</Typography>
              <Typography sx={{ fontSize: '13.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.mtopNo}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '13.6px', color: 'var(--mac-text-muted)', mb: '4px' }}>Tricycle Vehicle Plate</Typography>
              <Typography sx={{ fontSize: '13.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{driver.vehiclePlate}</Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFAFC', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--mac-border-color)' }}>
            <Typography sx={{ fontSize: '12.8px', color: 'var(--mac-text-secondary)' }}>
              Send License & Franchise renewal advisory to driver.
            </Typography>
            <ActionButton
              label={reminderSent ? 'Alert Sent ✓' : 'Send Renewal Alert'}
              showArrow={false}
              onClick={handleSendReminder}
              sx={{ height: 34, fontSize: '12.4px' }}
            />
          </Box>
        </Box>

        {/* Section 4B: Pending Document Renewal Review (Rule 24.2) */}
        {(driver.renewalStatus === 'Pending LGU Verification' || Boolean(driver.pendingLicenseExpiry || driver.pendingMtopExpiry)) && (
          <Box sx={{ mb: 4, backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '12px', padding: '20px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VerifiedUserIcon sx={{ color: '#D97706', fontSize: 20 }} />
                <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>
                  Pending Document Renewal Application (Rule 24.2)
                </Typography>
              </Box>
              <Chip label="Pending LGU Verification" size="small" sx={{ backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: 600, fontSize: '11px' }} />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2.5 }}>
              {driver.pendingLicenseExpiry && (
                <Box sx={{ backgroundColor: '#FFFFFF', p: 1.5, borderRadius: '8px', border: '1px solid #FDE68A' }}>
                  <Typography sx={{ fontSize: '11px', color: '#92400E', fontWeight: 600 }}>Proposed License Expiry</Typography>
                  <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#1F2937' }}>{driver.pendingLicenseExpiry}</Typography>
                  <Typography sx={{ fontSize: '11px', color: 'var(--mac-text-muted)' }}>Current: {driver.licenseExpiry}</Typography>
                </Box>
              )}
              {driver.pendingMtopExpiry && (
                <Box sx={{ backgroundColor: '#FFFFFF', p: 1.5, borderRadius: '8px', border: '1px solid #FDE68A' }}>
                  <Typography sx={{ fontSize: '11px', color: '#92400E', fontWeight: 600 }}>Proposed MTOP Expiry</Typography>
                  <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#1F2937' }}>{driver.pendingMtopExpiry}</Typography>
                  <Typography sx={{ fontSize: '11px', color: 'var(--mac-text-muted)' }}>Current: {driver.mtopExpiry}</Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => setRenewalRejectDialogOpen(true)}
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '12px' }}
              >
                Reject Renewal
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => setRenewalApproveDialogOpen(true)}
                sx={{ backgroundColor: '#D97706', '&:hover': { backgroundColor: '#B45309' }, textTransform: 'none', fontWeight: 600, fontSize: '12px' }}
              >
                Approve & Update Expiry
              </Button>
            </Box>
          </Box>
        )}

        {/* Section 5: Verification Credentials */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <VerifiedUserIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
              <Typography sx={{ fontSize: '12.4px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                4. Verification Documents ({docList.length})
              </Typography>
            </Box>
            {!isVerified && !allDocumentsVerified && !hasResubmissionIssues && (
              <Typography sx={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>
                * Inspect and verify all 4 documents to enable Stage 2 Approval
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {docList.map((doc, idx) => {
              const docType = getDocumentType(doc);
              const isStagedForReturn = returnIssues.some((i) => i.documentType === docType) || doc.status === 'Resubmission Required';
              const isDocVerified = !isStagedForReturn && doc.status === 'Verified';
              const isDocResubmit = isStagedForReturn;

              let wasFlagged = false;
              if (driver.rejectionComment && driver.rejectionComment.startsWith('{')) {
                try {
                  const p = JSON.parse(driver.rejectionComment);
                  const fList = p.faultyDocuments || (Array.isArray(p.issues) ? p.issues.map((i: any) => i.documentType) : []);
                  wasFlagged = fList.includes(docType);
                } catch {}
              }
              const isDocRecentlyResubmitted = !isStagedForReturn && !isDocVerified && (doc.status === 'Resubmitted (Awaiting Review)' || (Boolean(driver.isResubmitted) && wasFlagged));

              return (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: isDocVerified ? '#BBF7D0' : isDocResubmit ? '#FCD34D' : isDocRecentlyResubmitted ? '#93C5FD' : 'var(--mac-border-color)',
                    backgroundColor: isDocVerified ? '#F0FDF4' : isDocResubmit ? '#FFFBEB' : isDocRecentlyResubmitted ? '#EFF6FF' : '#FFFFFF',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {isDocVerified ? (
                      <CheckCircleIcon sx={{ color: '#16A34A', fontSize: 20 }} />
                    ) : isDocResubmit ? (
                      <AssignmentReturnIcon sx={{ color: '#D97706', fontSize: 20 }} />
                    ) : isDocRecentlyResubmitted ? (
                      <AssignmentReturnIcon sx={{ color: '#2563EB', fontSize: 20 }} />
                    ) : (
                      <VerifiedUserIcon sx={{ color: '#94A3B8', fontSize: 20 }} />
                    )}
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: '13.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                          {doc.name}
                        </Typography>
                        {isDocVerified && (
                          <Chip
                            label="Verified"
                            size="small"
                            sx={{ backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 700, fontSize: '10px', height: 20 }}
                          />
                        )}
                        {isDocResubmit && (
                          <Chip
                            label="Resubmission Required"
                            size="small"
                            sx={{ backgroundColor: '#FEF3C7', color: '#B45309', fontWeight: 700, fontSize: '10px', height: 20 }}
                          />
                        )}
                        {isDocRecentlyResubmitted && (
                          <Chip
                            label="Resubmitted (Awaiting Review)"
                            size="small"
                            sx={{ backgroundColor: '#DBEAFE', color: '#1D4ED8', fontWeight: 700, fontSize: '10px', height: 20, border: '1px solid #93C5FD' }}
                          />
                        )}
                        {!isDocVerified && !isDocResubmit && !isDocRecentlyResubmitted && (
                          <Chip
                            label="Pending Inspection"
                            size="small"
                            sx={{ backgroundColor: '#F1F5F9', color: '#64748B', fontWeight: 600, fontSize: '10px', height: 20 }}
                          />
                        )}
                      </Box>
                      <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: '3px' }}>
                        {doc.type}
                      </Typography>
                    </Box>
                  </Box>
                  <ActionButton
                    label="Inspect File"
                    showArrow={false}
                    onClick={() => setSelectedDoc({ doc, index: idx })}
                    sx={{ height: 34, fontSize: '12.4px' }}
                  />
                </Box>
              );
            })}
          </Box>
        </Box>
      </MacCenterModal>

      {/* Confirmation Dialogs */}
      <MacConfirmDialog
        open={verifyDialogOpen}
        onClose={() => setVerifyDialogOpen(false)}
        title="Approve Stage 2 Driver Verification?"
        message={`Authorize driver "${driver.name}" (${driver.todaName}) for official franchise operations in Calapan City.`}
        confirmLabel="Approve Driver"
        confirmVariant="orange"
        onConfirm={handleVerifyConfirm}
      />

      {/* Return for Resubmission Summary Dialog (Rule 3.8 Return Flow) */}
      <Dialog
        open={returnSummaryDialogOpen}
        onClose={() => setReturnSummaryDialogOpen(false)}
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(8px)',
            },
          },
          paper: {
            sx: {
              borderRadius: 'var(--mac-radius-lg)',
              maxWidth: 580,
              width: '100%',
              backgroundColor: '#FFFFFF',
              boxShadow: 'var(--mac-shadow-popover)',
              overflow: 'hidden',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            padding: '20px 24px 16px 24px',
            borderBottom: '1px solid var(--mac-border-color)',
            fontSize: '15px',
            fontWeight: 700,
            color: '#92400E',
            backgroundColor: '#FFFBEB',
            display: 'flex',
            alignItems: 'center',
            gap: 1.2,
          }}
        >
          <AssignmentReturnIcon sx={{ color: '#D97706', fontSize: 22 }} />
          Return Application for Resubmission
        </DialogTitle>

        <DialogContent sx={{ p: '24px !important', maxHeight: '65vh', overflowY: 'auto' }}>
          <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-secondary)', lineHeight: 1.5, mb: 2.5 }}>
            Review the flagged document issues below before returning the application for <strong>{driver.name}</strong> ({driver.todaName}) under <strong>Rule 3.8 Return Flow</strong>. The driver will only be required to correct and re-upload the flagged document(s).
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {returnIssues.map((issue, idx) => {
              const doc = docList.find((d) => getDocumentType(d) === issue.documentType);
              const docName = doc?.name || DOCUMENT_TYPE_OPTIONS.find((o) => o.value === issue.documentType)?.label || issue.documentType;

              return (
                <Box
                  key={issue.id || idx}
                  sx={{
                    p: 2,
                    borderRadius: '12px',
                    backgroundColor: '#FAFAFC',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
                    <Typography sx={{ fontSize: '12px', fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Faulty Document Issue #{idx + 1}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon sx={{ fontSize: 13 }} />}
                      onClick={() => handleEditIssueFromSummary(issue)}
                      sx={{
                        height: 28,
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'none',
                        borderColor: '#D97706',
                        color: '#B45309',
                        borderRadius: '6px',
                        backgroundColor: '#FFFBEB',
                        '&:hover': {
                          backgroundColor: '#FEF3C7',
                          borderColor: '#B45309',
                        },
                      }}
                    >
                      Edit
                    </Button>
                  </Box>

                  {/* Document Name - Locked text */}
                  <Box sx={{ mb: 1.2 }}>
                    <Typography sx={{ fontSize: '11px', fontWeight: 700, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      Document Name
                    </Typography>
                    <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--mac-text-primary)', mt: '2px' }}>
                      {docName}
                    </Typography>
                  </Box>

                  {/* Grounds */}
                  <Box sx={{ mb: 1.2 }}>
                    <Typography sx={{ fontSize: '11px', fontWeight: 700, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      Selected Grounds
                    </Typography>
                    <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-secondary)', mt: '2px' }}>
                      {issue.grounds}
                    </Typography>
                  </Box>

                  {/* Reviewer Notes */}
                  <Box>
                    <Typography sx={{ fontSize: '11px', fontWeight: 700, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      Reviewer Notes / Instructions
                    </Typography>
                    <Typography sx={{ fontSize: '13px', fontStyle: 'italic', color: '#334155', mt: '2px', backgroundColor: '#FFFFFF', p: '8px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      "{issue.notes}"
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </DialogContent>

        <DialogActions sx={{ padding: '16px 24px', borderTop: '1px solid var(--mac-border-color)', backgroundColor: '#FAFAFC', gap: 1.5 }}>
          <Button
            onClick={() => setReturnSummaryDialogOpen(false)}
            sx={{
              height: 38,
              padding: '0 18px',
              borderRadius: '9px',
              textTransform: 'none',
              fontSize: '12px',
              fontWeight: 600,
              color: '#334155',
              border: '1.5px solid #94A3B8',
              backgroundColor: '#FFFFFF',
              '&:hover': { backgroundColor: '#F1F5F9' },
            }}
          >
            Cancel
          </Button>

          <Button
            onClick={handleReturnConfirm}
            variant="contained"
            sx={{
              height: 38,
              padding: '0 20px',
              borderRadius: '9px',
              textTransform: 'none',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              boxShadow: 'var(--mac-shadow-subtle)',
              '&:hover': { backgroundColor: '#B45309' },
            }}
          >
            Confirm & Return Application ({returnIssues.length} {returnIssues.length === 1 ? 'Issue' : 'Issues'})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Configure Document Resubmission Dialog */}
      <Dialog
        open={Boolean(configureDocIssue)}
        onClose={() => setConfigureDocIssue(null)}
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(8px)',
            },
          },
          paper: {
            sx: {
              borderRadius: 'var(--mac-radius-lg)',
              maxWidth: 500,
              width: '100%',
              backgroundColor: '#FFFFFF',
              boxShadow: 'var(--mac-shadow-popover)',
              overflow: 'hidden',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            padding: '18px 24px 14px',
            borderBottom: '1px solid var(--mac-border-color)',
            fontSize: '14.5px',
            fontWeight: 700,
            color: '#92400E',
            backgroundColor: '#FFFBEB',
            display: 'flex',
            alignItems: 'center',
            gap: 1.2,
          }}
        >
          <AssignmentReturnIcon sx={{ color: '#D97706', fontSize: 20 }} />
          Configure Document Resubmission
        </DialogTitle>

        <DialogContent sx={{ p: '20px 24px !important' }}>
          {configureDocIssue && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Document Type - Locked / Non-editable */}
              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', mb: 0.5 }}>
                  Target Document (Locked)
                </Typography>
                <Box
                  sx={{
                    p: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#F8FAFC',
                    border: '1.5px solid #CBD5E1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    {configureDocIssue.docName}
                  </Typography>
                  <Chip label="Selected" size="small" sx={{ backgroundColor: '#FEF3C7', color: '#B45309', fontWeight: 700, fontSize: '10px' }} />
                </Box>
              </Box>

              {/* Grounds Dropdown */}
              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.6, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Select Grounds
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={configureDocIssue.grounds}
                    onChange={(e) =>
                      setConfigureDocIssue((prev) => (prev ? { ...prev, grounds: e.target.value } : null))
                    }
                    sx={{ borderRadius: '8px', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                  >
                    {(GROUNDS_BY_DOC_TYPE[configureDocIssue.docType] || []).map((ground) => (
                      <MenuItem key={ground} value={ground} sx={{ fontSize: '12.5px' }}>
                        {ground}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Reviewer Notes */}
              <Box>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.6, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Reviewer Notes / Instructions for Driver
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder={DEFAULT_NOTES_BY_DOC_TYPE[configureDocIssue.docType]}
                  value={configureDocIssue.notes}
                  onChange={(e) =>
                    setConfigureDocIssue((prev) => (prev ? { ...prev, notes: e.target.value } : null))
                  }
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '13px',
                      backgroundColor: '#FFFFFF',
                    },
                  }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ padding: '14px 24px', borderTop: '1px solid var(--mac-border-color)', backgroundColor: '#FAFAFC', gap: 1.5 }}>
          <Button
            onClick={() => setConfigureDocIssue(null)}
            sx={{
              height: 36,
              padding: '0 16px',
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '12px',
              fontWeight: 600,
              color: '#334155',
              border: '1.5px solid #94A3B8',
              backgroundColor: '#FFFFFF',
              '&:hover': { backgroundColor: '#F1F5F9' },
            }}
          >
            Cancel
          </Button>

          <Button
            onClick={handleSaveDocIssue}
            disabled={!configureDocIssue?.grounds || !configureDocIssue?.notes.trim()}
            variant="contained"
            sx={{
              height: 36,
              padding: '0 18px',
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              '&:hover': { backgroundColor: '#B45309' },
              '&.Mui-disabled': { backgroundColor: '#E5E5EA', color: '#8E8E93' },
            }}
          >
            Set for Resubmission
          </Button>
        </DialogActions>
      </Dialog>

      <MacConfirmDialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        title="Reject Driver Application?"
        message={`Disapprove Stage 2 LGU verification for "${driver.name}" (${driver.todaName}). Specify the reason for rejection or return for correction.`}
        confirmLabel="Reject Application"
        confirmVariant="danger"
        requireReason
        reasonPlaceholder="Specify rejection reasons (e.g. Expired Professional License, Invalid MTOP)..."
        onConfirm={handleRejectConfirm}
      />

      <MacConfirmDialog
        open={suspendDialogOpen}
        onClose={() => setSuspendDialogOpen(false)}
        title="Suspend Driver Account?"
        message={`Enact an administrative suspension on "${driver.name}". The driver will be barred from accepting booking dispatches.`}
        confirmLabel="Suspend Driver"
        confirmVariant="danger"
        requireReason
        reasonPlaceholder="Specify mandatory suspension reason..."
        onConfirm={handleSuspendConfirm}
      />

      <MacConfirmDialog
        open={reactivateDialogOpen}
        onClose={() => setReactivateDialogOpen(false)}
        title="Reactivate Driver Account?"
        message={`Reactivate "${driver.name}" to active status. The driver will immediately become eligible to receive ride bookings.`}
        confirmLabel="Reactivate Account"
        confirmVariant="orange"
        onConfirm={handleReactivateConfirm}
      />

      <MacConfirmDialog
        open={strikeDialogOpen}
        onClose={() => setStrikeDialogOpen(false)}
        title="Issue Administrative Policy Strike?"
        message={`Issue +1 policy violation strike to "${driver.name}". Note: 3 strikes trigger automated platform suspension.`}
        confirmLabel="Issue Strike"
        confirmVariant="danger"
        requireReason
        reasonPlaceholder="Specify violation details (e.g. Overcharging, Route Deviation)..."
        onConfirm={handleStrikeConfirm}
      />

      <MacConfirmDialog
        open={renewalApproveDialogOpen}
        onClose={() => setRenewalApproveDialogOpen(false)}
        title="Approve Driver Document Renewal?"
        message={`Approve and advance license/MTOP expiry credentials for "${driver.name}". Official records will update immediately.`}
        confirmLabel="Approve Renewal"
        confirmVariant="orange"
        onConfirm={handleRenewalApproveConfirm}
      />

      <MacConfirmDialog
        open={renewalRejectDialogOpen}
        onClose={() => setRenewalRejectDialogOpen(false)}
        title="Reject Document Renewal?"
        message={`Reject renewal application for "${driver.name}". The driver will be required to correct and re-upload valid documents.`}
        confirmLabel="Reject Renewal"
        confirmVariant="danger"
        requireReason
        reasonPlaceholder="Specify reason for renewal rejection (e.g. illegible photocopy, mismatched validity)..."
        onConfirm={handleRenewalRejectConfirm}
      />

      {/* Document Inspection Popover */}
      {selectedDoc && (() => {
        const docType = getDocumentType(selectedDoc.doc);
        const isStaged = returnIssues.some((i) => i.documentType === docType);
        const liveDoc = docList.find((d) => getDocumentType(d) === docType) || selectedDoc.doc;
        const currentStatus = isStaged ? 'Resubmission Required' : liveDoc.status;

        return (
          <DocumentPreviewModal
            open={Boolean(selectedDoc)}
            onClose={() => setSelectedDoc(null)}
            documentName={selectedDoc.doc.name}
            documentType={selectedDoc.doc.type}
            url={selectedDoc.doc.url}
            urls={selectedDoc.doc.urls}
            currentStatus={currentStatus}
            onApproveDocument={!isVerified ? () => handleApproveDocument(selectedDoc.index) : undefined}
            onRequestResubmit={!isVerified ? () => handleStartResubmitForDoc(liveDoc) : undefined}
          />
        );
      })()}

      {/* Pop-up Dialog: No documents selected for resubmission */}
      <Dialog
        open={noDocForReturnDialogOpen}
        onClose={() => setNoDocForReturnDialogOpen(false)}
        slotProps={{
          backdrop: { sx: { backgroundColor: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(8px)' } },
          paper: {
            sx: {
              borderRadius: 'var(--mac-radius-lg)',
              maxWidth: 440,
              width: '100%',
              backgroundColor: '#FFFFFF',
              boxShadow: 'var(--mac-shadow-popover)',
              overflow: 'hidden',
              p: 0,
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            padding: '18px 24px 14px',
            borderBottom: '1px solid var(--mac-border-color)',
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--mac-text-primary)',
            backgroundColor: '#FAFAFC',
            display: 'flex',
            alignItems: 'center',
            gap: 1.2,
          }}
        >
          <InfoOutlinedIcon sx={{ color: 'var(--sakay-orange)', fontSize: 22 }} />
          No Documents Selected for Resubmission
        </DialogTitle>
        <DialogContent sx={{ p: '20px 24px !important' }}>
          <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-secondary)', lineHeight: 1.5 }}>
            There are currently no documents requested for resubmission. Please inspect a file from the <strong>Verification Documents</strong> list above and select <strong>Request Resubmission</strong> if corrections are required.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ padding: '12px 24px 18px', borderTop: '1px solid var(--mac-border-color)', backgroundColor: '#FAFAFC' }}>
          <Button
            variant="contained"
            onClick={() => setNoDocForReturnDialogOpen(false)}
            sx={{
              height: 36,
              padding: '0 20px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'none',
              backgroundColor: 'var(--sakay-orange)',
              '&:hover': { backgroundColor: 'var(--sakay-orange-hover)' },
            }}
          >
            Understood
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pop-up Dialog: Unsubmitted Resubmissions Exit Confirmation */}
      <Dialog
        open={unsubmittedExitDialogOpen}
        onClose={() => setUnsubmittedExitDialogOpen(false)}
        slotProps={{
          backdrop: { sx: { backgroundColor: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(8px)' } },
          paper: {
            sx: {
              borderRadius: 'var(--mac-radius-lg)',
              maxWidth: 480,
              width: '100%',
              backgroundColor: '#FFFFFF',
              boxShadow: 'var(--mac-shadow-popover)',
              overflow: 'hidden',
              p: 0,
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            padding: '18px 24px 14px',
            borderBottom: '1px solid var(--mac-border-color)',
            fontSize: '15px',
            fontWeight: 700,
            color: '#92400E',
            backgroundColor: '#FFFBEB',
            display: 'flex',
            alignItems: 'center',
            gap: 1.2,
          }}
        >
          <WarningAmberIcon sx={{ color: '#D97706', fontSize: 22 }} />
          Unsubmitted Resubmission Requests
        </DialogTitle>
        <DialogContent sx={{ p: '20px 24px !important' }}>
          <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-primary)', lineHeight: 1.5, mb: 1 }}>
            You have marked <strong>{pendingReturnCount} document{pendingReturnCount === 1 ? '' : 's'}</strong> for resubmission.
          </Typography>
          <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-secondary)', lineHeight: 1.5 }}>
            Do you want to check and proceed with returning this application to the driver, or exit without returning?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ padding: '14px 24px 18px', borderTop: '1px solid var(--mac-border-color)', backgroundColor: '#FAFAFC', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setUnsubmittedExitDialogOpen(false);
              onClose();
            }}
            sx={{
              height: 38,
              padding: '0 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'none',
              borderColor: '#94A3B8',
              color: '#334155',
              '&:hover': { backgroundColor: '#F1F5F9' },
            }}
          >
            Exit
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setUnsubmittedExitDialogOpen(false);
              setReturnSummaryDialogOpen(true);
            }}
            sx={{
              height: 38,
              padding: '0 20px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'none',
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              '&:hover': { backgroundColor: '#B45309' },
            }}
          >
            Proceed with Return for Resubmission
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Alert */}
      <Snackbar
        open={Boolean(snackbarMsg)}
        autoHideDuration={4000}
        onClose={() => setSnackbarMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarMsg(null)} severity="info" sx={{ width: '100%' }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </>
  );
};
