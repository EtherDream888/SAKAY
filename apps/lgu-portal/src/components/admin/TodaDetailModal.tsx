import React, { useState, useEffect, useRef } from 'react';
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
  Pagination,
  CircularProgress,
} from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import L from 'leaflet';

import { AccreditedTodaRecord, DriverRecord } from '../../mockData/adminData';
import { MacCenterModal } from './MacCenterModal';
import { StatusBadge } from '../common/StatusBadge';
import { ActionButton } from './ActionButton';
import { DriverDetailModal } from './DriverDetailModal';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { fetchTodaDrivers } from '../../services/adminApiService';

interface TodaDetailModalProps {
  open: boolean;
  onClose: () => void;
  toda: AccreditedTodaRecord | null;
}

export const TodaDetailModal: React.FC<TodaDetailModalProps> = ({ open, onClose, toda }) => {
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  // Real affiliated drivers fetched from database
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState<boolean>(true);

  // Selected driver inside TODA roster modal for inspecting driver details
  const [selectedDriver, setSelectedDriver] = useState<DriverRecord | null>(null);

  // Selected document for official records preview
  const [selectedDoc, setSelectedDoc] = useState<{ name: string; type: string } | null>(null);

  // Map Ref for Leaflet
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);

  // Fetch real drivers affiliated with this TODA
  useEffect(() => {
    if (!toda || !open) return;

    setIsLoadingDrivers(true);
    fetchTodaDrivers(toda.id)
      .then((data) => {
        setDrivers(data);
      })
      .catch((err) => {
        console.error('[TodaDetailModal] Error loading toda drivers:', err);
      })
      .finally(() => {
        setIsLoadingDrivers(false);
      });
  }, [toda, open]);

  // Initialize map when modal is open
  useEffect(() => {
    if (!toda || !mapRef.current || !open) return;

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const lat = toda.centerLat || 13.4115;
    const lng = toda.centerLng || 121.1803;

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    // Draw service zone circle
    L.circle([lat, lng], {
      color: '#FF5500',
      fillColor: '#FF5500',
      fillOpacity: 0.15,
      radius: 600,
    }).addTo(map);

    // Custom TODA Marker
    const customIcon = L.divIcon({
      className: 'custom-toda-marker',
      html: '🏛️',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    L.marker([lat, lng], { icon: customIcon })
      .addTo(map)
      .bindPopup(`<b>${toda.name}</b><br/>${toda.barangay}`);

    leafletMapRef.current = map;

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [toda, open]);

  if (!toda) return null;

  // Pagination calculation
  const totalDrivers = drivers.length;
  const totalPages = Math.ceil(Math.max(1, totalDrivers) / rowsPerPage);
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalDrivers);
  const currentPageDrivers = drivers.slice(startIndex, endIndex);

  const officialDocs = [
    { name: `Official Barangay Clearance (${toda.barangay})`, type: 'LGU Barangay Certification', date: toda.accreditedDate || '2024' },
    { name: 'SEC / CDA Registration Certificate', type: 'Certified True Copy', date: toda.accreditedDate || '2024' },
    { name: `Driver Roster (${toda.registeredDrivers} Units)`, type: 'Accredited Roster PDF', date: toda.accreditedDate || '2024' },
    { name: "Mayor's Permit & Franchise Clearance", type: 'City Franchise Permit', date: toda.accreditedDate || '2024' },
  ];

  return (
    <>
      <MacCenterModal
        open={open}
        onClose={onClose}
        title={toda.name}
        subtitle={`Permit: ${toda.accreditationNo} • ${toda.barangay}`}
        badge={<StatusBadge status={toda.status as any} />}
        maxWidth={920}
      >
        {/* Section 1: TODA Information Grid */}
        <Box sx={{ mb: 3.5 }}>
          <Typography sx={{ fontSize: '10.4px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1.5, letterSpacing: '0.3px' }}>
            1. TODA Accreditation & Contact Information
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, backgroundColor: '#F5F5F7', padding: '18px', borderRadius: '12px' }}>
            <Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>Representative</Typography>
              <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{toda.representative}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>Contact Number</Typography>
              <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{toda.phone}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>Email Address</Typography>
              <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{toda.email || 'N/A'}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>Service Coverage Area</Typography>
              <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{toda.serviceZone || toda.barangay}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>Registered Drivers</Typography>
              <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--sakay-orange)' }}>{toda.registeredDrivers} Drivers</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>Accreditation Expiry</Typography>
              <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{toda.expiryDate}</Typography>
            </Box>
          </Box>
        </Box>

        {/* Section 2: Service Zone & Boundary Map */}
        <Box sx={{ mb: 3.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <MapIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
            <Typography sx={{ fontSize: '10.4px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              2. Service Zone & Operational Boundary
            </Typography>
          </Box>

          <Box
            sx={{
              width: '100%',
              height: 210,
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid var(--mac-border-color)',
              position: 'relative',
              boxShadow: 'var(--mac-shadow-subtle)',
            }}
          >
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          </Box>
        </Box>

        {/* Section 3: Official Records & Permits */}
        <Box sx={{ mb: 3.5 }}>
          <Typography sx={{ fontSize: '10.4px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1.5, letterSpacing: '0.3px' }}>
            3. Registration & Accreditation Documents ({officialDocs.length})
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {officialDocs.map((doc, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--mac-border-color)',
                  backgroundColor: '#FFFFFF',
                  boxShadow: 'var(--mac-shadow-subtle)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <DescriptionIcon sx={{ color: 'var(--sakay-orange)', fontSize: '19.3' }} />
                  <Box>
                    <Typography sx={{ fontSize: '11.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      {doc.name}
                    </Typography>
                    <Typography sx={{ fontSize: '10px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                      {doc.type} • Validated
                    </Typography>
                  </Box>
                </Box>
                <ActionButton
                  label="View Document"
                  showArrow={false}
                  onClick={() => setSelectedDoc({ name: doc.name, type: doc.type })}
                  sx={{ height: 34, fontSize: '10.4px' }}
                />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Section 4: Affiliated Driver Roster Table */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PeopleIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
              <Typography sx={{ fontSize: '10.4px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                4. Affiliated Tricycle Drivers ({totalDrivers})
              </Typography>
            </Box>
            {totalDrivers > 0 && (
              <Typography sx={{ fontSize: '10.4px', color: 'var(--mac-text-muted)', fontWeight: 500 }}>
                Showing {startIndex + 1}–{endIndex} of {totalDrivers} drivers
              </Typography>
            )}
          </Box>

          <TableContainer
            component={Paper}
            elevation={0}
            sx={{ border: '1px solid var(--mac-border-color)', borderRadius: '12px', overflow: 'hidden' }}
          >
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#FAFAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: '10.4px', py: 1.5 }}>DRIVER NAME</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '10.4px', py: 1.5 }}>PLATE NO.</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '10.4px', py: 1.5 }}>ONLINE STATUS</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '10.4px', py: 1.5 }}>VERIFICATION</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '10.4px', py: 1.5 }}>ACCOUNT</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '10.4px', py: 1.5 }}>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoadingDrivers ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} sx={{ color: 'var(--sakay-orange)', mb: 1 }} />
                      <Typography sx={{ fontSize: '10.4px', color: 'var(--mac-text-muted)' }}>
                        Loading driver records...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : currentPageDrivers.length > 0 ? (
                  currentPageDrivers.map((drv) => (
                    <TableRow
                      key={drv.id}
                      onClick={() => setSelectedDriver(drv)}
                      sx={{
                        cursor: 'pointer',
                        transition: 'var(--mac-transition-fast)',
                        '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                      }}
                    >
                      <TableCell sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 28, height: 28, fontSize: '9.6px', backgroundColor: 'var(--sakay-orange-soft)', color: 'var(--sakay-orange)' }}>
                            {drv.name.charAt(0)}
                          </Avatar>
                          <Typography sx={{ fontSize: '10.8px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                            {drv.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: '10.4px', color: 'var(--mac-text-secondary)', py: 1.5 }}>
                        {drv.vehiclePlate}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: drv.onlineStatus === 'Online' ? '#34A853' : '#9AA0A6' }} />
                          <Typography sx={{ fontSize: '10px', color: 'var(--mac-text-secondary)' }}>
                            {drv.onlineStatus}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <StatusBadge status={drv.verificationStatus as any} />
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <StatusBadge status={drv.accountStatus as any} />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.5 }}>
                        <ActionButton
                          label="Inspect"
                          showArrow={false}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDriver(drv);
                          }}
                          sx={{ height: 28, fontSize: '9.6px' }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography sx={{ fontSize: '10.8px', color: 'var(--mac-text-muted)' }}>
                        No registered drivers currently affiliated with this TODA.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2.5 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, val) => setPage(val)}
                size="small"
                sx={{
                  '& .Mui-selected': {
                    backgroundColor: 'var(--sakay-orange) !important',
                    color: '#FFFFFF',
                  },
                }}
              />
            </Box>
          )}
        </Box>
      </MacCenterModal>

      {/* Driver Detail Inspection Modal */}
      {selectedDriver && (
        <DriverDetailModal
          open={Boolean(selectedDriver)}
          onClose={() => setSelectedDriver(null)}
          driver={selectedDriver}
        />
      )}

      {/* Document Inspection Popover */}
      {selectedDoc && (
        <DocumentPreviewModal
          open={Boolean(selectedDoc)}
          onClose={() => setSelectedDoc(null)}
          documentName={selectedDoc.name}
          documentType={selectedDoc.type}
        />
      )}
    </>
  );
};
