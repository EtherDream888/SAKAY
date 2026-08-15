import React, { useState } from 'react';
import { Box } from '@mui/material';

interface MacTooltipProps {
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export const MacTooltip: React.FC<MacTooltipProps> = ({ title, children, disabled = false }) => {
  const [hovered, setHovered] = useState(false);

  if (disabled || !title) return <>{children}</>;

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{ position: 'relative', display: 'inline-flex' }}
    >
      {children}
      {hovered && (
        <Box
          className="mac-tooltip-node"
          sx={{
            position: 'absolute',
            left: 'calc(100% + 12px)',
            top: '50%',
            transform: 'translateY(-50%)',
            backgroundColor: 'rgba(28, 28, 30, 0.92)',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: 500,
            padding: '6px 10px',
            borderRadius: '8px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            zIndex: 1000,
            pointerEvents: 'none',
            animation: 'macTooltipFade 0.12s ease-out',
            '@keyframes macTooltipFade': {
              '0%': { opacity: 0, transform: 'translateY(-50%) scale(0.95)' },
              '100%': { opacity: 1, transform: 'translateY(-50%) scale(1)' },
            },
          }}
        >
          {title}
        </Box>
      )}
    </Box>
  );
};
