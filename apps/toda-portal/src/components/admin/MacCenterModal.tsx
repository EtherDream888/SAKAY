import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface MacCenterModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  primaryActionColor?: 'primary' | 'error' | 'success' | 'warning';
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  maxWidth?: number | string;
}

// macos-style centered modal with blurred backdrop and action buttons
export const MacCenterModal: React.FC<MacCenterModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  badge,
  children,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionColor = 'primary',
  secondaryActionLabel = 'Close',
  onSecondaryAction,
  maxWidth = 720,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.42)',
            backdropFilter: 'blur(4px)',
          },
        },
        paper: {
          sx: {
            borderRadius: 'var(--mac-radius-xl)',
            maxWidth: maxWidth,
            width: '100%',
            backgroundColor: '#FFFFFF',
            boxShadow: 'var(--mac-shadow-popover)',
            border: '1px solid var(--mac-border-color)',
            overflow: 'hidden',
            margin: '20px',
          },
        },
      }}
    >
      {/* Modal Header */}
      <DialogTitle
        sx={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid var(--mac-border-color)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ pr: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: subtitle ? '4px' : 0 }}>
            <Typography sx={{ fontSize: '20px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
              {title}
            </Typography>
            {badge}
          </Box>
          {subtitle && (
            <Typography sx={{ fontSize: '14.5px', color: 'var(--mac-text-muted)', fontWeight: 400 }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: 'var(--mac-text-muted)',
            backgroundColor: 'var(--mac-canvas-bg)',
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.06)',
              color: 'var(--mac-text-primary)',
            },
          }}
        >
          <CloseIcon fontSize="small" sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      {/* Modal Content with Explicit Top Padding */}
      <DialogContent sx={{ padding: '24px 28px 28px', pt: '24px !important' }}>
        {children}
      </DialogContent>

      {/* Modal Footer */}
      {(primaryActionLabel || secondaryActionLabel) && (
        <DialogActions
          sx={{
            padding: '18px 28px 24px',
            borderTop: '1px solid var(--mac-border-color)',
            backgroundColor: '#FAFAFC',
            gap: 1.5,
          }}
        >
          {secondaryActionLabel && (
            <Button
              variant="outlined"
              onClick={onSecondaryAction || onClose}
              sx={{
                height: 40,
                padding: '0 20px',
                borderRadius: '8px',
                borderColor: 'var(--mac-border-color)',
                color: 'var(--mac-text-secondary)',
                fontSize: '14.5px',
                fontWeight: 500,
                textTransform: 'none',
                backgroundColor: '#FFFFFF',
                '&:hover': {
                  backgroundColor: 'var(--mac-canvas-bg)',
                  borderColor: 'var(--mac-text-muted)',
                  color: 'var(--mac-text-primary)',
                },
              }}
            >
              {secondaryActionLabel}
            </Button>
          )}

          {primaryActionLabel && (
            <Button
              variant="contained"
              onClick={onPrimaryAction}
              color={primaryActionColor}
              sx={{
                height: 40,
                padding: '0 22px',
                borderRadius: '8px',
                fontSize: '14.5px',
                fontWeight: 600,
                textTransform: 'none',
                backgroundColor:
                  primaryActionColor === 'primary' ? 'var(--sakay-orange)' : undefined,
                '&:hover': {
                  backgroundColor:
                    primaryActionColor === 'primary' ? 'var(--sakay-orange-hover)' : undefined,
                },
              }}
            >
              {primaryActionLabel}
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
};
