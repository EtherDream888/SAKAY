import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import GavelIcon from '@mui/icons-material/Gavel';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate } from 'react-router-dom';

import { RECENT_INCIDENT_REPORTS } from '../../mockData/dashboardData';
import { StatusBadge } from '../common/StatusBadge';
import { IncidentReportItem } from '../../types/admin';

export const RecentIncidentReportsCard: React.FC = () => {
  const navigate = useNavigate();

  const getIncidentIcon = (type?: string) => {
    switch (type) {
      case 'overcharging':
      case 'fare':
        return <AttachMoneyIcon sx={{ color: '#D93025', fontSize: 18 }} />;
      case 'misconduct':
      case 'behavior':
        return <GavelIcon sx={{ color: '#F9AB00', fontSize: 18 }} />;
      case 'route':
      case 'safety':
      default:
        return <ReportProblemIcon sx={{ color: '#D93025', fontSize: 18 }} />;
    }
  };

  const getIncidentIconBg = (type?: string) => {
    switch (type) {
      case 'overcharging':
      case 'fare':
        return 'rgba(234, 67, 53, 0.12)';
      case 'misconduct':
      case 'behavior':
        return 'rgba(251, 188, 4, 0.15)';
      case 'route':
      case 'safety':
      default:
        return 'rgba(234, 67, 53, 0.12)';
    }
  };

  return (
    <Card
      sx={{
        borderRadius: 'var(--mac-radius-lg)',
        border: '1px solid var(--mac-border-color)',
        boxShadow: 'var(--mac-shadow-card)',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent sx={{ padding: '24px !important', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography sx={{ fontSize: '17px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
              Recent Incident Reports
            </Typography>
            <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', mt: '2px' }}>
              Passenger complaints requiring LGU officer review
            </Typography>
          </Box>

          <Button
            onClick={() => navigate('/incident-reports')}
            size="small"
            sx={{
              height: 38,
              padding: '0 18px',
              borderRadius: '9px',
              backgroundColor: '#FFFFFF',
              color: 'var(--mac-text-primary)',
              fontSize: '14px',
              fontWeight: 500,
              textTransform: 'none',
              border: '1px solid var(--mac-border-color)',
              boxShadow: 'var(--mac-shadow-subtle)',
              transition: 'var(--mac-transition-fast)',
              flexShrink: 0,
              '&:hover': {
                backgroundColor: 'var(--sakay-orange-soft)',
                color: 'var(--sakay-orange)',
                borderColor: 'var(--sakay-orange-border)',
              },
            }}
          >
            View all
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1, justifyContent: 'center' }}>
          {RECENT_INCIDENT_REPORTS.map((report: IncidentReportItem) => (
            <Box
              key={report.id}
              onClick={() => navigate('/incident-reports')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '10px',
                border: '1px solid var(--mac-border-color)',
                backgroundColor: '#FFFFFF',
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
                    fontSize: 20,
                    color: 'var(--mac-text-muted)',
                    opacity: 0.6,
                    transition: 'var(--mac-transition-fast)',
                  }}
                />
              </Box>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};
