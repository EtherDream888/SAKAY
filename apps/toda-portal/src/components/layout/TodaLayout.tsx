import React, { useState, useEffect } from 'react';
import { Box, Alert, Typography } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { TodaHeader } from './TodaHeader';
import { TodaSidebar } from './TodaSidebar';
import { fetchTodaProfile } from '../../services/todaApiService';
import { TodaProfile } from '../../types/toda';

interface TodaLayoutProps {
  children?: React.ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
}

export const TodaLayout: React.FC<TodaLayoutProps> = ({
  children,
  pageTitle,
  pageSubtitle,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profile, setProfile] = useState<TodaProfile | null>(null);

  useEffect(() => {
    fetchTodaProfile().then(p => {
      if (p) setProfile(p);
    });
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#FFF8F2',
      }}
    >
      <TodaSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          minWidth: 0,
          overflow: 'hidden',
          backgroundColor: '#FFF8F2',
        }}
      >
        <TodaHeader pageTitle={pageTitle} pageSubtitle={pageSubtitle} />

        <Box
          component="main"
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: { xs: '20px', md: '28px', lg: '32px' },
            backgroundColor: '#FFF8F2',
          }}
        >
          {profile?.accreditationStatus === 'Pending Verification' && (
            <Box sx={{ mb: 3.5 }}>
              <Alert severity="warning" sx={{ borderRadius: 'var(--mac-radius-lg)', boxShadow: 'var(--mac-shadow-card)', '& .MuiAlert-message': { width: '100%' } }}>
                <Typography sx={{ fontWeight: 600, color: '#9a6b00', mb: 0.5 }}>Pending Accreditation</Typography>
                <Typography sx={{ fontSize: '14px', color: '#664d03' }}>
                  Your TODA application is currently being reviewed by the LGU. You can access your account while waiting for approval, but some TODA features will remain unavailable until your application is approved and accredited.
                </Typography>
              </Alert>
            </Box>
          )}
          {children || <Outlet />}
        </Box>
      </Box>
    </Box>
  );
};

