import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Avatar,
  Snackbar,
  Paper,
  IconButton,
  Fade,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckIcon from '@mui/icons-material/Check';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ColorizeIcon from '@mui/icons-material/Colorize';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';

// Helper HSV <-> HEX Conversion Utilities
function hexToHsv(hexStr: string): { h: number; s: number; v: number } {
  let c = hexStr.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num) || (c.length !== 6)) return { h: 25, s: 100, v: 100 };
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  const rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
}

function hsvToHex(h: number, s: number, v: number): string {
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const vNorm = Math.max(0, Math.min(100, v)) / 100;
  const c = vNorm * sNorm;
  const hNorm = (h % 360 + 360) % 360;
  const x = c * (1 - Math.abs(((hNorm / 60) % 2) - 1));
  const m = vNorm - c;
  let r = 0, g = 0, b = 0;

  if (0 <= hNorm && hNorm < 60) { r = c; g = x; b = 0; }
  else if (60 <= hNorm && hNorm < 120) { r = x; g = c; b = 0; }
  else if (120 <= hNorm && hNorm < 180) { r = 0; g = c; b = x; }
  else if (180 <= hNorm && hNorm < 240) { r = 0; g = x; b = c; }
  else if (240 <= hNorm && hNorm < 300) { r = x; g = 0; b = c; }
  else if (300 <= hNorm && hNorm <= 360) { r = c; g = 0; b = x; }

  const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`.toUpperCase();
}

const PRESET_SWATCHES = [
  { name: 'SAKAY Orange', hex: '#FF6B00' },
  { name: 'Municipal Blue', hex: '#2563EB' },
  { name: 'City Emerald', hex: '#059669' },
  { name: 'Royal Violet', hex: '#7C3AED' },
  { name: 'Rose Pink', hex: '#DB2777' },
  { name: 'Crimson Red', hex: '#DC2626' },
];

const DEFAULT_SAVED_SWATCHES = [
  '#059669', // Emerald Green
  '#2563EB', // Municipal Blue
  '#4F46E5', // Indigo
  '#7C3AED', // Royal Violet
  '#C026D3', // Magenta
  '#E11D48', // Crimson
  '#FF6B00', // SAKAY Orange
  '#7F56D9', // Purple
];

const accountInputStyles = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    backgroundColor: '#FFFFFF',
    fontSize: '13px',
    '& fieldset': {
      borderColor: '#E5E5EA',
    },
    '&:hover fieldset': {
      borderColor: '#C7C7CC',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'var(--sakay-orange)',
    },
    '&.Mui-focused': {
      boxShadow: '0 0 0 3px var(--sakay-orange-soft)',
    },
  },
  '& .MuiInputLabel-root': {
    fontSize: '13px',
    color: '#86868B',
    backgroundColor: '#FFFFFF',
    px: 0.6,
    borderRadius: '4px',
    '&.Mui-focused': {
      color: 'var(--sakay-orange)',
    },
  },
};

// Embedded Compact Hex-Only Color Picker Component (No Alpha / No Format Dropdown)
interface EmbeddedColorPickerProps {
  color: string;
  onChange: (hex: string) => void;
}

const EmbeddedColorPicker: React.FC<EmbeddedColorPickerProps> = ({ color, onChange }) => {
  const [hsv, setHsv] = useState(() => hexToHsv(color));
  const [hexInput, setHexInput] = useState(color);
  const [savedSwatches, setSavedSwatches] = useState<string[]>(DEFAULT_SAVED_SWATCHES);

  const canvasRef = useRef<HTMLDivElement>(null);
  const isDraggingCanvas = useRef(false);

  useEffect(() => {
    const newHsv = hexToHsv(color);
    setHsv(newHsv);
    setHexInput(color.toUpperCase());
  }, [color]);

  const updateColorFromHsv = useCallback((h: number, s: number, v: number) => {
    const newHsv = { h, s, v };
    setHsv(newHsv);
    const hex = hsvToHex(h, s, v);
    setHexInput(hex);
    onChange(hex);
  }, [onChange]);

  // Handle Dragging inside 2D Saturation / Value canvas
  const handleCanvasMove = useCallback((e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

    const s = Math.round((x / rect.width) * 100);
    const v = Math.round((1 - y / rect.height) * 100);

    updateColorFromHsv(hsv.h, s, v);
  }, [hsv.h, updateColorFromHsv]);

  const handleCanvasMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    isDraggingCanvas.current = true;
    handleCanvasMove(e);
  };

  useEffect(() => {
    const handleMouseUp = () => { isDraggingCanvas.current = false; };
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingCanvas.current) handleCanvasMove(e);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleCanvasMove]);

  // Eyedropper integration
  const handleEyeDropper = async () => {
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result.sRGBHex) {
          const hex = result.sRGBHex.toUpperCase();
          onChange(hex);
        }
      } catch (e) {
        // User canceled eyedropper
      }
    }
  };

  const handleAddSavedSwatch = () => {
    const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);
    if (!savedSwatches.includes(currentHex)) {
      setSavedSwatches([...savedSwatches, currentHex]);
    }
  };

  const pureHueColor = `hsl(${hsv.h}, 100%, 50%)`;
  const pointerLeft = `${hsv.s}%`;
  const pointerTop = `${100 - hsv.v}%`;
  const currentColorHex = hsvToHex(hsv.h, hsv.s, hsv.v);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 380,
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid var(--mac-border-color)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        userSelect: 'none',
      }}
    >
      {/* 1. 2D Saturation / Brightness Gradient Canvas */}
      <Box
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onTouchStart={handleCanvasMouseDown}
        sx={{
          width: '100%',
          height: 170,
          borderRadius: '12px',
          position: 'relative',
          cursor: 'crosshair',
          backgroundColor: pureHueColor,
          backgroundImage: `
            linear-gradient(to top, #000000, transparent),
            linear-gradient(to right, #FFFFFF, transparent)
          `,
          overflow: 'hidden',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
        }}
      >
        {/* Pointer Circle Handle */}
        <Box
          sx={{
            position: 'absolute',
            left: pointerLeft,
            top: pointerTop,
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: '2.5px solid #FFFFFF',
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            backgroundColor: currentColorHex,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            transition: isDraggingCanvas.current ? 'none' : 'all 0.05s ease',
          }}
        />
      </Box>

      {/* 2. Controls Row: Eyedropper + Hue Slider Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {/* Eyedropper Button */}
        <IconButton
          size="small"
          onClick={handleEyeDropper}
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            border: '1px solid var(--mac-border-color)',
            backgroundColor: '#FFFFFF',
            color: 'var(--mac-text-secondary)',
            flexShrink: 0,
            '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
          }}
        >
          <ColorizeIcon fontSize="small" sx={{ fontSize: 18 }} />
        </IconButton>

        {/* Hue Rainbow Slider Bar */}
        <Box
          sx={{
            flexGrow: 1,
            height: 14,
            borderRadius: '7px',
            background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
            position: 'relative',
            cursor: 'pointer',
          }}
        >
          <input
            type="range"
            min="0"
            max="360"
            value={hsv.h}
            onChange={(e) => updateColorFromHsv(Number(e.target.value), hsv.s, hsv.v)}
            style={{
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              margin: 0,
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              left: `${(hsv.h / 360) * 100}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 16,
              height: 16,
              borderRadius: '50%',
              backgroundColor: pureHueColor,
              border: '2px solid #FFFFFF',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              pointerEvents: 'none',
            }}
          />
        </Box>
      </Box>

      {/* 3. HEX Format Input (Strictly HEX Only, No Alpha) */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            px: 1.5,
            py: 0.8,
            borderRadius: '8px',
            backgroundColor: '#F5F5F7',
            border: '1px solid var(--mac-border-color)',
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--mac-text-secondary)',
          }}
        >
          HEX
        </Box>

        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', position: 'relative' }}>
          <Box
            sx={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              backgroundColor: currentColorHex,
              position: 'absolute',
              left: 10,
              zIndex: 2,
              border: '1px solid rgba(0,0,0,0.12)',
            }}
          />
          <TextField
            size="small"
            value={hexInput}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setHexInput(val);
              if (/^#[0-9A-F]{6}$/i.test(val)) {
                const newHsv = hexToHsv(val);
                setHsv(newHsv);
                onChange(val);
              }
            }}
            sx={{
              width: '100%',
              '& .MuiOutlinedInput-root': {
                height: 36,
                borderRadius: '9px',
                pl: 4.2,
                fontSize: '13px',
                fontFamily: 'monospace',
                fontWeight: 600,
              },
            }}
          />
        </Box>
      </Box>

      {/* 4. Saved Swatches Row */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
            Saved Swatches
          </Typography>
          <Button
            size="small"
            startIcon={<AddIcon fontSize="small" sx={{ fontSize: 14 }} />}
            onClick={handleAddSavedSwatch}
            sx={{
              fontSize: '11.5px',
              fontWeight: 600,
              textTransform: 'none',
              color: 'var(--mac-text-secondary)',
              p: 0,
              minWidth: 'auto',
              '&:hover': { color: 'var(--sakay-orange)' },
            }}
          >
            Add
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {savedSwatches.map((hex) => {
            const isSelected = currentColorHex.toUpperCase() === hex.toUpperCase();
            return (
              <Box
                key={hex}
                onClick={() => {
                  const newHsv = hexToHsv(hex);
                  setHsv(newHsv);
                  setHexInput(hex.toUpperCase());
                  onChange(hex.toUpperCase());
                }}
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  backgroundColor: hex,
                  cursor: 'pointer',
                  border: isSelected ? `2.5px solid var(--mac-text-primary)` : '1px solid rgba(0,0,0,0.15)',
                  boxShadow: isSelected ? '0 0 0 2px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease',
                  '&:hover': { transform: 'scale(1.15)' },
                }}
              />
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

export const AccountManagementPage: React.FC = () => {
  const { user, adminProfile, refreshProfile } = useAuth();
  const { themeColor, setThemeColor } = useTheme();

  // Name State
  const [fullName, setFullName] = useState(adminProfile?.full_name || 'City Administrator');
  const [nameMsg, setNameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Email State
  const [email, setEmail] = useState(user?.email || adminProfile?.email || 'admin@gmail.com');
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Theme State & Toast State
  const [selectedColor, setSelectedColor] = useState(themeColor);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastProgress, setToastProgress] = useState(100);

  useEffect(() => {
    if (adminProfile?.full_name) {
      setFullName(adminProfile.full_name);
    }
  }, [adminProfile?.full_name]);

  useEffect(() => {
    const currentMail = user?.email || adminProfile?.email;
    if (currentMail) {
      setEmail(currentMail);
    }
  }, [user?.email, adminProfile?.email]);

  useEffect(() => {
    setSelectedColor(themeColor);
  }, [themeColor]);

  // Handle Toast Timer Progress
  useEffect(() => {
    let timer: any;
    let interval: any;
    if (toastOpen) {
      setToastProgress(100);
      const startTime = Date.now();
      const duration = 4000;
      interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setToastProgress(remaining);
      }, 50);

      timer = setTimeout(() => {
        setToastOpen(false);
      }, duration);
    }
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [toastOpen]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setIsUpdatingName(true);
    setNameMsg(null);
    try {
      if (user) {
        const { error } = await supabase
          .from('lgu_admin')
          .update({ full_name: fullName.trim() })
          .eq('auth_user_id', user.id);
        if (error) throw error;
        await refreshProfile();
        setNameMsg({ type: 'success', text: 'Administrator name updated successfully!' });
      }
    } catch (err: any) {
      setNameMsg({ type: 'error', text: err.message || 'Failed to update administrator name.' });
    } finally {
      setIsUpdatingName(false);
    }
  };

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

      if (user) {
        await supabase.from('lgu_admin').update({ email }).eq('auth_user_id', user.id);
        await refreshProfile();
      }

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
    try {
      await setThemeColor(selectedColor);
      setToastOpen(true);
    } catch (err: any) {
      console.error('Failed to save theme color:', err);
    } finally {
      setIsSavingTheme(false);
    }
  };

  const displayName = adminProfile?.full_name || fullName || 'City Administrator';
  const displayEmail = adminProfile?.email || user?.email || email || 'admin@gmail.com';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <Box sx={{ maxWidth: 1600, mx: 'auto', pb: 6, position: 'relative' }}>
      {/* 1. Account Profile Header Card - FULL WIDTH */}
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
        <CardContent sx={{ p: 3.5, display: 'flex', alignItems: 'center', gap: 3.5 }}>
          <Avatar
            sx={{
              width: 76,
              height: 76,
              bgcolor: 'var(--sakay-orange-soft)',
              color: 'var(--sakay-orange)',
              fontSize: '30px',
              fontWeight: 700,
              border: '2px solid var(--sakay-orange)',
              boxShadow: 'none',
              flexShrink: 0,
            }}
          >
            {initial}
          </Avatar>

          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontSize: '21px', fontWeight: 700, color: 'var(--mac-text-primary)', lineHeight: 1.2, mb: 0.5 }}>
              {displayName}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--mac-text-secondary)' }}>
                <BadgeIcon fontSize="small" sx={{ color: 'var(--sakay-orange)', fontSize: 17 }} />
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--sakay-orange)' }}>
                  LGU Administrator
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--mac-text-secondary)' }}>
                <EmailIcon fontSize="small" sx={{ color: 'var(--mac-text-muted)', fontSize: 17 }} />
                <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-primary)' }}>
                  {displayEmail}
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 2. Main Content Grid - FULL WIDTH 2-COLUMN */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3.5 }}>
        
        {/* Left Column: Profile Details & Credentials */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
          
          {/* Administrator Profile Name Update */}
          <Card
            sx={{
              borderRadius: 'var(--mac-radius-lg)',
              border: '1px solid var(--mac-border-color)',
              boxShadow: 'var(--mac-shadow-card)',
              backgroundColor: '#FFFFFF',
            }}
          >
            <CardContent sx={{ p: 3.5 }}>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                  <PersonOutlinedIcon sx={{ color: 'var(--sakay-orange)', fontSize: 21 }} />
                  <Typography sx={{ fontSize: '15px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                    Administrator Name
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
                  Update the official City Administrator display name.
                </Typography>
              </Box>

              {nameMsg && (
                <Alert severity={nameMsg.type} sx={{ mb: 2.5, borderRadius: '10px', fontSize: '12.5px' }}>
                  {nameMsg.text}
                </Alert>
              )}

              <form onSubmit={handleUpdateName}>
                <TextField
                  fullWidth
                  label="Full Name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isUpdatingName}
                  sx={{ mb: 2.5, ...accountInputStyles }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isUpdatingName || fullName === adminProfile?.full_name}
                  sx={{
                    borderRadius: '10px',
                    px: 3.5,
                    py: 1.1,
                    backgroundColor: 'var(--sakay-orange)',
                    boxShadow: 'none',
                    textTransform: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    '&:hover': { backgroundColor: 'var(--sakay-orange-hover)', boxShadow: 'none' },
                  }}
                >
                  {isUpdatingName ? 'Saving...' : 'Save Name'}
                </Button>
              </form>
            </CardContent>
          </Card>

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
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                  <ManageAccountsIcon sx={{ color: 'var(--sakay-orange)', fontSize: 21 }} />
                  <Typography sx={{ fontSize: '15px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                    Change Email Address
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
                  Update your official municipal email credentials securely.
                </Typography>
              </Box>

              {emailMsg && (
                <Alert severity={emailMsg.type} sx={{ mb: 2.5, borderRadius: '10px', fontSize: '12.5px' }}>
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
                  sx={{ mb: 2.5, ...accountInputStyles }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isUpdatingEmail || email === displayEmail}
                  sx={{
                    borderRadius: '10px',
                    px: 3.5,
                    py: 1.1,
                    backgroundColor: 'var(--sakay-orange)',
                    boxShadow: 'none',
                    textTransform: 'none',
                    fontSize: '13px',
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
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                  <SecurityIcon sx={{ color: 'var(--sakay-orange)', fontSize: 21 }} />
                  <Typography sx={{ fontSize: '15px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                    Change Password
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
                  Update your LGU administrator password securely.
                </Typography>
              </Box>

              {passwordMsg && (
                <Alert severity={passwordMsg.type} sx={{ mb: 2.5, borderRadius: '10px', fontSize: '12.5px' }}>
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
                  sx={{ mb: 2.5, ...accountInputStyles }}
                />
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isUpdatingPassword}
                  sx={{ mb: 2.5, ...accountInputStyles }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                  sx={{
                    borderRadius: '10px',
                    px: 3.5,
                    py: 1.1,
                    backgroundColor: 'var(--sakay-orange)',
                    boxShadow: 'none',
                    textTransform: 'none',
                    fontSize: '13px',
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

        {/* Right Column: System Appearance & Embedded Inline Color Picker */}
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
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <PaletteIcon sx={{ color: selectedColor, fontSize: 21 }} />
                <Typography sx={{ fontSize: '15px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                  System Appearance
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)' }}>
                Customize the primary accent color used throughout the SAKAY LGU Portal.
              </Typography>
            </Box>

            {/* Predefined System Presets Grid */}
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)', mb: 1.5 }}>
              System Accent Presets
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 3.5 }}>
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
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        backgroundColor: swatch.hex,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && <CheckIcon sx={{ color: '#FFFFFF', fontSize: 13 }} />}
                    </Box>
                    <Typography sx={{ fontSize: '12.5px', fontWeight: isSelected ? 700 : 500, color: 'var(--mac-text-primary)' }}>
                      {swatch.name}
                    </Typography>
                  </Box>
                );
              })}
            </Box>

            {/* Custom Embedded Inline 2D Color Picker */}
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)', mb: 1.5 }}>
              Custom HEX Color Picker
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <EmbeddedColorPicker
                color={selectedColor}
                onChange={(newHex) => setSelectedColor(newHex)}
              />
            </Box>

            {/* Live Visual Preview Card */}
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
              <Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                  Theme Preview
                </Typography>
                <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                  Current active accent color: {selectedColor.toUpperCase()}
                </Typography>
              </Box>
              <Button
                size="small"
                variant="contained"
                sx={{
                  backgroundColor: selectedColor,
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  boxShadow: 'none',
                  '&:hover': { backgroundColor: selectedColor, boxShadow: 'none' },
                }}
              >
                Active Button
              </Button>
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={handleSaveTheme}
              disabled={isSavingTheme || selectedColor === themeColor}
              sx={{
                borderRadius: '10px',
                py: 1.3,
                backgroundColor: selectedColor,
                boxShadow: 'none',
                textTransform: 'none',
                fontSize: '13.5px',
                fontWeight: 600,
                '&:hover': { backgroundColor: selectedColor, boxShadow: 'none' },
              }}
            >
              {isSavingTheme ? 'Saving Theme...' : 'Save Theme'}
            </Button>
          </CardContent>
        </Card>
      </Box>

      {/* Bottom-Right Toast Notification for Theme Customization */}
      <Snackbar
        open={toastOpen}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 2000,
        }}
        slots={{ transition: Fade }}
      >
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            border: '1px solid #D1FADF',
            backgroundColor: '#ECFDF3',
            overflow: 'hidden',
            minWidth: 320,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.8, gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CheckCircleOutlinedIcon sx={{ color: '#027A48', fontSize: 21 }} />
              <Typography sx={{ color: '#027A48', fontSize: '13px', fontWeight: 600 }}>
                System theme color updated and saved successfully!
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setToastOpen(false)} sx={{ color: '#027A48', p: 0.5 }}>
              <CloseIcon fontSize="small" sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          {/* Visible Progress Timer Indicator */}
          <Box
            sx={{
              height: 3,
              width: `${toastProgress}%`,
              backgroundColor: '#12B76A',
              transition: 'width 0.05s linear',
            }}
          />
        </Paper>
      </Snackbar>
    </Box>
  );
};
