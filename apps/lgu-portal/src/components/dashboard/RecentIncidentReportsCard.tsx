import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import GavelIcon from '@mui/icons-material/Gavel';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';

import { StatusBadge } from '../common/StatusBadge';


interface IncidentItem {
  id: string;
  category: string;
  status: string;
  timestamp: string;
  severity: string;
  description: string;
  iconType: string;
}

interface RecentIncidentReportsCardProps {
  reports?: IncidentItem[];
}

export const RecentIncidentReportsCard: React.FC<RecentIncidentReportsCardProps> = ({ reports = [] }) => {
  const navigate = useNavigate();

  const getIncidentIcon = (type?: string) => {
    switch (type) {
      case 'overcharging':
      case 'fare':
        return <AttachMoneyIcon sx={{ color: '#D93025', fontSize: '14.4' }} />;
      case 'misconduct':
      case 'behavior':
        return <GavelIcon sx={{ color: '#F9AB00', fontSize: '14.4' }} />;
      case 'route':
      case 'safety':
      default:
        return <ReportProblemIcon sx={{ color: '#D93025', fontSize: '14.4' }} />;
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
      <CardContent sx={{ padding: '26px 28px !important', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography sx={{ fontSize: '17px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
              Recent Incident Reports
            </Typography>
            <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', mt: '3px' }}>
              Passenger complaints requiring LGU officer review.
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

        {reports.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1, justifyContent: 'center' }}>
            {reports.map((report) => (
              <Box
                key={report.id}
                onClick={() => navigate('/incident-reports')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 'var(--mac-radius-md)',
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
                  <StatusBadge status={report.status as any} />
                  <ChevronRightIcon
                    className="incident-chevron"
                    sx={{
                      fontSize: '18px',
                      color: 'var(--mac-text-muted)',
                      opacity: 0.6,
                      transition: 'var(--mac-transition-fast)',
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flexGrow: 1,
              py: 5,
              gap: 1.5,
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 32, color: '#34A853', opacity: 0.8 }} />
            <Typography sx={{ fontSize: '15px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
              No Active Incident Reports
            </Typography>

            <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', textAlign: 'center', maxWidth: 300 }}>
              There are currently no passenger complaints or incident reports recorded.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
