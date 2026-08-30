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
  Card,
  CardContent,
  CircularProgress,
  Button,
} from '@mui/material';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';

import { IncidentReportRecord } from '../mockData/adminData';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { IncidentDetailModal } from '../components/admin/IncidentDetailModal';
import { TableEmptyState } from '../components/common/TableEmptyState';
import { fetchIncidents, updateIncidentStatus, recordAdminAuditAction } from '../services/adminApiService';

/**
 * ============================================================================
 * INCIDENT REPORTS PAGE COMPONENT (IncidentReportsPage.tsx)
 * ============================================================================
 * Checklist Scope:
 *   ● Manage Incident Reports
 *     ○ View submitted incident reports
 *     ○ Review incident details
 *     ○ View related trip information
 *     ○ Update incident status
 * ============================================================================
 */
export const IncidentReportsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedIncident, setSelectedIncident] = useState<IncidentReportRecord | null>(null);

  const loadIncidents = async () => {
    setIsLoading(true);
    try {
      const data = await fetchIncidents();
      setIncidents(data);
    } catch (err) {
      console.error('[IncidentReportsPage] Failed to fetch incidents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  // Filter logic
  const filteredIncidents = incidents.filter((inc) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      inc.id.toLowerCase().includes(q) ||
      inc.bookingId.toLowerCase().includes(q) ||
      inc.driverName.toLowerCase().includes(q) ||
      inc.reporterName.toLowerCase().includes(q) ||
      inc.category.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'All' || inc.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || inc.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const pendingCount = incidents.filter((i) => i.status === 'Pending Review').length;
  const investigationCount = incidents.filter((i) => i.status === 'Under Investigation').length;
  const resolvedCount = incidents.filter((i) => i.status === 'Resolved').length;
  const dismissedCount = incidents.filter((i) => i.status === 'Dismissed').length;

  const statusOptions: FilterOption[] = [
    { label: 'All Incident Statuses', value: 'All' },
    { label: 'Pending Review', value: 'Pending Review' },
    { label: 'Under Investigation', value: 'Under Investigation' },
    { label: 'Resolved', value: 'Resolved' },
    { label: 'Dismissed', value: 'Dismissed' },
  ];

  const categoryOptions: FilterOption[] = [
    { label: 'All Incident Categories', value: 'All' },
    { label: 'Overcharging Attempt', value: 'Overcharging Attempt' },
    { label: 'Unsafe Driving', value: 'Unsafe Driving' },
    { label: 'Rude Behavior', value: 'Rude Behavior' },
    { label: 'Harassment', value: 'Harassment' },
    { label: 'Vehicle Issue', value: 'Vehicle Issue' },
    { label: 'Route Deviation', value: 'Route Deviation' },
    { label: 'Reckless Driving', value: 'Reckless Driving' },
    { label: 'Passenger Misconduct', value: 'Passenger Misconduct' },
    { label: 'Lost Item', value: 'Lost Item' },
    { label: 'Others', value: 'Others' },
  ];

  const handleStatusUpdate = async (
    incidentId: string,
    newStatus: 'Under Investigation' | 'Resolved' | 'Dismissed',
    findings?: string
  ) => {
    try {
      await updateIncidentStatus(incidentId, newStatus, findings);
      setIncidents((prev) =>
        prev.map((inc) =>
          inc.id === incidentId
            ? { ...inc, status: newStatus, findings: findings || inc.findings }
            : inc
        )
      );
      if (selectedIncident && selectedIncident.id === incidentId) {
        setSelectedIncident((prev) => (prev ? { ...prev, status: newStatus, findings: findings || prev.findings } : null));
      }
    } catch (err) {
      console.error('[IncidentReports] Status update error:', err);
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
          mb: 4,
        }}
      >
        <Card
          onClick={() => setStatusFilter(statusFilter === 'Pending Review' ? 'All' : 'Pending Review')}
          sx={{
            cursor: 'pointer',
            borderRadius: 'var(--mac-radius-lg)',
            border: statusFilter === 'Pending Review' ? '2px solid var(--sakay-orange)' : '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            backgroundColor: '#FFFFFF',
          }}
        >
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '10px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Pending Review
              </Typography>
              <ReportProblemIcon sx={{ color: 'var(--sakay-orange)', fontSize: '16' }} />
            </Box>
            <Typography sx={{ fontSize: '22.4px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              {pendingCount}
            </Typography>
            <Typography sx={{ fontSize: '10px', color: 'var(--mac-text-muted)' }}>
              Awaiting initial LGU triage
            </Typography>
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusFilter(statusFilter === 'Under Investigation' ? 'All' : 'Under Investigation')}
          sx={{
            cursor: 'pointer',
            borderRadius: 'var(--mac-radius-lg)',
            border: statusFilter === 'Under Investigation' ? '2px solid var(--sakay-orange)' : '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            backgroundColor: '#FFFFFF',
          }}
        >
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '10px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Under Investigation
              </Typography>
              <HourglassEmptyIcon sx={{ color: '#1565C0', fontSize: '16' }} />
            </Box>
            <Typography sx={{ fontSize: '22.4px', fontWeight: 700, color: '#1565C0', mb: 0.5 }}>
              {investigationCount}
            </Typography>
            <Typography sx={{ fontSize: '10px', color: 'var(--mac-text-muted)' }}>
              Assigned to LGU triage officer
            </Typography>
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusFilter(statusFilter === 'Resolved' ? 'All' : 'Resolved')}
          sx={{
            cursor: 'pointer',
            borderRadius: 'var(--mac-radius-lg)',
            border: statusFilter === 'Resolved' ? '2px solid var(--sakay-orange)' : '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            backgroundColor: '#FFFFFF',
          }}
        >
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '10px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Resolved Reports
              </Typography>
              <CheckCircleIcon sx={{ color: '#2E7D32', fontSize: '16' }} />
            </Box>
            <Typography sx={{ fontSize: '22.4px', fontWeight: 700, color: '#2E7D32', mb: 0.5 }}>
              {resolvedCount}
            </Typography>
            <Typography sx={{ fontSize: '10px', color: 'var(--mac-text-muted)' }}>
              Sanctions or waivers finalized
            </Typography>
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusFilter(statusFilter === 'Dismissed' ? 'All' : 'Dismissed')}
          sx={{
            cursor: 'pointer',
            borderRadius: 'var(--mac-radius-lg)',
            border: statusFilter === 'Dismissed' ? '2px solid var(--sakay-orange)' : '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            backgroundColor: '#FFFFFF',
          }}
        >
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '10px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Dismissed
              </Typography>
              <CancelIcon sx={{ color: '#757575', fontSize: '16' }} />
            </Box>
            <Typography sx={{ fontSize: '22.4px', fontWeight: 700, color: '#757575', mb: 0.5 }}>
              {dismissedCount}
            </Typography>
            <Typography sx={{ fontSize: '10px', color: 'var(--mac-text-muted)' }}>
              Unfounded or duplicate reports
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 2. Filter Toolbar */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search incident ID, driver name, complainant, or category..."
        selectFilters={[
          {
            id: 'status',
            label: 'Incident Status',
            value: statusFilter,
            options: statusOptions,
            onChange: setStatusFilter,
          },
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
          setStatusFilter('All');
          setCategoryFilter('All');
        }}
      />

      {/* 3. Incidents Table */}
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
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                Incident ID & Category
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                Reported Entity / Driver
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                Complainant
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                Submitted Date
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                Status
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <CircularProgress size={32} sx={{ color: 'var(--sakay-orange)', mb: 1.5 }} />
                  <Typography sx={{ fontSize: '11.3px', color: 'var(--mac-text-muted)' }}>
                    Loading incident reports...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredIncidents.length > 0 ? (
              filteredIncidents.map((inc) => (
                <TableRow
                  key={inc.id}
                  sx={{
                    transition: 'var(--mac-transition-fast)',
                    '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                  }}
                >
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '11.6px', color: 'var(--mac-text-primary)' }}>
                      {inc.id}
                    </Typography>
                    <Typography sx={{ fontSize: '10px', color: 'var(--sakay-orange)', fontWeight: 600, mt: '3px' }}>
                      {inc.category}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontSize: '11.3px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      {inc.driverName}
                    </Typography>
                    <Typography sx={{ fontSize: '11.6px', color: 'var(--mac-text-muted)' }}>
                      {inc.todaName}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontSize: '11.3px', color: 'var(--mac-text-primary)' }}>
                      {inc.reporterName} ({inc.reportedBy})
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontSize: '10.8px', color: 'var(--mac-text-primary)' }}>
                      {inc.submittedDate}
                    </Typography>
                    <Typography sx={{ fontSize: '11.6px', color: 'var(--mac-text-muted)' }}>
                      {inc.submittedTime}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <StatusBadge status={inc.status as any} />
                  </TableCell>
                  <TableCell align="right" sx={{ py: 2.2, px: 3 }}>
                    <ActionButton
                      label="Investigate"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIncident(inc);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableEmptyState
                colSpan={6}
                icon={<ReportProblemIcon />}
                title="No incident reports found"
                description={
                  searchQuery || statusFilter !== 'All'
                    ? 'No reports match your active search or filter criteria.'
                    : 'Incident reports submitted by passengers or flagged by the system will appear here for review.'
                }
                onRefresh={loadIncidents}
                isRefreshing={isLoading}
              />
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 4. Centered Widescreen Incident Detail & Triage Modal */}
      {selectedIncident && (
        <IncidentDetailModal
          open={Boolean(selectedIncident)}
          onClose={() => setSelectedIncident(null)}
          incident={selectedIncident}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </Box>
  );
};

