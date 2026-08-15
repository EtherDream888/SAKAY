import React, { useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Avatar, Chip } from '@mui/material';

import { MOCK_DRIVERS, DriverRecord } from '../mockData/adminData';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { DriverDetailModal } from '../components/admin/DriverDetailModal';

export const DriverManagementPage: React.FC = () => {
  const [drivers, setDrivers] = useState<DriverRecord[]>(MOCK_DRIVERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('All');
  const [onlineFilter, setOnlineFilter] = useState('All');
  const [selectedDriver, setSelectedDriver] = useState<DriverRecord | null>(null);

  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.licenseNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.mtopNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.mtopOperatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.todaName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesVerification = verificationFilter === 'All' || d.verificationStatus === verificationFilter;
    const matchesOnline = onlineFilter === 'All' || d.onlineStatus === onlineFilter;

    return matchesSearch && matchesVerification && matchesOnline;
  });

  const verificationOptions: FilterOption[] = [
    { label: 'All Verifications', value: 'All' },
    { label: 'Verified', value: 'Verified' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Suspended', value: 'Suspended' },
  ];

  const onlineOptions: FilterOption[] = [
    { label: 'All Sessions', value: 'All' },
    { label: 'Online', value: 'Online' },
    { label: 'Offline', value: 'Offline' },
  ];

  const handleStatusChange = (driverId: string, newStatus: 'Active' | 'Inactive') => {
    setDrivers((prev) =>
      prev.map((d) => (d.id === driverId ? { ...d, accountStatus: newStatus } : d))
    );
    setSelectedDriver((prev) => (prev && prev.id === driverId ? { ...prev, accountStatus: newStatus } : prev));
  };

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* 1. Filter Toolbar */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by driver name, license no., MTOP operator, plate no., or TODA..."
        selectFilters={[
          {
            id: 'verification',
            label: 'Verification',
            value: verificationFilter,
            options: verificationOptions,
            onChange: setVerificationFilter,
          },
          {
            id: 'online',
            label: 'Online Status',
            value: onlineFilter,
            options: onlineOptions,
            onChange: setOnlineFilter,
          },
        ]}
        onResetFilters={() => {
          setSearchQuery('');
          setVerificationFilter('All');
          setOnlineFilter('All');
        }}
      />

      {/* 2. Driver Table */}
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
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>DRIVER & MTOP OPERATOR</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>TODA AFFILIATION</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>MTOP & PERMIT EXPIRY</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ONLINE SESSION</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>VERIFICATION</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACCOUNT STATUS</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDrivers.length > 0 ? (
              filteredDrivers.map((driver) => (
                <TableRow
                  key={driver.id}
                  onClick={() => setSelectedDriver(driver)}
                  sx={{
                    cursor: 'pointer',
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
                          backgroundColor: 'var(--sakay-orange-soft)',
                          color: 'var(--sakay-orange)',
                          fontSize: '14px',
                          fontWeight: 600,
                        }}
                      >
                        {driver.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Typography sx={{ fontWeight: 600, fontSize: '14.5px', color: 'var(--mac-text-primary)' }}>
                            {driver.name}
                          </Typography>
                          {driver.isOverdue5Days && (
                            <Chip label="Overdue >5 Days" size="small" sx={{ fontSize: '11px', fontWeight: 600, backgroundColor: '#FEE2E2', color: '#DC2626', height: 22 }} />
                          )}
                        </Box>
                        <Typography sx={{ fontSize: '12.5px', color: 'var(--sakay-orange)', fontWeight: 500, mt: '3px' }}>
                          Operator: {driver.mtopOperatorName}
                        </Typography>
                        <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                          License: {driver.licenseNo} • Plate: {driver.vehiclePlate}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: '14px', color: 'var(--mac-text-primary)', py: 2.2, px: 3 }}>
                    {driver.todaName}
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      MTOP: {driver.mtopNo}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mt: '4px' }}>
                      <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
                        Exp: {driver.mtopExpiry}
                      </Typography>
                      <StatusBadge status={driver.mtopStatus} />
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: driver.onlineStatus === 'Online' ? '#34A853' : '#9AA0A6',
                        }}
                      />
                      <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-secondary)' }}>
                        {driver.onlineStatus}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <StatusBadge status={driver.verificationStatus} />
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <StatusBadge status={driver.accountStatus} />
                  </TableCell>
                  <TableCell align="right" sx={{ py: 2.2, px: 3 }}>
                    <ActionButton
                      label="Inspect"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDriver(driver);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography sx={{ fontSize: '15px', color: 'var(--mac-text-muted)', fontWeight: 500 }}>
                    No driver records found matching your filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 3. Centered Driver Detail Modal */}
      {selectedDriver && (
        <DriverDetailModal
          open={Boolean(selectedDriver)}
          onClose={() => setSelectedDriver(null)}
          driver={selectedDriver}
          onStatusChange={handleStatusChange}
        />
      )}
    </Box>
  );
};
