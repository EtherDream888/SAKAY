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
  Button,
  TextField,
  MenuItem,
  Chip,
  FormControlLabel,
  Switch,
  Alert,
} from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import AddAlertIcon from '@mui/icons-material/AddAlert';
import PublishIcon from '@mui/icons-material/Publish';
import UnpublishedIcon from '@mui/icons-material/Unpublished';
import DeleteIcon from '@mui/icons-material/Delete';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

import { MOCK_TODA_ANNOUNCEMENTS, CURRENT_TODA_PROFILE, CURRENT_TODA_ADMIN } from '../mockData/todaData';
import { TodaAnnouncement } from '../types/toda';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { MacConfirmDialog } from '../components/admin/MacConfirmDialog';
import { logTodaAction } from '../lib/auditLog';

export const TodaAnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<TodaAnnouncement[]>(MOCK_TODA_ANNOUNCEMENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Selected announcement for detail modal
  const [selectedAnn, setSelectedAnn] = useState<TodaAnnouncement | null>(null);

  // Modals & Dialogs
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formCategory, setFormCategory] = useState<TodaAnnouncement['category']>('Terminal Rules');
  const [formUrgency, setFormUrgency] = useState<'Standard' | 'High Priority'>('Standard');
  const [formPush, setFormPush] = useState(true);

  // Filter Logic
  const filteredAnnouncements = announcements.filter((ann) => {
    const matchesSearch =
      ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'All' || ann.category === categoryFilter;
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Published' && ann.isPublished) ||
      (statusFilter === 'Draft' && !ann.isPublished);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // KPI counts
  const totalCount = announcements.length;
  const publishedCount = announcements.filter((a) => a.isPublished).length;
  const draftCount = announcements.filter((a) => !a.isPublished).length;

  const categoryOptions: FilterOption[] = [
    { label: 'All Categories', value: 'All' },
    { label: 'Terminal Rules', value: 'Terminal Rules' },
    { label: 'Document Renewal', value: 'Document Renewal' },
    { label: 'Meeting Notice', value: 'Meeting Notice' },
    { label: 'Safety Advisory', value: 'Safety Advisory' },
  ];

  const statusOptions: FilterOption[] = [
    { label: 'All Statuses', value: 'All' },
    { label: 'Published', value: 'Published' },
    { label: 'Draft', value: 'Draft' },
  ];

  // Action: Create Announcement
  const handleCreateSubmit = () => {
    if (!formTitle.trim() || !formMessage.trim()) return;

    const newId = `TODA-ANN-00${announcements.length + 1}`;
    const newRecord: TodaAnnouncement = {
      id: newId,
      title: formTitle.trim(),
      message: formMessage.trim(),
      category: formCategory,
      urgency: formUrgency,
      isPublished: true,
      sendPushNotification: formPush,
      createdBy: `${CURRENT_TODA_ADMIN.name} (${CURRENT_TODA_ADMIN.role})`,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + ' • ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };

    setAnnouncements((prev) => [newRecord, ...prev]);

    logTodaAction({
      actionType: 'ANNOUNCEMENT_PUBLISHED',
      targetId: newId,
      targetName: newRecord.title,
      details: `Published TODA driver broadcast "${newRecord.title}" under category "${newRecord.category}". Push: ${newRecord.sendPushNotification ? 'Yes' : 'No'}.`,
      category: 'Announcement',
    });

    setFormTitle('');
    setFormMessage('');
    setFormCategory('Terminal Rules');
    setFormUrgency('Standard');
    setFormPush(true);
    setCreateModalOpen(false);
  };

  // Action: Toggle Publish
  const handleTogglePublish = (ann: TodaAnnouncement) => {
    const nextState = !ann.isPublished;
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === ann.id ? { ...a, isPublished: nextState } : a))
    );
    setSelectedAnn((prev) => (prev && prev.id === ann.id ? { ...prev, isPublished: nextState } : prev));

    logTodaAction({
      actionType: nextState ? 'ANNOUNCEMENT_PUBLISHED' : 'ANNOUNCEMENT_UNPUBLISHED',
      targetId: ann.id,
      targetName: ann.title,
      details: `${nextState ? 'Published' : 'Unpublished/Archived'} announcement broadcast "${ann.title}".`,
      category: 'Announcement',
    });
  };

  // Action: Delete Announcement
  const handleDeleteConfirm = () => {
    if (!selectedAnn) return;

    setAnnouncements((prev) => prev.filter((a) => a.id !== selectedAnn.id));

    logTodaAction({
      actionType: 'ANNOUNCEMENT_DELETED',
      targetId: selectedAnn.id,
      targetName: selectedAnn.title,
      details: `Deleted TODA driver announcement "${selectedAnn.title}".`,
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
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2.5,
          mb: 3.5,
        }}
      >
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Total Announcements</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>{totalCount}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Active Broadcasts to Drivers</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#1E8E3E' }}>{publishedCount}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Drafts / Archived</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--sakay-orange)' }}>{draftCount}</Typography>
        </Box>
      </Box>

      {/* Scope Restriction Banner */}
      <Alert severity="info" sx={{ mb: 3, borderRadius: '10px' }}>
        <strong>TODA Audience Scope:</strong> Announcements composed here are transmitted exclusively to drivers affiliated with <strong>{CURRENT_TODA_PROFILE.name}</strong>. City-wide commuter or inter-TODA broadcasts are managed by the LGU Administrator.
      </Alert>

      {/* 2. Filter Toolbar */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <FilterToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search announcement title or message text..."
            selectFilters={[
              {
                id: 'category',
                label: 'Category',
                value: categoryFilter,
                options: categoryOptions,
                onChange: setCategoryFilter,
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
              setCategoryFilter('All');
              setStatusFilter('All');
            }}
          />
        </Box>

        <Button
          onClick={() => {
            setFormTitle('');
            setFormMessage('');
            setFormCategory('Terminal Rules');
            setFormUrgency('Standard');
            setFormPush(true);
            setCreateModalOpen(true);
          }}
          startIcon={<AddAlertIcon fontSize="small" />}
          variant="contained"
          sx={{
            height: 44,
            padding: '0 22px',
            borderRadius: '10px',
            textTransform: 'none',
            fontSize: '14px',
            fontWeight: 600,
            backgroundColor: 'var(--sakay-orange)',
            color: '#FFFFFF',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            '&:hover': { backgroundColor: 'var(--sakay-orange-hover)' },
          }}
        >
          New TODA Announcement
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
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ANNOUNCEMENT HEADLINE & MESSAGE</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>CATEGORY</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>TARGET AUDIENCE</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>STATUS</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>CREATED DATE</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAnnouncements.map((ann) => (
              <TableRow
                key={ann.id}
                onClick={() => setSelectedAnn(ann)}
                sx={{
                  cursor: 'pointer',
                  transition: 'var(--mac-transition-fast)',
                  '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                }}
              >
                <TableCell sx={{ py: 2.2, px: 3, maxWidth: 380 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '14.5px', color: 'var(--mac-text-primary)' }}>
                    {ann.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '12.5px',
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
                    label={ann.category}
                    size="small"
                    sx={{ fontSize: '12px', fontWeight: 600, backgroundColor: '#F1F3F4', color: '#5F6368', height: 26 }}
                  />
                </TableCell>
                <TableCell sx={{ py: 2.2, px: 3 }}>
                  <Chip
                    label="CCTODA Drivers"
                    size="small"
                    sx={{ fontSize: '12px', fontWeight: 600, backgroundColor: 'rgba(255, 107, 26, 0.12)', color: 'var(--sakay-orange)', height: 26 }}
                  />
                </TableCell>
                <TableCell sx={{ py: 2.2, px: 3 }}>
                  <StatusBadge status={ann.isPublished ? 'Published' : 'Draft'} />
                </TableCell>
                <TableCell sx={{ fontSize: '13px', color: 'var(--mac-text-secondary)', py: 2.2, px: 3 }}>
                  {ann.createdAt}
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
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 4. Compose Announcement Modal */}
      <MacCenterModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Compose TODA Driver Broadcast"
        subtitle={`Broadcast notice to all 24 affiliated ${CURRENT_TODA_PROFILE.acronym} drivers`}
        maxWidth={640}
        primaryActionLabel="Publish Announcement"
        onPrimaryAction={handleCreateSubmit}
        secondaryActionLabel="Cancel"
        onSecondaryAction={() => setCreateModalOpen(false)}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            fullWidth
            label="Announcement Title"
            placeholder="e.g. Mandatory Terminal Queue Rotation Reminder"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Broadcast Message"
            placeholder="Enter instructions, schedule notices, or tariff rules for driver members..."
            value={formMessage}
            onChange={(e) => setFormMessage(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              select
              fullWidth
              label="Topic Category"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as any)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            >
              <MenuItem value="Terminal Rules">Terminal Rules & Queue</MenuItem>
              <MenuItem value="Document Renewal">Document & Franchise Renewal</MenuItem>
              <MenuItem value="Meeting Notice">Meeting / Assembly Notice</MenuItem>
              <MenuItem value="Safety Advisory">Safety & Weather Advisory</MenuItem>
            </TextField>

            <TextField
              select
              fullWidth
              label="Urgency Level"
              value={formUrgency}
              onChange={(e) => setFormUrgency(e.target.value as any)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            >
              <MenuItem value="Standard">Standard Notice</MenuItem>
              <MenuItem value="High Priority">High Priority (Urgent Alert)</MenuItem>
            </TextField>
          </Box>

          <Box sx={{ p: '14px 18px', borderRadius: '10px', backgroundColor: '#FAFAFC', border: '1px solid var(--mac-border-color)' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formPush}
                  onChange={(e) => setFormPush(e.target.checked)}
                  color="warning"
                />
              }
              label={
                <Box>
                  <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                    Transmit Driver PWA Push Notification
                  </Typography>
                  <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
                    Alerts online and offline drivers immediately upon publishing.
                  </Typography>
                </Box>
              }
            />
          </Box>
        </Box>
      </MacCenterModal>

      {/* 5. Manage Announcement Modal */}
      {selectedAnn && (
        <MacCenterModal
          open={Boolean(selectedAnn)}
          onClose={() => setSelectedAnn(null)}
          title={selectedAnn.title}
          subtitle={`Category: ${selectedAnn.category} • Target: CCTODA Drivers`}
          badge={<StatusBadge status={selectedAnn.isPublished ? 'Published' : 'Draft'} />}
          maxWidth={660}
        >
          <Box sx={{ mb: 3 }}>
            <Box sx={{ backgroundColor: '#FAFAFC', padding: '20px', borderRadius: '12px', border: '1px solid var(--mac-border-color)', mb: 3 }}>
              <Typography sx={{ fontSize: '14.5px', color: 'var(--mac-text-primary)', lineHeight: 1.6 }}>
                "{selectedAnn.message}"
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, backgroundColor: '#F8F9FA', padding: '16px', borderRadius: '12px', mb: 3 }}>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Author / Officer</Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedAnn.createdBy}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Date Broadcasted</Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedAnn.createdAt}</Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '14px 18px', borderRadius: '10px', border: '1px solid var(--mac-border-color)', backgroundColor: '#FFFFFF' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {selectedAnn.isPublished ? <PublishIcon sx={{ color: '#1E8E3E' }} /> : <UnpublishedIcon sx={{ color: 'var(--sakay-orange)' }} />}
                <Box>
                  <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                    {selectedAnn.isPublished ? 'Active on Driver PWA' : 'Draft / Unpublished'}
                  </Typography>
                  <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
                    {selectedAnn.isPublished ? 'Visible in affiliated driver feeds.' : 'Hidden from driver screens.'}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  onClick={() => handleTogglePublish(selectedAnn)}
                  variant="outlined"
                  size="small"
                  sx={{
                    height: 34,
                    fontSize: '12.5px',
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: '8px',
                    color: selectedAnn.isPublished ? '#C2410C' : '#1E8E3E',
                  }}
                >
                  {selectedAnn.isPublished ? 'Unpublish' : 'Publish Broadcast'}
                </Button>

                <Button
                  onClick={() => setDeleteDialogOpen(true)}
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon fontSize="small" />}
                  sx={{
                    height: 34,
                    fontSize: '12.5px',
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

      {/* 6. Delete Dialog */}
      {selectedAnn && (
        <MacConfirmDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          title="Delete Announcement?"
          message={`Are you sure you want to delete "${selectedAnn.title}"?`}
          confirmLabel="Delete Announcement"
          confirmVariant="danger"
          onConfirm={handleDeleteConfirm}
        />
      )}
    </Box>
  );
};
