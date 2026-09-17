import React from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { useLanguage } from '../../utils/LanguageContext';

export interface LogoutConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export const LogoutConfirmDialog: React.FC<LogoutConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const { language } = useLanguage();

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(3px)',
          },
        },
        paper: {
          sx: {
            borderRadius: '24px',
            padding: '8px 12px 16px 12px',
            maxWidth: '360px',
            width: '90%',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25)',
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
          },
        },
      }}
    >
      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '24px 16px 8px 16px',
        }}
      >
        {/* Visual Badge Icon */}
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '20px',
            backgroundColor: '#FEF2F2',
            border: '1.5px solid #FEE2E2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2.25,
            color: '#EF4444',
          }}
        >
          <LogoutRoundedIcon sx={{ fontSize: 32 }} />
        </Box>

        {/* Modal Title */}
        <Typography
          sx={{
            fontSize: '20px',
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.4px',
            mb: 1,
          }}
        >
          {language === 'tl' ? 'Mag-logout sa SAKAY?' : 'Log out of SAKAY?'}
        </Typography>

        {/* Subtitle / Explanation */}
        <Typography
          sx={{
            fontSize: '14.5px',
            color: '#64748B',
            fontWeight: 500,
            lineHeight: 1.5,
            mb: 3,
            px: 1,
          }}
        >
          {language === 'tl'
            ? 'Sigurado ka bang nais mong mag-logout? Kakailanganin mong mag-sign in muli upang makapag-book ng biyahe.'
            : 'Are you sure you want to log out? You will need to sign in again to access your account and book rides.'}
        </Typography>

        {/* Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            width: '100%',
          }}
        >
          {/* Cancel Button */}
          <Button
            onClick={onClose}
            disabled={loading}
            fullWidth
            variant="outlined"
            sx={{
              height: '48px',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: 700,
              textTransform: 'none',
              borderColor: '#E2E8F0',
              color: '#64748B',
              backgroundColor: '#F8FAFC',
              '&:hover': {
                borderColor: '#CBD5E1',
                backgroundColor: '#F1F5F9',
              },
            }}
          >
            {language === 'tl' ? 'Kanselahin' : 'Cancel'}
          </Button>

          {/* Confirm Logout Button */}
          <Button
            onClick={onConfirm}
            disabled={loading}
            fullWidth
            variant="contained"
            sx={{
              height: '48px',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: 700,
              textTransform: 'none',
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
              '&:hover': {
                backgroundColor: '#DC2626',
                boxShadow: '0 6px 16px rgba(239, 68, 68, 0.35)',
              },
            }}
          >
            {loading ? (
              <CircularProgress size={22} sx={{ color: '#FFFFFF' }} />
            ) : language === 'tl' ? (
              'Mag-logout'
            ) : (
              'Log out'
            )}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default LogoutConfirmDialog;
