import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import { ACCREDITED_TODAS } from '../../../mockData/driverMockData';

export const DriverRegister: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('Aurelio "Auring" Bautista');
  const [phone, setPhone] = useState('09181234567');
  const [password, setPassword] = useState('DriverPass123!');
  const [selectedToda, setSelectedToda] = useState('toda-1');
  const [licenseNo, setLicenseNo] = useState('D02-19-008819');
  const [plateNo, setPlateNo] = useState('CAL-442-TR');
  const [franchiseNo, setFranchiseNo] = useState('FR-CAL-104');

  // Mock Upload Files
  const [licenseUploaded, setLicenseUploaded] = useState(true);
  const [mtopUploaded, setMtopUploaded] = useState(true);
  const [photoUploaded, setPhotoUploaded] = useState(true);

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !licenseNo || !plateNo) return;
    setSubmitted(true);
    setTimeout(() => {
      navigate('/driver/verify-otp', {
        state: {
          phone,
          driverName: name,
          todaId: selectedToda,
          isRecovery: false,
        },
      });
    }, 600);
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 1. Permanent Sticky Top Bar */}
      <Box
        sx={{
          padding: 'calc(var(--safe-area-top) + 12px) 20px 12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #F1F5F9',
          backgroundColor: '#FFFFFF',
          flexShrink: 0,
          zIndex: 20,
        }}
      >
        <IconButton
          onClick={() => navigate('/account-selection')}
          sx={{
            color: '#0F172A',
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            '&:hover': { backgroundColor: '#F1F5F9' },
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Logo color="orange" width={100} />
        <Box sx={{ width: 40 }} />
      </Box>

      {/* 2. Scrollable Form Content */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 20px calc(var(--safe-area-bottom) + 24px) 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
            Gumawa ng Account
          </Typography>
          <Typography sx={{ fontSize: '13px', color: '#64748B' }}>
            Ipasok ang iyong detalye para sa opisyal na akreditasyon at pamamasada sa SAKAY.
          </Typography>
        </Box>

        <TextField
          fullWidth
          required
          label="Buong Pangalan (Full Name)"
          placeholder="e.g. Aurelio Bautista"
          value={name}
          onChange={(e) => setName(e.target.value)}
          slotProps={{ input: { sx: { borderRadius: '14px', backgroundColor: '#F8FAFC' } } }}
        />

        <TextField
          fullWidth
          required
          label="Mobile Phone (+63)"
          placeholder="0917 123 4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          slotProps={{ input: { sx: { borderRadius: '14px', backgroundColor: '#F8FAFC' } } }}
        />

        <TextField
          fullWidth
          required
          type="password"
          label="Password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          slotProps={{ input: { sx: { borderRadius: '14px', backgroundColor: '#F8FAFC' } } }}
        />

        <FormControl fullWidth required>
          <InputLabel id="toda-select-label">Kinabibilangang TODA</InputLabel>
          <Select
            labelId="toda-select-label"
            value={selectedToda}
            label="Kinabibilangang TODA"
            onChange={(e) => setSelectedToda(e.target.value)}
            sx={{ borderRadius: '14px', backgroundColor: '#F8FAFC' }}
          >
            {ACCREDITED_TODAS.map((toda) => (
              <MenuItem key={toda.id} value={toda.id}>
                {toda.name} ({toda.acronym})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <TextField
            fullWidth
            required
            label="License Number"
            placeholder="D02-XX-XXXXXX"
            value={licenseNo}
            onChange={(e) => setLicenseNo(e.target.value)}
            slotProps={{ input: { sx: { borderRadius: '14px', backgroundColor: '#F8FAFC' } } }}
          />

          <TextField
            fullWidth
            required
            label="Plate Number"
            placeholder="CAL-XXX-XX"
            value={plateNo}
            onChange={(e) => setPlateNo(e.target.value)}
            slotProps={{ input: { sx: { borderRadius: '14px', backgroundColor: '#F8FAFC' } } }}
          />
        </Box>

        <TextField
          fullWidth
          label="Franchise / MTOP No. (Kung Meron)"
          placeholder="e.g. FR-CAL-2025-104"
          value={franchiseNo}
          onChange={(e) => setFranchiseNo(e.target.value)}
          slotProps={{ input: { sx: { borderRadius: '14px', backgroundColor: '#F8FAFC' } } }}
        />

        {/* Document Upload Previews */}
        <Typography sx={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', mt: 1 }}>
          Mga Dokumento para sa Beripikasyon
        </Typography>

        <Paper
          elevation={0}
          onClick={() => setLicenseUploaded(true)}
          sx={{
            p: 2,
            borderRadius: '16px',
            border: licenseUploaded ? '1px solid #10B981' : '1px dashed #CBD5E1',
            backgroundColor: licenseUploaded ? '#ECFDF5' : '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <UploadFileIcon sx={{ color: licenseUploaded ? '#10B981' : '#64748B' }} />
            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                Professional Driver's License
              </Typography>
              <Typography sx={{ fontSize: '11px', color: '#64748B' }}>
                {licenseUploaded ? 'Nai-upload: drivers_license_front.jpg' : 'I-tap upang mag-upload ng litrato'}
              </Typography>
            </Box>
          </Box>
          {licenseUploaded && <CheckCircleIcon sx={{ color: '#10B981', fontSize: 20 }} />}
        </Paper>

        <Paper
          elevation={0}
          onClick={() => setMtopUploaded(true)}
          sx={{
            p: 2,
            borderRadius: '16px',
            border: mtopUploaded ? '1px solid #10B981' : '1px dashed #CBD5E1',
            backgroundColor: mtopUploaded ? '#ECFDF5' : '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <UploadFileIcon sx={{ color: mtopUploaded ? '#10B981' : '#64748B' }} />
            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                Tricycle OR / CR & MTOP Permit
              </Typography>
              <Typography sx={{ fontSize: '11px', color: '#64748B' }}>
                {mtopUploaded ? 'Nai-upload: or_cr_franchise.pdf' : 'I-tap upang mag-upload ng kopya'}
              </Typography>
            </Box>
          </Box>
          {mtopUploaded && <CheckCircleIcon sx={{ color: '#10B981', fontSize: 20 }} />}
        </Paper>

        <PrimaryButton fullWidth type="submit" loading={submitted} sx={{ mt: 1 }}>
          Ipadala ang Aplikasyon
        </PrimaryButton>

        <Typography
          sx={{
            textAlign: 'center',
            fontSize: '14px',
            color: '#64748B',
            mt: 0.5,
          }}
        >
          May driver account na?
          <Box
            component="span"
            onClick={() => navigate('/driver/login')}
            sx={{
              color: '#FF6B00',
              fontWeight: 700,
              cursor: 'pointer',
              ml: '6px',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Mag-login Dito
          </Box>
        </Typography>
      </Box>
    </Box>
  );
};

export default DriverRegister;
