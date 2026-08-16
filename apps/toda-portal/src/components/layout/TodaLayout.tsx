import React, { useState } from 'react';
import { Box } from '@mui/material';
import { TodaHeader } from './TodaHeader';
import { TodaSidebar } from './TodaSidebar';

interface TodaLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
}

export const TodaLayout: React.FC<TodaLayoutProps> = ({
  children,
  pageTitle,
  pageSubtitle,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
      {/* Collapsible Sidebar */}
      <TodaSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          height: '100vh',
          overflowY: 'auto',
          backgroundColor: 'var(--mac-canvas-bg)',
        }}
      >
        <TodaHeader pageTitle={pageTitle} pageSubtitle={pageSubtitle} />

        <Box sx={{ flex: 1, padding: '32px' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};
