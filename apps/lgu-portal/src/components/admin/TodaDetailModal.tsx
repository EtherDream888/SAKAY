import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Avatar, Button, Pagination } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import L from 'leaflet';

import { AccreditedTodaRecord, DriverRecord, MOCK_DRIVERS } from '../../mockData/adminData';
import { MacCenterModal } from './MacCenterModal';
import { StatusBadge } from '../common/StatusBadge';
import { ActionButton } from './ActionButton';
import { DriverDetailModal } from './DriverDetailModal';
import { DocumentPreviewModal } from './DocumentPreviewModal';

interface TodaDetailModalProps {
  open: boolean;
  onClose: () => void;
  toda: AccreditedTodaRecord | null;
}

export const TodaDetailModal: React.FC<TodaDetailModalProps> = ({
  open,
  onClose,
  toda,
}) => {
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  // Selected driver inside TODA roster modal for inspecting driver details
  const [selectedDriver, setSelectedDriver] = useState<DriverRecord | null>(null);
  
  // Selected document for official records preview
  const [selectedDoc, setSelectedDoc] = useState<{ name: string; type: string } | null>(null);

  // Map Ref for Leaflet
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);

  // Initialize map when modal is open
  useEffect(() => {
    if (!toda || !mapRef.current || !open) return;

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const map = L.map(mapRef.current, {
      center: [toda.centerLat, toda.centerLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    // Draw service zone circle
    L.circle([toda.centerLat, toda.centerLng], {
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

    L.marker([toda.centerLat, toda.centerLng], { icon: customIcon })
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

  // Generate full 124 driver roster for demonstration pagination
  const mockRoster = Array.from({ length: toda.registeredDrivers }).map((_, idx) => {
    const baseDriver = MOCK_DRIVERS[idx % MOCK_DRIVERS.length];
    return {
      ...baseDriver,
      id: `DRV-TODA-${idx + 1}`,
      name: `${baseDriver.name.split(' ')[0]} ${String.fromCharCode(65 + (idx % 26))}. ${baseDriver.name.split(' ')[1] || 'Cruz'}`,
      vehiclePlate: `${100 + idx}-MV`,
      onlineStatus: idx % 2 === 0 ? 'Online' : ('Offline' as 'Online' | 'Offline'),
    };
  });

  // Calculate pagination slice
  const totalDrivers = mockRoster.length;
  const totalPages = Math.ceil(totalDrivers / rowsPerPage);
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalDrivers);
  const currentPageDrivers = mockRoster.slice(startIndex, endIndex);

  return (
    <>
      <MacCenterModal
        open={open}
        onClose={onClose}
        title={toda.name}
        subtitle={`Permit: ${toda.accreditationNo} • ${toda.barangay}`}
        badge={<StatusBadge status={toda.status} />}
        maxWidth={920}
      >
        {/* Section 1: TODA Information Grid */}
        <Box sx={{ mb: 3.5 }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1.5, letterSpacing: '0.3px' }}>
            TODA Accreditation & Contact Information
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, backgroundColor: '#F5F5F7', padding: '18px', borderRadius: '12px' }}>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Representative</Typography>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{toda.representative}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Contact Number</Typography>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{toda.phone}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Email Address</Typography>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{toda.email}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Service Coverage Area</Typography>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{toda.barangay}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Registered Drivers</Typography>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--sakay-orange)' }}>{toda.registeredDrivers} Drivers</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>Accreditation Expiry</Typography>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{toda.expiryDate}</Typography>
            </Box>
          </Box>
        </Box>

        {/* Section 2: Service Zone & Boundary Map */}
        <Box sx={{ mb: 3.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <MapIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Service Zone & Boundary
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
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1.5, letterSpacing: '0.3px' }}>
            Official Records & Permits ({toda.documents.length})
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {toda.documents.map((doc, idx) => (
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
                  <DescriptionIcon sx={{ color: 'var(--sakay-orange)', fontSize: 24 }} />
                  <Box>
                    <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                      {doc.name}
                    </Typography>
                    <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                      Issued: {doc.date}
                    </Typography>
                  </Box>
                </Box>
                <ActionButton label="View Document" showArrow={false} onClick={() => setSelectedDoc({ name: doc.name, type: doc.type })} sx={{ height: 34, fontSize: '13px' }} />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Section 4: Affiliated Driver Roster Table with 10-Row Pagination */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PeopleIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Affiliated Tricycle Drivers Roster ({totalDrivers} Registered)
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', fontWeight: 500 }}>
              Showing {startIndex + 1}–{endIndex} of {totalDrivers} drivers
            </Typography>
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid var(--mac-border-color)', borderRadius: '12px', overflow: 'hidden' }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#FAFAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', py: 1.5 }}>DRIVER NAME</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', py: 1.5 }}>PLATE NO.</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', py: 1.5 }}>ONLINE STATUS</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', py: 1.5 }}>VERIFICATION</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '13px', py: 1.5 }}>ACCOUNT</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '13px', py: 1.5 }}>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentPageDrivers.map((drv) => (
                  <TableRow
                    key={drv.id}
                    onClick={() => setSelectedDriver(drv as DriverRecord)}
                    sx={{
                      cursor: 'pointer',
                      transition: 'var(--mac-transition-fast)',
                      '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                    }}
                  >
                    <TableCell sx={{ py: 1.2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: '12px', backgroundColor: 'var(--sakay-orange-soft)', color: 'var(--sakay-orange)', fontWeight: 600 }}>
                          {drv.name.charAt(0)}
                        </Avatar>
                        <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                          {drv.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>{drv.vehiclePlate}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: drv.onlineStatus === 'Online' ? '#34A853' : '#9AA0A6' }} />
                        <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-secondary)', fontWeight: 500 }}>{drv.onlineStatus}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><StatusBadge status={drv.verificationStatus} /></TableCell>
                    <TableCell><StatusBadge status={drv.accountStatus} /></TableCell>
                    <TableCell align="right">
                      <ActionButton
                        label="Inspect"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDriver(drv as DriverRecord);
                        }}
                        sx={{ height: 30, fontSize: '12.5px', padding: '0 12px' }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 10-Row Pagination Bar */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, pt: 1 }}>
            <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>
              Page {page} of {totalPages}
            </Typography>

            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              shape="rounded"
              size="medium"
              sx={{
                '& .MuiPaginationItem-root': {
                  borderRadius: '8px',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  '&.Mui-selected': {
                    backgroundColor: 'var(--sakay-orange)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    '&:hover': { backgroundColor: 'var(--sakay-orange-hover)' },
                  },
                },
              }}
            />
          </Box>
        </Box>
      </MacCenterModal>

      {/* Driver Detail Inspector Modal over TODA Modal */}
      {selectedDriver && (
        <DriverDetailModal
          open={Boolean(selectedDriver)}
          onClose={() => setSelectedDriver(null)}
          driver={selectedDriver}
        />
      )}

      {/* Document Preview Modal */}
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
