import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, IconButton, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface MacCenterModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | number;
  children: React.ReactNode;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const MacCenterModal: React.FC<MacCenterModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  badge,
  maxWidth = 680,
  children,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
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
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '88vh',
          },
        },
      }}
    >
      {/* Modal Header */}
      <DialogTitle
        sx={{
          padding: '22px 28px 20px 28px',
          borderBottom: '1px solid var(--mac-border-color)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          backgroundColor: '#FAFAFC',
        }}
      >
        <Box sx={{ pr: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: '6px' }}>
            <Typography sx={{ fontSize: '20px', fontWeight: 600, color: 'var(--mac-text-primary)', lineHeight: 1.2 }}>
              {title}
            </Typography>
            {badge}
          </Box>
          {subtitle && (
            <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', fontWeight: 400, mt: '4px' }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            width: 32,
            height: 32,
            borderRadius: '8px',
            color: 'var(--mac-text-muted)',
            '&:hover': { backgroundColor: 'var(--mac-canvas-bg)', color: 'var(--mac-text-primary)' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Modal Body with Guaranteed 32px Top Spacing After Header Divider Line */}
      <DialogContent
        sx={{
          paddingTop: '32px !important',
          paddingBottom: '32px !important',
          paddingLeft: '32px !important',
          paddingRight: '32px !important',
          overflowY: 'auto',
        }}
      >
        {children}
      </DialogContent>

      {/* Modal Footer Bar if Actions Provided */}
      {(primaryActionLabel || secondaryActionLabel) && (
        <DialogActions
          sx={{
            padding: '16px 28px',
            borderTop: '1px solid var(--mac-border-color)',
            backgroundColor: '#FAFAFC',
            gap: 1.5,
          }}
        >
          {secondaryActionLabel && (
            <Button
              onClick={onSecondaryAction}
              variant="outlined"
              color="error"
              sx={{
                height: 38,
                padding: '0 20px',
                borderRadius: '9px',
                textTransform: 'none',
                fontSize: '14px',
                fontWeight: 500,
                borderColor: '#FCA5A5',
                color: '#DC2626',
                '&:hover': { backgroundColor: '#FEF2F2', borderColor: '#DC2626' },
              }}
            >
              {secondaryActionLabel}
            </Button>
          )}

          {primaryActionLabel && (
            <Button
              onClick={onPrimaryAction}
              variant="contained"
              sx={{
                height: 38,
                padding: '0 20px',
                borderRadius: '9px',
                textTransform: 'none',
                fontSize: '14px',
                fontWeight: 600,
                backgroundColor: 'var(--sakay-orange)',
                color: '#FFFFFF',
                boxShadow: 'var(--mac-shadow-subtle)',
                '&:hover': { backgroundColor: 'var(--sakay-orange-hover)' },
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
