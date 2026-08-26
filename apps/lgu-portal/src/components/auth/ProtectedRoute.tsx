import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import LocalPoliceOutlinedIcon from '@mui/icons-material/LocalPoliceOutlined';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { session, adminProfile, loading } = useAuth();
  const location = useLocation();

  // Full-screen loading screen while verifying session from Supabase
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
          color: '#FFFFFF',
          gap: 2.5,
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            backgroundColor: 'rgba(255, 107, 0, 0.15)',
            border: '1px solid rgba(255, 107, 0, 0.3)',
            padding: '8px 18px',
            borderRadius: '20px',
          }}
        >
          <LocalPoliceOutlinedIcon sx={{ color: '#FF6B00', fontSize: '16' }} />
          <Typography sx={{ fontSize: '10.4px', fontWeight: 600, color: '#FFD580', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            SAKAY LGU Portal
          </Typography>
        </Box>

        <CircularProgress size={36} thickness={4} sx={{ color: '#FF6B00' }} />

        <Typography sx={{ fontSize: '11.3px', color: '#94A3B8', fontWeight: 400 }}>
          Verifying administrator credentials...
        </Typography>
      </Box>
    );
  }

  // If unauthenticated or no valid admin profile found, redirect to /login
  if (!session || !adminProfile) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

// Route wrapper for /login so already-authenticated admins are redirected to /dashboard
export const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, adminProfile, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0F172A',
        }}
      >
        <CircularProgress size={32} sx={{ color: '#FF6B00' }} />
      </Box>
    );
  }

  if (session && adminProfile) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
