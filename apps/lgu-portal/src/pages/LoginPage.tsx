import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  Paper,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

import logoTextOrange from '@sakay/shared/assets/images/logo-text-orange.png';
import appIcon from '@sakay/shared/assets/icons/app-icon.png';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, loading: authLoading, error: authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect target after login
  const fromLocation = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim()) {
      setLocalError('Please enter your email address.');
      return;
    }

    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await signIn(email, password);

      if (res.success) {
        navigate(fromLocation, { replace: true });
      } else {
        setLocalError(res.error || 'Invalid email or password.');
      }
    } catch (err: any) {
      setLocalError(err.message || 'An unexpected error occurred during sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || authError;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        padding: { xs: 2, sm: 3 },
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {/* Centered Login Card */}
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: { xs: '32px 24px', sm: '40px 32px' },
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)',
          border: '1px solid #E2E8F0',
        }}
      >
        {/* Brand Logo & Header */}
        <Box sx={{ textAlign: 'center', mb: 3.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1.5 }}>
            <Box
              component="img"
              src={appIcon}
              alt="SAKAY Icon"
              sx={{ width: 36, height: 36, borderRadius: '10px' }}
            />
            <Box
              component="img"
              src={logoTextOrange}
              alt="SAKAY Logo"
              sx={{ height: 26, objectFit: 'contain' }}
            />
          </Box>
          <Typography
            sx={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
            }}
          >
            LGU Administrator Portal
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#0F172A',
              letterSpacing: '-0.3px',
              mb: '4px',
            }}
          >
            Sign In
          </Typography>
          <Typography sx={{ fontSize: '13.5px', color: '#64748B' }}>
            Enter your credentials to access your account.
          </Typography>
        </Box>

        {/* Error Alert */}
        {displayError && (
          <Alert
            severity="error"
            sx={{
              mb: 2.5,
              borderRadius: '10px',
              fontSize: '13px',
              '& .MuiAlert-icon': {
                fontSize: 18,
                alignSelf: 'center',
              },
            }}
          >
            {displayError}
          </Alert>
        )}

        {/* Login Form */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          {/* Email Address with Native Floating Label */}
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting || authLoading}
            autoComplete="email"
            autoFocus
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                backgroundColor: '#FFFFFF',
                fontSize: '14.5px',
                '& fieldset': {
                  borderColor: '#CBD5E1',
                },
                '&:hover fieldset': {
                  borderColor: '#94A3B8',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#FF6B00',
                  borderWidth: '2px',
                },
              },
              '& .MuiInputLabel-root': {
                fontSize: '14px',
                color: '#64748B',
                '&.Mui-focused': {
                  color: '#FF6B00',
                },
              },
            }}
          />

          {/* Password with Native Floating Label */}
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting || authLoading}
            autoComplete="current-password"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                      sx={{ color: '#94A3B8' }}
                    >
                      {showPassword ? (
                        <VisibilityOffOutlinedIcon fontSize="small" />
                      ) : (
                        <VisibilityOutlinedIcon fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                backgroundColor: '#FFFFFF',
                fontSize: '14.5px',
                '& fieldset': {
                  borderColor: '#CBD5E1',
                },
                '&:hover fieldset': {
                  borderColor: '#94A3B8',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#FF6B00',
                  borderWidth: '2px',
                },
              },
              '& .MuiInputLabel-root': {
                fontSize: '14px',
                color: '#64748B',
                '&.Mui-focused': {
                  color: '#FF6B00',
                },
              },
            }}
          />

          {/* Sign In Button */}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={isSubmitting || authLoading}
            sx={{
              height: '48px',
              borderRadius: '10px',
              backgroundColor: '#FF6B00',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: '0 4px 14px rgba(255, 107, 0, 0.3)',
              mt: 0.5,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: '#E65A00',
                boxShadow: '0 6px 18px rgba(255, 107, 0, 0.4)',
              },
            }}
          >
            {isSubmitting || authLoading ? (
              <CircularProgress size={22} sx={{ color: '#FFFFFF' }} />
            ) : (
              'Sign In'
            )}
          </Button>
        </Box>
      </Paper>

      {/* Clean footer */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '12px', color: '#94A3B8' }}>
          City Government of Calapan • Tricycle Transport Regulatory System
        </Typography>
      </Box>
    </Box>
  );
};

export default LoginPage;
