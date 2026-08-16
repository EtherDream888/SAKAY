import React from 'react';
import { Button, ButtonProps } from '@mui/material';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

interface ActionButtonProps extends Omit<ButtonProps, 'children'> {
  label?: string;
  showArrow?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  label = 'Review',
  showArrow = true,
  onClick,
  sx,
  ...props
}) => {
  return (
    <Button
      variant="outlined"
      size="small"
      onClick={onClick}
      endIcon={showArrow ? <ArrowForwardIosIcon sx={{ fontSize: '10px !important', ml: '-2px' }} /> : undefined}
      sx={{
        height: '32px',
        padding: showArrow ? '0 12px 0 14px' : '0 14px',
        borderRadius: '8px',
        borderColor: 'var(--mac-border-color)',
        backgroundColor: '#FFFFFF',
        color: 'var(--mac-text-primary)',
        fontSize: '12.5px',
        fontWeight: 500,
        textTransform: 'none',
        boxShadow: 'var(--mac-shadow-subtle)',
        transition: 'var(--mac-transition-fast)',
        '&:hover': {
          backgroundColor: 'var(--sakay-orange-soft)',
          borderColor: 'var(--sakay-orange-border)',
          color: 'var(--sakay-orange)',
        },
        ...sx,
      }}
      {...props}
    >
      {label}
    </Button>
  );
};
