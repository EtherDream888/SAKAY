import React, { useState } from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { TodaHeader } from './TodaHeader';
import { TodaSidebar } from './TodaSidebar';

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
          {children || <Outlet />}
        </Box>
      </Box>
    </Box>
  );
};
