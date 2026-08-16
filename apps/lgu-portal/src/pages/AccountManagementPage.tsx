import React, { useState } from 'react';
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
  Avatar,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Button,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LockResetIcon from '@mui/icons-material/LockReset';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BadgeIcon from '@mui/icons-material/Badge';
import SecurityIcon from '@mui/icons-material/Security';

import { MOCK_LGU_ADMINS, LguAdminRecord, CURRENT_ADMIN } from '../mockData/adminData';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { MacConfirmDialog } from '../components/admin/MacConfirmDialog';
import { logAdminAction } from '../lib/auditLog';

export const AccountManagementPage: React.FC = () => {
  const [admins, setAdmins] = useState<LguAdminRecord[]>(MOCK_LGU_ADMINS);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Selected Admin for Detail / Manage Modal
  const [selectedAdmin, setSelectedAdmin] = useState<LguAdminRecord | null>(null);

  // Modal / Dialog States
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [reassignRoleModalOpen, setReassignRoleModalOpen] = useState(false);

  // Form State for Adding New Admin
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<LguAdminRecord['role']>('Verifier');
  const [selectedNewRole, setSelectedNewRole] = useState<LguAdminRecord['role']>('Verifier');

  // Filter Logic
  const filteredAdmins = admins.filter((admin) => {
    const matchesSearch =
      admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.contactNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'All' || admin.role === roleFilter;
    const matchesStatus = statusFilter === 'All' || admin.accountStatus === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // KPI Counts
  const totalCount = admins.length;
  const activeCount = admins.filter((a) => a.accountStatus === 'Active').length;
  const pendingResetCount = admins.filter((a) => a.accountStatus === 'Pending Password Reset').length;
  const deactivatedCount = admins.filter((a) => a.accountStatus === 'Deactivated').length;

  const roleOptions: FilterOption[] = [
    { label: 'All Roles', value: 'All' },
    { label: 'Super Administrator', value: 'Super Administrator' },
    { label: 'Verifier', value: 'Verifier' },
    { label: 'Incident Officer', value: 'Incident Officer' },
    { label: 'Fare Administrator', value: 'Fare Administrator' },
    { label: 'Analytics Viewer', value: 'Analytics Viewer' },
  ];

  const statusOptions: FilterOption[] = [
    { label: 'All Statuses', value: 'All' },
    { label: 'Active', value: 'Active' },
    { label: 'Pending Password Reset', value: 'Pending Password Reset' },
    { label: 'Deactivated', value: 'Deactivated' },
  ];

  // Helper for Role Chip Colors
  const getRoleChipStyle = (role: LguAdminRecord['role']) => {
    switch (role) {
      case 'Super Administrator':
        return { bg: 'rgba(255, 107, 26, 0.12)', color: 'var(--sakay-orange)', border: 'rgba(255, 107, 26, 0.3)' };
      case 'Verifier':
        return { bg: 'rgba(21, 101, 192, 0.12)', color: '#1565C0', border: 'rgba(21, 101, 192, 0.3)' };
      case 'Incident Officer':
        return { bg: 'rgba(198, 40, 40, 0.12)', color: '#C62828', border: 'rgba(198, 40, 40, 0.3)' };
      case 'Fare Administrator':
        return { bg: 'rgba(46, 125, 50, 0.12)', color: '#2E7D32', border: 'rgba(46, 125, 50, 0.3)' };
      case 'Analytics Viewer':
        return { bg: 'rgba(106, 27, 154, 0.12)', color: '#6A1B9A', border: 'rgba(106, 27, 154, 0.3)' };
      default:
        return { bg: '#F1F3F4', color: '#5F6368', border: '#DADCE0' };
    }
  };

  // Action: Add Admin Account
  const handleAddAdminSubmit = () => {
    if (!newAdminName.trim() || !newAdminEmail.trim()) return;

    const newId = `LGU-ADM-00${admins.length + 1}`;
    const newRecord: LguAdminRecord = {
      id: newId,
      name: newAdminName.trim(),
      email: newAdminEmail.trim(),
      contactNumber: newAdminPhone.trim() || '+63 900 000 0000',
      role: newAdminRole,
      accountStatus: 'Pending Password Reset',
      lastLogin: 'Never (First Login Required)',
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    };

    setAdmins((prev) => [newRecord, ...prev]);

    // Log Action
    logAdminAction({
      actionType: 'ADMIN_ACCOUNT_CREATED',
      targetId: newId,
      targetName: newRecord.name,
      details: `Created new ${newRecord.role} account (${newRecord.email}) with required first-login password reset.`,
      category: 'Authentication',
    });

    // Reset Form
    setNewAdminName('');
    setNewAdminEmail('');
    setNewAdminPhone('');
    setNewAdminRole('Verifier');
    setAddModalOpen(false);
  };

  // Action: Deactivate Admin Account
  const handleDeactivateConfirm = (reason?: string) => {
    if (!selectedAdmin) return;

    setAdmins((prev) =>
      prev.map((a) => (a.id === selectedAdmin.id ? { ...a, accountStatus: 'Deactivated' } : a))
    );
    setSelectedAdmin((prev) => (prev ? { ...prev, accountStatus: 'Deactivated' } : null));

    logAdminAction({
      actionType: 'ADMIN_ACCOUNT_DEACTIVATED',
      targetId: selectedAdmin.id,
      targetName: selectedAdmin.name,
      details: `Deactivated administrative account. Reason: ${reason || 'Administrative protocol revocation.'}`,
      category: 'Authentication',
    });

    setDeactivateDialogOpen(false);
  };

  // Action: Reactivate Admin Account
  const handleReactivateConfirm = () => {
    if (!selectedAdmin) return;

    setAdmins((prev) =>
      prev.map((a) => (a.id === selectedAdmin.id ? { ...a, accountStatus: 'Active' } : a))
    );
    setSelectedAdmin((prev) => (prev ? { ...prev, accountStatus: 'Active' } : null));

    logAdminAction({
      actionType: 'ADMIN_ACCOUNT_REACTIVATED',
      targetId: selectedAdmin.id,
      targetName: selectedAdmin.name,
      details: `Reactivated administrative access privileges for ${selectedAdmin.role}.`,
      category: 'Authentication',
    });

    setReactivateDialogOpen(false);
  };

  // Action: Reset Password
  const handleResetPasswordConfirm = () => {
    if (!selectedAdmin) return;

    setAdmins((prev) =>
      prev.map((a) => (a.id === selectedAdmin.id ? { ...a, accountStatus: 'Pending Password Reset' } : a))
    );
    setSelectedAdmin((prev) => (prev ? { ...prev, accountStatus: 'Pending Password Reset' } : null));

    logAdminAction({
      actionType: 'ADMIN_PASSWORD_RESET_TRIGGERED',
      targetId: selectedAdmin.id,
      targetName: selectedAdmin.name,
      details: `Issued temporary credential reset email to ${selectedAdmin.email}. Account flagged for password renewal on next login.`,
      category: 'Authentication',
    });

    setResetPasswordDialogOpen(false);
  };

  // Action: Reassign Role
  const handleReassignRoleConfirm = () => {
    if (!selectedAdmin) return;

    const oldRole = selectedAdmin.role;
    setAdmins((prev) =>
      prev.map((a) => (a.id === selectedAdmin.id ? { ...a, role: selectedNewRole } : a))
    );
    setSelectedAdmin((prev) => (prev ? { ...prev, role: selectedNewRole } : null));

    logAdminAction({
      actionType: 'ADMIN_ROLE_REASSIGNED',
      targetId: selectedAdmin.id,
      targetName: selectedAdmin.name,
      details: `Reassigned administrative role from "${oldRole}" to "${selectedNewRole}".`,
      category: 'Authentication',
    });

    setReassignRoleModalOpen(false);
  };

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* 1. Summary Information Panels */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 3.5,
        }}
      >
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Total LGU Administrators</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>{totalCount}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Active Staff Accounts</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#2E7D32' }}>{activeCount}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Pending Password Reset</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--sakay-orange)' }}>{pendingResetCount}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Deactivated Accounts</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#C62828' }}>{deactivatedCount}</Typography>
        </Box>
      </Box>

      {/* 2. Filter Toolbar with "+ Add Admin" Action */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'stretch' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <FilterToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search admin by name, email, or ID..."
            selectFilters={[
              {
                id: 'role',
                label: 'Role',
                value: roleFilter,
                options: roleOptions,
                onChange: setRoleFilter,
              },
              {
                id: 'status',
                label: 'Status',
                value: statusFilter,
                options: statusOptions,
                onChange: setStatusFilter,
              },
            ]}
            onResetFilters={() => {
              setSearchQuery('');
              setRoleFilter('All');
              setStatusFilter('All');
            }}
            disableMarginBottom
          />
        </Box>

        <Button
          onClick={() => setAddModalOpen(true)}
          startIcon={<PersonAddIcon fontSize="small" />}
          variant="contained"
          sx={{
            height: 'auto',
            alignSelf: 'stretch',
            padding: '0 24px',
            borderRadius: 'var(--mac-radius-lg)',
            textTransform: 'none',
            fontSize: '14px',
            fontWeight: 600,
            backgroundColor: 'var(--sakay-orange)',
            color: '#FFFFFF',
            whiteSpace: 'nowrap',
            boxShadow: 'var(--mac-shadow-subtle)',
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'var(--mac-transition-fast)',
            '&:hover': {
              backgroundColor: 'var(--sakay-orange-hover)',
            },
          }}
        >
          Add Admin Account
        </Button>
      </Box>

      {/* 3. LGU Administrators Table */}
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
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ADMINISTRATOR</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>EMAIL & CONTACT</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ASSIGNED ROLE</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACCOUNT STATUS</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>LAST LOGIN</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAdmins.length > 0 ? (
              filteredAdmins.map((admin) => {
                const roleChip = getRoleChipStyle(admin.role);
                return (
                  <TableRow
                    key={admin.id}
                    sx={{
                      transition: 'var(--mac-transition-fast)',
                      '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                    }}
                  >
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                          sx={{
                            width: 38,
                            height: 38,
                            backgroundColor: roleChip.bg,
                            color: roleChip.color,
                            fontSize: '14px',
                            fontWeight: 700,
                          }}
                        >
                          {admin.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 600, fontSize: '14.5px', color: 'var(--mac-text-primary)' }}>
                            {admin.name}
                          </Typography>
                          <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                            ID: {admin.id} • Created: {admin.createdAt}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-primary)', fontWeight: 500 }}>
                        {admin.email}
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                        {admin.contactNumber}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <Chip
                        label={admin.role}
                        size="small"
                        sx={{
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: roleChip.bg,
                          color: roleChip.color,
                          border: `1px solid ${roleChip.border}`,
                          height: 26,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <StatusBadge status={admin.accountStatus} />
                    </TableCell>
                    <TableCell sx={{ fontSize: '13px', color: 'var(--mac-text-secondary)', py: 2.2, px: 3 }}>
                      {admin.lastLogin || 'Never'}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 2.2, px: 3 }}>
                      <ActionButton
                        label="Manage"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAdmin(admin);
                          setSelectedNewRole(admin.role);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography sx={{ fontSize: '15px', color: 'var(--mac-text-muted)', fontWeight: 500 }}>
                    No administrator accounts found matching your filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 4. Add Admin Modal */}
      <MacCenterModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add LGU Administrator Account"
        subtitle="Provision a municipal staff account with role-based permissions."
        maxWidth={620}
        primaryActionLabel="Create Admin Account"
        onPrimaryAction={handleAddAdminSubmit}
        secondaryActionLabel="Cancel"
        onSecondaryAction={() => setAddModalOpen(false)}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box sx={{ backgroundColor: 'var(--sakay-orange-soft)', border: '1px solid var(--sakay-orange-border)', padding: '14px 18px', borderRadius: '10px' }}>
            <Typography sx={{ fontSize: '13px', color: '#9A3412', lineHeight: 1.4 }}>
              <strong>First-Login Protocol:</strong> Newly created accounts are assigned the <em>Pending Password Reset</em> status. The user will be required to configure a secure password upon their initial login.
            </Typography>
          </Box>

          <TextField
            fullWidth
            label="Full Name & Title"
            placeholder="e.g. Maria Elena Santos"
            value={newAdminName}
            onChange={(e) => setNewAdminName(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                '&.Mui-focused fieldset': { borderColor: 'var(--sakay-orange)' },
              },
            }}
          />

          <TextField
            fullWidth
            label="Official Municipal Email"
            placeholder="e.g. m.santos@calapan.gov.ph"
            type="email"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                '&.Mui-focused fieldset': { borderColor: 'var(--sakay-orange)' },
              },
            }}
          />

          <TextField
            fullWidth
            label="Official Contact Number"
            placeholder="e.g. +63 918 555 0102"
            value={newAdminPhone}
            onChange={(e) => setNewAdminPhone(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                '&.Mui-focused fieldset': { borderColor: 'var(--sakay-orange)' },
              },
            }}
          />

          <FormControl fullWidth>
            <InputLabel id="role-select-label">Administrative Role</InputLabel>
            <Select
              labelId="role-select-label"
              value={newAdminRole}
              label="Administrative Role"
              onChange={(e) => setNewAdminRole(e.target.value as LguAdminRecord['role'])}
              sx={{
                borderRadius: '10px',
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--sakay-orange)' },
              }}
            >
              <MenuItem value="Super Administrator">Super Administrator (Full System & User Control)</MenuItem>
              <MenuItem value="Verifier">Verifier (TODA & Driver Document Validation)</MenuItem>
              <MenuItem value="Incident Officer">Incident Officer (Complaints & Safety Triage)</MenuItem>
              <MenuItem value="Fare Administrator">Fare Administrator (Municipal Matrix & Rates)</MenuItem>
              <MenuItem value="Analytics Viewer">Analytics Viewer (Operational Reports & Insights)</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </MacCenterModal>

      {/* 5. Manage Admin Account Modal */}
      {selectedAdmin && (
        <MacCenterModal
          open={Boolean(selectedAdmin)}
          onClose={() => setSelectedAdmin(null)}
          title={`Administrator Profile — ${selectedAdmin.name}`}
          subtitle={`Account ID: ${selectedAdmin.id}`}
          badge={<StatusBadge status={selectedAdmin.accountStatus} />}
          maxWidth={680}
        >
          <Box sx={{ mb: 3 }}>
            {/* Overview Card */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5, backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px', mb: 3 }}>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Full Name</Typography>
                <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedAdmin.name}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Official Email</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedAdmin.email}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Assigned Role</Typography>
                <Chip
                  label={selectedAdmin.role}
                  size="small"
                  sx={{
                    ...getRoleChipStyle(selectedAdmin.role),
                    fontSize: '12px',
                    fontWeight: 600,
                    height: 26,
                  }}
                />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Last Session</Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 500, color: 'var(--mac-text-primary)' }}>{selectedAdmin.lastLogin || 'Never'}</Typography>
              </Box>
            </Box>

            {/* Quick Administrative Actions */}
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 2 }}>
              Account Governance Actions
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* Reset Password Action */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--mac-border-color)', backgroundColor: '#FAFAFC' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <LockResetIcon sx={{ color: 'var(--sakay-orange)' }} />
                  <Box>
                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      Trigger First-Login Password Reset
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
                      Forces the user to renew credentials on next login.
                    </Typography>
                  </Box>
                </Box>
                <ActionButton
                  label="Reset Password"
                  showArrow={false}
                  onClick={() => setResetPasswordDialogOpen(true)}
                  sx={{ height: 34, fontSize: '12.5px' }}
                />
              </Box>

              {/* Reassign Role Action */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--mac-border-color)', backgroundColor: '#FAFAFC' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <BadgeIcon sx={{ color: '#1565C0' }} />
                  <Box>
                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      Reassign Role Permissions
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
                      Adjust verification, fare, or incident privileges.
                    </Typography>
                  </Box>
                </Box>
                <ActionButton
                  label="Change Role"
                  showArrow={false}
                  onClick={() => setReassignRoleModalOpen(true)}
                  sx={{ height: 34, fontSize: '12.5px' }}
                />
              </Box>

              {/* Deactivate / Reactivate Action */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--mac-border-color)', backgroundColor: '#FAFAFC' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {selectedAdmin.accountStatus === 'Deactivated' ? (
                    <CheckCircleIcon sx={{ color: '#2E7D32' }} />
                  ) : (
                    <BlockIcon sx={{ color: '#DC2626' }} />
                  )}
                  <Box>
                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      {selectedAdmin.accountStatus === 'Deactivated' ? 'Reactivate Account Access' : 'Deactivate Administrator Account'}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
                      {selectedAdmin.accountStatus === 'Deactivated' ? 'Restore access to the LGU portal.' : 'Revoke administrative login immediately.'}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  onClick={() => {
                    if (selectedAdmin.accountStatus === 'Deactivated') {
                      setReactivateDialogOpen(true);
                    } else {
                      setDeactivateDialogOpen(true);
                    }
                  }}
                  variant="outlined"
                  size="small"
                  color={selectedAdmin.accountStatus === 'Deactivated' ? 'success' : 'error'}
                  sx={{
                    height: 34,
                    fontSize: '12.5px',
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: '8px',
                  }}
                >
                  {selectedAdmin.accountStatus === 'Deactivated' ? 'Reactivate' : 'Deactivate'}
                </Button>
              </Box>
            </Box>
          </Box>
        </MacCenterModal>
      )}

      {/* 6. Deactivate Confirmation Dialog */}
      {selectedAdmin && (
        <MacConfirmDialog
          open={deactivateDialogOpen}
          onClose={() => setDeactivateDialogOpen(false)}
          title="Deactivate Administrator Account?"
          message={`Are you sure you want to deactivate "${selectedAdmin.name}"? They will no longer be able to log in to the SAKAY LGU Portal.`}
          confirmLabel="Deactivate Account"
          confirmVariant="danger"
          requireReason
          reasonPlaceholder="Specify reason for deactivation (e.g. End of tenure, staff transfer)..."
          onConfirm={handleDeactivateConfirm}
        />
      )}

      {/* 7. Reactivate Confirmation Dialog */}
      {selectedAdmin && (
        <MacConfirmDialog
          open={reactivateDialogOpen}
          onClose={() => setReactivateDialogOpen(false)}
          title="Reactivate Administrator Account?"
          message={`Reactivate municipal portal access for "${selectedAdmin.name}"?`}
          confirmLabel="Reactivate Account"
          confirmVariant="orange"
          onConfirm={handleReactivateConfirm}
        />
      )}

      {/* 8. Reset Password Confirmation Dialog */}
      {selectedAdmin && (
        <MacConfirmDialog
          open={resetPasswordDialogOpen}
          onClose={() => setResetPasswordDialogOpen(false)}
          title="Trigger Password Reset?"
          message={`A temporary recovery link will be generated for "${selectedAdmin.name}". Account status will change to "Pending Password Reset".`}
          confirmLabel="Send Reset Link"
          confirmVariant="orange"
          onConfirm={handleResetPasswordConfirm}
        />
      )}

      {/* 9. Reassign Role Modal */}
      {selectedAdmin && (
        <MacCenterModal
          open={reassignRoleModalOpen}
          onClose={() => setReassignRoleModalOpen(false)}
          title={`Reassign Role — ${selectedAdmin.name}`}
          subtitle="Update administrative access permissions and capability scope."
          maxWidth={500}
          primaryActionLabel="Update Role"
          onPrimaryAction={handleReassignRoleConfirm}
          secondaryActionLabel="Cancel"
          onSecondaryAction={() => setReassignRoleModalOpen(false)}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="reassign-role-label">New Administrative Role</InputLabel>
              <Select
                labelId="reassign-role-label"
                value={selectedNewRole}
                label="New Administrative Role"
                onChange={(e) => setSelectedNewRole(e.target.value as LguAdminRecord['role'])}
                sx={{
                  borderRadius: '10px',
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--sakay-orange)' },
                }}
              >
                <MenuItem value="Super Administrator">Super Administrator</MenuItem>
                <MenuItem value="Verifier">Verifier</MenuItem>
                <MenuItem value="Incident Officer">Incident Officer</MenuItem>
                <MenuItem value="Fare Administrator">Fare Administrator</MenuItem>
                <MenuItem value="Analytics Viewer">Analytics Viewer</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </MacCenterModal>
      )}
    </Box>
  );
};
