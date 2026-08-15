import React from 'react';
import { Box, Typography } from '@mui/material';

interface WelcomeHeaderProps {
  welcomeText?: string;
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({
  welcomeText = 'Welcome back, LGU Admin! 👋',
}) => {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        variant="h2"
        sx={{
          fontSize: '26px',
          fontWeight: 600,
          color: 'var(--mac-text-primary)',
          letterSpacing: '-0.3px',
          lineHeight: 1.2,
        }}
      >
        {welcomeText}
      </Typography>
    </Box>
  );
};
