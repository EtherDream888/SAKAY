import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Tabs,
  Tab,
  Avatar,
  Chip,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import GavelIcon from '@mui/icons-material/Gavel';
import DescriptionIcon from '@mui/icons-material/Description';
import InsertPhotoIcon from '@mui/icons-material/InsertPhoto';
import VisibilityIcon from '@mui/icons-material/Visibility';

import { MOCK_TODA_DRIVERS, MOCK_EXEMPTION_REQUESTS, CURRENT_TODA_PROFILE } from '../mockData/todaData';
import { TodaDriverMember, DriverExemptionRequest, EvidenceFileItem } from '../types/toda';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { MacConfirmDialog } from '../components/admin/MacConfirmDialog';
import { DocumentPreviewModal } from '../components/admin/DocumentPreviewModal';
import {
  fetchTodaDriverMembers,
  suspendTodaDriver,
  reactivateTodaDriver,
  recordTodaAuditAction,
} from '../services/todaApiService';

// toda driver roster membership, strikes record, and suspension management
export const TodaDriverMembershipPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [drivers, setDrivers] = useState<TodaDriverMember[]>(MOCK_TODA_DRIVERS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [exemptions, setExemptions] = useState<DriverExemptionRequest[]>(MOCK_EXEMPTION_REQUESTS);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Selected Driver for Detail Modal
  const [selectedDriver, setSelectedDriver] = useState<TodaDriverMember | null>(null);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [suspendReasonInput, setSuspendReasonInput] = useState('');

  // Selected Exemption for Review Modal
  const [selectedExemption, setSelectedExemption] = useState<DriverExemptionRequest | null>(null);
  const [exemptionDecisionModalOpen, setExemptionDecisionModalOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<EvidenceFileItem | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchTodaDriverMembers()
      .then((data) => {
        if (isMounted && data && data.length > 0) {
          setDrivers(data);
        }
      })
      .catch((err) => {
        console.warn('[TodaMembership] Failed to fetch drivers, using fallback:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter Logic
  const filteredDrivers = drivers.filter((drv) => {
    const matchesSearch =
      drv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drv.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drv.membershipNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drv.franchiseNo.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || drv.accountStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCount = drivers.length;
  const activeCount = drivers.filter((d) => d.accountStatus === 'Active').length;
  const reviewCount = drivers.filter((d) => d.accountStatus === 'Suspension Review' || d.accountStatus === 'Reactivation Review').length;
  const suspendedCount = drivers.filter((d) => d.accountStatus === 'TODA Suspended' || d.accountStatus === 'LGU Deactivated').length;

  const statusOptions: FilterOption[] = [
    { label: 'All Member Statuses', value: 'All' },
    { label: 'Active', value: 'Active' },
    { label: 'Suspension Review (LGU Endorsement)', value: 'Suspension Review' },
    { label: 'Reactivation Review', value: 'Reactivation Review' },
    { label: 'TODA Suspended', value: 'TODA Suspended' },
    { label: 'LGU Deactivated', value: 'LGU Deactivated' },
  ];

  // Action: Request Driver Suspension Review (Governance Flow)
  const handleSuspendRequest = async () => {
    if (!selectedDriver) return;

    try {
      await suspendTodaDriver(selectedDriver.id, suspendReasonInput);
    } catch (err) {
      console.warn('[TodaMembership] Error submitting suspension endorsement:', err);
    }

    setDrivers((prev) =>
      prev.map((d) =>
        d.id === selectedDriver.id
          ? {
              ...d,
              accountStatus: 'Suspension Review',
              suspensionReason: suspendReasonInput || 'Endorsed for TODA policy review.',
              suspendedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            }
          : d
      )
    );

    recordTodaAuditAction({
      actionType: 'DRIVER_SUSPENSION_RECOMMENDED',
      targetId: selectedDriver.id,
      targetName: selectedDriver.name,
      details: `Submitted driver suspension endorsement for ${selectedDriver.name} (${selectedDriver.vehiclePlate}) for LGU review. Reason: ${suspendReasonInput || 'Operational violation.'}`,
      category: 'Membership',
    });

    setSuspendDialogOpen(false);
    setSelectedDriver(null);
  };

  // Action: Request Driver Reactivation (Governance Flow)
  const handleReactivateRequest = async () => {
    if (!selectedDriver) return;

    try {
      await reactivateTodaDriver(selectedDriver.id);
    } catch (err) {
      console.warn('[TodaMembership] Error submitting reactivation endorsement:', err);
    }

    setDrivers((prev) =>
      prev.map((d) =>
        d.id === selectedDriver.id
          ? { ...d, accountStatus: 'Reactivation Review' }
          : d
      )
    );

    recordTodaAuditAction({
      actionType: 'DRIVER_REACTIVATION_RECOMMENDED',
      targetId: selectedDriver.id,
      targetName: selectedDriver.name,
      details: `Submitted driver reactivation recommendation for ${selectedDriver.name} (${selectedDriver.vehiclePlate}) to LGU Franchising Office for decision.`,
      category: 'Membership',
    });

    setReactivateDialogOpen(false);
    setSelectedDriver(null);
  };

  // Exemption Decision Handlers (Endorse vs Decline Endorsement)
  const handleExemptionDecision = (approved: boolean) => {
    if (!selectedExemption) return;

    const newStatus = approved ? 'Approved' : 'Rejected';
    setExemptions((prev) =>
      prev.map((ex) =>
        ex.id === selectedExemption.id
          ? {
              ...ex,
              status: newStatus,
              decisionNotes: approved
                ? 'TODA President verified supporting evidence and endorsed strike exemption to LGU.'
                : 'TODA President declined endorsement of strike exemption.',
            }
          : ex
      )
    );

    recordTodaAuditAction({
      actionType: approved ? 'STRIKE_EXEMPTION_ENDORSED' : 'STRIKE_EXEMPTION_DECLINED',
      targetId: selectedExemption.id,
      targetName: selectedExemption.driverName,
      details: `${approved ? 'Endorsed' : 'Declined endorsement of'} strike exemption appeal for ${selectedExemption.driverName} (${selectedExemption.incidentCategory}).`,
      category: 'Membership',
    });

    setExemptionDecisionModalOpen(false);
    setSelectedExemption(null);
  };

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* 1. Page Sub-Header Navigation Tabs */}
      <Box sx={{ borderBottom: '1px solid var(--mac-border-color)', mb: 3.5 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            minHeight: 46,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '15.5px',
              fontWeight: 600,
              minHeight: 46,
              color: 'var(--mac-text-muted)',
              '&.Mui-selected': { color: 'var(--sakay-orange)' },
            },
            '& .MuiTabs-indicator': { backgroundColor: 'var(--sakay-orange)', height: 3 },
          }}
        >
          <Tab icon={<PeopleIcon sx={{ fontSize: 20 }} />} iconPosition="start" label={`Accredited Driver Roster (${totalCount})`} />
          <Tab icon={<GavelIcon sx={{ fontSize: 20 }} />} iconPosition="start" label={`Strike Exemption Appeals (${exemptions.length})`} />
        </Tabs>
      </Box>

      {activeTab === 0 ? (
        <>
          {/* 2. KPI Summary Panels */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2.5,
              mb: 3.5,
            }}
          >
            <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
              <Typography sx={{ fontSize: '14px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Roster Driver Roster</Typography>
              <Typography sx={{ fontSize: '34px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>{totalCount}</Typography>
            </Box>

            <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
              <Typography sx={{ fontSize: '14px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Active Accredited Drivers</Typography>
              <Typography sx={{ fontSize: '34px', fontWeight: 700, color: '#059669' }}>{activeCount}</Typography>
            </Box>

            <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
              <Typography sx={{ fontSize: '14px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Pending Governance Reviews</Typography>
              <Typography sx={{ fontSize: '34px', fontWeight: 700, color: 'var(--sakay-orange)' }}>{reviewCount}</Typography>
              <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)', mt: 0.5 }}>Under LGU endorsement review</Typography>
            </Box>

            <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
              <Typography sx={{ fontSize: '14px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Suspended / Deactivated</Typography>
              <Typography sx={{ fontSize: '34px', fontWeight: 700, color: '#DC2626' }}>{suspendedCount}</Typography>
            </Box>
          </Box>

          {/* 3. Filter Toolbar */}
          <FilterToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search driver name, plate, franchise, or membership ID..."
            selectFilters={[
              {
                id: 'status',
                label: 'Account Status',
                value: statusFilter,
                options: statusOptions,
                onChange: setStatusFilter,
              },
            ]}
            onResetFilters={() => {
              setSearchQuery('');
              setStatusFilter('All');
            }}
          />

          {/* 4. Accredited Drivers Roster Table */}
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              borderRadius: 'var(--mac-radius-lg)',
              border: '1px solid var(--mac-border-color)',
              boxShadow: 'var(--mac-shadow-card)',
              overflow: 'hidden',
            }}
          >
            <Table>
              <TableHead sx={{ backgroundColor: '#FAFAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>DRIVER MEMBER</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>FRANCHISE & PLATE</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>SERVICE ZONE</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>STRIKES RECORD</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACCOUNT STATUS</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--mac-text-muted)', py: 2, px: 3, width: 220, whiteSpace: 'nowrap' }}>GOVERNANCE ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDrivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 7 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                        <Typography sx={{ fontSize: '16.5px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                          No Drivers Found
                        </Typography>
                        <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-muted)' }}>
                          There are currently no driver members matching the "{statusFilter !== 'All' ? statusFilter : 'selected'}" filter criteria.
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDrivers.map((drv) => (
                    <TableRow key={drv.id} sx={{ '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' } }}>
                      <TableCell sx={{ py: 2, px: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
                          <Avatar
                            sx={{
                              width: 42,
                              height: 42,
                              backgroundColor: 'var(--sakay-orange-soft)',
                              color: 'var(--sakay-orange)',
                              fontWeight: 700,
                              fontSize: '15px',
                            }}
                          >
                            {drv.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                              {drv.name}
                            </Typography>
                            <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>
                              {drv.membershipNo} • Lic: {drv.licenseNo}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell sx={{ py: 2, px: 3 }}>
                        <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                          {drv.vehiclePlate}
                        </Typography>
                        <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>
                          {drv.franchiseNo}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ py: 2, px: 3 }}>
                        <Typography sx={{ fontSize: '14.5px', color: 'var(--mac-text-secondary)' }}>
                          {drv.serviceZone}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ py: 2, px: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Chip
                            label={`${drv.strikesCount} / 5 Strikes`}
                            size="small"
                            sx={{
                              fontSize: '13px',
                              fontWeight: 600,
                              backgroundColor: drv.strikesCount >= 3 ? '#FEF2F2' : '#F1F3F4',
                              color: drv.strikesCount >= 3 ? '#DC2626' : 'var(--mac-text-secondary)',
                            }}
                          />
                        </Box>
                      </TableCell>

                      <TableCell sx={{ py: 2, px: 3 }}>
                        <StatusBadge status={drv.accountStatus} />
                      </TableCell>

                      <TableCell align="right" sx={{ py: 2, px: 3, whiteSpace: 'nowrap' }}>
                        {drv.accountStatus === 'Active' ? (
                          <ActionButton
                            label="Request Suspension"
                            onClick={() => {
                              setSelectedDriver(drv);
                              setSuspendDialogOpen(true);
                            }}
                          />
                        ) : drv.accountStatus === 'TODA Suspended' || drv.accountStatus === 'Suspension Review' ? (
                          <ActionButton
                            label="Request Reactivation"
                            onClick={() => {
                              setSelectedDriver(drv);
                              setReactivateDialogOpen(true);
                            }}
                          />
                        ) : (
                          <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)' }}>
                            Under LGU Jurisdiction
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        /* 5. Strike Exemption Appeals Tab */
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            overflow: 'hidden',
          }}
        >
          <Table>
            <TableHead sx={{ backgroundColor: '#FAFAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>DRIVER</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>INCIDENT CATEGORY</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>SUBMITTED EVIDENCE</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>APPEAL DATE</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>STATUS</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {exemptions.map((ex) => (
                <TableRow key={ex.id} sx={{ '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' } }}>
                  <TableCell sx={{ py: 2, px: 3, fontWeight: 600, fontSize: '15px' }}>
                    {ex.driverName}
                  </TableCell>

                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      {ex.incidentCategory}
                    </Typography>
                    <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>
                      Strike Ref: {ex.strikeId}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Chip
                      icon={<DescriptionIcon sx={{ fontSize: 16 }} />}
                      label={`${ex.evidenceFiles.length} Evidence Document${ex.evidenceFiles.length > 1 ? 's' : ''}`}
                      size="small"
                      sx={{ backgroundColor: 'var(--sakay-orange-soft)', color: 'var(--sakay-orange)', fontWeight: 600, fontSize: '13px' }}
                    />
                  </TableCell>

                  <TableCell sx={{ py: 2, px: 3, fontSize: '14px', color: 'var(--mac-text-secondary)' }}>
                    {ex.submittedAt}
                  </TableCell>

                  <TableCell sx={{ py: 2, px: 3 }}>
                    <StatusBadge status={ex.status} />
                  </TableCell>

                  <TableCell align="right" sx={{ py: 2, px: 3 }}>
                    <ActionButton
                      label="Review Appeal"
                      onClick={() => {
                        setSelectedExemption(ex);
                        setExemptionDecisionModalOpen(true);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 6. Strike Exemption Appeal Centered Modal with Clickable Evidence */}
      {selectedExemption && (
        <MacCenterModal
          open={exemptionDecisionModalOpen}
          onClose={() => setExemptionDecisionModalOpen(false)}
          title={`Review Strike Exemption Appeal — ${selectedExemption.driverName}`}
          subtitle={`Submitted: ${selectedExemption.submittedAt} • TODA Endorsement Review`}
          badge={<StatusBadge status={selectedExemption.status} />}
          maxWidth={760}
          primaryActionLabel={selectedExemption.status === 'Pending Review' ? "Endorse Appeal to LGU" : undefined}
          onPrimaryAction={() => handleExemptionDecision(true)}
          secondaryActionLabel={selectedExemption.status === 'Pending Review' ? "Decline Endorsement" : "Close"}
          onSecondaryAction={() => {
            if (selectedExemption.status === 'Pending Review') {
              handleExemptionDecision(false);
            } else {
              setExemptionDecisionModalOpen(false);
            }
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Section 1: Appeal Information */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 1.5 }}>
                Appeal Information
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                  backgroundColor: '#F5F5F7',
                  padding: '18px 20px',
                  borderRadius: '12px',
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>Driver Name</Typography>
                  <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedExemption.driverName}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>Strike / Incident Category</Typography>
                  <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedExemption.incidentCategory}</Typography>
                </Box>
                <Box sx={{ gridColumn: 'span 2' }}>
                  <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>Driver's Stated Reason for Appeal</Typography>
                  <Typography sx={{ fontSize: '15px', color: 'var(--mac-text-primary)', mt: '2px', lineHeight: 1.5 }}>
                    "{selectedExemption.reason}"
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Section 2: Supporting Evidence Attachments (Clickable & Viewable with explicit View button) */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 1.5 }}>
                Submitted Supporting Evidence ({selectedExemption.evidenceFiles.length} Attachments)
              </Typography>

              {selectedExemption.evidenceFiles.length === 0 ? (
                <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-muted)', fontStyle: 'italic' }}>
                  No supporting evidence was submitted with this appeal.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {selectedExemption.evidenceFiles.map((file) => (
                    <Box
                      key={file.id}
                      onClick={() => setPreviewDocument(file)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        borderRadius: '10px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--mac-border-color)',
                        boxShadow: 'var(--mac-shadow-subtle)',
                        cursor: 'pointer',
                        transition: 'var(--mac-transition-fast)',
                        '&:hover': {
                          borderColor: 'var(--sakay-orange-border)',
                          backgroundColor: 'var(--sakay-orange-soft)',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {file.type === 'image' ? (
                          <InsertPhotoIcon sx={{ color: 'var(--sakay-orange)', fontSize: 24 }} />
                        ) : (
                          <DescriptionIcon sx={{ color: '#1565C0', fontSize: 24 }} />
                        )}
                        <Box>
                          <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                            {file.name}
                          </Typography>
                          <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>
                            Official evidence document attachment
                          </Typography>
                        </Box>
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<VisibilityIcon fontSize="small" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewDocument(file);
                        }}
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
                        }}
                      >
                        View
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </MacCenterModal>
      )}

      {/* Document Inspection Preview Modal */}
      {previewDocument && (
        <DocumentPreviewModal
          open={Boolean(previewDocument)}
          onClose={() => setPreviewDocument(null)}
          documentName={previewDocument.name}
          documentType={previewDocument.type}
        />
      )}

      {/* Suspension Recommendation Confirmation Dialog */}
      <MacConfirmDialog
        open={suspendDialogOpen}
        onClose={() => setSuspendDialogOpen(false)}
        title="Request Driver Suspension Review?"
        message={`Submit a driver suspension recommendation for ${selectedDriver?.name} (${selectedDriver?.vehiclePlate}) to the LGU Franchising Office for formal review.`}
        confirmLabel="Submit Suspension Request"
        confirmVariant="danger"
        requireReason
        reasonPlaceholder="Specify operational violation details..."
        onConfirm={handleSuspendRequest}
      />

      {/* Reactivation Recommendation Confirmation Dialog */}
      <MacConfirmDialog
        open={reactivateDialogOpen}
        onClose={() => setReactivateDialogOpen(false)}
        title="Request Driver Reactivation?"
        message={`Recommend reactivation of ${selectedDriver?.name}'s account status. The request will be forwarded to the LGU Franchising Board.`}
        confirmLabel="Submit Reactivation Endorsement"
        confirmVariant="orange"
        onConfirm={handleReactivateRequest}
      />
    </Box>
  );
};
