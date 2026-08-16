import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { StatusBadge } from '../common/StatusBadge';
import { RECENT_TODA_APPLICATIONS } from '../../mockData/dashboardData';

export const RecentTodaApplicationsCard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        backgroundColor: 'var(--mac-card-bg)',
        borderRadius: 'var(--mac-radius-lg)',
        border: '1px solid var(--mac-border-color)',
        boxShadow: 'var(--mac-shadow-card)',
        padding: '26px 28px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header & Subtitle Block */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: '17px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
            Recent TODA Applications
          </Typography>
          <Button
            onClick={() => navigate('/toda-applications')}
            size="small"
            sx={{
              fontSize: '13px',
              textTransform: 'none',
              color: 'var(--mac-text-muted)',
              fontWeight: 500,
              padding: 0,
              minWidth: 'auto',
              '&:hover': { color: 'var(--sakay-orange)', backgroundColor: 'transparent' },
            }}
          >
            View all
          </Button>
        </Box>
        <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', mt: '3px' }}>
          Recent TODA accreditation requests.
        </Typography>
      </Box>

      {/* List Items */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {RECENT_TODA_APPLICATIONS.map((app) => (
          <Box
            key={app.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: 'var(--mac-radius-md)',
              backgroundColor: '#FAFAFC',
              border: '1px solid var(--mac-border-subtle)',
              transition: 'var(--mac-transition-fast)',
              '&:hover': {
                backgroundColor: 'var(--mac-canvas-bg)',
                borderColor: 'var(--mac-border-color)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '8px',
                  backgroundColor: 'var(--mac-canvas-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--mac-text-secondary)',
                }}
              >
                <AccountBalanceIcon fontSize="small" />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)', lineHeight: 1.2 }}>
                  {app.name}
                </Typography>
                <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)', lineHeight: 1.2, mt: '3px' }}>
                  Submitted: {app.submittedDate}
                </Typography>
              </Box>
            </Box>

            <StatusBadge status={app.status} />
          </Box>
        ))}
      </Box>
    </Box>
  );
};
