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
  CircularProgress,
} from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

import { DriverRecord } from '../mockData/adminData';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { DriverDetailModal } from '../components/admin/DriverDetailModal';
import { fetchDrivers } from '../services/adminApiService';
import { TableEmptyState } from '../components/common/TableEmptyState';

/**
 * ============================================================================
 * DRIVER MANAGEMENT PAGE COMPONENT
 * ============================================================================
 * Purpose:
 *   Allows LGU Transport Officers to review driver credentials, monitor
 *   dual-gate verification statuses, track online sessions, investigate
 *   policy strikes, and enact administrative suspensions.
 *   Connected 100% directly to the live Supabase database.
 * ============================================================================
 */
export const DriverManagementPage: React.FC = () => {
  // State: Driver roster and active filters
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('All');
  const [onlineFilter, setOnlineFilter] = useState('All');
  const [selectedDriver, setSelectedDriver] = useState<DriverRecord | null>(null);

  /**
   * Load real drivers from database
   */
  const loadDrivers = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDrivers();
      setDrivers(data);
    } catch (err) {
      console.error('[DriverManagementPage] Failed to fetch drivers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  // Filter logic: Search by name, license number, plate number, franchise number, or TODA
  const filteredDrivers = drivers.filter((d) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      d.name.toLowerCase().includes(q) ||
      d.licenseNo.toLowerCase().includes(q) ||
      d.mtopNo.toLowerCase().includes(q) ||
      d.todaName.toLowerCase().includes(q) ||
      d.vehiclePlate.toLowerCase().includes(q) ||
      d.barangay.toLowerCase().includes(q);

    const matchesVerification =
      verificationFilter === 'All' || d.verificationStatus === verificationFilter;
    const matchesOnline = onlineFilter === 'All' || d.onlineStatus === onlineFilter;

    return matchesSearch && matchesVerification && matchesOnline;
  });

  const verificationOptions: FilterOption[] = [
    { label: 'All Verifications', value: 'All' },
    { label: 'Verified', value: 'Verified' },
    { label: 'Pending Verification', value: 'Pending' },
    { label: 'Suspended', value: 'Suspended' },
  ];

  const onlineOptions: FilterOption[] = [
    { label: 'All Sessions', value: 'All' },
    { label: 'Online', value: 'Online' },
    { label: 'Offline', value: 'Offline' },
  ];

  const handleDriverUpdated = (updatedDriver: DriverRecord) => {
    setDrivers((prev) =>
      prev.map((d) => (d.id === updatedDriver.id ? updatedDriver : d))
    );
    setSelectedDriver(updatedDriver);
  };

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* 1. Filter Toolbar */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by driver name, license no., plate no., franchise, or TODA..."
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
          backgroundColor: '#FFFFFF',
        }}
      >
        <Table>
          <TableHead sx={{ backgroundColor: '#FAFAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, fontSize: '9.2px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                DRIVER & CREDENTIALS
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '9.2px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                TODA AFFILIATION
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '9.2px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                FRANCHISE & PLATE
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '9.2px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                ONLINE SESSION
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '9.2px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                VERIFICATION
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '9.2px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                ACCOUNT STATUS
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '9.2px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                ACTIONS
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                  <CircularProgress size={32} sx={{ color: 'var(--sakay-orange)', mb: 1.5 }} />
                  <Typography sx={{ fontSize: '11px', color: 'var(--mac-text-muted)' }}>
                    Loading driver records...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredDrivers.length > 0 ? (
              filteredDrivers.map((driver) => (
                <TableRow
                  key={driver.id}
                  sx={{
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
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        {driver.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Typography sx={{ fontWeight: 600, fontSize: '11px', color: 'var(--mac-text-primary)' }}>
                            {driver.name}
                          </Typography>
                          {driver.isOverdue5Days && (
                            <Chip
                              label="Overdue >5 Days"
                              size="small"
                              sx={{ fontSize: '8.4px', fontWeight: 600, backgroundColor: '#FEE2E2', color: '#DC2626', height: 22 }}
                            />
                          )}
                        </Box>
                        <Typography sx={{ fontSize: '9.2px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                          License: {driver.licenseNo} • Tel: {driver.phone}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: '11px', color: 'var(--mac-text-primary)', py: 2.2, px: 3 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '11px', color: 'var(--mac-text-primary)' }}>
                      {driver.todaName}
                    </Typography>
                    <Typography sx={{ fontSize: '9.2px', color: 'var(--mac-text-muted)' }}>
                      Brgy. {driver.barangay}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontSize: '9.2px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      MTOP: {driver.mtopNo}
                    </Typography>
                    <Typography sx={{ fontSize: '9.2px', color: 'var(--mac-text-secondary)', mt: '2px' }}>
                      Plate: {driver.vehiclePlate}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: driver.onlineStatus === 'Online' ? '#34A853' : '#9AA0A6',
                        }}
                      />
                      <Typography sx={{ fontSize: '9.2px', color: 'var(--mac-text-secondary)' }}>
                        {driver.onlineStatus}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <StatusBadge status={driver.verificationStatus as any} />
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <StatusBadge status={driver.accountStatus as any} />
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
              <TableEmptyState
                colSpan={7}
                icon={<DirectionsCarIcon />}
                title="No drivers registered yet."
                description="Driver accounts will appear here once accredited TODAs begin registering their drivers in the SAKAY system."
                onRefresh={loadDrivers}
                isRefreshing={isLoading}
              />
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 3. Driver Detail Inspection Modal */}
      {selectedDriver && (
        <DriverDetailModal
          open={Boolean(selectedDriver)}
          onClose={() => setSelectedDriver(null)}
          driver={selectedDriver}
          onDriverUpdated={handleDriverUpdated}
        />
      )}
    </Box>
  );
};


