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
  Chip,
} from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InboxIcon from '@mui/icons-material/Inbox';

import { TodaAnnouncement } from '../types/toda';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { MacConfirmDialog } from '../components/admin/MacConfirmDialog';
import {
  fetchTodaAnnouncements,
  postTodaAnnouncement,
  deleteTodaAnnouncement,
  recordTodaAuditAction,
} from '../services/todaApiService';

// toda announcements broadcast management and driver mobile PWA push notifications
export const TodaAnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<TodaAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const loadAnnouncements = () => {
    setIsLoading(true);
    fetchTodaAnnouncements()
      .then((data) => setAnnouncements(data || []))
      .catch((err) => {
        console.error('[TodaAnnouncements] Error fetching from database:', err);
        setAnnouncements([]);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  // Selected announcement for detail/edit modal
  const [selectedAnn, setSelectedAnn] = useState<TodaAnnouncement | null>(null);
  const [editingAnn, setEditingAnn] = useState<TodaAnnouncement | null>(null);

  // Modals & Dialogs
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formCategory, setFormCategory] = useState<TodaAnnouncement['category']>('Terminal Rules');
  const [formUrgency, setFormUrgency] = useState<'Standard' | 'High Priority'>('Standard');

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

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingAnn(null);
    setFormTitle('');
    setFormMessage('');
    setFormCategory('Terminal Rules');
    setFormUrgency('Standard');
    setCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (ann: TodaAnnouncement) => {
    setSelectedAnn(null);
    setEditingAnn(ann);
    setFormTitle(ann.title);
    setFormMessage(ann.message);
    setFormCategory(ann.category);
    setFormUrgency(ann.urgency);
    setCreateModalOpen(true);
  };

  // Action: Create or Edit Announcement
  const handleSaveAnnouncement = async (isPublishingImmediately: boolean) => {
    if (!formTitle.trim() || !formMessage.trim()) return;

    try {
      await postTodaAnnouncement(formTitle.trim(), formMessage.trim(), formUrgency);
      loadAnnouncements();
    } catch (err) {
      console.error('[TodaAnnouncements] Save error:', err);
    }

    setFormTitle('');
    setFormMessage('');
    setCreateModalOpen(false);
    setEditingAnn(null);
  };

  // Action: Publish Existing Draft from Detail Modal
  const handlePublishDraft = (ann: TodaAnnouncement) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === ann.id ? { ...a, isPublished: true } : a))
    );
    setSelectedAnn(null);
  };

  // Action: Delete Announcement
  const handleDeleteConfirm = async () => {
    if (!selectedAnn) return;

    try {
      await deleteTodaAnnouncement(selectedAnn.id);
      loadAnnouncements();
    } catch (err) {
      console.error('[TodaAnnouncements] Delete error:', err);
      setAnnouncements((prev) => prev.filter((a) => a.id !== selectedAnn.id));
    }

    setDeleteDialogOpen(false);
    setSelectedAnn(null);
  };

  const isFormValid = formTitle.trim() && formMessage.trim();

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* 1. Summary KPI Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2.5,
          mb: 3.5,
        }}
      >
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Total TODA Announcements</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>{totalCount}</Typography>
        </Box>

        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Published to Driver App</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--sakay-orange)' }}>{publishedCount}</Typography>
        </Box>

        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Saved Drafts</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--mac-text-muted)' }}>{draftCount}</Typography>
        </Box>
      </Box>

      {/* 2. Floating Filter Toolbar + New Announcement Button */}
      <Box sx={{ display: 'flex', alignItems: { xs: 'stretch', md: 'stretch' }, gap: 2, mb: 3.5, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 280 }}>
          <FilterToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search announcement title or message content..."
            disableMarginBottom
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
                label: 'Publication Status',
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
          onClick={handleOpenCreate}
          startIcon={<CampaignIcon />}
          sx={{
            height: 'auto',
            alignSelf: 'stretch',
            px: 3,
            borderRadius: '12px',
            fontSize: '14.5px',
            fontWeight: 600,
            textTransform: 'none',
            backgroundColor: 'var(--sakay-orange)',
            color: '#FFFFFF',
            boxShadow: '0 8px 18px rgba(255, 107, 26, 0.24)',
            whiteSpace: 'nowrap',
            '&:hover': {
              backgroundColor: 'var(--sakay-orange-hover)',
            },
          }}
        >
          New Announcement
        </Button>
      </Box>

      {/* 3. Announcements List Table with Clean Fixed Action Column */}
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
              <TableCell sx={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ANNOUNCEMENT TITLE</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>CATEGORY</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>TARGET RECIPIENTS</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>CREATED BY & DATE</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>STATUS</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--mac-text-muted)', py: 2, px: 3, width: 140 }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAnnouncements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 7 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                    <InboxIcon sx={{ fontSize: 48, color: 'var(--mac-text-tertiary)' }} />
                    <Typography sx={{ fontSize: '16px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                      No Announcements Found
                    </Typography>
                    <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)' }}>
                      There are currently no announcements matching the "{statusFilter !== 'All' ? statusFilter : 'selected'}" filter criteria.
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filteredAnnouncements.map((ann) => (
                <TableRow key={ann.id} sx={{ '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' } }}>
                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      {ann.title}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '12.5px',
                        color: 'var(--mac-text-muted)',
                        mt: '2px',
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {ann.message}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Chip
                      label={ann.category}
                      size="small"
                      sx={{
                        fontSize: '12.5px',
                        fontWeight: 600,
                        backgroundColor: ann.urgency === 'High Priority' ? '#FEF2F2' : '#F1F3F4',
                        color: ann.urgency === 'High Priority' ? '#DC2626' : 'var(--mac-text-secondary)',
                      }}
                    />
                  </TableCell>

                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      TODA Driver App Members
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-primary)', fontWeight: 500 }}>
                      {ann.createdBy}
                    </Typography>
                    <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
                      {ann.createdAt}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ py: 2, px: 3 }}>
                    <StatusBadge status={ann.isPublished ? 'Published' : 'Draft'} />
                  </TableCell>

                  <TableCell align="right" sx={{ py: 2, px: 3 }}>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<VisibilityIcon sx={{ fontSize: 15 }} />}
                        onClick={() => setSelectedAnn(ann)}
                        sx={{
                          height: 34,
                          px: 1.75,
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 600,
                          textTransform: 'none',
                          whiteSpace: 'nowrap',
                          color: 'var(--mac-text-primary)',
                          borderColor: 'var(--mac-border-color)',
                          '&:hover': { backgroundColor: 'var(--sakay-orange-soft)', borderColor: 'var(--sakay-orange-border)' },
                        }}
                      >
                        View
                      </Button>

                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setSelectedAnn(ann);
                          setDeleteDialogOpen(true);
                        }}
                        sx={{
                          height: 34,
                          width: 34,
                          minWidth: 34,
                          padding: 0,
                          borderRadius: '8px',
                          color: '#DC2626',
                          borderColor: '#FECACA',
                          '&:hover': { backgroundColor: '#FEF2F2', borderColor: '#DC2626' },
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 4. Create / Edit Announcement Centered Modal */}
      <MacCenterModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={editingAnn ? "Edit TODA Announcement" : "Create New TODA Announcement"}
        subtitle="Broadcast notice to TODA drivers via their Driver App"
        maxWidth={700}
        primaryActionLabel={isFormValid ? (editingAnn ? "Save Announcement" : "Publish Announcement") : undefined}
        onPrimaryAction={isFormValid ? () => handleSaveAnnouncement(true) : undefined}
        secondaryActionLabel={isFormValid && !editingAnn ? "Save as Draft" : "Cancel"}
        onSecondaryAction={() => {
          if (isFormValid && !editingAnn) {
            handleSaveAnnouncement(false);
          } else {
            setCreateModalOpen(false);
          }
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Title Field */}
          <Box>
            <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--mac-text-primary)', mb: 1 }}>
              Announcement Title
            </Typography>
            <TextField
              fullWidth
              placeholder="e.g. Mandatory General Assembly Meeting on May 20..."
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
          </Box>

          {/* Category & Urgency Selectors */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
            <Box>
              <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--mac-text-primary)', mb: 1 }}>
                Category
              </Typography>
              <TextField
                select
                fullWidth
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as any)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              >
                {categoryOptions.filter((c) => c.value !== 'All').map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--mac-text-primary)', mb: 1 }}>
                Urgency Priority
              </Typography>
              <TextField
                select
                fullWidth
                value={formUrgency}
                onChange={(e) => setFormUrgency(e.target.value as any)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              >
                <MenuItem value="Standard">Standard Priority</MenuItem>
                <MenuItem value="High Priority">High Priority (Urgent Advisory)</MenuItem>
              </TextField>
            </Box>
          </Box>

          {/* Message Content Area */}
          <Box>
            <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--mac-text-primary)', mb: 1 }}>
              Announcement Content / Message
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Provide clear details and instructions for TODA member drivers..."
              value={formMessage}
              onChange={(e) => setFormMessage(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
          </Box>

          <Box
            sx={{
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: '10px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <NotificationsActiveIcon sx={{ color: '#059669', fontSize: 24 }} />
            <Typography sx={{ fontSize: '13px', color: '#065F46', lineHeight: 1.4 }}>
              <strong>Notice:</strong> All member drivers will automatically be notified in their Driver App when an announcement is published or updated.
            </Typography>
          </Box>
        </Box>
      </MacCenterModal>

      {/* 5. View Announcement Detail Centered Modal (Publish & Edit triggers inside modal!) */}
      {selectedAnn && !deleteDialogOpen && (
        <MacCenterModal
          open={Boolean(selectedAnn)}
          onClose={() => setSelectedAnn(null)}
          title={selectedAnn.title}
          subtitle={`Created: ${selectedAnn.createdAt} • ${selectedAnn.createdBy}`}
          badge={<StatusBadge status={selectedAnn.isPublished ? 'Published' : 'Draft'} />}
          maxWidth={660}
          primaryActionLabel={selectedAnn.isPublished ? "Edit Announcement" : "Publish Announcement"}
          onPrimaryAction={() => {
            if (selectedAnn.isPublished) {
              handleOpenEdit(selectedAnn);
            } else {
              handlePublishDraft(selectedAnn);
            }
          }}
          secondaryActionLabel={selectedAnn.isPublished ? "Close" : "Edit Draft"}
          onSecondaryAction={() => {
            if (selectedAnn.isPublished) {
              setSelectedAnn(null);
            } else {
              handleOpenEdit(selectedAnn);
            }
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ backgroundColor: '#F5F5F7', padding: '18px 20px', borderRadius: '12px' }}>
              <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)', mb: 1 }}>Category & Priority</Typography>
              <Chip label={selectedAnn.category} size="small" sx={{ mr: 1, fontWeight: 600, fontSize: '12.5px' }} />
              <Chip label={selectedAnn.urgency} size="small" color={selectedAnn.urgency === 'High Priority' ? 'error' : 'default'} sx={{ fontWeight: 600, fontSize: '12.5px' }} />
            </Box>

            <Box>
              <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)', mb: 1 }}>Full Announcement Message</Typography>
              <Typography sx={{ fontSize: '14.5px', color: 'var(--mac-text-primary)', lineHeight: 1.6, backgroundColor: '#FFFFFF', border: '1px solid var(--mac-border-color)', padding: '16px 20px', borderRadius: '10px' }}>
                {selectedAnn.message}
              </Typography>
            </Box>
          </Box>
        </MacCenterModal>
      )}

      {/* Delete Confirmation Dialog */}
      <MacConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Delete Announcement?"
        message={`Are you sure you want to delete announcement "${selectedAnn?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Announcement"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
      />
    </Box>
  );
};
