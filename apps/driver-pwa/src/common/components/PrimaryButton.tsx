import React from 'react';
import Button from '@mui/material/Button';
import type { ButtonProps } from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

interface PrimaryButtonProps extends ButtonProps {
  loading?: boolean;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  loading = false,
  disabled,
  sx,
  ...props
}) => {
  return (
    <Button
      variant="contained"
      disabled={disabled || loading}
      sx={{
        height: 54,
        fontSize: '1rem',
        fontWeight: 700,
        textTransform: 'none',
        borderRadius: '16px',
        backgroundColor: '#FF6B00',
        boxShadow: 'none',
        transition: 'background-color 0.2s ease-in-out',
        '&:hover': {
          backgroundColor: '#E66000',
          boxShadow: 'none',
        },
        '&:disabled': {
          backgroundColor: '#CBD5E1',
          color: '#FFFFFF',
        },
        ...sx,
      }}
      {...props}
    >
      {loading ? <CircularProgress size={24} color="inherit" /> : children}
    </Button>
  );
};

export default PrimaryButton;
