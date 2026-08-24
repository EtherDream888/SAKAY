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
  Avatar,
  TextField,
  MenuItem,
  Chip,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LockResetIcon from '@mui/icons-material/LockReset';
import EditIcon from '@mui/icons-material/Edit';
import KeyIcon from '@mui/icons-material/Key';
import SecurityIcon from '@mui/icons-material/Security';

import { MOCK_LGU_ADMINS, LguAdminRecord, CURRENT_ADMIN } from '../mockData/adminData';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { MacConfirmDialog } from '../components/admin/MacConfirmDialog';
import { logAdminAction } from '../lib/auditLog';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';

/**
 * ============================================================================
 * LGU ADMINISTRATOR ACCOUNT MANAGEMENT (AccountManagementPage.tsx)
 * ============================================================================
 * Checklist Scope:
 *   ● Manage Account Information
 *     ○ View account information
 *     ○ Update account information
 *     ○ Change password
 *   ● Staff Administration:
 *     ○ Manage system user accounts, roles, privileges, and credentials
 * ============================================================================
 */
export const AccountManagementPage: React.FC = () => {
  const { adminProfile, user } = useAuth();
  const [admins, setAdmins] = useState<LguAdminRecord[]>(MOCK_LGU_ADMINS);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Self Profile & Password State
  const [selfName, setSelfName] = useState(adminProfile?.full_name || CURRENT_ADMIN.name);
  const [selfPhone, setSelfPhone] = useState(adminProfile?.contact_number || '+63 917 889 0012');
  const [selfPosition, setSelfPosition] = useState(adminProfile?.position || 'Super Administrator');

  // Self Modal States
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Selected Admin for Detail / Manage Modal
  const [selectedAdmin, setSelectedAdmin] = useState<LguAdminRecord | null>(null);

  // Modal / Dialog States for Staff Management
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

  // Self Profile Update Handler
  const handleUpdateSelfProfile = async () => {
    try {
      if (adminProfile?.admin_id) {
        await supabase
          .from('lgu_admin')
          .update({
            full_name: selfName,
            contact_number: selfPhone,
          })
          .eq('admin_id', adminProfile.admin_id);
      }

      logAdminAction({
        actionType: 'ADMIN_PROFILE_UPDATED',
        targetId: adminProfile?.admin_id || 'SELF',
        targetName: selfName,
        details: `Updated own profile information (Name: ${selfName}, Phone: ${selfPhone}).`,
        category: 'Authentication',
      });

      setEditProfileOpen(false);
    } catch (err) {
      console.error('[AccountManagementPage] Update profile error:', err);
    }
  };

  // Password Change Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordMsg(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
      logAdminAction({
        actionType: 'ADMIN_PASSWORD_CHANGED',
        targetId: user?.id || 'SELF',
        targetName: selfName,
        details: 'Successfully updated administrator authentication password credentials.',
        category: 'Authentication',
      });

      setTimeout(() => {
        setChangePasswordOpen(false);
        setNewPassword('');
        setConfirmPassword('');
        setPasswordMsg(null);
      }, 2000);
    } catch (err) {
      setPasswordMsg({ type: 'error', text: (err as Error).message });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

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
      default:
        return { bg: 'rgba(106, 27, 154, 0.12)', color: '#6A1B9A', border: 'rgba(106, 27, 154, 0.3)' };
    }
  };

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

    logAdminAction({
      actionType: 'ADMIN_ACCOUNT_CREATED',
      targetId: newId,
      targetName: newRecord.name,
      details: `Created new ${newRecord.role} account (${newRecord.email}) with required first-login password reset.`,
      category: 'Authentication',
    });

    setNewAdminName('');
    setNewAdminEmail('');
    setNewAdminPhone('');
    setNewAdminRole('Verifier');
    setAddModalOpen(false);
  };

  const handleDeactivateConfirm = (reason?: string) => {
    if (!selectedAdmin) return;
    setAdmins((prev) => prev.map((a) => (a.id === selectedAdmin.id ? { ...a, accountStatus: 'Deactivated' } : a)));
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

  const handleReactivateConfirm = () => {
    if (!selectedAdmin) return;
    setAdmins((prev) => prev.map((a) => (a.id === selectedAdmin.id ? { ...a, accountStatus: 'Active' } : a)));
    setSelectedAdmin((prev) => (prev ? { ...prev, accountStatus: 'Active' } : null));

    logAdminAction({
      actionType: 'ADMIN_ACCOUNT_REACTIVATED',
      targetId: selectedAdmin.id,
      targetName: selectedAdmin.name,
      details: `Reactivated administrative privileges for ${selectedAdmin.role}.`,
      category: 'Authentication',
    });
    setReactivateDialogOpen(false);
  };

  const handleResetPasswordConfirm = () => {
    if (!selectedAdmin) return;
    setAdmins((prev) => prev.map((a) => (a.id === selectedAdmin.id ? { ...a, accountStatus: 'Pending Password Reset' } : a)));
    setSelectedAdmin((prev) => (prev ? { ...prev, accountStatus: 'Pending Password Reset' } : null));

    logAdminAction({
      actionType: 'ADMIN_PASSWORD_RESET_TRIGGERED',
      targetId: selectedAdmin.id,
      targetName: selectedAdmin.name,
      details: `Issued temporary credential reset to ${selectedAdmin.email}.`,
      category: 'Authentication',
    });
    setResetPasswordDialogOpen(false);
  };

  const handleReassignRoleConfirm = () => {
    if (!selectedAdmin) return;
    const oldRole = selectedAdmin.role;
    setAdmins((prev) => prev.map((a) => (a.id === selectedAdmin.id ? { ...a, role: selectedNewRole } : a)));
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
      {/* 1. My Administrator Account Dossier (View, Update, Change Password) */}
      <Card
        sx={{
          mb: 4,
          borderRadius: 'var(--mac-radius-lg)',
          border: '1px solid var(--mac-border-color)',
          boxShadow: 'var(--mac-shadow-card)',
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            p: '20px 24px',
            borderBottom: '1px solid var(--mac-border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                width: 52,
                height: 52,
                backgroundColor: 'var(--sakay-orange-soft)',
                color: 'var(--sakay-orange)',
                fontWeight: 700,
                fontSize: 20,
                border: '2px solid var(--sakay-orange)',
              }}
            >
              {selfName.charAt(0)}
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: '18px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                {selfName}
              </Typography>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                {user?.email || adminProfile?.email || 'admin@calapan.gov.ph'} • {selfPosition}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button
              onClick={() => setEditProfileOpen(true)}
              startIcon={<EditIcon fontSize="small" />}
              variant="outlined"
              size="small"
              sx={{ textTransform: 'none', borderColor: 'var(--mac-border-color)', color: 'var(--mac-text-primary)', fontWeight: 600 }}
            >
              Update Information
            </Button>
            <Button
              onClick={() => setChangePasswordOpen(true)}
              startIcon={<KeyIcon fontSize="small" />}
              variant="contained"
              size="small"
              sx={{ textTransform: 'none', backgroundColor: 'var(--sakay-orange)', fontWeight: 600 }}
            >
              Change Password
            </Button>
          </Box>
        </Box>

        <CardContent sx={{ p: '20px 24px !important' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3 }}>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Staff Administrator ID</Typography>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)', mt: 0.5 }}>
                {adminProfile?.admin_id ? `ADM-${adminProfile.admin_id.slice(0, 8).toUpperCase()}` : 'LGU-ADM-001'}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Contact Number</Typography>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)', mt: 0.5 }}>
                {selfPhone}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Account Security Standing</Typography>
              <Box sx={{ mt: 0.5 }}>
                <StatusBadge status="Active" />
              </Box>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Assigned Access Role</Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip label={selfPosition} size="small" sx={{ fontWeight: 600, fontSize: '12px', backgroundColor: 'rgba(255, 107, 26, 0.12)', color: 'var(--sakay-orange)' }} />
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 2. Staff Accounts Ledger Title & Action */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '18px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
            LGU Staff Administrator Directory
          </Typography>
          <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mt: '2px' }}>
            Manage staff accounts, assign operational roles, and enforce security policies
          </Typography>
        </Box>
        <Button
          onClick={() => setAddModalOpen(true)}
          startIcon={<PersonAddIcon fontSize="small" />}
          variant="contained"
          size="small"
          sx={{ textTransform: 'none', backgroundColor: 'var(--sakay-orange)', fontWeight: 600 }}
        >
          + Add Staff Administrator
        </Button>
      </Box>

      {/* 3. Filter Toolbar */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search admin by name, email, or ID..."
        selectFilters={[
          { id: 'role', label: 'Role', value: roleFilter, options: roleOptions, onChange: setRoleFilter },
          { id: 'status', label: 'Status', value: statusFilter, options: statusOptions, onChange: setStatusFilter },
        ]}
        onResetFilters={() => {
          setSearchQuery('');
          setRoleFilter('All');
          setStatusFilter('All');
        }}
      />

      {/* 4. Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 'var(--mac-radius-lg)',
          border: '1px solid var(--mac-border-color)',
          boxShadow: 'var(--mac-shadow-card)',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
        }}
      >
        <Table>
          <TableHead sx={{ backgroundColor: '#FAFAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ADMINISTRATOR</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>CONTACT</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ASSIGNED ROLE</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>STATUS</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>LAST LOGIN</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAdmins.map((admin) => {
              const chipStyle = getRoleChipStyle(admin.role);
              return (
                <TableRow key={admin.id} sx={{ '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' } }}>
                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 34, height: 34, bgcolor: 'var(--sakay-orange-soft)', color: 'var(--sakay-orange)', fontWeight: 600, fontSize: 13 }}>
                        {admin.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{admin.name}</Typography>
                        <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>{admin.id}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-primary)' }}>{admin.email}</Typography>
                    <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>{admin.contactNumber}</Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Chip label={admin.role} size="small" sx={{ fontSize: '11.5px', fontWeight: 600, backgroundColor: chipStyle.bg, color: chipStyle.color, border: `1px solid ${chipStyle.border}`, height: 24 }} />
                  </TableCell>
                  <TableCell sx={{ py: 2, px: 3 }}>
                    <StatusBadge status={admin.accountStatus as any} />
                  </TableCell>
                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-primary)' }}>{admin.lastLogin}</Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 2, px: 3 }}>
                    <ActionButton label="Manage" onClick={() => setSelectedAdmin(admin)} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Self Profile Modal */}
      <Dialog open={editProfileOpen} onClose={() => setEditProfileOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '18px' }}>Update Account Information</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
          <TextField label="Full Name" value={selfName} onChange={(e) => setSelfName(e.target.value)} fullWidth size="small" />
          <TextField label="Contact Number" value={selfPhone} onChange={(e) => setSelfPhone(e.target.value)} fullWidth size="small" />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setEditProfileOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleUpdateSelfProfile} variant="contained" sx={{ textTransform: 'none', backgroundColor: 'var(--sakay-orange)' }}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '18px' }}>Change Account Password</DialogTitle>
        <form onSubmit={handleChangePassword}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
            {passwordMsg && <Alert severity={passwordMsg.type}>{passwordMsg.text}</Alert>}
            <TextField label="New Password (min 6 characters)" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required fullWidth size="small" />
            <TextField label="Confirm New Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required fullWidth size="small" />
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setChangePasswordOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button type="submit" disabled={isUpdatingPassword} variant="contained" sx={{ textTransform: 'none', backgroundColor: 'var(--sakay-orange)' }}>
              {isUpdatingPassword ? <CircularProgress size={20} sx={{ color: '#FFFFFF' }} /> : 'Update Password'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Staff Management Modals */}
      {selectedAdmin && (
        <MacCenterModal open={Boolean(selectedAdmin)} onClose={() => setSelectedAdmin(null)} title="Staff Account Dossier" subtitle={selectedAdmin.name} maxWidth={540}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-secondary)' }}>
              Email: <b>{selectedAdmin.email}</b> • Role: <b>{selectedAdmin.role}</b>
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
              <Button onClick={() => { setResetPasswordDialogOpen(true); }} variant="outlined" size="small" sx={{ textTransform: 'none' }}>
                Reset Password
              </Button>
              <Button onClick={() => { setReassignRoleModalOpen(true); }} variant="outlined" size="small" sx={{ textTransform: 'none' }}>
                Reassign Role
              </Button>
              {selectedAdmin.accountStatus === 'Active' ? (
                <Button onClick={() => setDeactivateDialogOpen(true)} color="error" variant="outlined" size="small" sx={{ textTransform: 'none' }}>
                  Deactivate
                </Button>
              ) : (
                <Button onClick={() => setReactivateDialogOpen(true)} color="success" variant="outlined" size="small" sx={{ textTransform: 'none' }}>
                  Reactivate
                </Button>
              )}
            </Box>
          </Box>
        </MacCenterModal>
      )}

      {/* Add Admin Dialog */}
      <Dialog open={addModalOpen} onClose={() => setAddModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '18px' }}>Add Staff Administrator</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
          <TextField label="Full Name *" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} required fullWidth size="small" />
          <TextField label="Official LGU Email *" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} required fullWidth size="small" />
          <TextField label="Mobile Contact" value={newAdminPhone} onChange={(e) => setNewAdminPhone(e.target.value)} fullWidth size="small" />
          <TextField select label="Administrative Role" value={newAdminRole} onChange={(e) => setNewAdminRole(e.target.value as any)} fullWidth size="small">
            <MenuItem value="Super Administrator">Super Administrator</MenuItem>
            <MenuItem value="Verifier">Verifier</MenuItem>
            <MenuItem value="Incident Officer">Incident Officer</MenuItem>
            <MenuItem value="Fare Administrator">Fare Administrator</MenuItem>
            <MenuItem value="Analytics Viewer">Analytics Viewer</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setAddModalOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleAddAdminSubmit} variant="contained" sx={{ textTransform: 'none', backgroundColor: 'var(--sakay-orange)' }}>Create Account</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
