import React from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface PageEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

// reusable empty-state for non-table page sections (reports, analytics, etc.)
export const PageEmptyState: React.FC<PageEmptyStateProps> = ({
  icon,
  title,
  description,
  onRefresh,
  isRefreshing = false,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        py: 10,
        px: 4,
        maxWidth: 440,
        mx: 'auto',
        textAlign: 'center',
      }}
    >
      {/* icon container */}
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: '14px',
          backgroundColor: 'var(--sakay-orange-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          '& svg': {
            fontSize: 26,
            color: 'var(--sakay-orange)',
          },
        }}
      >
        {icon}
      </Box>

      <Typography
        sx={{
          fontSize: '13px',
          fontWeight: 700,
          color: 'var(--mac-text-primary)',
          lineHeight: 1.3,
        }}
      >
        {title}
      </Typography>

      <Typography
        sx={{
          fontSize: '11px',
          fontWeight: 400,
          color: 'var(--mac-text-muted)',
          lineHeight: 1.5,
        }}
      >
        {description}
      </Typography>

      {onRefresh && (
        <Button
          onClick={onRefresh}
          disabled={isRefreshing}
          startIcon={
            isRefreshing
              ? <CircularProgress size={14} sx={{ color: 'var(--sakay-orange)' }} />
              : <RefreshIcon />
          }
          sx={{
            mt: 0.5,
            height: 36,
            padding: '0 18px',
            borderRadius: '10px',
            border: '1px solid var(--mac-border-color)',
            backgroundColor: '#FFFFFF',
            color: 'var(--mac-text-secondary)',
            fontSize: '12px',
            fontWeight: 500,
            textTransform: 'none',
            boxShadow: 'var(--mac-shadow-subtle)',
            transition: 'var(--mac-transition-fast)',
            '&:hover': {
              backgroundColor: 'var(--sakay-orange-soft)',
              color: 'var(--sakay-orange)',
              borderColor: 'var(--sakay-orange-border)',
            },
            '&:disabled': {
              opacity: 0.7,
            },
          }}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      )}
    </Box>
  );
};
