import React, { useState, useEffect } from 'react';
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
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';

export interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  documentName: string;
  documentType?: string;
  issueDate?: string;
  url?: string | null;
  urls?: string[];
  currentStatus?: 'Pending' | 'Pending Inspection' | 'Verified' | 'Resubmission Required';
  onApproveDocument?: () => void;
  onRequestResubmit?: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  open,
  onClose,
  documentName,
  documentType = 'Official Record',
  issueDate = 'May 10, 2026',
  url = null,
  urls,
  currentStatus,
  onApproveDocument,
  onRequestResubmit,
}) => {
  const allUrls: string[] = urls && urls.length > 0 ? urls.filter(Boolean) : (url ? [url] : []);
  const [photoIndex, setPhotoIndex] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [imgLoading, setImgLoading] = useState<boolean>(true);
  const [imgError, setImgError] = useState<boolean>(false);

  useEffect(() => {
    setPhotoIndex(0);
    setZoomLevel(1);
    setImgLoading(true);
    setImgError(false);
  }, [open, url, urls]);

  const activeUrl = allUrls[photoIndex] || null;
  const hasMultiplePhotos = allUrls.length > 1;

  const handlePrevPhoto = () => {
    if (photoIndex > 0) {
      setPhotoIndex((prev) => prev - 1);
      setZoomLevel(1);
      setImgLoading(true);
      setImgError(false);
    }
  };

  const handleNextPhoto = () => {
    if (photoIndex < allUrls.length - 1) {
      setPhotoIndex((prev) => prev + 1);
      setZoomLevel(1);
      setImgLoading(true);
      setImgError(false);
    }
  };

  const isImage = Boolean(
    activeUrl &&
      (/\.(jpg|jpeg|png|webp|gif)/i.test(activeUrl.split('?')[0]) ||
        activeUrl.startsWith('data:image') ||
        documentType?.toLowerCase().includes('photo') ||
        documentType?.toLowerCase().includes('proof') ||
        documentType?.toLowerCase().includes('image') ||
        documentType?.toLowerCase().includes('biometric') ||
        documentType?.toLowerCase().includes('license') ||
        documentType?.toLowerCase().includes('selfie') ||
        documentType?.toLowerCase().includes('mtop'))
  );

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  const handleDownload = () => {
    if (!activeUrl) return;
    const a = document.createElement('a');
    a.href = activeUrl;
    a.target = '_blank';
    a.download = `${documentName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${photoIndex + 1}${isImage ? '.jpg' : '.pdf'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenOriginal = () => {
    if (activeUrl) {
      window.open(activeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          },
        },
        paper: {
          sx: {
            borderRadius: 'var(--mac-radius-xl)',
            maxWidth: 720,
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
          padding: '18px 24px',
          borderBottom: '1px solid var(--mac-border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FAFAFC',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DescriptionIcon sx={{ color: 'var(--sakay-orange)', fontSize: 22 }} />
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: '14px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                {documentName}
              </Typography>
              {currentStatus === 'Verified' && (
                <Chip
                  label="Verified"
                  size="small"
                  sx={{ backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 700, fontSize: '10.5px', height: 20 }}
                />
              )}
              {currentStatus === 'Resubmission Required' && (
                <Chip
                  label="Resubmission Required"
                  size="small"
                  sx={{ backgroundColor: '#FEF3C7', color: '#B45309', fontWeight: 700, fontSize: '10.5px', height: 20 }}
                />
              )}
              {(currentStatus === 'Pending' || currentStatus === 'Pending Inspection') && (
                <Chip
                  label="Pending Inspection"
                  size="small"
                  sx={{ backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 700, fontSize: '10.5px', height: 20 }}
                />
              )}
            </Box>
            <Typography sx={{ fontSize: '11px', color: 'var(--mac-text-muted)', mt: '2px' }}>
              {documentType} • Issued: {issueDate}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isImage && activeUrl && !imgError && (
            <>
              <IconButton size="small" onClick={handleZoomOut} title="Zoom Out" sx={{ color: 'var(--mac-text-secondary)' }}>
                <ZoomOutIcon fontSize="small" />
              </IconButton>
              <Typography sx={{ fontSize: '11px', fontWeight: 600, color: 'var(--mac-text-muted)', minWidth: 36, textAlign: 'center' }}>
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
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{
          padding: isImage && activeUrl && !imgError ? '16px' : '24px',
          backgroundColor: isImage && activeUrl && !imgError ? '#18181B' : '#F8F9FA',
          minHeight: 380,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {activeUrl ? (
          isImage && !imgError ? (
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: 420,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto',
                borderRadius: '8px',
                backgroundColor: '#09090B',
              }}
            >
              {hasMultiplePhotos && (
                <>
                  {/* Photo Counter Pill */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'rgba(0, 0, 0, 0.75)',
                      backdropFilter: 'blur(4px)',
                      color: '#FFFFFF',
                      px: 2,
                      py: 0.5,
                      borderRadius: '20px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      zIndex: 10,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.8,
                    }}
                  >
                    <span>Photo {photoIndex + 1} of {allUrls.length}:</span>
                    <span style={{ color: '#FCD34D' }}>{photoIndex === 0 ? 'Front (Harap)' : 'Back (Likod)'}</span>
                  </Box>

                  {/* Previous Photo Button */}
                  <IconButton
                    disabled={photoIndex === 0}
                    onClick={handlePrevPhoto}
                    title="Previous Photo (Harap)"
                    sx={{
                      position: 'absolute',
                      left: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 10,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: '#FFFFFF',
                      width: 40,
                      height: 40,
                      '&:hover': { backgroundColor: 'rgba(0,0,0,0.85)' },
                      '&.Mui-disabled': { opacity: 0.2, color: '#9CA3AF', backgroundColor: 'transparent' },
                    }}
                  >
                    <ChevronLeftIcon sx={{ fontSize: 26 }} />
                  </IconButton>

                  {/* Next Photo Button */}
                  <IconButton
                    disabled={photoIndex === allUrls.length - 1}
                    onClick={handleNextPhoto}
                    title="Next Photo (Likod)"
                    sx={{
                      position: 'absolute',
                      right: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 10,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: '#FFFFFF',
                      width: 40,
                      height: 40,
                      '&:hover': { backgroundColor: 'rgba(0,0,0,0.85)' },
                      '&.Mui-disabled': { opacity: 0.2, color: '#9CA3AF', backgroundColor: 'transparent' },
                    }}
                  >
                    <ChevronRightIcon sx={{ fontSize: 26 }} />
                  </IconButton>
                </>
              )}

              {imgLoading && (
                <Box sx={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                  <CircularProgress size={32} sx={{ color: 'var(--sakay-orange)' }} />
                  <Typography sx={{ fontSize: '12px', color: '#A1A1AA' }}>Loading image preview...</Typography>
                </Box>
              )}
              <Box
                component="img"
                key={activeUrl}
                src={activeUrl}
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
                height: 420,
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid var(--mac-border-color)',
                overflow: 'hidden',
              }}
            >
              <iframe
                src={activeUrl}
                title={documentName}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </Box>
          )
        ) : (
          <Box
            sx={{
              width: '100%',
              height: 320,
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px dashed var(--mac-border-color)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              textAlign: 'center',
              boxShadow: 'var(--mac-shadow-subtle)',
            }}
          >
            <DescriptionIcon sx={{ fontSize: 52, color: 'var(--mac-text-tertiary)', mb: 1.5 }} />
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-primary)', mb: '4px' }}>
              Official Document Preview
            </Typography>
            <Typography sx={{ fontSize: '11px', color: 'var(--mac-text-muted)', textAlign: 'center', maxWidth: 360 }}>
              LGU Administrative Record Verified • Official Seal & Electronic Signature Intact
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ padding: '14px 24px', borderTop: '1px solid var(--mac-border-color)', backgroundColor: '#FAFAFC', gap: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {onRequestResubmit && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AssignmentReturnIcon fontSize="small" />}
              onClick={onRequestResubmit}
              sx={{
                height: 36,
                padding: '0 16px',
                borderRadius: '8px',
                textTransform: 'none',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#B45309',
                border: '1.5px solid #D97706',
                backgroundColor: '#FFFBEB',
                '&:hover': { backgroundColor: '#FEF3C7', borderColor: '#B45309' },
              }}
            >
              Request Resubmission
            </Button>
          )}

          {onApproveDocument && (
            <Button
              variant="contained"
              size="small"
              startIcon={<CheckCircleIcon fontSize="small" />}
              onClick={onApproveDocument}
              sx={{
                height: 36,
                padding: '0 16px',
                borderRadius: '8px',
                textTransform: 'none',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#FFFFFF',
                backgroundColor: '#16A34A',
                '&:hover': { backgroundColor: '#15803D' },
              }}
            >
              Approve Document
            </Button>
          )}

          {!onRequestResubmit && !onApproveDocument && (
            <Typography sx={{ fontSize: '11px', color: 'var(--mac-text-muted)' }}>
              {activeUrl ? 'Official Compliance Submission' : 'Document Submission Record'}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {activeUrl && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<OpenInNewIcon fontSize="small" />}
              onClick={handleOpenOriginal}
              sx={{
                height: 36,
                padding: '0 14px',
                borderRadius: '8px',
                textTransform: 'none',
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--mac-text-secondary)',
                border: '1px solid var(--mac-border-color)',
                '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
              }}
            >
              Open Full Resolution
            </Button>
          )}

          <Button
            variant="contained"
            size="small"
            startIcon={<DownloadIcon fontSize="small" />}
            disabled={!activeUrl}
            onClick={handleDownload}
            sx={{
              height: 36,
              padding: '0 16px',
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '11.5px',
              fontWeight: 600,
              color: '#FFFFFF',
              backgroundColor: 'var(--sakay-orange)',
              '&:hover': { backgroundColor: 'var(--sakay-orange-hover)' },
              '&.Mui-disabled': { backgroundColor: '#E5E5EA', color: '#C7C7CC' },
            }}
          >
            Download Copy
          </Button>

          <Button
            onClick={onClose}
            sx={{
              height: 36,
              padding: '0 14px',
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '11.5px',
              fontWeight: 500,
              color: 'var(--mac-text-secondary)',
              border: '1px solid var(--mac-border-color)',
              '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
            }}
          >
            Close
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
