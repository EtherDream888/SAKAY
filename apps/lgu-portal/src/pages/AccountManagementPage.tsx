import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, Alert, Avatar } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckIcon from '@mui/icons-material/Check';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';

const PRESET_SWATCHES = [
  { name: 'SAKAY Orange', hex: '#FF6B00' },
  { name: 'Municipal Blue', hex: '#2563EB' },
  { name: 'City Emerald', hex: '#059669' },
  { name: 'Royal Violet', hex: '#7C3AED' },
  { name: 'Rose Pink', hex: '#DB2777' },
  { name: 'Crimson Red', hex: '#DC2626' },
];

export const AccountManagementPage: React.FC = () => {
  const { user, adminProfile } = useAuth();
  const { themeColor, setThemeColor } = useTheme();

  const [email, setEmail] = useState(user?.email || adminProfile?.email || 'admin@gmail.com');
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [selectedColor, setSelectedColor] = useState(themeColor);
  const [themeMsg, setThemeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  useEffect(() => {
    setSelectedColor(themeColor);
  }, [themeColor]);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setEmailMsg({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    setIsUpdatingEmail(true);
    setEmailMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      setEmailMsg({ type: 'success', text: 'Email update requested. Please check your new email for confirmation.' });
    } catch (err: any) {
      setEmailMsg({ type: 'error', text: err.message || 'Failed to update email. Please try again.' });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setIsUpdatingPassword(true);
    setPasswordMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSaveTheme = async () => {
    setIsSavingTheme(true);
    setThemeMsg(null);
    try {
      await setThemeColor(selectedColor);
      setThemeMsg({ type: 'success', text: 'System theme color updated and saved successfully!' });
    } catch (err: any) {
      setThemeMsg({ type: 'error', text: 'Failed to save theme setting.' });
    } finally {
      setIsSavingTheme(false);
    }
  };

  const displayName = adminProfile?.full_name || 'City Administrator';
  const displayEmail = adminProfile?.email || user?.email || 'admin@gmail.com';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', pb: 6 }}>
      {/* 1. Account Profile Card */}
      <Card
        sx={{
          mb: 4,
          borderRadius: 'var(--mac-radius-lg)',
          border: '1px solid var(--mac-border-color)',
          boxShadow: 'var(--mac-shadow-card)',
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 3.5 }}>
          {/* Avatar: Vertically centered, NO shadow, clean outline with accent color */}
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: 'var(--sakay-orange-soft)',
              color: 'var(--sakay-orange)',
              fontSize: '32px',
              fontWeight: 700,
              border: '2px solid var(--sakay-orange)',
              boxShadow: 'none',
              flexShrink: 0,
            }}
          >
            {initial}
          </Avatar>

          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontSize: '22px', fontWeight: 700, color: 'var(--mac-text-primary)', lineHeight: 1.2, mb: 0.5 }}>
              {displayName}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--mac-text-secondary)' }}>
                <BadgeIcon fontSize="small" sx={{ color: 'var(--sakay-orange)', fontSize: 18 }} />
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--sakay-orange)' }}>
                  LGU Admin
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--mac-text-secondary)' }}>
                <EmailIcon fontSize="small" sx={{ color: 'var(--mac-text-muted)', fontSize: 18 }} />
                <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-primary)' }}>
                  {displayEmail}
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 2. Main Content Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3.5 }}>
        
        {/* Account Security - Email & Password */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
          
          {/* Change Email Address */}
          <Card
            sx={{
              borderRadius: 'var(--mac-radius-lg)',
              border: '1px solid var(--mac-border-color)',
              boxShadow: 'var(--mac-shadow-card)',
              backgroundColor: '#FFFFFF',
            }}
          >
            <CardContent sx={{ p: 3.5 }}>
              {/* Card Title & Subtitle - NO DIVIDER */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                  <ManageAccountsIcon sx={{ color: 'var(--sakay-orange)', fontSize: 22 }} />
                  <Typography sx={{ fontSize: '16px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                    Change Email Address
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)' }}>
                  Update your official municipal email credentials securely.
                </Typography>
              </Box>

              {emailMsg && (
                <Alert severity={emailMsg.type} sx={{ mb: 2.5, borderRadius: '10px', fontSize: '13.5px' }}>
                  {emailMsg.text}
                </Alert>
              )}

              <form onSubmit={handleUpdateEmail}>
                <TextField
                  fullWidth
                  label="New Email Address"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isUpdatingEmail}
                  sx={{
                    mb: 2.5,
                    '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                    '& .MuiInputLabel-root': { fontSize: '14px' },
                    '& .MuiOutlinedInput-input': { fontSize: '14px' },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isUpdatingEmail || email === displayEmail}
                  sx={{
                    borderRadius: '10px',
                    px: 3.5,
                    py: 1.2,
                    backgroundColor: 'var(--sakay-orange)',
                    boxShadow: 'none',
                    textTransform: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                    '&:hover': { backgroundColor: 'var(--sakay-orange-hover)', boxShadow: 'none' },
                  }}
                >
                  {isUpdatingEmail ? 'Updating...' : 'Update Email'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card
            sx={{
              borderRadius: 'var(--mac-radius-lg)',
              border: '1px solid var(--mac-border-color)',
              boxShadow: 'var(--mac-shadow-card)',
              backgroundColor: '#FFFFFF',
            }}
          >
            <CardContent sx={{ p: 3.5 }}>
              {/* Card Title & Subtitle - NO DIVIDER */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                  <SecurityIcon sx={{ color: 'var(--sakay-orange)', fontSize: 22 }} />
                  <Typography sx={{ fontSize: '16px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                    Change Password
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)' }}>
                  Update your LGU administrator password securely.
                </Typography>
              </Box>

              {passwordMsg && (
                <Alert severity={passwordMsg.type} sx={{ mb: 2.5, borderRadius: '10px', fontSize: '13.5px' }}>
                  {passwordMsg.text}
                </Alert>
              )}

              <form onSubmit={handleUpdatePassword}>
                <TextField
                  fullWidth
                  label="New Password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isUpdatingPassword}
                  sx={{
                    mb: 2.5,
                    '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                    '& .MuiInputLabel-root': { fontSize: '14px' },
                    '& .MuiOutlinedInput-input': { fontSize: '14px' },
                  }}
                />
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isUpdatingPassword}
                  sx={{
                    mb: 2.5,
                    '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                    '& .MuiInputLabel-root': { fontSize: '14px' },
                    '& .MuiOutlinedInput-input': { fontSize: '14px' },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                  sx={{
                    borderRadius: '10px',
                    px: 3.5,
                    py: 1.2,
                    backgroundColor: 'var(--sakay-orange)',
                    boxShadow: 'none',
                    textTransform: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                    '&:hover': { backgroundColor: 'var(--sakay-orange-hover)', boxShadow: 'none' },
                  }}
                >
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </Box>

        {/* 3. System Appearance / Theme Color Customization */}
        <Card
          sx={{
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            backgroundColor: '#FFFFFF',
            height: 'fit-content',
          }}
        >
          <CardContent sx={{ p: 3.5 }}>
            {/* Card Title & Subtitle - NO DIVIDER */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <PaletteIcon sx={{ color: selectedColor, fontSize: 22 }} />
                <Typography sx={{ fontSize: '16px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                  System Appearance
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)' }}>
                Customize the primary accent color used throughout the SAKAY LGU Portal.
              </Typography>
            </Box>

            {themeMsg && (
              <Alert severity={themeMsg.type} sx={{ mb: 2.5, borderRadius: '10px', fontSize: '13.5px' }}>
                {themeMsg.text}
              </Alert>
            )}

            {/* Color Swatches Grid */}
            <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--mac-text-primary)', mb: 1.5 }}>
              Preset Accent Swatches
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 3 }}>
              {PRESET_SWATCHES.map((swatch) => {
                const isSelected = selectedColor.toUpperCase() === swatch.hex.toUpperCase();
                return (
                  <Box
                    key={swatch.hex}
                    onClick={() => setSelectedColor(swatch.hex)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.2,
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: isSelected ? `2px solid ${swatch.hex}` : '1px solid var(--mac-border-color)',
                      backgroundColor: isSelected ? 'rgba(0,0,0,0.02)' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: swatch.hex,
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        backgroundColor: swatch.hex,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && <CheckIcon sx={{ color: '#FFFFFF', fontSize: 14 }} />}
                    </Box>
                    <Typography sx={{ fontSize: '13px', fontWeight: isSelected ? 700 : 500, color: 'var(--mac-text-primary)' }}>
                      {swatch.name}
                    </Typography>
                  </Box>
                );
              })}
            </Box>

            {/* Custom Color Input */}
            <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--mac-text-primary)', mb: 1.5 }}>
              Custom Accent Color
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3.5 }}>
              <Box
                component="input"
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '10px',
                  border: '1px solid var(--mac-border-color)',
                  cursor: 'pointer',
                  padding: 0,
                  backgroundColor: 'transparent',
                  '&::-webkit-color-swatch-wrapper': { padding: 0 },
                  '&::-webkit-color-swatch': { border: 'none', borderRadius: '8px' },
                }}
              />
              <TextField
                size="small"
                label="Hex Code"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                sx={{
                  flexGrow: 1,
                  '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                  '& .MuiInputLabel-root': { fontSize: '13.5px' },
                  '& .MuiOutlinedInput-input': { fontSize: '14px', fontFamily: 'monospace', fontWeight: 600 },
                }}
              />
            </Box>

            {/* Live Visual Preview */}
            <Box
              sx={{
                padding: '16px 20px',
                borderRadius: '12px',
                border: '1px solid var(--mac-border-color)',
                backgroundColor: '#FAFAFC',
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography sx={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--mac-text-muted)' }}>
                Theme Preview
              </Typography>
              <Button
                size="small"
                variant="contained"
                sx={{
                  backgroundColor: selectedColor,
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  boxShadow: 'none',
                  '&:hover': { backgroundColor: selectedColor, boxShadow: 'none' },
                }}
              >
                Sample Active State
              </Button>
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={handleSaveTheme}
              disabled={isSavingTheme || selectedColor === themeColor}
              sx={{
                borderRadius: '10px',
                py: 1.2,
                backgroundColor: selectedColor,
                boxShadow: 'none',
                textTransform: 'none',
                fontSize: '14px',
                fontWeight: 600,
                '&:hover': { backgroundColor: selectedColor, boxShadow: 'none' },
              }}
            >
              {isSavingTheme ? 'Saving Theme...' : 'Save Theme'}
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};
