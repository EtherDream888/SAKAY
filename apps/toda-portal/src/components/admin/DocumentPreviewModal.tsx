import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  documentName: string;
  documentType?: string;
  imageUrl?: string | null;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  open,
  onClose,
  documentName,
  documentType = 'Official Document Proof',
  imageUrl,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [imgLoading, setImgLoading] = useState<boolean>(true);
  const [imgError, setImgError] = useState<boolean>(false);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.target = '_blank';
    a.download = `${documentName.replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenOriginal = () => {
    if (imageUrl) {
      window.open(imageUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
          },
        },
        paper: {
          sx: {
            width: '100%',
            maxWidth: 780,
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
          padding: '18px 24px',
          borderBottom: '1px solid var(--mac-border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FAFAFC',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DescriptionIcon sx={{ color: 'var(--sakay-orange)', fontSize: 24 }} />
          <Box>
            <Typography sx={{ fontSize: '16px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
              {documentName}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
              {documentType} • Official TODA / Municipal Compliance Submission
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {imageUrl && !imgError && (
            <>
              <IconButton size="small" onClick={handleZoomOut} title="Zoom Out" sx={{ color: 'var(--mac-text-secondary)' }}>
                <ZoomOutIcon fontSize="small" />
              </IconButton>
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: 'var(--mac-text-muted)', minWidth: 38, textAlign: 'center' }}>
                {Math.round(zoomLevel * 100)}%
              </Typography>
              <IconButton size="small" onClick={handleZoomIn} title="Zoom In" sx={{ color: 'var(--mac-text-secondary)' }}>
                <ZoomInIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={handleResetZoom} title="Reset Zoom" sx={{ color: 'var(--mac-text-secondary)' }}>
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </>
          )}
          <IconButton onClick={onClose} size="small" sx={{ ml: 1 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ padding: '20px', backgroundColor: '#18181B', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {imageUrl && !imgError ? (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: 480,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'auto',
              borderRadius: '8px',
              backgroundColor: '#09090B',
            }}
          >
            {imgLoading && (
              <Box sx={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                <CircularProgress size={36} sx={{ color: 'var(--sakay-orange)' }} />
                <Typography sx={{ fontSize: '13px', color: '#A1A1AA' }}>Loading captured document...</Typography>
              </Box>
            )}
            <Box
              component="img"
              src={imageUrl}
              alt={documentName}
              onLoad={() => setImgLoading(false)}
              onError={() => {
                setImgLoading(false);
                setImgError(true);
              }}
              sx={{
                maxWidth: zoomLevel === 1 ? '100%' : 'none',
                maxHeight: zoomLevel === 1 ? '100%' : 'none',
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
                objectFit: 'contain',
                borderRadius: '6px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                display: imgLoading ? 'none' : 'block',
              }}
            />
          </Box>
        ) : (
          <Box
            sx={{
              width: '100%',
              height: 380,
              backgroundColor: '#FAFAFC',
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
              {documentName}
            </Typography>
            <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', maxWidth: 440, mb: 1 }}>
              {imgError
                ? 'Unable to load high-resolution image preview. You may still inspect the document record below.'
                : 'Captured document metadata is registered with Calapan City TODA Administrative Board.'}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ padding: '16px 24px', borderTop: '1px solid var(--mac-border-color)', backgroundColor: '#FAFAFC', display: 'flex', justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)' }}>
          {imageUrl ? 'High-Resolution Captured Submission' : 'Document Submission Record'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {imageUrl && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<OpenInNewIcon fontSize="small" />}
              onClick={handleOpenOriginal}
              sx={{
                textTransform: 'none',
                borderRadius: '8px',
                borderColor: 'var(--mac-border-color)',
                color: 'var(--mac-text-secondary)',
                fontSize: '12.5px',
                fontWeight: 600,
              }}
            >
              Open Full Resolution
            </Button>
          )}

          {imageUrl && (
            <Button
              variant="contained"
              size="small"
              startIcon={<DownloadIcon fontSize="small" />}
              onClick={handleDownload}
              sx={{
                textTransform: 'none',
                borderRadius: '8px',
                backgroundColor: 'var(--sakay-orange)',
                color: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 600,
                '&:hover': { backgroundColor: 'var(--sakay-orange-hover)' },
              }}
            >
              Download Photo
            </Button>
          )}

          <Button
            variant="outlined"
            size="small"
            onClick={onClose}
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              borderColor: 'var(--mac-border-color)',
              color: 'var(--mac-text-primary)',
              fontSize: '12.5px',
              fontWeight: 600,
            }}
          >
            Close
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
