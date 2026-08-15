import React from 'react';
import { Box, Typography } from '@mui/material';

interface WelcomeHeaderProps {
  welcomeText?: string;
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({
  welcomeText = 'Welcome back, LGU Admin! 👋',
}) => {
  return (
    <Box
      sx={{
        mb: 3,
        pt: 1,
        px: 0.5,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.78) 0%, rgba(255, 244, 236, 0.9) 100%)',
          border: '1px solid rgba(255, 123, 58, 0.14)',
          borderRadius: '28px',
          boxShadow: 'var(--mac-shadow-card)',
          padding: { xs: '20px 20px', md: '24px 26px' },
        }}
      >
        <Typography
          variant="h2"
          sx={{
            fontSize: { xs: '24px', md: '30px' },
            fontWeight: 700,
            color: 'var(--mac-text-primary)',
            letterSpacing: '-0.6px',
            lineHeight: 1.1,
          }}
        >
          {welcomeText}
        </Typography>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--sakay-orange) 0%, #ff8a47 100%)',
            boxShadow: '0 12px 24px rgba(255, 107, 26, 0.32)',
          }}
        />
      </Box>
    </Box>
  );
};
