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
  Chip,
  CircularProgress,
  Button,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import RefreshIcon from '@mui/icons-material/Refresh';

import { AuditLogRecord } from '../mockData/adminData';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { ActionButton } from '../components/admin/ActionButton';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { fetchAuditLogs } from '../services/adminApiService';

/**
 * ============================================================================
 * AUDIT LOGGING PAGE (AuditLogPage.tsx)
 * ============================================================================
 * Checklist Scope:
 *   ● View Audit Logs
 *     ○ Real-time administrative activity ledger
 *     ○ Cryptographic timestamp & target entity tracking
 * ============================================================================
 */
export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error('[AuditLogPage] Failed to fetch audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (log.action_type && log.action_type.toLowerCase().includes(q)) ||
      (log.actor_name && log.actor_name.toLowerCase().includes(q)) ||
      (log.target_name && log.target_name.toLowerCase().includes(q)) ||
      (log.details && log.details.toLowerCase().includes(q)) ||
      (log.log_id && log.log_id.toLowerCase().includes(q));

    const matchesCategory = categoryFilter === 'All' || log.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalLogs = logs.length;
  const verificationLogs = logs.filter((l) => l.category === 'Verification').length;
  const userOversightLogs = logs.filter((l) => l.category === 'User Oversight').length;
  const systemRateLogs = logs.filter(
    (l) => l.category === 'Fare Matrix' || l.category === 'Announcement' || l.category === 'System'
  ).length;

  const categoryOptions: FilterOption[] = [
    { label: 'All Action Categories', value: 'All' },
    { label: 'Verification & Accreditation', value: 'Verification' },
    { label: 'User Oversight & Policy', value: 'User Oversight' },
    { label: 'Fare Matrix Adjustments', value: 'Fare Matrix' },
    { label: 'System & Announcement', value: 'System' },
  ];

  const getCategoryBadgeStyle = (category: string) => {
    switch (category) {
      case 'Verification':
        return { bg: 'rgba(21, 101, 192, 0.12)', color: '#1565C0', border: 'rgba(21, 101, 192, 0.3)' };
      case 'User Oversight':
        return { bg: 'rgba(234, 67, 53, 0.12)', color: '#D93025', border: 'rgba(234, 67, 53, 0.3)' };
      case 'Fare Matrix':
        return { bg: 'rgba(46, 125, 50, 0.12)', color: '#2E7D32', border: 'rgba(46, 125, 50, 0.3)' };
      default:
        return { bg: 'rgba(255, 107, 26, 0.12)', color: 'var(--sakay-orange)', border: 'rgba(255, 107, 26, 0.3)' };
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
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '16px 20px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '10.4px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Total Audit Trail Events</Typography>
          <Typography sx={{ fontSize: '22.4px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>{totalLogs}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '16px 20px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '10.4px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Accreditation & Verifications</Typography>
          <Typography sx={{ fontSize: '22.4px', fontWeight: 700, color: '#1565C0' }}>{verificationLogs}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '16px 20px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '10.4px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Policy Strikes & Suspensions</Typography>
          <Typography sx={{ fontSize: '22.4px', fontWeight: 700, color: '#C62828' }}>{userOversightLogs}</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '16px 20px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '10.4px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Fare & System Actions</Typography>
          <Typography sx={{ fontSize: '22.4px', fontWeight: 700, color: '#2E7D32' }}>{systemRateLogs}</Typography>
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
        ]}
        onResetFilters={() => {
          setSearchQuery('');
          setCategoryFilter('All');
        }}
      />

      {/* 3. Audit Log Ledger Table */}
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
              <TableCell sx={{ fontWeight: 600, fontSize: '10.4px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>TIMESTAMP & ID</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '10.4px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACTOR</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '10.4px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACTION EVENT</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '10.4px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>CATEGORY</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '10.4px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>AUDIT DETAILS</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '10.4px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <CircularProgress size={32} sx={{ color: 'var(--sakay-orange)', mb: 1.5 }} />
                  <Typography sx={{ fontSize: '11.3px', color: 'var(--mac-text-muted)' }}>
                    Loading activity logs...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredLogs.length > 0 ? (
              filteredLogs.map((log) => {
                const badgeStyle = getCategoryBadgeStyle(log.category);
                return (
                  <TableRow
                    key={log.id}
                    sx={{
                      transition: 'var(--mac-transition-fast)',
                      '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                    }}
                  >
                    <TableCell sx={{ py: 2, px: 3 }}>
                      <Typography sx={{ fontSize: '10.8px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                        {log.timestamp}
                      </Typography>
                      <Typography sx={{ fontSize: '9.3px', color: 'var(--mac-text-muted)', fontFamily: 'monospace', mt: '2px' }}>
                        {log.id.slice(0, 16)}...
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2, px: 3 }}>
                      <Typography sx={{ fontSize: '11.3px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                        {log.actor_name}
                      </Typography>
                      <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>
                        {log.actor_role}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2, px: 3 }}>
                      <Chip
                        label={log.action_type}
                        size="small"
                        sx={{
                          fontSize: '9.3px',
                          fontWeight: 700,
                          backgroundColor: '#F5F5F7',
                          color: 'var(--mac-text-primary)',
                          fontFamily: 'monospace',
                          height: 24,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 2, px: 3 }}>
                      <Chip
                        label={log.category}
                        size="small"
                        sx={{
                          fontSize: '9.3px',
                          fontWeight: 600,
                          backgroundColor: badgeStyle.bg,
                          color: badgeStyle.color,
                          border: `1px solid ${badgeStyle.border}`,
                          height: 24,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 2, px: 3, maxWidth: 380 }}>
                      <Typography
                        sx={{
                          fontSize: '10.8px',
                          color: 'var(--mac-text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {log.details}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 2, px: 3 }}>
                      <ActionButton
                        label="View Event"
                        showArrow={false}
                        onClick={() => setSelectedLog(log)}
                        sx={{ height: 32, fontSize: '10px' }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                    <SecurityIcon sx={{ fontSize: '35.3', color: 'var(--mac-border-color)' }} />
                    <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-primary)', fontWeight: 600 }}>
                      No activity log records found
                    </Typography>
                    <Typography sx={{ fontSize: '10.8px', color: 'var(--mac-text-muted)', maxWidth: 420 }}>
                      {searchQuery || categoryFilter !== 'All'
                        ? 'No events match your active search filters.'
                        : 'There are currently no administrative events recorded.'}
                    </Typography>
                    <Button
                      onClick={loadLogs}
                      startIcon={<RefreshIcon />}
                      sx={{
                        mt: 1,
                        textTransform: 'none',
                        fontSize: '10.8px',
                        color: 'var(--sakay-orange)',
                        fontWeight: 600,
                      }}
                    >
                      Refresh
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 4. Event Detail Modal */}
      {selectedLog && (
        <MacCenterModal
          open={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          title="Administrative Audit Event"
          subtitle={`Log ID: ${selectedLog.id}`}
          badge={<Chip label={selectedLog.category} size="small" />}
          maxWidth={680}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px' }}>
            <Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>Action Type</Typography>
              <Typography sx={{ fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--sakay-orange)' }}>
                {selectedLog.action_type}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>Acting Officer</Typography>
              <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                {selectedLog.actor_name} ({selectedLog.actor_role})
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>Timestamp</Typography>
              <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                {selectedLog.timestamp}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>Event Details & System Remarks</Typography>
              <Typography sx={{ fontSize: '11.3px', color: 'var(--mac-text-primary)', mt: '4px', lineHeight: 1.5 }}>
                {selectedLog.details}
              </Typography>
            </Box>
          </Box>
        </MacCenterModal>
      )}
    </Box>
  );
};

