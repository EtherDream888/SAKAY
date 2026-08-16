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
  Chip,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';

import { TodaAuditLog } from '../types/toda';
import { CURRENT_TODA_PROFILE } from '../mockData/todaData';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { ActionButton } from '../components/admin/ActionButton';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { getAuditLogs, subscribeAuditLogs } from '../lib/auditLog';

export const TodaAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<TodaAuditLog[]>(getAuditLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedLog, setSelectedLog] = useState<TodaAuditLog | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAuditLogs(() => {
      setLogs(getAuditLogs());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.log_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'All' || log.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categoryOptions: FilterOption[] = [
    { label: 'All Categories', value: 'All' },
    { label: 'Driver Verification', value: 'Driver Verification' },
    { label: 'Membership Governance', value: 'Membership' },
    { label: 'Incident Triage', value: 'Incident' },
    { label: 'Announcements', value: 'Announcement' },
    { label: 'Account & Terminal', value: 'Account' },
    { label: 'Operations', value: 'Operations' },
  ];

  const getCategoryBadgeStyle = (category: TodaAuditLog['category']) => {
    switch (category) {
      case 'Driver Verification':
        return { bg: 'rgba(21, 101, 192, 0.12)', color: '#1565C0', border: 'rgba(21, 101, 192, 0.3)' };
      case 'Membership':
        return { bg: 'rgba(234, 67, 53, 0.12)', color: '#D93025', border: 'rgba(234, 67, 53, 0.3)' };
      case 'Incident':
        return { bg: 'rgba(255, 107, 26, 0.12)', color: 'var(--sakay-orange)', border: 'rgba(255, 107, 26, 0.3)' };
      case 'Announcement':
        return { bg: 'rgba(46, 125, 50, 0.12)', color: '#2E7D32', border: 'rgba(46, 125, 50, 0.3)' };
      case 'Account':
        return { bg: 'rgba(106, 27, 154, 0.12)', color: '#6A1B9A', border: 'rgba(106, 27, 154, 0.3)' };
      default:
        return { bg: '#F1F3F4', color: '#5F6368', border: '#DADCE0' };
    }
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
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Total TODA Actions Logged</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>{logs.length}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Driver Endorsement Actions</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#1565C0' }}>
            {logs.filter((l) => l.category === 'Driver Verification').length}
          </Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>TODA Disciplinary Strikes</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#DC2626' }}>
            {logs.filter((l) => l.category === 'Membership').length}
          </Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Incident Triage & Escalations</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--sakay-orange)' }}>
            {logs.filter((l) => l.category === 'Incident').length}
          </Typography>
        </Box>
      </Box>

      {/* 2. Filter Toolbar */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search TODA audit action, actor, target entity, or log ID..."
        selectFilters={[
          {
            id: 'category',
            label: 'Category',
            value: categoryFilter,
            options: categoryOptions,
            onChange: setCategoryFilter,
          },
        ]}
        onResetFilters={() => {
          setSearchQuery('');
          setCategoryFilter('All');
        }}
      />

      {/* 3. Table */}
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
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>TIMESTAMP & LOG ID</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>TODA OFFICER</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>CATEGORY</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>TARGET ENTITY</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>DETAILS OF MODIFICATION</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLogs.map((log) => {
              const catBadge = getCategoryBadgeStyle(log.category);
              return (
                <TableRow
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  sx={{
                    cursor: 'pointer',
                    transition: 'var(--mac-transition-fast)',
                    '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                  }}
                >
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-primary)' }}>
                      {log.performed_at}
                    </Typography>
                    <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)', fontFamily: 'monospace' }}>
                      {log.log_id}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 32, height: 32, backgroundColor: 'var(--sakay-orange-soft)', color: 'var(--sakay-orange)', fontSize: '12px', fontWeight: 700 }}>
                        {log.actor_name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-primary)' }}>
                          {log.actor_name}
                        </Typography>
                        <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)' }}>
                          {CURRENT_TODA_PROFILE.acronym}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Chip
                      label={log.category}
                      size="small"
                      sx={{
                        fontSize: '11.5px',
                        fontWeight: 600,
                        backgroundColor: catBadge.bg,
                        color: catBadge.color,
                        border: `1px solid ${catBadge.border}`,
                        height: 24,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--mac-text-primary)' }}>
                      {log.target_name}
                    </Typography>
                    <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)', fontFamily: 'monospace' }}>
                      {log.target_id}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3, maxWidth: 380 }}>
                    <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-secondary)', lineHeight: 1.4 }}>
                      {log.details}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 2.2, px: 3 }}>
                    <ActionButton
                      label="Inspect"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLog(log);
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 4. Event Inspection Modal */}
      {selectedLog && (
        <MacCenterModal
          open={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          title={`TODA Audit Trail Event — ${selectedLog.log_id}`}
          subtitle={`Action Type: ${selectedLog.action_type}`}
          badge={<Chip label={selectedLog.category} size="small" sx={{ ...getCategoryBadgeStyle(selectedLog.category), fontWeight: 700 }} />}
          maxWidth={620}
        >
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, backgroundColor: '#F8F9FA', p: 2, borderRadius: '12px', mb: 3 }}>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Timestamp</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedLog.performed_at}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Acting Officer</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedLog.actor_name}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Target Entity ID</Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--sakay-orange)', fontFamily: 'monospace' }}>{selectedLog.target_id}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Target Entity Name</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedLog.target_name}</Typography>
              </Box>
            </Box>

            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1 }}>
              Full Log Payload Details
            </Typography>
            <Box sx={{ p: 2, borderRadius: '10px', backgroundColor: '#FAFAFC', border: '1px solid var(--mac-border-color)' }}>
              <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-primary)', lineHeight: 1.6 }}>
                {selectedLog.details}
              </Typography>
            </Box>
          </Box>
        </MacCenterModal>
      )}
    </Box>
  );
};
