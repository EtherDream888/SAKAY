import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, IconButton, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  documentName: string;
  documentType?: string;
  issueDate?: string;
  url?: string | null;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  open,
  onClose,
  documentName,
  documentType = 'Official Record',
  issueDate = 'May 10, 2026',
  url = null,
}) => {
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
            borderRadius: 'var(--mac-radius-xl)',
            maxWidth: 560,
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
          padding: '20px 26px',
          borderBottom: '1px solid var(--mac-border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FAFAFC',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DescriptionIcon sx={{ color: 'var(--sakay-orange)', fontSize: '19.3' }} />
          <Box>
            <Typography sx={{ fontSize: '13.6px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
              {documentName}
            </Typography>
            <Typography sx={{ fontSize: '10px', color: 'var(--mac-text-muted)', mt: '2px' }}>
              {documentType} • Issued: {issueDate}
            </Typography>
          </Box>
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

      {/* Modal Body with 32px Top Spacing After Divider Line */}
      <DialogContent
        sx={{
          paddingTop: '32px !important',
          paddingBottom: '28px !important',
          paddingLeft: '28px !important',
          paddingRight: '28px !important',
          backgroundColor: '#F8F9FA',
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: 280,
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px dashed var(--mac-border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxShadow: 'var(--mac-shadow-subtle)',
          }}
        >
          {url ? (
            <iframe
              src={url}
              title={documentName}
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px' }}
            />
          ) : (
            <>
              <DescriptionIcon sx={{ fontSize: 56, color: 'var(--mac-text-tertiary)', mb: 1.5 }} />
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: 'var(--mac-text-primary)', mb: '4px' }}>
                Official Document Preview
              </Typography>
              <Typography sx={{ fontSize: '10.4px', color: 'var(--mac-text-muted)', textAlign: 'center', maxWidth: 360 }}>
                LGU Administrative Record Verified • Official Seal & Electronic Signature Intact
              </Typography>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ padding: '16px 26px', borderTop: '1px solid var(--mac-border-color)', backgroundColor: '#FAFAFC', gap: 1.5 }}>
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
          Close
        </Button>

        <Button
          startIcon={<DownloadIcon fontSize="small" />}
          disabled={!url}
          onClick={() => {
            if (url) {
              window.open(url, '_blank');
            }
          }}
          sx={{
            height: 38,
            padding: '0 20px',
            borderRadius: '9px',
            textTransform: 'none',
            fontSize: '11.3px',
            fontWeight: 600,
            color: '#FFFFFF',
            backgroundColor: 'var(--sakay-orange)',
            '&:hover': { backgroundColor: 'var(--sakay-orange-hover)' },
            '&.Mui-disabled': { backgroundColor: '#E5E5EA', color: '#C7C7CC' }
          }}
        >
          Download PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
};
