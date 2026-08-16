import React from 'react';
import { Tooltip, TooltipProps } from '@mui/material';

export const MacTooltip: React.FC<TooltipProps> = ({ children, ...props }) => {
  return (
    <Tooltip
      arrow
      slotProps={{
        tooltip: {
          sx: {
            backgroundColor: 'rgba(29, 29, 31, 0.92)',
            backdropFilter: 'blur(12px)',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: 500,
            borderRadius: '8px',
            padding: '6px 12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
          },
        },
        arrow: {
          sx: {
            color: 'rgba(29, 29, 31, 0.92)',
          },
        },
      }}
      {...props}
    >
      {children}
    </Tooltip>
  );
};
