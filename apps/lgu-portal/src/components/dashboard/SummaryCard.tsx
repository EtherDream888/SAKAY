import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PersonIcon from '@mui/icons-material/Person';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { SummaryMetric } from '../../types/admin';

interface SummaryCardProps {
  metric: SummaryMetric;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ metric }) => {
  const navigate = useNavigate();

  const getIcon = (id: string) => {
    switch (id) {
      case 'accredited-todas':
        return <AccountBalanceIcon sx={{ color: 'var(--sakay-orange)', fontSize: '17.6' }} />;
      case 'active-drivers':
        return <PersonIcon sx={{ color: '#34A853', fontSize: '17.6' }} />;
      case 'active-trips':
        return <DirectionsCarIcon sx={{ color: '#1A73E8', fontSize: '17.6' }} />;
      case 'todays-bookings':
        return <ConfirmationNumberIcon sx={{ color: '#9C27B0', fontSize: '17.6' }} />;
      default:
        return <AccountBalanceIcon sx={{ color: 'var(--sakay-orange)', fontSize: '17.6' }} />;
    }
  };

  const getIconBg = (id: string) => {
    switch (id) {
      case 'accredited-todas':
        return 'var(--sakay-orange-soft)';
      case 'active-drivers':
        return '#E6F4EA';
      case 'active-trips':
        return '#E8F0FE';
      case 'todays-bookings':
        return '#F3E5F5';
      default:
        return 'var(--sakay-orange-soft)';
    }
  };

  const getAccent = (id: string) => {
    switch (id) {
      case 'accredited-todas':
        return 'var(--sakay-orange)';
      case 'active-drivers':
        return '#34A853';
      case 'active-trips':
        return '#1A73E8';
      case 'todays-bookings':
        return '#9C27B0';
      default:
        return 'var(--sakay-orange)';
    }
  };

  return (
    <Box
      onClick={() => metric.route && navigate(metric.route)}
      sx={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.78) 100%)',
        borderRadius: 'var(--mac-radius-xl)',
        border: '1px solid rgba(15, 23, 42, 0.05)',
        boxShadow: 'var(--mac-shadow-card)',
        padding: '22px 22px 18px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'var(--mac-transition-normal)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: '0 auto auto 0',
          width: '100%',
          height: '4px',
          background: `linear-gradient(90deg, ${getAccent(metric.id)} 0%, ${getAccent(metric.id)} 38%, rgba(255,255,255,0) 100%)`,
        },
        '&:hover': {
          boxShadow: 'var(--mac-shadow-hover)',
          borderColor: 'rgba(255, 107, 26, 0.18)',
          transform: 'translateY(-3px)',
          '& .chevron-icon': {
            transform: 'translateX(4px)',
            color: getAccent(metric.id),
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: '14px',
            backgroundColor: getIconBg(metric.id),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.3)',
          }}
        >
          {getIcon(metric.id)}
        </Box>
        <Typography
          sx={{
            fontSize: '10.4px',
            fontWeight: 600,
            color: 'var(--mac-text-muted)',
            letterSpacing: '-0.02em',
          }}
        >
          {metric.title}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, my: 1.25 }}>
        <Typography
          sx={{
            fontSize: '27.3px',
            fontWeight: 700,
            color: 'var(--mac-text-primary)',
            letterSpacing: '-0.8px',
            lineHeight: 1,
          }}
        >
          {metric.value}
        </Typography>

        {metric.trend && (
          <Box
            sx={{
              backgroundColor: 'var(--mac-success-bg)',
              color: 'var(--mac-success-text)',
              fontSize: '9.6px',
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: '999px',
            }}
          >
            {metric.trend}
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography sx={{ fontSize: '10.4px', color: 'var(--mac-text-secondary)' }}>
          {metric.subtitle}
        </Typography>
        <ChevronRightIcon
          className="chevron-icon"
          sx={{
            fontSize: '16',
            color: 'var(--mac-text-muted)',
            transition: 'var(--mac-transition-fast)',
          }}
        />
      </Box>
    </Box>
  );
};
