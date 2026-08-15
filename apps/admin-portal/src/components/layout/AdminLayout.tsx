import React, { useState } from 'react';
import { Box } from '@mui/material';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

interface AdminLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, pageTitle, pageSubtitle }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <Box
      sx={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(245,247,250,0.94) 0%, rgba(236,240,245,0.9) 100%)',
      }}
    >
      <AdminSidebar
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
          background: 'linear-gradient(180deg, rgba(255,255,255,0.38) 0%, rgba(245,247,250,0.2) 100%)',
        }}
      >
        <AdminHeader pageTitle={pageTitle} pageSubtitle={pageSubtitle} />

        <Box
          component="main"
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: { xs: '20px', md: '28px', lg: '32px' },
            background: 'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04))',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};
