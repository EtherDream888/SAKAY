import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ConstructionIcon from '@mui/icons-material/Construction';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, subtitle }) => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        backgroundColor: 'var(--mac-card-bg)',
        borderRadius: 'var(--mac-radius-lg)',
        border: '1px solid var(--mac-border-color)',
        boxShadow: 'var(--mac-shadow-card)',
        padding: '40px 24px',
        textAlign: 'center',
        maxWidth: 700,
        margin: '20px auto',
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '16px',
          backgroundColor: 'var(--sakay-orange-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--sakay-orange)',
          mb: 2.5,
        }}
      >
        <ConstructionIcon sx={{ fontSize: 32 }} />
      </Box>

      <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '24px', color: 'var(--mac-text-primary)', mb: 1 }}>
        {title}
      </Typography>

      <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-secondary)', mb: 3, maxWidth: 460 }}>
        {subtitle}
      </Typography>

      <Box
        sx={{
          backgroundColor: 'var(--mac-warning-bg)',
          color: 'var(--mac-warning-text)',
          fontSize: '12px',
          fontWeight: 600,
          padding: '6px 16px',
          borderRadius: '12px',
          mb: 3,
        }}
      >
        Routing & Page Shell Ready for Step 2 Implementation
      </Box>

      <Button
        onClick={() => navigate('/dashboard')}
        startIcon={<ArrowBackIcon fontSize="small" />}
        sx={{
          height: 38,
          padding: '0 18px',
          borderRadius: '8px',
          backgroundColor: 'var(--sakay-orange)',
          color: '#FFFFFF',
          fontSize: '13px',
          fontWeight: 600,
          textTransform: 'none',
          '&:hover': {
            backgroundColor: 'var(--sakay-orange-hover)',
          },
        }}
      >
        Return to Dashboard
      </Button>
    </Box>
  );
};
