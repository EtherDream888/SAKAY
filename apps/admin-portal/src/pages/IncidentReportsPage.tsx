import React, { useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Card, CardContent, Chip } from '@mui/material';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

import { MOCK_INCIDENT_REPORTS_DETAILED, IncidentReportRecord } from '../mockData/adminData';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { IncidentDetailModal } from '../components/admin/IncidentDetailModal';

export const IncidentReportsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentReportRecord[]>(MOCK_INCIDENT_REPORTS_DETAILED);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedIncident, setSelectedIncident] = useState<IncidentReportRecord | null>(null);

  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.bookingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.reporterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || inc.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || inc.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

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

  const handleStatusUpdate = (
    incidentId: string,
    newStatus: 'Under Investigation' | 'Resolved' | 'Dismissed',
    findings?: string
  ) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? {
              ...inc,
              status: newStatus,
              findings: findings || inc.findings,
              statusHistory: [
                ...inc.statusHistory,
                {
                  step: `Updated to ${newStatus}`,
                  timestamp: new Date().toLocaleString(),
                  actor: 'LGU Admin Officer',
                },
              ],
            }
          : inc
      )
    );

    setSelectedIncident((prev) =>
      prev && prev.id === incidentId
        ? {
            ...prev,
            status: newStatus,
            findings: findings || prev.findings,
            statusHistory: [
              ...prev.statusHistory,
              {
                step: `Updated to ${newStatus}`,
                timestamp: new Date().toLocaleString(),
                actor: 'LGU Admin Officer',
              },
            ],
          }
        : null
    );
  };

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* 1. Summary Cards (Identical Layout to Dashboard) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 4,
        }}
      >
        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Pending Review
              </Typography>
              <ReportProblemIcon sx={{ color: 'var(--sakay-orange)', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              12
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
              Awaiting initial LGU triage
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Under Investigation
              </Typography>
              <HourglassEmptyIcon sx={{ color: 'var(--sakay-orange)', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              5
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
              Assigned to LGU officer
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Resolved Reports
              </Typography>
              <CheckCircleIcon sx={{ color: 'var(--sakay-orange)', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              34
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
              Sanctions or waivers issued
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Dismissed
              </Typography>
              <CancelIcon sx={{ color: 'var(--sakay-orange)', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontSize: '26px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              8
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
              Unfounded / grace period compliant
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 2. Filter Toolbar */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search incident ID, driver name, passenger name, or category..."
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
            label: 'Incident Category',
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

      {/* 3. Incident Reports Table */}
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
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>INCIDENT ID</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>CATEGORY</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>REPORTED BY</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>DRIVER & TODA</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>SUBMITTED DATE</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>STATUS</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredIncidents.length > 0 ? (
              filteredIncidents.map((incident) => (
                <TableRow
                  key={incident.id}
                  onClick={() => setSelectedIncident(incident)}
                  sx={{
                    cursor: 'pointer',
                    transition: 'var(--mac-transition-fast)',
                    '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                  }}
                >
                  <TableCell sx={{ py: 2.2, px: 3, fontWeight: 700, fontSize: '14px', color: 'var(--mac-text-primary)' }}>
                    #{incident.id}
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--sakay-orange)' }}>
                      {incident.category}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
                      Trip Ref: {incident.tripId}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: '14px', color: 'var(--mac-text-primary)', py: 2.2, px: 3 }}>
                    {incident.reportedBy}: <span style={{ fontWeight: 600 }}>{incident.reporterName}</span>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-primary)' }}>
                      {incident.driverName}
                    </Typography>
                    <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
                      {incident.todaName} ({incident.vehiclePlate})
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: '13.5px', color: 'var(--mac-text-secondary)', py: 2.2, px: 3 }}>
                    {incident.submittedDate} • {incident.submittedTime}
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <StatusBadge status={incident.status} />
                  </TableCell>
                  <TableCell align="right" sx={{ py: 2.2, px: 3 }}>
                    <ActionButton
                      label="Review"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIncident(incident);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography sx={{ fontSize: '15px', color: 'var(--mac-text-muted)', fontWeight: 500 }}>
                    No incident reports found matching your filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 4. Incident Detail Review Modal */}
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
