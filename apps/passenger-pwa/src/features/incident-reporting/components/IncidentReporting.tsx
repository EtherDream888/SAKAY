import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { supabase } from '../../../services/supabaseClient';

interface IncidentReportItem {
  id: string;
  incidentType: string;
  franchiseNo: string;
  description: string;
  status: 'Submitted' | 'Under Investigation (LGU & TODA)' | 'Resolved' | 'Action Taken';
  submittedAt: string;
}

const STORAGE_KEY = 'sakay_passenger_incident_reports';

export const IncidentReporting: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navState = location.state as { from?: string; franchiseNo?: string; bookingId?: string } | null;
  const returnPath = navState?.from || '/dashboard';

  const [tab, setTab] = useState<0 | 1>(0);
  const [incidentType, setIncidentType] = useState('Overcharging Attempt');
  const [franchiseNo, setFranchiseNo] = useState(navState?.franchiseNo || '');
  const [description, setDescription] = useState(navState?.bookingId ? `Booking ref: ${navState.bookingId}. ` : '');
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Exact categories matching apps/admin-portal/src/features/incidents/pages/IncidentReportsPage.tsx
  const incidentCategories = [
    'Overcharging Attempt',
    'Rude Behavior',
    'Unsafe Driving',
    'Reckless Driving',
    'Route Deviation',
    'Passenger Misconduct',
    'Lost Item',
    'Others',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const newReport: IncidentReportItem = {
      id: `INC-2026-${Date.now().toString().slice(-4)}`,
      incidentType,
      franchiseNo: franchiseNo.trim() || 'Unspecified Unit',
      description: description.trim(),
      status: 'Under Investigation (LGU & TODA)',
      submittedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    try {
      await supabase.from('incident_report').insert([
        {
          category: incidentType,
          description: `[Franchise: ${franchiseNo.trim() || 'N/A'}] ${description.trim()}`,
          severity: incidentType.includes('Unsafe') || incidentType.includes('Reckless') ? 'High' : 'Medium',
          status: 'Pending Review',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.warn('[IncidentReporting] DB sync note:', err);
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const history = raw ? JSON.parse(raw) : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([newReport, ...history]));
    } catch {
      // ignore
    }

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setTab(1); // Switch to tracking tab
    }, 1500);
  };

  const getIncidentReports = (): IncidentReportItem[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw
        ? JSON.parse(raw)
        : [
            {
              id: 'INC-2026-9041',
              incidentType: 'Overcharging Attempt',
              franchiseNo: 'CAL-2025-0104',
              description: 'Nanghingi ng sobrang ₱20 lampas sa taripa mula Calapan Port hanggang City Hall.',
              status: 'Under Investigation (LGU & TODA)',
              submittedAt: 'Aug 13, 2026',
            },
          ];
    } catch {
      return [];
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Top Header */}
      <Box sx={{ padding: 'calc(var(--safe-area-top) + 16px) 20px 12px', display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #F1F5F9', backgroundColor: '#FFFFFF' }}>
        <IconButton onClick={() => navigate(returnPath)} sx={{ color: '#0F172A' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
          Pag-uulat ng Insidente (Incident Report)
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ backgroundColor: '#FFFFFF', px: 2, borderBottom: '1px solid #E2E8F0' }}>
        <Tabs value={tab} onChange={(_, val) => setTab(val)} textColor="inherit" indicatorColor="primary">
          <Tab label="Magsumite ng Ulat" sx={{ fontWeight: 700, textTransform: 'none' }} />
          <Tab label="Subaybayan ang Ulat" sx={{ fontWeight: 700, textTransform: 'none' }} />
        </Tabs>
      </Box>

      {tab === 0 ? (
        <Box component="form" onSubmit={handleSubmit} sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Typography sx={{ fontSize: '13.5px', color: '#64748B' }}>
            Direktang ipinapadala ang ulat na ito sa LGU Transport Board at TODA Grievance Committee para sa kaukulang imbestigasyon.
          </Typography>

          {/* Category Dropdown */}
          <FormControl fullWidth>
            <InputLabel>Uri ng Insidente (Incident Category)</InputLabel>
            <Select
              value={incidentType}
              label="Uri ng Insidente (Incident Category)"
              onChange={(e) => setIncidentType(e.target.value)}
              sx={{ borderRadius: '14px', backgroundColor: '#FFFFFF' }}
            >
              {incidentCategories.map((cat) => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Franchise / Body Number */}
          <TextField
            fullWidth
            label="Franchise Number / Plate No. / TODA"
            placeholder="e.g. CAL-2025-0773 o TODA-104"
            value={franchiseNo}
            onChange={(e) => setFranchiseNo(e.target.value)}
            sx={{ backgroundColor: '#FFFFFF', '& .MuiOutlinedInput-root': { borderRadius: '14px' } }}
          />

          {/* Written Description */}
          <TextField
            fullWidth
            required
            multiline
            rows={4}
            label="Detalyadong Salaysay ng Pangyayari"
            placeholder="Pakilahad ang eksaktong oras, lugar, at buong detalye ng insidente..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={{ backgroundColor: '#FFFFFF', '& .MuiOutlinedInput-root': { borderRadius: '14px' } }}
          />

          {/* Photo Evidence Upload Button */}
          <Paper
            onClick={() => setPhotoUploaded(true)}
            sx={{
              p: 2,
              borderRadius: '14px',
              border: photoUploaded ? '1px solid #1E8E3E' : '1px dashed #CBD5E1',
              backgroundColor: photoUploaded ? '#E6F4EA' : '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {photoUploaded ? <CheckCircleIcon sx={{ color: '#1E8E3E' }} /> : <UploadFileIcon sx={{ color: '#64748B' }} />}
              <Box>
                <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                  {photoUploaded ? 'Nai-upload ang Larawan/Katibayan' : 'Mag-upload ng Larawan / Katibayan (Optional)'}
                </Typography>
                <Typography sx={{ fontSize: '11px', color: '#64748B' }}>Screenshot, resibo, o litrato ng tricycle</Typography>
              </Box>
            </Box>
            <Chip label={photoUploaded ? 'Nai-attach' : 'Upload'} size="small" color={photoUploaded ? 'success' : 'default'} />
          </Paper>

          {submitted ? (
            <Alert severity="success" sx={{ borderRadius: '14px' }}>
              Matagumpay na naitala ang iyong ulat. May magsasagawang imbestigasyon ang LGU.
            </Alert>
          ) : (
            <Button
              type="submit"
              variant="contained"
              fullWidth
              startIcon={<ReportProblemIcon />}
              sx={{
                height: 52,
                borderRadius: '16px',
                backgroundColor: '#DC2626',
                fontWeight: 800,
                fontSize: '15px',
                '&:hover': { backgroundColor: '#B91C1C' },
              }}
            >
              Isumite ang Reklamo (Submit Report)
            </Button>
          )}
        </Box>
      ) : (
        /* Status Tracker Tab */
        <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {getIncidentReports().map((report) => (
            <Paper key={report.id} elevation={0} sx={{ p: 2.5, borderRadius: '16px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{report.id}</Typography>
                <Chip
                  label={report.status}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: '10.5px',
                    backgroundColor: report.status === 'Resolved' ? '#E6F4EA' : '#FEF3C7',
                    color: report.status === 'Resolved' ? '#1E8E3E' : '#B45309',
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#FF6B00' }}>
                Kategorya: {report.incidentType}
              </Typography>
              <Typography sx={{ fontSize: '12px', color: '#64748B' }}>
                Inirereklamong Unit: <strong>{report.franchiseNo}</strong> • Petsa: {report.submittedAt}
              </Typography>
              <Typography sx={{ fontSize: '12.5px', color: '#334155', mt: 0.5 }}>
                {report.description}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
};
