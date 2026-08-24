import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  documentName: string;
  documentType?: string;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  open,
  onClose,
  documentName,
  documentType = 'Document File',
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
            width: '100%',
            maxWidth: 680,
            borderRadius: 'var(--mac-radius-xl)',
            backgroundColor: '#FFFFFF',
            boxShadow: 'var(--mac-shadow-popover)',
            border: '1px solid var(--mac-border-color)',
            overflow: 'hidden',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--mac-border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DescriptionIcon sx={{ color: 'var(--sakay-orange)' }} />
          <Box>
            <Typography sx={{ fontSize: '16px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
              {documentName}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
              {documentType} • Official Municipal & TODA Compliance Submission
            </Typography>
          </Box>
        </Box>

        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: '24px' }}>
        {/* Mock Document Render Surface */}
        <Box
          sx={{
            height: 380,
            backgroundColor: '#F8F9FA',
            borderRadius: '12px',
            border: '2px dashed var(--mac-border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
            textAlign: 'center',
          }}
        >
          <VerifiedUserIcon sx={{ fontSize: 48, color: '#1E8E3E', mb: 2 }} />
          <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'var(--mac-text-primary)', mb: 1 }}>
            Official Compliance Document Verified
          </Typography>
          <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', maxWidth: 440, mb: 3 }}>
            Document metadata has been verified by the Calapan City TODA Administrative Board and matches the official submission record.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PrintIcon />}
              sx={{
                textTransform: 'none',
                borderRadius: '8px',
                borderColor: 'var(--mac-border-color)',
                color: 'var(--mac-text-secondary)',
              }}
            >
              Print Record
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<DownloadIcon />}
              sx={{
                textTransform: 'none',
                borderRadius: '8px',
                backgroundColor: 'var(--sakay-orange)',
                '&:hover': { backgroundColor: 'var(--sakay-orange-hover)' },
              }}
            >
              Download PDF Copy
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
