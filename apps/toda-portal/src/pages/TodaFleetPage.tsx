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
  Button,
  Chip,
  TextField,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import AddIcon from '@mui/icons-material/Add';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';

import { fetchTodaFleet, addTodaVehicle, TodaVehicleUnit, DEFAULT_TODA_ID } from '../services/todaApiService';
import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { DocumentPreviewModal } from '../components/admin/DocumentPreviewModal';

/**
 * ============================================================================
 * TODA TRICYCLE FLEET MANAGEMENT PAGE (TodaFleetPage.tsx)
 * ============================================================================
 * Checklist Scope:
 *   ● Manage Tricycle Units
 *     ○ View tricycle records
 *     ○ Add tricycle unit
 *     ○ Review tricycle documents
 *     ○ Update tricycle status
 *     ○ Manage TODA vehicle fleet
 * ============================================================================
 */
export const TodaFleetPage: React.FC = () => {
  const [fleet, setFleet] = useState<TodaVehicleUnit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Add Unit Dialog
  const [addUnitDialogOpen, setAddUnitDialogOpen] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newMtop, setNewMtop] = useState('');
  const [newDriver, setNewDriver] = useState('');
  const [newOrCr, setNewOrCr] = useState('');

  // Document preview
  const [previewDoc, setPreviewDoc] = useState<{ name: string; type: string } | null>(null);

  const loadFleet = async () => {
    setIsLoading(true);
    try {
      const data = await fetchTodaFleet(DEFAULT_TODA_ID);
      setFleet(data);
    } catch (err) {
      console.error('[TodaFleetPage] Error loading fleet:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFleet();
  }, []);

  const handleAddUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate.trim() || !newMtop.trim() || !newDriver.trim()) return;

    try {
      await addTodaVehicle({
        plateNumber: newPlate.trim(),
        mtopNumber: newMtop.trim(),
        driverName: newDriver.trim(),
        orCrNumber: newOrCr.trim() || 'ORCR-PENDING',
      });

      const newUnit: TodaVehicleUnit = {
        id: `UNIT-${String(fleet.length + 1).padStart(3, '0')}`,
        plateNumber: newPlate.trim(),
        mtopNumber: newMtop.trim(),
        driverName: newDriver.trim(),
        driverId: `DRV-NEW-${Date.now().toString().slice(-4)}`,
        status: 'Active',
        inspectionStatus: 'Passed',
        orCrNumber: newOrCr.trim() || 'ORCR-PENDING',
        registeredDate: new Date().toLocaleDateString('en-US'),
      };

      setFleet((prev) => [newUnit, ...prev]);
      setAddUnitDialogOpen(false);
      setNewPlate('');
      setNewMtop('');
      setNewDriver('');
      setNewOrCr('');
    } catch (err) {
      console.error('[TodaFleetPage] Error adding unit:', err);
    }
  };

  const handleToggleUnitStatus = (unitId: string) => {
    setFleet((prev) =>
      prev.map((u) =>
        u.id === unitId
          ? { ...u, status: u.status === 'Active' ? 'Maintenance' : 'Active' }
          : u
      )
    );
  };

  const filteredFleet = fleet.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      u.plateNumber.toLowerCase().includes(q) ||
      u.mtopNumber.toLowerCase().includes(q) ||
      u.driverName.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'All' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalUnits = fleet.length;
  const activeUnits = fleet.filter((u) => u.status === 'Active').length;
  const maintenanceUnits = fleet.filter((u) => u.status === 'Maintenance').length;

  const statusOptions: FilterOption[] = [
    { label: 'All Unit Statuses', value: 'All' },
    { label: 'Active', value: 'Active' },
    { label: 'Maintenance', value: 'Maintenance' },
    { label: 'Inactive', value: 'Inactive' },
  ];

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* 1. Summary Cards & Add Button */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '20px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
            TODA Tricycle Fleet Roster
          </Typography>
          <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', mt: '3px' }}>
            Manage authorized motorized tricycle units, franchise permits, and roadworthiness records
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            onClick={loadFleet}
            startIcon={<RefreshIcon />}
            variant="outlined"
            size="small"
            sx={{ textTransform: 'none', borderColor: 'var(--mac-border-color)', color: 'var(--mac-text-primary)' }}
          >
            Refresh
          </Button>
          <Button
            onClick={() => setAddUnitDialogOpen(true)}
            startIcon={<AddIcon />}
            variant="contained"
            size="small"
            sx={{ textTransform: 'none', backgroundColor: 'var(--sakay-orange)', fontWeight: 600 }}
          >
            + Register Tricycle Unit
          </Button>
        </Box>
      </Box>

      {/* 2. Top Summary KPI Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2.5,
          mb: 4,
        }}
      >
        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Total Fleet Size
              </Typography>
              <DirectionsCarIcon sx={{ color: 'var(--sakay-orange)', fontSize: 22 }} />
            </Box>
            <Typography sx={{ fontSize: '28px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              {totalUnits} Units
            </Typography>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
              Accredited TODA tricycle inventory
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Active & Operational
              </Typography>
              <CheckCircleIcon sx={{ color: '#2E7D32', fontSize: 22 }} />
            </Box>
            <Typography sx={{ fontSize: '28px', fontWeight: 700, color: '#2E7D32', mb: 0.5 }}>
              {activeUnits} Units
            </Typography>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
              Ready for dispatch operations
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Under Maintenance / Inactive
              </Typography>
              <BuildIcon sx={{ color: '#C2410C', fontSize: 22 }} />
            </Box>
            <Typography sx={{ fontSize: '28px', fontWeight: 700, color: '#C2410C', mb: 0.5 }}>
              {maintenanceUnits} Units
            </Typography>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
              Temporary mechanical repairs
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 3. Filter Toolbar */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search vehicle plate no., MTOP franchise, driver name, or unit ID..."
        selectFilters={[
          {
            id: 'status',
            label: 'Operational Status',
            value: statusFilter,
            options: statusOptions,
            onChange: setStatusFilter,
          },
        ]}
        onResetFilters={() => {
          setSearchQuery('');
          setStatusFilter('All');
        }}
      />

      {/* 4. Fleet Data Table */}
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
                UNIT ID & PLATE NO.
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                MTOP FRANCHISE
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                ASSIGNED MEMBER DRIVER
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                INSPECTION & OR/CR
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                FLEET STATUS
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                ACTIONS
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <CircularProgress size={32} sx={{ color: 'var(--sakay-orange)', mb: 1.5 }} />
                  <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-muted)' }}>
                    Loading vehicle fleet...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredFleet.length > 0 ? (
              filteredFleet.map((unit) => (
                <TableRow
                  key={unit.id}
                  sx={{
                    transition: 'var(--mac-transition-fast)',
                    '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                  }}
                >
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--mac-text-primary)' }}>
                      {unit.plateNumber}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                      Unit Ref: {unit.id}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      {unit.mtopNumber}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
                      Calapan City Franchise
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      {unit.driverName}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
                      ID: {unit.driverId}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#2E7D32' }}>
                      ✓ {unit.inspectionStatus}
                    </Typography>
                    <Typography
                      onClick={() => setPreviewDoc({ name: `OR/CR Document (${unit.plateNumber})`, type: 'Official LTO Registration' })}
                      sx={{ fontSize: '12px', color: 'var(--sakay-orange)', cursor: 'pointer', mt: '2px', textDecoration: 'underline' }}
                    >
                      {unit.orCrNumber} (View Doc)
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <StatusBadge status={unit.status === 'Active' ? 'Active' : 'Inactive'} />
                  </TableCell>
                  <TableCell align="right" sx={{ py: 2.2, px: 3 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleToggleUnitStatus(unit.id)}
                      sx={{
                        textTransform: 'none',
                        fontSize: '12.5px',
                        borderColor: 'var(--mac-border-color)',
                        color: unit.status === 'Active' ? '#C2410C' : '#2E7D32',
                      }}
                    >
                      {unit.status === 'Active' ? 'Set Maintenance' : 'Set Active'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <Typography sx={{ fontSize: '15px', color: 'var(--mac-text-primary)', fontWeight: 600 }}>
                    No tricycle units found
                  </Typography>
                  <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', mt: 0.5 }}>
                    {searchQuery || statusFilter !== 'All'
                      ? 'No vehicle units match your search filters.'
                      : 'There are currently no registered tricycle units in this TODA fleet.'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Tricycle Unit Dialog */}
      <Dialog open={addUnitDialogOpen} onClose={() => setAddUnitDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '18px' }}>
          Register New Tricycle Unit
        </DialogTitle>
        <form onSubmit={handleAddUnitSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Vehicle Plate Number *"
              value={newPlate}
              onChange={(e) => setNewPlate(e.target.value)}
              placeholder="e.g. 981-MV"
              required
              fullWidth
              size="small"
            />
            <TextField
              label="MTOP Franchise Permit Number *"
              value={newMtop}
              onChange={(e) => setNewMtop(e.target.value)}
              placeholder="e.g. MTOP-2026-098"
              required
              fullWidth
              size="small"
            />
            <TextField
              label="Assigned Member Driver Full Name *"
              value={newDriver}
              onChange={(e) => setNewDriver(e.target.value)}
              placeholder="e.g. Danilo R. Santos"
              required
              fullWidth
              size="small"
            />
            <TextField
              label="LTO OR/CR Certificate Number"
              value={newOrCr}
              onChange={(e) => setNewOrCr(e.target.value)}
              placeholder="e.g. ORCR-77491"
              fullWidth
              size="small"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setAddUnitDialogOpen(false)} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{ textTransform: 'none', backgroundColor: 'var(--sakay-orange)', fontWeight: 600 }}
            >
              Add Unit to Fleet
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Document Inspection Popover */}
      {previewDoc && (
        <DocumentPreviewModal
          open={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          documentName={previewDoc.name}
          documentType={previewDoc.type}
        />
      )}
    </Box>
  );
};
