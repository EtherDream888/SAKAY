import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Chip,
  Divider,
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import CalculateIcon from '@mui/icons-material/Calculate';
import HistoryIcon from '@mui/icons-material/History';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import { MOCK_FARE_MATRIX_HISTORY, FareMatrixRecord, CURRENT_ADMIN } from '../mockData/adminData';
import { StatusBadge } from '../components/common/StatusBadge';
import { ActionButton } from '../components/admin/ActionButton';
import { MacCenterModal } from '../components/admin/MacCenterModal';
import { fetchFareMatrices, createFareMatrix, recordAdminAuditAction } from '../services/adminApiService';

/**
 * ============================================================================
 * FARE CONFIGURATION PAGE COMPONENT
 * ============================================================================
 * Purpose:
 *   Allows LGU Transport Board administrators to review active municipal
 *   tricycle tariffs, derive passenger seat fares, enact new fare ordinances,
 *   and maintain an immutable audit trail of all rate modifications.
 * ============================================================================
 */
export const FareConfigurationPage: React.FC = () => {
  // State: Historical and currently enacted fare matrix records
  const [fareHistory, setFareHistory] = useState<FareMatrixRecord[]>(MOCK_FARE_MATRIX_HISTORY);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [updateModalOpen, setUpdateModalOpen] = useState<boolean>(false);
  const [selectedVersion, setSelectedVersion] = useState<FareMatrixRecord | null>(null);

  /**
   * Effect: Fetch live fare matrices from the backend server on initial component load.
   * If the backend server is offline, it gracefully uses the fallback mock data.
   */
  useEffect(() => {
    let isMounted = true;
    fetchFareMatrices()
      .then((data) => {
        if (isMounted && data && data.length > 0) {
          setFareHistory(data);
        }
      })
      .catch((err) => {
        console.warn('[FareConfiguration] Failed to fetch fare matrix, using fallback:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute: The currently active municipal matrix (first record where is_active is true)
  const activeMatrix = fareHistory.find((f) => f.is_active) || fareHistory[0];

  // Form State: Controlled inputs for enacting a new municipal fare rate ordinance
  const [newBaseFare, setNewBaseFare] = useState<string>('15.00');
  const [newBaseDistance, setNewBaseDistance] = useState<string>('2.0');
  const [newSucceedingRate, setNewSucceedingRate] = useState<string>('1.00');
  const [newOrdinance, setNewOrdinance] = useState<string>('City Ordinance No. 118, Series of 2022 (Amendment 2026)');
  const [newEffectiveDate, setNewEffectiveDate] = useState<string>('June 01, 2026');
  const [newNotes, setNewNotes] = useState<string>('');

  /**
   * Handler: Submits a new municipal fare matrix.
   * 1. Validates numerical inputs.
   * 2. Calls createFareMatrix() API to persist the new rates in the backend.
   * 3. Records an immutable action in the audit trail.
   * 4. Updates the local state to immediately reflect the new active rates.
   */
  const handleUpdateMatrixSubmit = async () => {
    const base = parseFloat(newBaseFare) || 15.0;
    const dist = parseFloat(newBaseDistance) || 2.0;
    const succ = parseFloat(newSucceedingRate) || 1.0;

    const newVersionId = `FARE-2026-V${fareHistory.length + 1}`;
    const newRecord: FareMatrixRecord = {
      id: newVersionId,
      fare_matrix_id: `FM-00${fareHistory.length + 1}`,
      base_fare: base,
      base_distance_km: dist,
      succeeding_rate: succ,
      effective_timestamp: new Date().toISOString(),
      effective_date: newEffectiveDate,
      is_active: true,
      configured_by_lgu_admin: `${CURRENT_ADMIN.name} (${CURRENT_ADMIN.role})`,
      ordinance_reference: newOrdinance,
      notes: newNotes || 'Updated municipal fare rates according to Sangguniang Panlungsod resolution.',
      created_at: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    };

    // Save to Backend API / Database
    try {
      await createFareMatrix({
        baseFare: base,
        baseDistanceKm: dist,
        succeedingRate: succ,
        ordinanceNumber: newOrdinance,
        configuredBy: `${CURRENT_ADMIN.name} (${CURRENT_ADMIN.role})`,
      });
    } catch (error) {
      console.warn('[FareConfiguration] Failed to save matrix to backend, saving locally:', error);
    }

    // Update local UI state
    setFareHistory((prev) => [
      newRecord,
      ...prev.map((f) => ({
        ...f,
        is_active: false,
        effective_date: f.is_active ? `${f.effective_date} (Superseded)` : f.effective_date,
      })),
    ]);

    // Record action to the immutable audit trail ledger
    recordAdminAuditAction({
      actionType: 'FARE_MATRIX_UPDATED',
      targetId: newRecord.fare_matrix_id,
      targetName: `Fare Matrix Version ${fareHistory.length + 1}`,
      details: `Enacted new fare rates: ₱${base.toFixed(2)} base fare (${dist.toFixed(1)} km), ₱${succ.toFixed(2)}/km succeeding rate. Ordinance: ${newOrdinance}.`,
      category: 'Fare Matrix',
    });

    setUpdateModalOpen(false);
  };

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* 1. Top Summary Stat Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 3.5,
        }}
      >
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Standard Base Fare</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--sakay-orange)' }}>₱{activeMatrix.base_fare.toFixed(2)}</Typography>
          <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: 0.5 }}>First {activeMatrix.base_distance_km.toFixed(1)} kilometers</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Succeeding Per-KM Rate</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#1565C0' }}>₱{activeMatrix.succeeding_rate.toFixed(2)} / km</Typography>
          <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: 0.5 }}>Excess distance increment</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Solo Charter Base</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#2E7D32' }}>₱{(activeMatrix.base_fare * 4).toFixed(2)}</Typography>
          <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: 0.5 }}>4-Seat capacity charter</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', padding: '20px 24px', boxShadow: 'var(--mac-shadow-card)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--mac-text-muted)', mb: 1 }}>Matrix Versions</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>{fareHistory.length} Versions</Typography>
          <Typography sx={{ fontSize: '12px', color: '#1E8E3E', mt: 0.5, fontWeight: 600 }}>Active: V{fareHistory.length}</Typography>
        </Box>
      </Box>

      {/* 2. Active Fare Matrix & Derived Formulas Split Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' }, gap: 3, mb: 4, alignItems: 'start' }}>
        {/* Active Fare Matrix Card */}
        <Card
          sx={{
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <CardContent sx={{ p: '28px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: '4px' }}>
                  <Typography sx={{ fontSize: '20px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                    Current Active Fare Matrix
                  </Typography>
                  <Chip
                    label="Active Standard"
                    size="small"
                    sx={{ backgroundColor: '#E6F4EA', color: '#1E8E3E', fontWeight: 700, fontSize: '12px', height: 24 }}
                  />
                </Box>
                <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)' }}>
                  {activeMatrix.ordinance_reference}
                </Typography>
              </Box>

              <Button
                onClick={() => setUpdateModalOpen(true)}
                startIcon={<EditNoteIcon />}
                variant="contained"
                sx={{
                  height: 40,
                  padding: '0 20px',
                  borderRadius: '9px',
                  textTransform: 'none',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  backgroundColor: 'var(--sakay-orange)',
                  color: '#FFFFFF',
                  boxShadow: 'var(--mac-shadow-subtle)',
                  '&:hover': { backgroundColor: 'var(--sakay-orange-hover)' },
                }}
              >
                Configure New Rate
              </Button>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2.5, backgroundColor: '#FAFAFC', padding: '22px', borderRadius: '12px', border: '1px solid var(--mac-border-color)', mb: 3 }}>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Base Minimum Fare
                </Typography>
                <Typography sx={{ fontSize: '24px', fontWeight: 700, color: 'var(--sakay-orange)' }}>
                  ₱{activeMatrix.base_fare.toFixed(2)}
                </Typography>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-secondary)', mt: '2px' }}>
                  Covers first {activeMatrix.base_distance_km.toFixed(1)} km
                </Typography>
              </Box>

              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Per-Kilometer Increment
                </Typography>
                <Typography sx={{ fontSize: '24px', fontWeight: 700, color: '#1565C0' }}>
                  ₱{activeMatrix.succeeding_rate.toFixed(2)}
                </Typography>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-secondary)', mt: '2px' }}>
                  Applied after {activeMatrix.base_distance_km.toFixed(1)} km
                </Typography>
              </Box>

              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Effective Since
                </Typography>
                <Typography sx={{ fontSize: '18px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  {activeMatrix.effective_date}
                </Typography>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-secondary)', mt: '2px' }}>
                  Enforced City-Wide
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1 }}>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>
                Configured By: <strong style={{ color: 'var(--mac-text-primary)' }}>{activeMatrix.configured_by_lgu_admin}</strong>
              </Typography>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
                System Version ID: {activeMatrix.fare_matrix_id}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Derived Calculations Context Card */}
        <Card
          sx={{
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            backgroundColor: '#FFFFFF',
          }}
        >
          <CardContent sx={{ p: '26px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <CalculateIcon sx={{ color: 'var(--sakay-orange)', fontSize: 24 }} />
              <Typography sx={{ fontSize: '18px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                Derived Metering Formulas
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mb: 2.5 }}>
              Standard algorithmic fare computations mandated by Calapan City Local Transport Framework:
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Formula 1: Single Seat Fare */}
              <Box sx={{ backgroundColor: '#F8F9FA', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--mac-border-color)' }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: '4px' }}>
                  1. Standard Single Seat Fare
                </Typography>
                <Typography sx={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--sakay-orange)', fontWeight: 600 }}>
                  Seat Fare = Base Fare + (Excess Distance × Per-KM Rate)
                </Typography>
                <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)', mt: '4px' }}>
                  Example (4.5 km): ₱15 + (2.5 km × ₱1.00) = ₱17.50 → ₱18.00 rounded
                </Typography>
              </Box>

              {/* Formula 2: Solo Trip Charter */}
              <Box sx={{ backgroundColor: '#F8F9FA', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--mac-border-color)' }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: '4px' }}>
                  2. Solo Trip (Full Unit Charter)
                </Typography>
                <Typography sx={{ fontFamily: 'monospace', fontSize: '13px', color: '#1565C0', fontWeight: 600 }}>
                  Solo Trip Fare = Seat Fare × 4 Seats (₱60.00 Base)
                </Typography>
                <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)', mt: '4px' }}>
                  Guarantees exclusive vehicle occupancy for passenger party.
                </Typography>
              </Box>

              {/* Formula 3: Ride-Sharing Split */}
              <Box sx={{ backgroundColor: '#F8F9FA', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--mac-border-color)' }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: '4px' }}>
                  3. Ride-Sharing Proportional Split
                </Typography>
                <Typography sx={{ fontFamily: 'monospace', fontSize: '13px', color: '#2E7D32', fontWeight: 600 }}>
                  Commuter Base = (Declared Pax / Total Pax) × ₱60.00
                </Typography>
                <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)', mt: '4px' }}>
                  Split savings benefit both co-passengers while ensuring ₱60.00 driver gross.
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* 3. Version History Table */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <HistoryIcon sx={{ color: 'var(--sakay-orange)' }} />
          <Typography sx={{ fontSize: '18px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
            Fare Matrix Version History & Historical Records
          </Typography>
        </Box>

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
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>VERSION & ORDINANCE</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>BASE FARE</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>BASE DISTANCE</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>PER-KM INCREMENT</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>EFFECTIVE TIMEFRAME</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>STATUS</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fareHistory.map((version) => (
                <TableRow
                  key={version.id}
                  sx={{
                    transition: 'var(--mac-transition-fast)',
                    backgroundColor: version.is_active ? 'rgba(255, 107, 26, 0.03)' : 'transparent',
                    '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                  }}
                >
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '14.5px', color: 'var(--mac-text-primary)' }}>
                      {version.id} ({version.fare_matrix_id})
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                      {version.ordinance_reference}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: '15px', fontWeight: 700, color: 'var(--sakay-orange)', py: 2.2, px: 3 }}>
                    ₱{version.base_fare.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ fontSize: '14px', color: 'var(--mac-text-primary)', py: 2.2, px: 3 }}>
                    {version.base_distance_km.toFixed(1)} km
                  </TableCell>
                  <TableCell sx={{ fontSize: '14px', fontWeight: 600, color: '#1565C0', py: 2.2, px: 3 }}>
                    ₱{version.succeeding_rate.toFixed(2)} / km
                  </TableCell>
                  <TableCell sx={{ fontSize: '13.5px', color: 'var(--mac-text-secondary)', py: 2.2, px: 3 }}>
                    {version.effective_date}
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <StatusBadge status={version.is_active ? 'Active' : 'Superseded'} />
                  </TableCell>
                  <TableCell align="right" sx={{ py: 2.2, px: 3 }}>
                    <ActionButton
                      label="Inspect"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVersion(version);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* 4. Configure New Fare Matrix Modal */}
      <MacCenterModal
        open={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        title="Configure New Fare Matrix Version"
        subtitle="Appends an immutable rate record to the municipal ledger."
        maxWidth={640}
        primaryActionLabel="Enact & Publish Rate"
        onPrimaryAction={handleUpdateMatrixSubmit}
        secondaryActionLabel="Cancel"
        onSecondaryAction={() => setUpdateModalOpen(false)}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box sx={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', padding: '14px 18px', borderRadius: '10px' }}>
            <Typography sx={{ fontSize: '13px', color: '#0369A1', lineHeight: 1.4 }}>
              <strong>Immutable Versioning Rule:</strong> Submitting a new configuration will preserve all past records for fare audit trails. The newly created version will immediately become the active calculation basis across Calapan City.
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              fullWidth
              label="Base Fare (PHP)"
              placeholder="15.00"
              value={newBaseFare}
              onChange={(e) => setNewBaseFare(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
            <TextField
              fullWidth
              label="Base Distance Coverage (KM)"
              placeholder="2.0"
              value={newBaseDistance}
              onChange={(e) => setNewBaseDistance(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
          </Box>

          <TextField
            fullWidth
            label="Succeeding Per-Kilometer Rate (PHP/KM)"
            placeholder="1.00"
            value={newSucceedingRate}
            onChange={(e) => setNewSucceedingRate(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />

          <TextField
            fullWidth
            label="Ordinance / Resolution Legal Reference"
            placeholder="e.g. City Ordinance No. 118, Series of 2022"
            value={newOrdinance}
            onChange={(e) => setNewOrdinance(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />

          <TextField
            fullWidth
            label="Effective Implementation Date"
            placeholder="e.g. June 01, 2026"
            value={newEffectiveDate}
            onChange={(e) => setNewEffectiveDate(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Regulatory Notes & Rationale"
            placeholder="Specify reason for fare adjustments (e.g. annual inflation index, fuel price stabilization)..."
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />
        </Box>
      </MacCenterModal>

      {/* 5. Inspect Version Modal */}
      {selectedVersion && (
        <MacCenterModal
          open={Boolean(selectedVersion)}
          onClose={() => setSelectedVersion(null)}
          title={`Fare Matrix Record — ${selectedVersion.fare_matrix_id}`}
          subtitle={selectedVersion.ordinance_reference}
          badge={<StatusBadge status={selectedVersion.is_active ? 'Active' : 'Superseded'} />}
          maxWidth={640}
        >
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2.5, backgroundColor: '#F5F5F7', padding: '20px', borderRadius: '12px', mb: 3 }}>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Base Minimum Fare</Typography>
                <Typography sx={{ fontSize: '20px', fontWeight: 700, color: 'var(--sakay-orange)' }}>₱{selectedVersion.base_fare.toFixed(2)}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Base Distance Covered</Typography>
                <Typography sx={{ fontSize: '18px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedVersion.base_distance_km.toFixed(1)} km</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Succeeding Rate</Typography>
                <Typography sx={{ fontSize: '18px', fontWeight: 600, color: '#1565C0' }}>₱{selectedVersion.succeeding_rate.toFixed(2)} / km</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Solo Charter Base (4 Seats)</Typography>
                <Typography sx={{ fontSize: '18px', fontWeight: 600, color: '#2E7D32' }}>₱{(selectedVersion.base_fare * 4).toFixed(2)}</Typography>
              </Box>
              <Box sx={{ gridColumn: 'span 2' }}>
                <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>Authorized Officer</Typography>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{selectedVersion.configured_by_lgu_admin}</Typography>
              </Box>
            </Box>

            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1.5 }}>
              Administrative Notes & Background
            </Typography>
            <Box sx={{ backgroundColor: '#FAFAFC', padding: '16px 20px', borderRadius: '10px', border: '1px solid var(--mac-border-color)' }}>
              <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-primary)', lineHeight: 1.5 }}>
                {selectedVersion.notes || 'No supplementary notes attached to this record.'}
              </Typography>
            </Box>
          </Box>
        </MacCenterModal>
      )}
    </Box>
  );
};
