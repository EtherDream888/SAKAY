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
  TextField,
  MenuItem,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import GavelIcon from '@mui/icons-material/Gavel';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import StarIcon from '@mui/icons-material/Star';

import { MOCK_TODA_DRIVERS, MOCK_EXEMPTION_REQUESTS, CURRENT_TODA_PROFILE } from '../mockData/todaData';
import { TodaDriverMember, DriverExemptionRequest } from '../types/toda';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { MacConfirmDialog } from '../components/admin/MacConfirmDialog';
import {
  fetchTodaDriverMembers,
  suspendTodaDriver,
  reactivateTodaDriver,
  recordTodaAuditAction,
} from '../services/todaApiService';

/**
 * ============================================================================
 * TODA DRIVER MEMBERSHIP & ROSTER PAGE
 * ============================================================================
 * Purpose:
 *   Enables TODA Association officers to monitor their 24 accredited member
 *   drivers, adjust terminal shifts, investigate 90-day strike records,
 *   and enforce TODA-level temporary terminal suspensions.
 * ============================================================================
 */
export const TodaDriverMembershipPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [drivers, setDrivers] = useState<TodaDriverMember[]>(MOCK_TODA_DRIVERS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [exemptions, setExemptions] = useState<DriverExemptionRequest[]>(MOCK_EXEMPTION_REQUESTS);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [shiftFilter, setShiftFilter] = useState('All');

  // Selected Driver for Detail / Edit Modal
  const [selectedDriver, setSelectedDriver] = useState<TodaDriverMember | null>(null);
  const [editDriverModalOpen, setEditDriverModalOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);

  // Edit Driver Form State
  const [editPhone, setEditPhone] = useState('');
  const [editShift, setEditShift] = useState('');
  const [editZone, setEditZone] = useState('');

  // Selected Exemption for Review Modal
  const [selectedExemption, setSelectedExemption] = useState<DriverExemptionRequest | null>(null);
  const [exemptionDecisionModalOpen, setExemptionDecisionModalOpen] = useState(false);

  /**
   * Effect: Fetch live member driver roster on initial mount.
   */
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

  // Filter Drivers
  const filteredDrivers = drivers.filter((drv) => {
    const matchesSearch =
      drv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drv.membershipNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drv.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drv.franchiseNo.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || drv.accountStatus === statusFilter;
    const matchesShift = shiftFilter === 'All' || drv.terminalShift.includes(shiftFilter);

    return matchesSearch && matchesStatus && matchesShift;
  });

  // KPI Counts
  const totalDriversCount = drivers.length;
  const activeDriversCount = drivers.filter((d) => d.accountStatus === 'Active').length;
  const todaSuspendedCount = drivers.filter((d) => d.accountStatus === 'TODA Suspended').length;
  const lguDeactivatedCount = drivers.filter((d) => d.accountStatus === 'LGU Deactivated').length;
  const pendingExemptionsCount = exemptions.filter((e) => e.status === 'Pending Review').length;

  const statusOptions: FilterOption[] = [
    { label: 'All Statuses', value: 'All' },
    { label: 'Active', value: 'Active' },
    { label: 'TODA Suspended', value: 'TODA Suspended' },
    { label: 'LGU Deactivated', value: 'LGU Deactivated' },
  ];

  const shiftOptions: FilterOption[] = [
    { label: 'All Shifts', value: 'All' },
    { label: 'Morning (6AM–2PM)', value: 'Morning' },
    { label: 'Afternoon (2PM–10PM)', value: 'Afternoon' },
    { label: 'Night (10PM–6AM)', value: 'Night' },
  ];

  // Open Edit Modal
  const handleOpenEdit = (drv: TodaDriverMember) => {
    setSelectedDriver(drv);
    setEditPhone(drv.phone);
    setEditShift(drv.terminalShift);
    setEditZone(drv.serviceZone);
    setEditDriverModalOpen(true);
  };

  const handleEditSubmit = () => {
    if (!selectedDriver) return;

    setDrivers((prev) =>
      prev.map((d) =>
        d.id === selectedDriver.id
          ? { ...d, phone: editPhone, terminalShift: editShift, serviceZone: editZone }
          : d
      )
    );

    recordTodaAuditAction({
      actionType: 'DRIVER_MEMBERSHIP_UPDATED',
      targetId: selectedDriver.id,
      targetName: selectedDriver.name,
      details: `Updated membership parameters for ${selectedDriver.name}. Shift: ${editShift}, Zone: ${editZone}.`,
      category: 'Membership',
    });

    setEditDriverModalOpen(false);
  };

  // TODA Suspend Action (Local Disciplinary Action)
  const handleSuspendConfirm = async (reason?: string) => {
    if (!selectedDriver) return;

    const finalReason = reason || 'TODA Terminal Rules Violation (3-Day Loading Bay Suspension)';

    // Backend API Call
    try {
      await suspendTodaDriver(selectedDriver.id, finalReason, 3);
    } catch (err) {
      console.warn('[TodaMembership] Backend error during suspend:', err);
    }

    setDrivers((prev) =>
      prev.map((d) =>
        d.id === selectedDriver.id
          ? { ...d, accountStatus: 'TODA Suspended', suspensionReason: finalReason, suspendedAt: new Date().toLocaleDateString() }
          : d
      )
    );
    setSelectedDriver((prev) => (prev ? { ...prev, accountStatus: 'TODA Suspended', suspensionReason: finalReason } : null));

    recordTodaAuditAction({
      actionType: 'DRIVER_TODA_SUSPENDED',
      targetId: selectedDriver.id,
      targetName: selectedDriver.name,
      details: `Enforced TODA-level suspension on member ${selectedDriver.name} (${selectedDriver.membershipNo}). Reason: ${finalReason}.`,
      category: 'Membership',
    });

    setSuspendDialogOpen(false);
  };

  // TODA Reactivate Action
  const handleReactivateConfirm = async () => {
    if (!selectedDriver) return;

    // Backend API Call
    try {
      await reactivateTodaDriver(selectedDriver.id);
    } catch (err) {
      console.warn('[TodaMembership] Backend error during reactivate:', err);
    }

    setDrivers((prev) =>
      prev.map((d) =>
        d.id === selectedDriver.id
          ? { ...d, accountStatus: 'Active', suspensionReason: undefined, suspendedAt: undefined }
          : d
      )
    );
    setSelectedDriver((prev) => (prev ? { ...prev, accountStatus: 'Active', suspensionReason: undefined } : null));

    recordTodaAuditAction({
      actionType: 'DRIVER_TODA_REACTIVATED',
      targetId: selectedDriver.id,
      targetName: selectedDriver.name,
      details: `Reinstated active TODA terminal loading privileges for ${selectedDriver.name}.`,
      category: 'Membership',
    });

    setReactivateDialogOpen(false);
  };

  // Exemption: Approve
  const handleApproveExemption = (exm: DriverExemptionRequest) => {
    setExemptions((prev) =>
      prev.map((e) => (e.id === exm.id ? { ...e, status: 'Approved', decisionNotes: 'Approved by TODA President. Strike record cleared.' } : e))
    );

    recordTodaAuditAction({
      actionType: 'EXEMPTION_REQUEST_APPROVED',
      targetId: exm.id,
      targetName: exm.driverName,
      details: `Approved strike exemption appeal for ${exm.driverName} (${exm.incidentCategory}). Strike cancelled.`,
      category: 'Membership',
    });

    setExemptionDecisionModalOpen(false);
  };

  // Exemption: Escalate to LGU
  const handleEscalateExemption = (exm: DriverExemptionRequest) => {
    setExemptions((prev) =>
      prev.map((e) => (e.id === exm.id ? { ...e, status: 'Escalated to LGU', decisionNotes: 'Escalated to LGU Franchising Board due to dispute complexity or strike threshold.' } : e))
    );

    recordTodaAuditAction({
      actionType: 'EXEMPTION_ESCALATED_TO_LGU',
      targetId: exm.id,
      targetName: exm.driverName,
      details: `Escalated strike exemption appeal for ${exm.driverName} to LGU Administrator for formal dispute adjudication.`,
      category: 'Membership',
    });

    setExemptionDecisionModalOpen(false);
  };

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* 1. Summary Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 3.5,
        }}
      >
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Total Roster Drivers</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>{totalDriversCount}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Active in Rotation</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#1E8E3E' }}>{activeDriversCount}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>TODA Suspensions</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--sakay-orange)' }}>{todaSuspendedCount}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Pending Strike Appeals</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#1565C0' }}>{pendingExemptionsCount}</Typography>
        </Box>
      </Box>

      {/* 2. Sub-Queue Navigation Tabs */}
      <Box sx={{ borderBottom: '1px solid var(--mac-border-color)', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '14.5px',
              fontWeight: 600,
              color: 'var(--mac-text-muted)',
              minHeight: 48,
              '&.Mui-selected': { color: 'var(--sakay-orange)' },
            },
            '& .MuiTabs-indicator': { backgroundColor: 'var(--sakay-orange)' },
          }}
        >
          <Tab label={`Affiliated Drivers Roster (${totalDriversCount})`} />
          <Tab label={`Strike Exemption Appeals (${exemptions.length})`} />
        </Tabs>
      </Box>

      {/* TAB 0: Affiliated Drivers Roster */}
      {activeTab === 0 && (
        <Box>
          <FilterToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search member name, ID, vehicle plate, or franchise..."
            selectFilters={[
              {
                id: 'status',
                label: 'Account Status',
                value: statusFilter,
                options: statusOptions,
                onChange: setStatusFilter,
              },
              {
                id: 'shift',
                label: 'Shift Allocation',
                value: shiftFilter,
                options: shiftOptions,
                onChange: setShiftFilter,
              },
            ]}
            onResetFilters={() => {
              setSearchQuery('');
              setStatusFilter('All');
              setShiftFilter('All');
            }}
          />

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
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>MEMBER DRIVER</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>VEHICLE & FRANCHISE</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ASSIGNED SHIFT & ZONE</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>RATING & TRIPS</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACCOUNT STATUS</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDrivers.map((drv) => (
                  <TableRow
                    key={drv.id}
                    onClick={() => handleOpenEdit(drv)}
                    sx={{
                      cursor: 'pointer',
                      transition: 'var(--mac-transition-fast)',
                      '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                    }}
                  >
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 36, height: 36, backgroundColor: 'var(--sakay-orange-soft)', color: 'var(--sakay-orange)', fontSize: '13px', fontWeight: 700 }}>
                          {drv.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 600, fontSize: '14.5px', color: 'var(--mac-text-primary)' }}>
                            {drv.name}
                          </Typography>
                          <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                            Member ID: {drv.membershipNo} • {drv.phone}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                        Plate: {drv.vehiclePlate}
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                        Franchise: {drv.franchiseNo}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-primary)', fontWeight: 500 }}>
                        {drv.terminalShift}
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                        Zone: {drv.serviceZone}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <StarIcon sx={{ fontSize: 16, color: '#FBBC04' }} />
                        <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                          {drv.rating.toFixed(1)}
                        </Typography>
                        <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', ml: 0.5 }}>
                          ({drv.totalTrips} trips)
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <StatusBadge status={drv.accountStatus} />
                    </TableCell>
                    <TableCell align="right" sx={{ py: 2.2, px: 3 }}>
                      <ActionButton
                        label="Manage"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(drv);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* TAB 1: Strike Exemption Appeals */}
      {activeTab === 1 && (
        <Box>
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
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>APPEALING DRIVER</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>STRIKE REASON & CONTEXT</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>SUPPORTING EVIDENCE</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>STATUS</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {exemptions.map((exm) => (
                  <TableRow
                    key={exm.id}
                    onClick={() => {
                      setSelectedExemption(exm);
                      setExemptionDecisionModalOpen(true);
                    }}
                    sx={{
                      cursor: 'pointer',
                      transition: 'var(--mac-transition-fast)',
                      '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                    }}
                  >
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '14.5px', color: 'var(--mac-text-primary)' }}>
                        {exm.driverName}
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                        ID: {exm.driverId} • Submitted {exm.submittedAt}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3, maxWidth: 340 }}>
                      <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--sakay-orange)' }}>
                        {exm.incidentCategory}
                      </Typography>
                      <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-secondary)', mt: '4px' }}>
                        {exm.reason}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      {exm.evidenceFiles.map((file, i) => (
                        <Chip key={i} label={file} size="small" sx={{ fontSize: '11px', height: 22, mr: 0.5, mb: 0.5 }} />
                      ))}
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <StatusBadge status={exm.status as any} />
                    </TableCell>
                    <TableCell align="right" sx={{ py: 2.2, px: 3 }}>
                      <ActionButton
                        label="Review Appeal"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedExemption(exm);
                          setExemptionDecisionModalOpen(true);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* 3. Manage Driver Membership Modal */}
      {selectedDriver && (
        <MacCenterModal
          open={editDriverModalOpen}
          onClose={() => setEditDriverModalOpen(false)}
          title={`Member Profile — ${selectedDriver.name}`}
          subtitle={`Membership No: ${selectedDriver.membershipNo} • Franchise: ${selectedDriver.franchiseNo}`}
          badge={<StatusBadge status={selectedDriver.accountStatus} />}
          maxWidth={680}
          primaryActionLabel="Save Allocation Changes"
          onPrimaryAction={handleEditSubmit}
          secondaryActionLabel="Close"
          onSecondaryAction={() => setEditDriverModalOpen(false)}
        >
          <Box sx={{ mb: 2 }}>
            {/* Overview Grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, backgroundColor: '#F8F9FA', p: 2, borderRadius: '12px', mb: 3 }}>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>License No.</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedDriver.licenseNo}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Vehicle Plate</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedDriver.vehiclePlate}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Total Completed Trips</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedDriver.totalTrips} rides</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Accumulated Strikes</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 700, color: selectedDriver.strikesCount > 0 ? 'var(--sakay-orange)' : '#1E8E3E' }}>
                  {selectedDriver.strikesCount} Strikes
                </Typography>
              </Box>
            </Box>

            {/* Editable Form Controls */}
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1.5 }}>
              Terminal & Zone Assignment
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
              <TextField
                fullWidth
                label="Driver Mobile Number"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />

              <TextField
                select
                fullWidth
                label="Assigned Terminal Shift Rotation"
                value={editShift}
                onChange={(e) => setEditShift(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              >
                <MenuItem value="Morning (6:00 AM – 2:00 PM)">Morning (6:00 AM – 2:00 PM)</MenuItem>
                <MenuItem value="Afternoon (2:00 PM – 10:00 PM)">Afternoon (2:00 PM – 10:00 PM)</MenuItem>
                <MenuItem value="Night (10:00 PM – 6:00 AM)">Night (10:00 PM – 6:00 AM)</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Designated Local Service Zone"
                value={editZone}
                onChange={(e) => setEditZone(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
            </Box>

            {/* TODA Disciplinary Action */}
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1.5 }}>
              TODA Disciplinary Governance
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '14px 18px', borderRadius: '10px', border: '1px solid var(--mac-border-color)', backgroundColor: '#FFFFFF' }}>
              <Box>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  {selectedDriver.accountStatus === 'TODA Suspended' ? 'Reactivate TODA Loading Privileges' : 'Enforce TODA Terminal Suspension'}
                </Typography>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
                  {selectedDriver.accountStatus === 'TODA Suspended'
                    ? 'Restore terminal rotation privileges.'
                    : 'Temporary suspension for line cutting, terminal misconduct, or tariff non-compliance.'}
                </Typography>
              </Box>

              <Button
                variant="outlined"
                size="small"
                disabled={selectedDriver.accountStatus === 'LGU Deactivated'}
                color={selectedDriver.accountStatus === 'TODA Suspended' ? 'success' : 'error'}
                onClick={() => {
                  if (selectedDriver.accountStatus === 'TODA Suspended') {
                    setReactivateDialogOpen(true);
                  } else {
                    setSuspendDialogOpen(true);
                  }
                }}
                sx={{ height: 34, borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
                {selectedDriver.accountStatus === 'TODA Suspended' ? 'Reactivate' : 'Suspend Driver'}
              </Button>
            </Box>
          </Box>
        </MacCenterModal>
      )}

      {/* 4. Suspend Dialog */}
      {selectedDriver && (
        <MacConfirmDialog
          open={suspendDialogOpen}
          onClose={() => setSuspendDialogOpen(false)}
          title="Suspend TODA Member?"
          message={`Enforce terminal suspension for "${selectedDriver.name}"? Driver will not be eligible for terminal rotation bay loading.`}
          confirmLabel="Suspend Member"
          confirmVariant="danger"
          requireReason
          reasonPlaceholder="Specify TODA violation reason (e.g. Queue jumping, passenger tariff dispute)..."
          onConfirm={handleSuspendConfirm}
        />
      )}

      {/* 5. Reactivate Dialog */}
      {selectedDriver && (
        <MacConfirmDialog
          open={reactivateDialogOpen}
          onClose={() => setReactivateDialogOpen(false)}
          title="Reactivate TODA Member?"
          message={`Reactivate terminal rotation privileges for "${selectedDriver.name}"?`}
          confirmLabel="Reactivate Driver"
          confirmVariant="orange"
          onConfirm={handleReactivateConfirm}
        />
      )}

      {/* 6. Exemption Review Modal */}
      {selectedExemption && (
        <MacCenterModal
          open={exemptionDecisionModalOpen}
          onClose={() => setExemptionDecisionModalOpen(false)}
          title={`Strike Exemption Appeal — ${selectedExemption.driverName}`}
          subtitle={`Case ID: ${selectedExemption.id} • ${selectedExemption.incidentCategory}`}
          badge={<StatusBadge status={selectedExemption.status as any} />}
          maxWidth={640}
        >
          <Box sx={{ mb: 2 }}>
            <Box sx={{ backgroundColor: '#F8F9FA', p: 2, borderRadius: '10px', mb: 2.5 }}>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mb: 0.5 }}>Driver Explanation:</Typography>
              <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-primary)', lineHeight: 1.5 }}>
                "{selectedExemption.reason}"
              </Typography>
            </Box>

            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1.5 }}>
              TODA President Decision Seam
            </Typography>

            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', p: 2, backgroundColor: '#F5F5F7', borderRadius: '10px' }}>
              <Button
                variant="outlined"
                startIcon={<SendIcon />}
                disabled={selectedExemption.status !== 'Pending Review'}
                onClick={() => handleEscalateExemption(selectedExemption)}
                sx={{
                  textTransform: 'none',
                  borderRadius: '8px',
                  borderColor: 'var(--mac-border-color)',
                  color: 'var(--sakay-orange)',
                  fontWeight: 600,
                }}
              >
                Escalate to LGU Board
              </Button>
              <Button
                variant="contained"
                disabled={selectedExemption.status !== 'Pending Review'}
                onClick={() => handleApproveExemption(selectedExemption)}
                sx={{
                  textTransform: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#1E8E3E',
                  '&:hover': { backgroundColor: '#137333' },
                  fontWeight: 600,
                }}
              >
                Approve & Clear Strike
              </Button>
            </Box>
          </Box>
        </MacCenterModal>
      )}
    </Box>
  );
};
