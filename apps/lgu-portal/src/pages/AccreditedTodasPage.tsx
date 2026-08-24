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
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import RefreshIcon from '@mui/icons-material/Refresh';

import { AccreditedTodaRecord } from '../mockData/adminData';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { TodaDetailModal } from '../components/admin/TodaDetailModal';
import { fetchAccreditedTodas } from '../services/adminApiService';

/**
 * ============================================================================
 * ACCREDITED TODAS DIRECTORY PAGE
 * ============================================================================
 * Purpose:
 *   Displays the official municipal registry of accredited Tricycle Operators
 *   and Drivers Associations (TODAs) authorized to operate in Calapan City.
 *   Connected directly to the live Supabase database.
 * ============================================================================
 */
export const AccreditedTodasPage: React.FC = () => {
  const [todas, setTodas] = useState<AccreditedTodaRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [driverCountFilter, setDriverCountFilter] = useState('All');

  // Selected TODA for Driver Directory Modal
  const [selectedToda, setSelectedToda] = useState<AccreditedTodaRecord | null>(null);

  const loadTodas = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAccreditedTodas();
      setTodas(data);
    } catch (err) {
      console.error('[AccreditedTodasPage] Failed to fetch accredited TODAs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTodas();
  }, []);

  const filteredTodas = todas.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      t.name.toLowerCase().includes(q) ||
      (t.acronym && t.acronym.toLowerCase().includes(q)) ||
      t.representative.toLowerCase().includes(q) ||
      t.barangay.toLowerCase().includes(q) ||
      t.accreditationNo.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;

    let matchesDriverCount = true;
    if (driverCountFilter === 'Small') matchesDriverCount = t.registeredDrivers < 25;
    if (driverCountFilter === 'Medium') matchesDriverCount = t.registeredDrivers >= 25 && t.registeredDrivers <= 50;
    if (driverCountFilter === 'Large') matchesDriverCount = t.registeredDrivers > 50;

    return matchesSearch && matchesStatus && matchesDriverCount;
  });

  const statusOptions: FilterOption[] = [
    { label: 'All Statuses', value: 'All' },
    { label: 'Active', value: 'Active' },
    { label: 'Suspended', value: 'Suspended' },
    { label: 'Inactive', value: 'Inactive' },
  ];

  const driverCountOptions: FilterOption[] = [
    { label: 'All Roster Sizes', value: 'All' },
    { label: 'Small (<25 Units)', value: 'Small' },
    { label: 'Medium (25-50 Units)', value: 'Medium' },
    { label: 'Large (>50 Units)', value: 'Large' },
  ];

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* 1. Filter Toolbar */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search accredited TODAs, acronym, barangay, or permit number..."
        selectFilters={[
          {
            id: 'status',
            label: 'Status',
            value: statusFilter,
            options: statusOptions,
            onChange: setStatusFilter,
          },
          {
            id: 'driverCount',
            label: 'Roster Size',
            value: driverCountFilter,
            options: driverCountOptions,
            onChange: setDriverCountFilter,
          },
        ]}
        onResetFilters={() => {
          setSearchQuery('');
          setStatusFilter('All');
          setDriverCountFilter('All');
        }}
      />

      {/* 2. Directory Table */}
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
                TODA NAME & ACRONYM
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                REPRESENTATIVE
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                SERVICE ZONE (BARANGAY)
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                BARANGAY CLEARANCE
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                AUTHORIZED FLEET
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                STATUS
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                ACTIONS
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                  <CircularProgress size={32} sx={{ color: 'var(--sakay-orange)', mb: 1.5 }} />
                  <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-muted)' }}>
                    Loading accredited TODAs from municipal registry...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredTodas.length > 0 ? (
              filteredTodas.map((toda) => (
                <TableRow
                  key={toda.id}
                  sx={{
                    transition: 'var(--mac-transition-fast)',
                    '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                  }}
                >
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '14.5px', color: 'var(--mac-text-primary)' }}>
                        {toda.name}
                      </Typography>
                      {toda.acronym && (
                        <Chip
                          label={toda.acronym}
                          size="small"
                          sx={{ fontSize: '11px', fontWeight: 600, backgroundColor: 'rgba(255, 107, 26, 0.1)', color: 'var(--sakay-orange)', height: 22 }}
                        />
                      )}
                      {toda.flaggedForReview && (
                        <Chip
                          icon={<WarningAmberIcon style={{ fontSize: 14, color: '#EA580C' }} />}
                          label={`Flagged (${toda.confirmedIncidents} Incidents)`}
                          size="small"
                          sx={{
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: '#FFF7ED',
                            color: '#EA580C',
                            border: '1px solid #FDBA74',
                            height: 22,
                          }}
                        />
                      )}
                    </Box>
                    <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)', mt: '3px' }}>
                      Permit / Cert: {toda.accreditationNo}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: '14px', color: 'var(--mac-text-primary)', py: 2.2, px: 3 }}>
                    {toda.representative}
                  </TableCell>
                  <TableCell sx={{ fontSize: '14px', color: 'var(--mac-text-secondary)', py: 2.2, px: 3 }}>
                    {toda.barangay}
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography
                      sx={{
                        fontSize: '13.5px',
                        fontWeight: 600,
                        color:
                          toda.clearanceStatus === 'Expired'
                            ? '#DC2626'
                            : toda.clearanceStatus === 'Expiring Soon'
                            ? '#EA580C'
                            : 'var(--mac-text-primary)',
                      }}
                    >
                      Expires: {toda.barangayClearanceExpiry}
                    </Typography>
                    <Box sx={{ mt: '4px' }}>
                      <StatusBadge status={toda.clearanceStatus as any} />
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)', py: 2.2, px: 3 }}>
                    {toda.registeredDrivers} Drivers
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <StatusBadge status={toda.status as any} />
                  </TableCell>
                  <TableCell align="right" sx={{ py: 2.2, px: 3 }}>
                    <ActionButton
                      label="View Directory"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedToda(toda);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                    <AccountBalanceIcon sx={{ fontSize: 44, color: 'var(--mac-border-color)' }} />
                    <Typography sx={{ fontSize: '15px', color: 'var(--mac-text-primary)', fontWeight: 600 }}>
                      No accredited TODAs found
                    </Typography>
                    <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', maxWidth: 420 }}>
                      {searchQuery || statusFilter !== 'All'
                        ? 'No records match your active search or filter parameters.'
                        : 'There are currently no accredited TODAs registered yet.'}
                    </Typography>
                    <Button
                      onClick={loadTodas}
                      startIcon={<RefreshIcon />}
                      sx={{
                        mt: 1,
                        textTransform: 'none',
                        fontSize: '13.5px',
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

      {/* 3. Centered Widescreen TODA Driver Directory Modal */}
      {selectedToda && (
        <TodaDetailModal
          open={Boolean(selectedToda)}
          onClose={() => setSelectedToda(null)}
          toda={selectedToda}
        />
      )}
    </Box>
  );
};
