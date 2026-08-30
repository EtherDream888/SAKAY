import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  TextField,
  CircularProgress,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface MacConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'orange' | 'primary';
  requireReason?: boolean;
  reasonPlaceholder?: string;
  isLoading?: boolean;
  onConfirm: (reason?: string) => void;
}

export const MacConfirmDialog: React.FC<MacConfirmDialogProps> = ({
  open,
  onClose,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  requireReason = false,
  reasonPlaceholder = 'Please enter a reason...',
  isLoading = false,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState(false);

  const handleConfirm = () => {
    if (isLoading) return;
    if (requireReason && !reason.trim()) {
      setError(true);
      return;
    }
    onConfirm(reason);
    setReason('');
    setError(false);
  };

  const getConfirmButtonStyles = () => {
    switch (confirmVariant) {
      case 'danger':
        return {
          backgroundColor: '#DC2626',
          '&:hover': { backgroundColor: '#B91C1C' },
        };
      case 'orange':
        return {
          backgroundColor: 'var(--sakay-orange)',
          '&:hover': { backgroundColor: 'var(--sakay-orange-hover)' },
        };
      default:
        return {
          backgroundColor: '#1E8E3E',
          '&:hover': { backgroundColor: '#137333' },
        };
    }
  };

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
            width: '100%',
            maxWidth: 480,
            borderRadius: 'var(--mac-radius-lg)',
            backgroundColor: '#FFFFFF',
            boxShadow: 'var(--mac-shadow-popover)',
            border: '1px solid var(--mac-border-color)',
            padding: '8px',
          },
        },
      }}
    >
      <DialogTitle sx={{ padding: '20px 24px 12px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {confirmVariant === 'danger' && (
            <WarningAmberIcon sx={{ color: '#DC2626', fontSize: 24 }} />
          )}
          <Typography sx={{ fontSize: '17px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
            {title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ padding: '0 24px 20px' }}>
        <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-secondary)', lineHeight: 1.5, mb: requireReason ? 2 : 0 }}>
          {message}
        </Typography>

        {requireReason && (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder={reasonPlaceholder}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(false);
              }}
              error={error}
              helperText={error ? 'Reason is required for this action' : ''}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  backgroundColor: '#FAFAFC',
                },
              }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ padding: '12px 24px 16px', gap: 1 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{
            height: 38,
            padding: '0 16px',
            borderRadius: '8px',
            border: '1.5px solid #94A3B8',
            color: '#334155',
            fontSize: '13.5px',
            fontWeight: 600,
            textTransform: 'none',
            backgroundColor: '#FFFFFF',
            '&:hover': {
              backgroundColor: '#F1F5F9',
              borderColor: '#64748B',
              color: '#0F172A',
            },
          }}
        >
          {cancelLabel}
        </Button>

        <Button
          variant="contained"
          disabled={isLoading}
          onClick={handleConfirm}
          sx={{
            height: 38,
            padding: '0 20px',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: 600,
            textTransform: 'none',
            color: '#FFFFFF',
            ...getConfirmButtonStyles(),
          }}
        >
          {isLoading ? <CircularProgress size={20} color="inherit" /> : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
