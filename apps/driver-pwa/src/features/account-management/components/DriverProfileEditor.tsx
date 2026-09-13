import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  TextField,
  Avatar,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StarIcon from '@mui/icons-material/Star';
import VerifiedIcon from '@mui/icons-material/Verified';

import { supabase } from '../../../services/supabaseClient';
import { fetchDriverProfile } from '../../../services/driverApiService';

export const formatMobileNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '');

  let afterPrefix = '';
  if (digits.startsWith('09')) {
    afterPrefix = digits.slice(2);
  } else if (digits.startsWith('639')) {
    afterPrefix = digits.slice(3);
  } else if (digits.startsWith('9')) {
    afterPrefix = digits.slice(1);
  } else if (digits.startsWith('0')) {
    afterPrefix = digits.slice(1);
  } else {
    afterPrefix = digits;
  }

  afterPrefix = afterPrefix.slice(0, 9);

  if (!afterPrefix) {
    return '09';
  }

  const full = '09' + afterPrefix;
  if (full.length <= 4) {
    return full;
  }
  if (full.length <= 7) {
    return `${full.slice(0, 4)} ${full.slice(4)}`;
  }
  return `${full.slice(0, 4)} ${full.slice(4, 7)} ${full.slice(7, 11)}`;
};

export const DriverProfileEditor: React.FC = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('sakay_driver_profile');
    return saved ? JSON.parse(saved) : {
      id: '',
      name: '',
      phone: '',
      email: '',
      licenseNumber: '',
      vehiclePlate: '',
      franchiseNumber: '',
      todaName: '',
      rating: 5.0,
      totalTrips: 0,
    };
  });

  const [phone, setPhone] = useState(() => formatMobileNumber(profile.phone || '09'));
  const [email, setEmail] = useState(profile.email || '');
  const [savedNotice, setSavedNotice] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const driverId = localStorage.getItem('sakay_driver_id') || undefined;
    fetchDriverProfile(driverId).then(async (dbProfile) => {
      if (dbProfile) {
        // Query completed trips count for this driver
        const { count: completedTripsCount } = await supabase
          .from('booking')
          .select('*', { count: 'exact', head: true })
          .eq('driver_id', dbProfile.id)
          .eq('booking_status', 'Completed');

        const combined = {
          ...dbProfile,
          totalTrips: completedTripsCount || 0,
        };
        setProfile(combined);
        setPhone(formatMobileNumber(combined.phone || '09'));
        setEmail(combined.email || '');
        localStorage.setItem('sakay_driver_profile', JSON.stringify(combined));
      }
    });
  }, []);

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;

    // Only prevent deletion when cursor is collapsed at or before '09'
    if (e.key === 'Backspace' && start === end && start <= 2) {
      e.preventDefault();
    }
    if (e.key === 'Delete' && start === end && start < 2) {
      e.preventDefault();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const rawPhoneDigits = phone.replace(/\D/g, '');
    const formattedPhone = rawPhoneDigits.startsWith('09')
      ? `+63${rawPhoneDigits.slice(1)}`
      : rawPhoneDigits.startsWith('639')
      ? `+${rawPhoneDigits}`
      : `+63${rawPhoneDigits}`;

    const updated = {
      ...profile,
      phone: formattedPhone,
      email,
    };

    try {
      const activeId = profile.id || localStorage.getItem('sakay_driver_id');
      if (activeId) {
        await supabase
          .from('driver')
          .update({
            contact_number: formattedPhone,
            email: email || null,
          })
          .eq('driver_id', activeId);
      }

      setProfile(updated);
      localStorage.setItem('sakay_driver_profile', JSON.stringify(updated));
      localStorage.setItem('sakay_driver_phone', formattedPhone);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } catch (err) {
      console.warn('[DriverProfileEditor] Save error:', err);
    } finally {
      setSaving(false);
    }
  };

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
            {profile.name ? profile.name.charAt(0) : 'D'}
          </Avatar>
          <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>{profile.name || 'Drayber'}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: '2px' }}>
            <VerifiedIcon sx={{ color: '#1E8E3E', fontSize: 16 }} />
            <Typography sx={{ fontSize: '12.5px', color: '#1E8E3E', fontWeight: 700 }}>
              Accredited SAKAY Driver
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 2.5, pt: 2, borderTop: '1px solid #F1F5F9' }}>
            <Box>
              <Typography sx={{ fontSize: '11px', color: '#64748B' }}>Rating</Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>★ {(Number(profile.rating) || 5.0).toFixed(1)}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '11px', color: '#64748B' }}>Trips</Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{profile.totalTrips || 0}</Typography>
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
            Active Registration
          </Typography>
          <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
            TODA: {profile.todaName || 'Active TODA'}
          </Typography>
          <Typography sx={{ fontSize: '13px', color: '#475569', mt: '2px' }}>
            Unit: Plate {profile.vehiclePlate || 'N/A'} • Franchise #{profile.franchiseNumber || 'N/A'}
          </Typography>
          <Typography sx={{ fontSize: '12px', color: '#64748B', mt: '2px' }}>
            License: {profile.licenseNumber || 'N/A'}
          </Typography>
        </Paper>

        {/* Editable Fields */}
        <TextField
          fullWidth
          label="Contact Mobile Number"
          value={phone}
          onChange={(e) => setPhone(formatMobileNumber(e.target.value))}
          onKeyDown={handlePhoneKeyDown}
        />

        <TextField
          fullWidth
          label="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {savedNotice && (
          <Typography sx={{ fontSize: '13px', color: '#1E8E3E', fontWeight: 700, textAlign: 'center' }}>
            ✓ Profile saved successfully!
          </Typography>
        )}

        <Button
          variant="contained"
          fullWidth
          disabled={saving}
          onClick={handleSave}
          sx={{
            height: 50,
            borderRadius: '14px',
            backgroundColor: '#FF6B00',
            fontWeight: 800,
            '&:hover': { backgroundColor: '#E66000' },
          }}
        >
          {saving ? <CircularProgress size={24} sx={{ color: '#FFFFFF' }} /> : 'Save Changes'}
        </Button>
      </Box>
    </Box>
  );
};

export default DriverProfileEditor;
