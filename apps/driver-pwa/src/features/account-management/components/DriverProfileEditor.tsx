import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  TextField,
  Avatar,
  Chip,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StarIcon from '@mui/icons-material/Star';
import VerifiedIcon from '@mui/icons-material/Verified';
import GavelIcon from '@mui/icons-material/Gavel';

import { INITIAL_DRIVER_PROFILE, ACCREDITED_TODAS, VERIFIED_TRICYCLES } from '../../../mockData/driverMockData';

export const DriverProfileEditor: React.FC = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('sakay_driver_profile');
    return saved ? JSON.parse(saved) : INITIAL_DRIVER_PROFILE;
  });

  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    const updated = { ...profile, phone, email };
    setProfile(updated);
    localStorage.setItem('sakay_driver_profile', JSON.stringify(updated));
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const activeToda = ACCREDITED_TODAS.find((t) => t.id === profile.selectedTodaId);
  const activeVehicle = VERIFIED_TRICYCLES.find((v) => v.id === profile.selectedVehicleId);

  return (
    <Box sx={{ width: '100%', height: '100%', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Header */}
      <Box sx={{ padding: 'calc(var(--safe-area-top) + 16px) 20px 16px', display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #F1F5F9', backgroundColor: '#FFFFFF' }}>
        <IconButton onClick={() => navigate('/driver/home')} sx={{ color: '#0F172A' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
          Driver Profile & Settings
        </Typography>
      </Box>

      <Box sx={{ p: '24px 20px', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Profile Card */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: '20px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', textAlign: 'center' }}>
          <Avatar sx={{ width: 68, height: 68, backgroundColor: '#FF6B00', fontWeight: 800, fontSize: '24px', margin: '0 auto 12px auto' }}>
            {profile.name.charAt(0)}
          </Avatar>
          <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>{profile.name}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: '2px' }}>
            <VerifiedIcon sx={{ color: '#1E8E3E', fontSize: 16 }} />
            <Typography sx={{ fontSize: '12.5px', color: '#1E8E3E', fontWeight: 700 }}>
              Accredited SAKAY Driver
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 2.5, pt: 2, borderTop: '1px solid #F1F5F9' }}>
            <Box>
              <Typography sx={{ fontSize: '11px', color: '#64748B' }}>Rating</Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>★ {profile.rating.toFixed(1)}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '11px', color: '#64748B' }}>Biyahe</Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{profile.totalTrips}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '11px', color: '#64748B' }}>Strikes</Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#1E8E3E' }}>0 / 3</Typography>
            </Box>
          </Box>
        </Paper>

        {/* Active Affiliations Summary */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
          <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', mb: 1 }}>
            Aktibong Rehistrasyon
          </Typography>
          <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
            TODA: {activeToda?.name} ({activeToda?.acronym})
          </Typography>
          <Typography sx={{ fontSize: '13px', color: '#475569', mt: '2px' }}>
            Unit: Plate {activeVehicle?.plateNumber} • Franchise #{activeVehicle?.franchiseNumber}
          </Typography>
          <Typography sx={{ fontSize: '12px', color: '#64748B', mt: '2px' }}>
            License: {profile.licenseNo} (Valid until {profile.licenseExpiry})
          </Typography>
        </Paper>

        {/* Editable Fields */}
        <TextField
          fullWidth
          label="Contact Mobile Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <TextField
          fullWidth
          label="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {savedNotice && (
          <Typography sx={{ fontSize: '13px', color: '#1E8E3E', fontWeight: 700, textAlign: 'center' }}>
            ✓ Matagumpay na na-save ang profile!
          </Typography>
        )}

        <Button
          variant="contained"
          fullWidth
          onClick={handleSave}
          sx={{
            height: 50,
            borderRadius: '14px',
            backgroundColor: '#FF6B00',
            fontWeight: 800,
            '&:hover': { backgroundColor: '#E66000' },
          }}
        >
          I-save ang Pagbabago
        </Button>
      </Box>
    </Box>
  );
};
