import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Button, TextField, Box } from '@mui/material';

interface MacConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: 'orange' | 'danger';
  requireReason?: boolean;
  reasonPlaceholder?: string;
  onConfirm: (reason?: string) => void;
}

export const MacConfirmDialog: React.FC<MacConfirmDialogProps> = ({
  open,
  onClose,
  title,
  message,
  confirmLabel,
  confirmVariant = 'orange',
  requireReason = false,
  reasonPlaceholder = 'Enter reason...',
  onConfirm,
}) => {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(requireReason ? reason : undefined);
    setReason('');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          },
        },
        paper: {
          sx: {
            borderRadius: 'var(--mac-radius-lg)',
            maxWidth: 480,
            width: '100%',
            backgroundColor: '#FFFFFF',
            boxShadow: 'var(--mac-shadow-popover)',
            overflow: 'hidden',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          padding: '20px 24px 16px 24px',
          borderBottom: '1px solid var(--mac-border-color)',
          fontSize: '14.4px',
          fontWeight: 600,
          color: 'var(--mac-text-primary)',
          backgroundColor: '#FAFAFC',
        }}
      >
        {title}
      </DialogTitle>

      <DialogContent sx={{ paddingTop: '28px !important', paddingBottom: '20px !important', paddingLeft: '24px !important', paddingRight: '24px !important' }}>
        <Typography sx={{ fontSize: '11.3px', color: 'var(--mac-text-secondary)', lineHeight: 1.5, mb: requireReason ? 2 : 0 }}>
          {message}
        </Typography>

        {requireReason && (
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ fontSize: '10.4px', fontWeight: 600, color: 'var(--mac-text-primary)', mb: 1 }}>
              Reason for Decision (Required)
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder={reasonPlaceholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '9px',
                  fontSize: '11.3px',
                  backgroundColor: '#FAFAFC',
                  '& fieldset': { borderColor: 'var(--mac-border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--sakay-orange-border)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--sakay-orange)' },
                },
              }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ padding: '16px 24px', borderTop: '1px solid var(--mac-border-color)', backgroundColor: '#FAFAFC', gap: 1.5 }}>
        <Button
          onClick={onClose}
          sx={{
            height: 38,
            padding: '0 18px',
            borderRadius: '9px',
            textTransform: 'none',
            fontSize: '11.3px',
            fontWeight: 500,
            color: 'var(--mac-text-secondary)',
            border: '1px solid var(--mac-border-color)',
            '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
          }}
        >
          Cancel
        </Button>

        <Button
          onClick={handleConfirm}
          disabled={requireReason && !reason.trim()}
          variant="contained"
          sx={{
            height: 38,
            padding: '0 20px',
            borderRadius: '9px',
            textTransform: 'none',
            fontSize: '11.3px',
            fontWeight: 600,
            backgroundColor: confirmVariant === 'danger' ? '#DC2626' : 'var(--sakay-orange)',
            color: '#FFFFFF',
            boxShadow: 'var(--mac-shadow-subtle)',
            '&:hover': {
              backgroundColor: confirmVariant === 'danger' ? '#B91C1C' : 'var(--sakay-orange-hover)',
            },
            '&.Mui-disabled': {
              backgroundColor: '#E5E5EA',
              color: '#8E8E93',
            },
          }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
