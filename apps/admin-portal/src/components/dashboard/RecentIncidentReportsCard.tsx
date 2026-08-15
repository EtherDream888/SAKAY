import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import SecurityIcon from '@mui/icons-material/Security';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { StatusBadge } from '../common/StatusBadge';
import { RECENT_INCIDENT_REPORTS } from '../../mockData/dashboardData';

export const RecentIncidentReportsCard: React.FC = () => {
  const navigate = useNavigate();

  const getIncidentIcon = (iconType: string) => {
    switch (iconType) {
      case 'overcharging':
        return <WarningAmberIcon fontSize="small" sx={{ color: '#E65100' }} />;
      case 'misconduct':
        return <PersonOffIcon fontSize="small" sx={{ color: '#C62828' }} />;
      case 'route':
        return <AltRouteIcon fontSize="small" sx={{ color: '#1565C0' }} />;
      default:
        return <SecurityIcon fontSize="small" sx={{ color: 'var(--sakay-orange)' }} />;
    }
  };

  const getIncidentIconBg = (iconType: string) => {
    switch (iconType) {
      case 'overcharging':
        return '#FFF3E0';
      case 'misconduct':
        return '#FFEBEE';
      case 'route':
        return '#E3F2FD';
      default:
        return 'var(--sakay-orange-soft)';
    }
  };

  const handleIncidentClick = (reportId: string) => {
    navigate('/incident-reports', { state: { reportId } });
  };

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
            Recent Incident Reports
          </Typography>
          <Button
            onClick={() => navigate('/incident-reports')}
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
          Passenger safety and driver misconduct logs.
        </Typography>
      </Box>

      {/* Interactive, Clickable List of Incident Reports */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {RECENT_INCIDENT_REPORTS.map((report) => (
          <Box
            key={report.id}
            onClick={() => handleIncidentClick(report.id)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: 'var(--mac-radius-md)',
              backgroundColor: '#FAFAFC',
              border: '1px solid var(--mac-border-subtle)',
              cursor: 'pointer',
              transition: 'var(--mac-transition-fast)',
              '&:hover': {
                backgroundColor: 'var(--sakay-orange-soft)',
                borderColor: 'var(--sakay-orange-border)',
                transform: 'translateX(3px)',
                '& .incident-chevron': {
                  opacity: 1,
                  transform: 'translateX(2px)',
                  color: 'var(--sakay-orange)',
                },
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '8px',
                  backgroundColor: getIncidentIconBg(report.iconType),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {getIncidentIcon(report.iconType)}
              </Box>
              <Box>
                <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)', lineHeight: 1.2 }}>
                  {report.category}
                </Typography>
                <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)', lineHeight: 1.2, mt: '3px' }}>
                  {report.timestamp}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StatusBadge status={report.status} />
              <ChevronRightIcon
                className="incident-chevron"
                sx={{
                  fontSize: 18,
                  color: 'var(--mac-text-muted)',
                  opacity: 0.5,
                  transition: 'var(--mac-transition-fast)',
                }}
              />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
