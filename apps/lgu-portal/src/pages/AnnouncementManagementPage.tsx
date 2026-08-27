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
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import AddAlertIcon from '@mui/icons-material/AddAlert';
import PublishIcon from '@mui/icons-material/Publish';
import UnpublishedIcon from '@mui/icons-material/Unpublished';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import { AnnouncementRecord, AccreditedTodaRecord, CURRENT_ADMIN } from '../mockData/adminData';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { MacConfirmDialog } from '../components/admin/MacConfirmDialog';
import { TableEmptyState } from '../components/common/TableEmptyState';
import {
  fetchAnnouncements,
  fetchAccreditedTodas,
  createAnnouncement,
  deleteAnnouncement,
  recordAdminAuditAction,
} from '../services/adminApiService';

/**
 * ============================================================================
 * ANNOUNCEMENT MANAGEMENT PAGE COMPONENT
 * ============================================================================
 * Purpose:
 *   Enables LGU Transport Administrators to draft, broadcast, schedule,
 *   and archive city-wide municipal notices targeted to commuters,
 *   tricycle drivers, or specific TODA associations.
 * ============================================================================
 */
export const AnnouncementManagementPage: React.FC = () => {
  // State: Broadcast bulletins list and filter options
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [todasList, setTodasList] = useState<AccreditedTodaRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Selected announcement for detail/management
  const [selectedAnn, setSelectedAnn] = useState<AnnouncementRecord | null>(null);

  // Modals & Dialogs
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form State: Creating a new announcement
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formRole, setFormRole] = useState<AnnouncementRecord['target_role']>('All');
  const [formTodaId, setFormTodaId] = useState<string>('all-todas');
  const [formTiming, setFormTiming] = useState<'Immediate' | 'Scheduled'>('Immediate');
  const [formScheduledDate, setFormScheduledDate] = useState('May 25, 2026');

  /**
   * Effect: Fetch live municipal announcements and accredited TODAs on initial mount.
   */
  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchAnnouncements(), fetchAccreditedTodas()])
      .then(([annData, todaData]) => {
        if (isMounted) {
          setAnnouncements(annData || []);
          setTodasList(todaData || []);
        }
      })
      .catch((err) => {
        console.warn('[AnnouncementManagement] Failed to fetch data:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter logic: Search by title, message, or TODA name
  const filteredAnnouncements = announcements.filter((ann) => {
    const matchesSearch =
      ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ann.toda_name && ann.toda_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === 'All' || ann.target_role === roleFilter;
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Published' && ann.is_published) ||
      (statusFilter === 'Draft / Unpublished' && !ann.is_published);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // KPI stat counts
  const totalCount = announcements.length;
  const publishedCount = announcements.filter((a) => a.is_published).length;
  const todaScopedCount = announcements.filter((a) => a.toda_id !== null).length;
  const draftCount = announcements.filter((a) => !a.is_published).length;

  const roleOptions: FilterOption[] = [
    { label: 'All Audiences', value: 'All' },
    { label: 'All Users', value: 'All' },
    { label: 'Passengers', value: 'Passenger' },
    { label: 'Drivers', value: 'Driver' },
    { label: 'TODA Administrators', value: 'TODA Administrator' },
  ];

  const statusOptions: FilterOption[] = [
    { label: 'All Statuses', value: 'All' },
    { label: 'Published', value: 'Published' },
    { label: 'Draft / Unpublished', value: 'Draft / Unpublished' },
  ];

  const getRoleBadgeStyle = (role: AnnouncementRecord['target_role']) => {
    switch (role) {
      case 'All':
        return { bg: 'rgba(255, 107, 26, 0.12)', color: 'var(--sakay-orange)' };
      case 'Passenger':
        return { bg: 'rgba(26, 115, 232, 0.12)', color: '#1A73E8' };
      case 'Driver':
        return { bg: 'rgba(46, 125, 50, 0.12)', color: '#2E7D32' };
      case 'TODA Administrator':
        return { bg: 'rgba(106, 27, 154, 0.12)', color: '#6A1B9A' };
      default:
        return { bg: '#F1F3F4', color: '#5F6368' };
    }
  };

  /**
   * Action Handler: Submits a new broadcast announcement.
   * Persists to backend API and writes to immutable audit trail.
   */
  const handleCreateSubmit = async () => {
    if (!formTitle.trim() || !formMessage.trim()) return;

    let todaName: string | null = null;
    if (formTodaId !== 'all-todas' && formRole !== 'All') {
      const todaMatch = todasList.find((t) => t.id === formTodaId);
      todaName = todaMatch ? todaMatch.name : 'Selected TODA';
    } else {
      todaName = formRole === 'All' ? 'All City TODAs & Commuters' : `All ${formRole}s`;
    }

    const newId = `ANN-2026-00${announcements.length + 1}`;
    const newRecord: AnnouncementRecord = {
      id: newId,
      announcement_id: `ANN-00${announcements.length + 1}`,
      title: formTitle.trim(),
      message: formMessage.trim(),
      target_role: formRole,
      toda_id: formTodaId === 'all-todas' ? null : formTodaId,
      toda_name: todaName,
      is_published: formTiming === 'Immediate',
      publish_timing: formTiming,
      scheduled_date: formTiming === 'Scheduled' ? formScheduledDate : undefined,
      created_by_lgu_admin: `${CURRENT_ADMIN.name} (${CURRENT_ADMIN.role})`,
      created_at: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + ' • ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };

    // Backend API Call
    try {
      await createAnnouncement({
        title: formTitle.trim(),
        message: formMessage.trim(),
        targetRole: formRole,
      });
    } catch (err) {
      console.warn('[AnnouncementManagement] Backend error during announcement create:', err);
    }

    setAnnouncements((prev) => [newRecord, ...prev]);

    // Record in Audit Trail
    recordAdminAuditAction({
      actionType: formTiming === 'Immediate' ? 'ANNOUNCEMENT_PUBLISHED' : 'ANNOUNCEMENT_SCHEDULED',
      targetId: newId,
      targetName: newRecord.title,
      details: `Created announcement "${newRecord.title}" targeted for ${newRecord.target_role} (${todaName}). Status: ${newRecord.is_published ? 'Published' : 'Draft/Scheduled'}.`,
      category: 'Announcement',
    });

    // Reset Form
    setFormTitle('');
    setFormMessage('');
    setFormRole('All');
    setFormTodaId('all-todas');
    setFormTiming('Immediate');
    setCreateModalOpen(false);
  };

  /**
   * Action Handler: Toggles published vs unpublished status.
   */
  const handleTogglePublish = (ann: AnnouncementRecord) => {
    const nextPublished = !ann.is_published;
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === ann.id ? { ...a, is_published: nextPublished } : a))
    );
    setSelectedAnn((prev) => (prev && prev.id === ann.id ? { ...prev, is_published: nextPublished } : prev));

    recordAdminAuditAction({
      actionType: nextPublished ? 'ANNOUNCEMENT_PUBLISHED' : 'ANNOUNCEMENT_UNPUBLISHED',
      targetId: ann.id,
      targetName: ann.title,
      details: `${nextPublished ? 'Published' : 'Unpublished/Archived'} announcement broadcast "${ann.title}".`,
      category: 'Announcement',
    });
  };

  /**
   * Action Handler: Deletes an announcement record.
   */
  const handleDeleteConfirm = async () => {
    if (!selectedAnn) return;

    // Backend API Call
    try {
      await deleteAnnouncement(selectedAnn.id);
    } catch (err) {
      console.warn('[AnnouncementManagement] Backend error during announcement delete:', err);
    }

    setAnnouncements((prev) => prev.filter((a) => a.id !== selectedAnn.id));

    recordAdminAuditAction({
      actionType: 'ANNOUNCEMENT_DELETED',
      targetId: selectedAnn.id,
      targetName: selectedAnn.title,
      details: `Deleted municipal announcement record "${selectedAnn.title}".`,
      category: 'Announcement',
    });

    setDeleteDialogOpen(false);
    setSelectedAnn(null);
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
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '16px 20px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '10.4px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Total Announcements</Typography>
          <Typography sx={{ fontSize: '22.4px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>{totalCount}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '16px 20px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '10.4px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Active Broadcasts</Typography>
          <Typography sx={{ fontSize: '22.4px', fontWeight: 700, color: '#2E7D32' }}>{publishedCount}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '16px 20px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '10.4px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>TODA Scoped Notices</Typography>
          <Typography sx={{ fontSize: '22.4px', fontWeight: 700, color: '#1565C0' }}>{todaScopedCount}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '16px 20px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '10.4px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Drafts / Scheduled</Typography>
          <Typography sx={{ fontSize: '22.4px', fontWeight: 700, color: 'var(--sakay-orange)' }}>{draftCount}</Typography>
        </Box>
      </Box>

      {/* 2. Filter Toolbar with "+ New Announcement" */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'stretch' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <FilterToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search announcement title, text, or TODA scope..."
            selectFilters={[
              {
                id: 'role',
                label: 'Audience',
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
          onClick={() => {
            setFormTitle('');
            setFormMessage('');
            setFormRole('All');
            setFormTodaId('all-todas');
            setFormTiming('Immediate');
            setCreateModalOpen(true);
          }}
          startIcon={<AddAlertIcon fontSize="small" />}
          variant="contained"
          sx={{
            height: 'auto',
            alignSelf: 'stretch',
            padding: '0 24px',
            borderRadius: 'var(--mac-radius-lg)',
            textTransform: 'none',
            fontSize: '11.3px',
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
          New Announcement
        </Button>
      </Box>

      {/* 3. Announcements Table */}
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
              <TableCell sx={{ fontWeight: 600, fontSize: '10.4px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ANNOUNCEMENT TITLE & MESSAGE</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '10.4px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>TARGET AUDIENCE</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '10.4px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>TODA / JURISDICTION</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '10.4px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>STATUS</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '10.4px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>CREATED BY & DATE</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '10.4px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAnnouncements.length > 0 ? (
              filteredAnnouncements.map((ann) => {
                const roleBadge = getRoleBadgeStyle(ann.target_role);
                return (
                  <TableRow
                    key={ann.id}
                    sx={{
                      transition: 'var(--mac-transition-fast)',
                      '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                    }}
                  >
                    <TableCell sx={{ py: 2.2, px: 3, maxWidth: 360 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '11.6px', color: 'var(--mac-text-primary)' }}>
                        {ann.title}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '10px',
                          color: 'var(--mac-text-muted)',
                          mt: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {ann.message}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <Chip
                        label={ann.target_role === 'All' ? 'All Platform Users' : `${ann.target_role}s`}
                        size="small"
                        sx={{
                          fontSize: '9.6px',
                          fontWeight: 600,
                          backgroundColor: roleBadge.bg,
                          color: roleBadge.color,
                          height: 26,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '10.8px', color: 'var(--mac-text-secondary)', py: 2.2, px: 3 }}>
                      {ann.toda_name || 'City-Wide'}
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <StatusBadge status={ann.is_published ? 'Published' : 'Draft'} />
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <Typography sx={{ fontSize: '10.8px', color: 'var(--mac-text-primary)', fontWeight: 500 }}>
                        {ann.created_by_lgu_admin.split('(')[0]}
                      </Typography>
                      <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                        {ann.created_at}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 2.2, px: 3 }}>
                      <ActionButton
                        label="Manage"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnn(ann);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableEmptyState
                colSpan={6}
                icon={<CampaignIcon />}
                title="No announcements yet."
                description={
                  searchQuery || roleFilter !== 'All' || statusFilter !== 'All'
                    ? 'No announcements match your search or filter parameters.'
                    : 'Municipal announcements and broadcast messages will appear here once you publish them.'
                }
                onRefresh={async () => {
                  setIsLoading(true);
                  try {
                    const data = await fetchAnnouncements();
                    setAnnouncements(data || []);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                isRefreshing={isLoading}
              />
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 4. New Announcement Modal */}
      <MacCenterModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Compose Municipal Announcement"
        subtitle="Broadcast notices, route advisories, or compliance reminders."
        maxWidth={680}
        primaryActionLabel={formTiming === 'Immediate' ? 'Publish Broadcast Now' : 'Save & Schedule'}
        onPrimaryAction={handleCreateSubmit}
        secondaryActionLabel="Cancel"
        onSecondaryAction={() => setCreateModalOpen(false)}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            fullWidth
            label="Announcement Headline / Title"
            placeholder="e.g. Annual Franchise Renewal Advisory"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Official Message Body"
            placeholder="Enter official advisory, instructions, or regulatory details for commuters or operators..."
            value={formMessage}
            onChange={(e) => setFormMessage(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="target-audience-label">Target Audience</InputLabel>
              <Select
                labelId="target-audience-label"
                value={formRole}
                label="Target Audience"
                onChange={(e) => setFormRole(e.target.value as AnnouncementRecord['target_role'])}
                sx={{ borderRadius: '10px' }}
              >
                <MenuItem value="All">All Users (Passengers, Drivers, TODAs)</MenuItem>
                <MenuItem value="Passenger">Passengers Only</MenuItem>
                <MenuItem value="Driver">Tricycle Drivers Only</MenuItem>
                <MenuItem value="TODA Administrator">TODA Administrators Only</MenuItem>
              </Select>
            </FormControl>

            {formRole !== 'All' ? (
              <FormControl fullWidth>
                <InputLabel id="toda-scope-label">TODA Scope</InputLabel>
                <Select
                  labelId="toda-scope-label"
                  value={formTodaId}
                  label="TODA Scope"
                  onChange={(e) => setFormTodaId(e.target.value)}
                  sx={{ borderRadius: '10px' }}
                >
                  <MenuItem value="all-todas">All City TODAs (City-Wide)</MenuItem>
                  {todasList.map((toda) => (
                    <MenuItem key={toda.id} value={toda.id}>
                      {toda.name} ({toda.barangay})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', backgroundColor: '#F8F9FA', padding: '0 16px', borderRadius: '10px', border: '1px solid var(--mac-border-color)' }}>
                <Typography sx={{ fontSize: '10.4px', color: 'var(--mac-text-muted)' }}>
                  Jurisdiction: <strong>City-Wide (All Sectors)</strong>
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ backgroundColor: '#FAFAFC', padding: '16px 20px', borderRadius: '10px', border: '1px solid var(--mac-border-color)' }}>
            <Typography sx={{ fontSize: '10.4px', fontWeight: 600, color: 'var(--mac-text-primary)', mb: 1 }}>
              Broadcast Publishing Schedule
            </Typography>
            <RadioGroup
              row
              value={formTiming}
              onChange={(e) => setFormTiming(e.target.value as 'Immediate' | 'Scheduled')}
            >
              <FormControlLabel value="Immediate" control={<Radio sx={{ color: 'var(--sakay-orange)', '&.Mui-checked': { color: 'var(--sakay-orange)' } }} />} label="Publish Immediately" />
              <FormControlLabel value="Scheduled" control={<Radio sx={{ color: 'var(--sakay-orange)', '&.Mui-checked': { color: 'var(--sakay-orange)' } }} />} label="Schedule for Future Date" />
            </RadioGroup>

            {formTiming === 'Scheduled' && (
              <TextField
                fullWidth
                size="small"
                label="Target Broadcast Date"
                value={formScheduledDate}
                onChange={(e) => setFormScheduledDate(e.target.value)}
                sx={{ mt: 1.5, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              />
            )}
          </Box>
        </Box>
      </MacCenterModal>

      {/* 5. Manage Announcement Modal */}
      {selectedAnn && (
        <MacCenterModal
          open={Boolean(selectedAnn)}
          onClose={() => setSelectedAnn(null)}
          title={selectedAnn.title}
          subtitle={`Announcement ID: ${selectedAnn.announcement_id} • Target: ${selectedAnn.target_role}`}
          badge={<StatusBadge status={selectedAnn.is_published ? 'Published' : 'Draft'} />}
          maxWidth={700}
        >
          <Box sx={{ mb: 3 }}>
            <Box sx={{ backgroundColor: '#FAFAFC', padding: '20px', borderRadius: '12px', border: '1px solid var(--mac-border-color)', mb: 3 }}>
              <Typography sx={{ fontSize: '11.6px', color: 'var(--mac-text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                "{selectedAnn.message}"
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, backgroundColor: '#F5F5F7', padding: '18px', borderRadius: '12px', mb: 3 }}>
              <Box>
                <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>Target Audience</Typography>
                <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedAnn.target_role}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>TODA Scope</Typography>
                <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedAnn.toda_name || 'City-Wide'}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>Author / Officer</Typography>
                <Typography sx={{ fontSize: '11.3px', fontWeight: 500, color: 'var(--mac-text-primary)' }}>{selectedAnn.created_by_lgu_admin}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>Timestamp</Typography>
                <Typography sx={{ fontSize: '11.3px', fontWeight: 500, color: 'var(--mac-text-primary)' }}>{selectedAnn.created_at}</Typography>
              </Box>
            </Box>

            {/* Actions Bar */}
            <Typography sx={{ fontSize: '10.4px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1.5 }}>
              Publication Controls
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--mac-border-color)', backgroundColor: '#FFFFFF' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {selectedAnn.is_published ? <PublishIcon sx={{ color: '#2E7D32' }} /> : <UnpublishedIcon sx={{ color: '#EA580C' }} />}
                <Box>
                  <Typography sx={{ fontSize: '11.3px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                    {selectedAnn.is_published ? 'Currently Active on Mobile PWAs' : 'Unpublished (Hidden from Users)'}
                  </Typography>
                  <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>
                    {selectedAnn.is_published ? 'Commuters and drivers can view this broadcast.' : 'Save changes or publish to make visible.'}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  onClick={() => {
                    setFormTitle(selectedAnn.title);
                    setFormMessage(selectedAnn.message);
                    setFormRole(selectedAnn.target_role);
                    setFormTodaId(selectedAnn.toda_id || 'all-todas');
                    setFormTiming(selectedAnn.publish_timing || 'Immediate');
                    setSelectedAnn(null);
                    setCreateModalOpen(true);
                  }}
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon fontSize="small" />}
                  sx={{
                    height: 34,
                    fontSize: '10px',
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: '8px',
                    color: 'var(--sakay-orange)',
                    borderColor: 'var(--sakay-orange-border)',
                    backgroundColor: 'var(--sakay-orange-soft)',
                    '&:hover': { backgroundColor: 'var(--sakay-orange)', color: '#FFFFFF' },
                  }}
                >
                  Edit Announcement
                </Button>

                <Button
                  onClick={() => handleTogglePublish(selectedAnn)}
                  variant="outlined"
                  size="small"
                  sx={{
                    height: 34,
                    fontSize: '10px',
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: '8px',
                    color: selectedAnn.is_published ? '#C2410C' : '#2E7D32',
                    borderColor: selectedAnn.is_published ? '#FDBA74' : '#A7F3D0',
                    '&:hover': { backgroundColor: selectedAnn.is_published ? '#FFF7ED' : '#ECFDF5' },
                  }}
                >
                  {selectedAnn.is_published ? 'Unpublish' : 'Publish Broadcast'}
                </Button>

                <Button
                  onClick={() => setDeleteDialogOpen(true)}
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon fontSize="small" />}
                  sx={{
                    height: 34,
                    fontSize: '10px',
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: '8px',
                  }}
                >
                  Delete
                </Button>
              </Box>
            </Box>
          </Box>
        </MacCenterModal>
      )}

      {/* 6. Delete Confirmation Dialog */}
      {selectedAnn && (
        <MacConfirmDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          title="Delete Announcement?"
          message={`Are you sure you want to permanently delete "${selectedAnn.title}"? This cannot be undone.`}
          confirmLabel="Delete Announcement"
          confirmVariant="danger"
          onConfirm={handleDeleteConfirm}
        />
      )}
    </Box>
  );
};

