import React from 'react';
import { Button, ButtonProps } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface ActionButtonProps extends Omit<ButtonProps, 'variant' | 'color'> {
  label: string;
  showArrow?: boolean;
  active?: boolean;
}

// reusable action button used across table rows and cards
export const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  showArrow = true,
  active = false,
  onClick,
  sx,
  ...props
}) => {
  return (
    <Button
      onClick={onClick}
      endIcon={showArrow ? <ArrowForwardIcon className="action-arrow" sx={{ fontSize: 16, transition: 'transform 0.15s ease' }} /> : undefined}
      sx={{
        height: 36,
        padding: '0 16px',
        borderRadius: '9px',
        fontSize: '12px',
        fontWeight: 500,
        textTransform: 'none',
        backgroundColor: active ? 'var(--sakay-orange-soft)' : '#FFFFFF',
        color: active ? 'var(--sakay-orange)' : 'var(--mac-text-primary)',
        border: active ? '1px solid var(--sakay-orange-border)' : '1px solid var(--mac-border-color)',
        boxShadow: 'var(--mac-shadow-subtle)',
        transition: 'var(--mac-transition-fast)',
        // keep label on one line
        whiteSpace: 'nowrap',
        '&:hover': {
          backgroundColor: 'var(--sakay-orange-soft)',
          color: 'var(--sakay-orange)',
          borderColor: 'var(--sakay-orange-border)',
          '& .action-arrow': {
            transform: 'translateX(3px)',
            color: 'var(--sakay-orange)',
          },
        },
        '&:active': {
          backgroundColor: '#FFE6D5',
          transform: 'scale(0.98)',
        },
        ...sx,
      }}
      {...props}
    >
      {label}
    </Button>
  );
};
