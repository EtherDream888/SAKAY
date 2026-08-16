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
import HistoryToggleOffIcon from '@mui/icons-material/HistoryToggleOff';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import { AuditLogRecord, MOCK_LGU_ADMINS } from '../mockData/adminData';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { ActionButton } from '../components/admin/ActionButton';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { getAuditLogs, subscribeAuditLogs } from '../lib/auditLog';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogRecord[]>(getAuditLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [actorFilter, setActorFilter] = useState('All');
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  // Subscribe to live audit log actions across the session
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
    const matchesActor = actorFilter === 'All' || log.actor_name.includes(actorFilter);

    return matchesSearch && matchesCategory && matchesActor;
  });

  // KPI statistics
  const totalLogs = logs.length;
  const verificationLogs = logs.filter((l) => l.category === 'Verification').length;
  const userOversightLogs = logs.filter((l) => l.category === 'User Oversight').length;
  const systemRateLogs = logs.filter((l) => l.category === 'Fare Matrix' || l.category === 'Announcement' || l.category === 'Authentication').length;

  const categoryOptions: FilterOption[] = [
    { label: 'All Action Categories', value: 'All' },
    { label: 'Verification & Accreditation', value: 'Verification' },
    { label: 'User Oversight & Policy', value: 'User Oversight' },
    { label: 'Fare Matrix Adjustments', value: 'Fare Matrix' },
    { label: 'Municipal Announcements', value: 'Announcement' },
    { label: 'Authentication & Accounts', value: 'Authentication' },
  ];

  const actorOptions: FilterOption[] = [
    { label: 'All Acting Officers', value: 'All' },
    ...MOCK_LGU_ADMINS.map((admin) => ({
      label: admin.name,
      value: admin.name.split(' ')[0],
    })),
  ];

  const getCategoryBadgeStyle = (category: AuditLogRecord['category']) => {
    switch (category) {
      case 'Verification':
        return { bg: 'rgba(21, 101, 192, 0.12)', color: '#1565C0', border: 'rgba(21, 101, 192, 0.3)' };
      case 'User Oversight':
        return { bg: 'rgba(234, 67, 53, 0.12)', color: '#D93025', border: 'rgba(234, 67, 53, 0.3)' };
      case 'Fare Matrix':
        return { bg: 'rgba(46, 125, 50, 0.12)', color: '#2E7D32', border: 'rgba(46, 125, 50, 0.3)' };
      case 'Announcement':
        return { bg: 'rgba(255, 107, 26, 0.12)', color: 'var(--sakay-orange)', border: 'rgba(255, 107, 26, 0.3)' };
      case 'Authentication':
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
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Total Audit Trail Events</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>{totalLogs}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Accreditation & Verifications</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#1565C0' }}>{verificationLogs}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Policy Strikes & Suspensions</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#C62828' }}>{userOversightLogs}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Fare & Broadcast Actions</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#2E7D32' }}>{systemRateLogs}</Typography>
        </Box>
      </Box>

      {/* 2. Filter Toolbar */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search audit details, actor, target entity, or log ID..."
        selectFilters={[
          {
            id: 'category',
            label: 'Action Category',
            value: categoryFilter,
            options: categoryOptions,
            onChange: setCategoryFilter,
          },
          {
            id: 'actor',
            label: 'Acting Officer',
            value: actorFilter,
            options: actorOptions,
            onChange: setActorFilter,
          },
        ]}
        onResetFilters={() => {
          setSearchQuery('');
          setCategoryFilter('All');
          setActorFilter('All');
        }}
      />

      {/* 3. Audit Log Table */}
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
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACTING ADMINISTRATOR</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACTION CATEGORY</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>TARGET ENTITY</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>DETAILS OF MODIFICATION</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => {
                const catBadge = getCategoryBadgeStyle(log.category);
                return (
                  <TableRow
                    key={log.id}
                    sx={{
                      transition: 'var(--mac-transition-fast)',
                      '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                    }}
                  >
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-primary)' }}>
                        {log.performed_at}
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: '2px', fontFamily: 'monospace' }}>
                        {log.log_id}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            backgroundColor: 'var(--sakay-orange-soft)',
                            color: 'var(--sakay-orange)',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          {log.actor_name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-primary)' }}>
                            {log.actor_name}
                          </Typography>
                          <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)' }}>
                            {log.actor_role}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2.2, px: 3 }}>
                      <Chip
                        label={log.category || 'System'}
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
                      <Typography
                        sx={{
                          fontSize: '13px',
                          color: 'var(--mac-text-secondary)',
                          lineHeight: 1.4,
                        }}
                      >
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
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography sx={{ fontSize: '15px', color: 'var(--mac-text-muted)', fontWeight: 500 }}>
                    No audit records found matching your filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 4. Inspect Audit Event Modal */}
      {selectedLog && (
        <MacCenterModal
          open={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          title={`Audit Log Record — ${selectedLog.log_id}`}
          subtitle={`Action: ${selectedLog.action_type}`}
          badge={<Chip label={selectedLog.category} size="small" sx={{ ...getCategoryBadgeStyle(selectedLog.category), fontWeight: 700 }} />}
          maxWidth={640}
        >
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5, backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px', mb: 3 }}>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Timestamp Recorded</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedLog.performed_at}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Acting Officer</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedLog.actor_name}</Typography>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>{selectedLog.actor_role}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Target Entity ID</Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, fontFamily: 'monospace', color: 'var(--sakay-orange)' }}>{selectedLog.target_id}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Target Entity Name</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedLog.target_name}</Typography>
              </Box>
            </Box>

            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1.5 }}>
              Full Audit Payload & Action Details
            </Typography>
            <Box sx={{ backgroundColor: '#FAFAFC', padding: '18px 20px', borderRadius: '10px', border: '1px solid var(--mac-border-color)', mb: 3 }}>
              <Typography sx={{ fontSize: '14.5px', color: 'var(--mac-text-primary)', lineHeight: 1.6 }}>
                {selectedLog.details}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, backgroundColor: '#E6F4EA', padding: '12px 18px', borderRadius: '8px' }}>
              <SecurityIcon sx={{ color: '#1E8E3E', fontSize: 20 }} />
              <Typography sx={{ fontSize: '12.5px', color: '#1E8E3E', fontWeight: 600 }}>
                Immutable Record: This event has been cryptographically timestamped and committed to the municipal administrative trail.
              </Typography>
            </Box>
          </Box>
        </MacCenterModal>
      )}
    </Box>
  );
};
