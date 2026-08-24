import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Chip } from '@mui/material';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import PersonIcon from '@mui/icons-material/Person';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import RouteIcon from '@mui/icons-material/Route';
import DescriptionIcon from '@mui/icons-material/Description';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { IncidentReportRecord } from '../../mockData/adminData';
import { MacCenterModal } from './MacCenterModal';
import { StatusBadge } from '../common/StatusBadge';
import { ActionButton } from './ActionButton';
import { MacConfirmDialog } from './MacConfirmDialog';
import { DocumentPreviewModal } from './DocumentPreviewModal';

interface IncidentDetailModalProps {
  open: boolean;
  onClose: () => void;
  incident: IncidentReportRecord | null;
  onStatusUpdate?: (incidentId: string, newStatus: 'Under Investigation' | 'Resolved' | 'Dismissed', findings?: string) => void;
  onViewLinkedTrip?: (tripId: string) => void;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  open,
  onClose,
  incident,
  onStatusUpdate,
  onViewLinkedTrip,
}) => {
  const [findingsText, setFindingsText] = useState(incident?.findings || '');
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  // Dialog confirmation states
  const [investigateDialogOpen, setInvestigateDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);

  if (!incident) return null;

  const handleConfirmStatusChange = (targetStatus: 'Under Investigation' | 'Resolved' | 'Dismissed', reason?: string) => {
    const finalFindings = reason || findingsText;
    if (onStatusUpdate) {
      onStatusUpdate(incident.id, targetStatus, finalFindings);
    }
    setInvestigateDialogOpen(false);
    setResolveDialogOpen(false);
    setDismissDialogOpen(false);
  };

  return (
    <>
      <MacCenterModal
        open={open}
        onClose={onClose}
        title={`Incident #${incident.id}`}
        subtitle={`${incident.category} • Submitted ${incident.submittedDate}`}
        badge={<StatusBadge status={incident.status} />}
        maxWidth={820}
      >
        {/* Repeated Complaints Warning Banner */}
        {incident.relatedIncidentsCount >= 3 && (
          <Box
            sx={{
              mb: 4,
              backgroundColor: '#FFF7ED',
              border: '1px solid #FDBA74',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <WarningAmberIcon sx={{ color: '#EA580C', fontSize: 24, flexShrink: 0 }} />
            <Box>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: '#9A3412', mb: '2px' }}>
                Supervisory Review Warning: Driver Has {incident.relatedIncidentsCount} Related Complaints
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#C2410C' }}>
                Driver {incident.driverName} ({incident.todaName}) has accumulated 3 or more incident reports within the past 30 days.
              </Typography>
            </Box>
          </Box>
        )}

        {/* Section 1: Overview Header */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 2.5,
            backgroundColor: '#FAFAFC',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid var(--mac-border-color)',
            mb: 4,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Incident Category</Typography>
            <Typography sx={{ fontSize: '15px', fontWeight: 700, color: 'var(--sakay-orange)' }}>{incident.category}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Submitted Timestamp</Typography>
            <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{incident.submittedDate} • {incident.submittedTime}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Reported By</Typography>
            <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{incident.reportedBy} ({incident.reporterName})</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Current Status</Typography>
            <StatusBadge status={incident.status} />
          </Box>
        </Box>

        {/* Section 2: Full Written Description */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
            <DescriptionIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Full Written Description
            </Typography>
          </Box>

          <Box
            sx={{
              backgroundColor: '#F5F5F7',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--mac-border-color)',
            }}
          >
            <Typography sx={{ fontSize: '14.5px', color: 'var(--mac-text-primary)', lineHeight: 1.6 }}>
              "{incident.description}"
            </Typography>
          </Box>
        </Box>

        {/* Section 3: Supporting Evidence Attachments */}
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 2, letterSpacing: '0.3px' }}>
            Submitted Supporting Evidence ({incident.evidenceFiles.length})
          </Typography>

          {incident.evidenceFiles.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {incident.evidenceFiles.map((file, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: '10px',
                    border: '1px solid var(--mac-border-color)',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <DescriptionIcon sx={{ color: 'var(--sakay-orange)', fontSize: 24 }} />
                    <Box>
                      <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                        {file.name}
                      </Typography>
                      <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                        Attachment Format: {file.type.toUpperCase()}
                      </Typography>
                    </Box>
                  </Box>
                  <ActionButton label="View Evidence" showArrow={false} onClick={() => setSelectedDoc(file.name)} sx={{ height: 34, fontSize: '13px' }} />
                </Box>
              ))}
            </Box>
          ) : (
            <Box sx={{ padding: '16px 20px', backgroundColor: '#F5F5F7', borderRadius: '10px' }}>
              <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', fontStyle: 'italic' }}>
                No supporting photo or video evidence was attached to this incident report.
              </Typography>
            </Box>
          )}
        </Box>

        {/* Section 4: Linked Trip Card */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
            <RouteIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Linked Trip Details
            </Typography>
          </Box>

          <Box sx={{ backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography sx={{ fontSize: '15px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                Trip Ref: {incident.tripId} (Booking {incident.bookingId})
              </Typography>
              {onViewLinkedTrip && (
                <ActionButton
                  label="View Linked Trip"
                  onClick={() => onViewLinkedTrip(incident.tripId)}
                  sx={{ height: 32, fontSize: '12.5px' }}
                />
              )}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '3px' }}>Driver</Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{incident.driverName} ({incident.vehiclePlate})</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '3px' }}>TODA Affiliation</Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{incident.todaName}</Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Section 5: Status History Audit Trail */}
        {incident.statusHistory && incident.statusHistory.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
              <HistoryIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Review Timeline & Audit Trail
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, backgroundColor: '#F5F5F7', padding: '18px 20px', borderRadius: '12px' }}>
              {incident.statusHistory.map((step, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CheckCircleIcon sx={{ color: 'var(--sakay-orange)', fontSize: 18 }} />
                  <Box>
                    <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      {step.step}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
                      {step.timestamp} • {step.actor}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Section 6: Official Findings & Action Taken */}
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1.5, letterSpacing: '0.3px' }}>
            Official LGU Investigation Findings & Action Taken
          </Typography>
          <TextField
            multiline
            rows={3}
            fullWidth
            placeholder="Record official investigation findings, witness notes, or administrative action rationale..."
            value={findingsText}
            onChange={(e) => setFindingsText(e.target.value)}
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                fontSize: '14px',
              },
            }}
          />
        </Box>

        {/* Section 7: Workflow Action Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, pt: 1 }}>
          {incident.status === 'Pending Review' && (
            <Button
              onClick={() => setInvestigateDialogOpen(true)}
              sx={{
                height: 40,
                padding: '0 20px',
                borderRadius: '9px',
                textTransform: 'none',
                fontSize: '13.5px',
                fontWeight: 600,
                backgroundColor: '#1565C0',
                color: '#FFFFFF',
                '&:hover': { backgroundColor: '#0D47A1' },
              }}
            >
              Mark Under Investigation
            </Button>
          )}

          {incident.status !== 'Dismissed' && (
            <Button
              onClick={() => setDismissDialogOpen(true)}
              sx={{
                height: 40,
                padding: '0 20px',
                borderRadius: '9px',
                textTransform: 'none',
                fontSize: '13.5px',
                fontWeight: 600,
                borderColor: 'var(--mac-border-color)',
                color: 'var(--mac-text-secondary)',
                '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
              }}
              variant="outlined"
            >
              Dismiss Report
            </Button>
          )}

          {incident.status !== 'Resolved' && (
            <Button
              onClick={() => setResolveDialogOpen(true)}
              sx={{
                height: 40,
                padding: '0 22px',
                borderRadius: '9px',
                textTransform: 'none',
                fontSize: '13.5px',
                fontWeight: 600,
                backgroundColor: 'var(--sakay-orange)',
                color: '#FFFFFF',
                boxShadow: 'var(--mac-shadow-subtle)',
                '&:hover': { backgroundColor: 'var(--sakay-orange-hover)' },
              }}
            >
              Resolve Incident
            </Button>
          )}
        </Box>
      </MacCenterModal>

      {/* Document Inspection Popover */}
      {selectedDoc && (
        <DocumentPreviewModal
          open={Boolean(selectedDoc)}
          onClose={() => setSelectedDoc(null)}
          documentName={selectedDoc}
          documentType="Evidence Attachment"
        />
      )}

      {/* Confirmation Dialogs */}
      <MacConfirmDialog
        open={investigateDialogOpen}
        onClose={() => setInvestigateDialogOpen(false)}
        title="Mark Incident Under Investigation?"
        message={`Assign incident #${incident.id} for formal investigation. The status will be updated to Under Investigation.`}
        confirmLabel="Confirm Assignment"
        confirmVariant="orange"
        onConfirm={() => handleConfirmStatusChange('Under Investigation')}
      />

      <MacConfirmDialog
        open={resolveDialogOpen}
        onClose={() => setResolveDialogOpen(false)}
        title="Resolve Incident Report?"
        message={`Mark incident #${incident.id} as Resolved. Record any findings below.`}
        confirmLabel="Resolve Incident"
        confirmVariant="orange"
        requireReason
        reasonPlaceholder="Specify resolution findings or sanctions issued..."
        onConfirm={(reason) => handleConfirmStatusChange('Resolved', reason)}
      />

      <MacConfirmDialog
        open={dismissDialogOpen}
        onClose={() => setDismissDialogOpen(false)}
        title="Dismiss Incident Report?"
        message={`Dismiss incident #${incident.id} as unfounded or invalid.`}
        confirmLabel="Dismiss Report"
        confirmVariant="danger"
        requireReason
        reasonPlaceholder="Specify reason for dismissal..."
        onConfirm={(reason) => handleConfirmStatusChange('Dismissed', reason)}
      />
    </>
  );
};
