import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CameraswitchIcon from '@mui/icons-material/Cameraswitch';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import FlashOffIcon from '@mui/icons-material/FlashOff';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import VideocamOffOutlinedIcon from '@mui/icons-material/VideocamOffOutlined';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import { useLanguage } from '../../../utils/LanguageContext';
import {
  enhanceLicenseDocument,
  assessImageQuality,
  captureRawFrame,
  ImageQualityAssessment,
} from '../../../services/imageEnhancementService';

export const DriverScanLicenseBack: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, t } = useLanguage();
  const state = location.state as {
    phone?: string;
    driverName?: string;
    frontPhoto?: string;
  } | undefined;

  const isTagalog = language === 'tl';
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewfinderRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);

  // Analysis & Quality modal states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [qualityDialogOpen, setQualityDialogOpen] = useState(false);
  const [pendingCapturedPhoto, setPendingCapturedPhoto] = useState<{ processed: string; raw: string } | null>(null);
  const [qualityAssessment, setQualityAssessment] = useState<ImageQualityAssessment | null>(null);

  const startCamera = useCallback(async (targetFacing: 'environment' | 'user') => {
    setCameraError(null);

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(t.useRearCameraError);
      return;
    }

    try {
      let selectedDeviceId: string | undefined;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');

        if (targetFacing === 'user') {
          const frontDev = videoInputs.find((d) =>
            /front|user|facing\s*front|selfie|built-in|facetime/i.test(d.label)
          );
          if (frontDev) selectedDeviceId = frontDev.deviceId;
          else if (videoInputs.length > 1) {
            selectedDeviceId = videoInputs[0].deviceId;
          }
        } else {
          const backDev = videoInputs.find((d) =>
            /back|rear|environment|facing\s*back/i.test(d.label)
          );
          if (backDev) selectedDeviceId = backDev.deviceId;
          else if (videoInputs.length > 1) {
            selectedDeviceId = videoInputs[videoInputs.length - 1].deviceId;
          }
        }
      } catch {}

      const constraintsList: MediaStreamConstraints[] = [];

      if (selectedDeviceId) {
        constraintsList.push({
          video: {
            deviceId: { exact: selectedDeviceId },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      }

      constraintsList.push({
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      constraintsList.push({
        video: { facingMode: targetFacing },
        audio: false,
      });

      constraintsList.push({
        video: true,
        audio: false,
      });

      let activeStream: MediaStream | null = null;
      let lastErr: unknown = null;

      for (const constraint of constraintsList) {
        try {
          activeStream = await navigator.mediaDevices.getUserMedia(constraint);
          if (activeStream) break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (!activeStream) {
        throw lastErr || new Error('Camera access failed');
      }

      setStream(activeStream);
      if (videoRef.current) {
        videoRef.current.srcObject = activeStream;
      }
    } catch (err: unknown) {
      console.warn('[DriverScanLicenseBack] Camera stream error:', err);
      setCameraError(t.useRearCameraError);
    }
  }, [t.useRearCameraError]);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  // Tap-to-Focus with Orange indicator
  const handleTapToFocus = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!viewfinderRef.current) return;
    const rect = viewfinderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setFocusPoint({ x, y });
    setTimeout(() => setFocusPoint(null), 1200);

    try {
      const track = stream?.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities?.() as { focusMode?: string[] } | undefined;
        if (capabilities?.focusMode?.includes('continuous') || capabilities?.focusMode?.includes('manual')) {
          (track.applyConstraints as (c: unknown) => Promise<void>)({
            advanced: [
              {
                focusMode: 'continuous',
                pointsOfInterest: [{ x: x / rect.width, y: y / rect.height }],
              },
            ],
          }).catch(() => {});
        }
      }
    } catch {}
  };

  const handleToggleTorch = async () => {
    try {
      const track = stream?.getVideoTracks()[0];
      if (track) {
        const nextTorch = !torchOn;
        const capabilities = track.getCapabilities?.() as { torch?: boolean } | undefined;
        if (capabilities?.torch) {
          await (track.applyConstraints as (c: unknown) => Promise<void>)({
            advanced: [{ torch: nextTorch }],
          });
          setTorchOn(nextTorch);
        } else {
          setTorchOn(!torchOn);
        }
      }
    } catch (err) {
      console.warn('[DriverScanLicenseBack] Torch error:', err);
    }
  };

  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleCapture = async () => {
    setIsAnalyzing(true);
    let capturedDataUrl = '';
    let rawFrameDataUrl = '';

    try {
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        try {
          rawFrameDataUrl = captureRawFrame(videoRef.current);
          capturedDataUrl = await enhanceLicenseDocument(
            videoRef.current,
            guideRef.current || viewfinderRef.current,
            'back'
          );
        } catch (err) {
          console.warn('[DriverScanLicenseBack] Image enhancement error:', err);
          const video = videoRef.current;
          const canvas = canvasRef.current || document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            capturedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
            rawFrameDataUrl = capturedDataUrl;
          }
        }
      }

      if (!capturedDataUrl) {
        setIsAnalyzing(false);
        return;
      }

      const assessment = await assessImageQuality(capturedDataUrl);
      setPendingCapturedPhoto({ processed: capturedDataUrl, raw: rawFrameDataUrl });
      setQualityAssessment(assessment);

      setIsAnalyzing(false);

      if (!assessment.isAcceptable) {
        setQualityDialogOpen(true);
        return;
      }

      proceedWithPhoto(capturedDataUrl, rawFrameDataUrl);
    } catch (err) {
      console.error('[DriverScanLicenseBack] Capture failed:', err);
      setIsAnalyzing(false);
    }
  };

  const proceedWithPhoto = (photoUrl: string, rawPhotoUrl?: string) => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }

    navigate('/driver/review-license-back', {
      state: {
        ...state,
        backPhoto: photoUrl,
        rawBackPhoto: rawPhotoUrl || photoUrl,
      },
    });
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 1. Header Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          pt: 'calc(var(--safe-area-top) + 20px)',
          pb: 2,
          backgroundColor: '#FFFFFF',
          zIndex: 15,
        }}
      >
        <IconButton
          onClick={() => navigate('/driver/review-license-front', { state })}
          sx={{
            width: 44,
            height: 44,
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            '&:hover': { backgroundColor: '#F8FAFC' },
          }}
        >
          <ArrowBackIcon sx={{ color: '#0F172A', fontSize: 22 }} />
        </IconButton>

        <Logo color="orange" width={110} />
      </Box>

      {/* 2. Main Scanner Viewport Area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2.5,
          position: 'relative',
          overflowY: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {/* Title Prompt */}
        <Typography
          sx={{
            fontSize: '17px',
            color: '#FFFFFF',
            textAlign: 'center',
            fontWeight: 600,
            lineHeight: 1.4,
            maxWidth: '320px',
            mt: 1,
            mb: 2,
          }}
        >
          {t.scanBackPromptPrefix}
          <Box component="span" sx={{ color: '#FF6B00', fontWeight: 800 }}>
            {t.scanBackWord}
          </Box>
          {t.scanPromptMid}
          <br />
          <Box component="span" sx={{ color: '#FF6B00', fontWeight: 800 }}>
            {t.philippineDriversLicense}
          </Box>
          {t.scanPromptSuffix}
        </Typography>

        {/* Viewfinder Target Area with Card Boundary & 4 Corner L-Brackets */}
        <Box
          ref={viewfinderRef}
          onClick={handleTapToFocus}
          sx={{
            width: '100%',
            maxWidth: '370px',
            aspectRatio: '1.45 / 1',
            minHeight: '255px',
            borderRadius: '18px',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#0F172A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7)',
            cursor: 'crosshair',
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
              display: cameraError ? 'none' : 'block',
            }}
          />

          {cameraError && (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#1E293B',
                color: '#94A3B8',
                gap: 1,
                p: 2,
              }}
            >
              <VideocamOffOutlinedIcon sx={{ fontSize: 44, color: '#64748B' }} />
              <Typography sx={{ fontSize: '13px', color: '#94A3B8', textAlign: 'center' }}>
                Camera stream offline
              </Typography>
            </Box>
          )}

          {/* Card Boundary Dashed Frame with 4-Corner L-Brackets */}
          <Box
            ref={guideRef}
            sx={{
              position: 'absolute',
              inset: '8px',
              border: '1.5px dashed rgba(255, 255, 255, 0.75)',
              borderRadius: '14px',
              pointerEvents: 'none',
            }}
          >
            {/* Top-Left Corner L Bracket */}
            <Box
              sx={{
                position: 'absolute',
                top: '-3px',
                left: '-3px',
                width: '32px',
                height: '32px',
                borderTop: '4.5px solid #FF6B00',
                borderLeft: '4.5px solid #FF6B00',
                borderTopLeftRadius: '14px',
              }}
            />
            {/* Top-Right Corner L Bracket */}
            <Box
              sx={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                width: '32px',
                height: '32px',
                borderTop: '4.5px solid #FF6B00',
                borderRight: '4.5px solid #FF6B00',
                borderTopRightRadius: '14px',
              }}
            />
            {/* Bottom-Left Corner L Bracket */}
            <Box
              sx={{
                position: 'absolute',
                bottom: '-3px',
                left: '-3px',
                width: '32px',
                height: '32px',
                borderBottom: '4.5px solid #FF6B00',
                borderLeft: '4.5px solid #FF6B00',
                borderBottomLeftRadius: '14px',
              }}
            />
            {/* Bottom-Right Corner L Bracket */}
            <Box
              sx={{
                position: 'absolute',
                bottom: '-3px',
                right: '-3px',
                width: '32px',
                height: '32px',
                borderBottom: '4.5px solid #FF6B00',
                borderRight: '4.5px solid #FF6B00',
                borderBottomRightRadius: '14px',
              }}
            />
          </Box>

          {/* Analyzing Image Quality Loading Overlay */}
          {isAnalyzing && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.78)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 30,
                gap: 1.5,
                p: 2,
              }}
            >
              <CircularProgress size={38} sx={{ color: '#FF6B00', thickness: 4.5 }} />
              <Typography sx={{ color: '#FFFFFF', fontSize: '14.5px', fontWeight: 700, textAlign: 'center' }}>
                {t.analyzingImageQuality}
              </Typography>
            </Box>
          )}

          {/* Tap-to-Focus Reticle (Orange Border) */}
          {focusPoint && (
            <Box
              sx={{
                position: 'absolute',
                top: focusPoint.y - 28,
                left: focusPoint.x - 28,
                width: 56,
                height: 56,
                border: '2.5px solid #FF6B00',
                borderRadius: '10px',
                pointerEvents: 'none',
                animation: 'pulseFocus 0.8s ease-out',
                '@keyframes pulseFocus': {
                  '0%': { transform: 'scale(1.4)', opacity: 0.9 },
                  '50%': { transform: 'scale(1.0)', opacity: 1 },
                  '100%': { transform: 'scale(0.95)', opacity: 0.7 },
                },
              }}
            />
          )}
        </Box>

        {/* Camera Permission Alert (Use rear camera directive) */}
        {cameraError && (
          <Box sx={{ width: '100%', maxWidth: '360px', mt: 2 }}>
            <Alert
              severity="warning"
              sx={{
                backgroundColor: 'rgba(255, 107, 0, 0.15)',
                color: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid rgba(255, 107, 0, 0.3)',
                '& .MuiAlert-icon': { color: '#FF6B00' },
              }}
            >
              {cameraError}
            </Alert>
          </Box>
        )}

        {/* Tips Box */}
        <Box
          sx={{
            width: '100%',
            maxWidth: '360px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            p: 2,
            mt: 2.5,
            mb: 2,
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <Typography
            sx={{
              color: '#FF6B00',
              fontWeight: 800,
              fontSize: '13.5px',
              mb: 1.25,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            {t.tipsTitle}
          </Typography>
          <Box
            component="ul"
            sx={{
              margin: 0,
              paddingLeft: '18px',
              color: '#E2E8F0',
              fontSize: '12.5px',
              lineHeight: 1.6,
              '& li': { mb: 0.5 },
            }}
          >
            <li>{t.scanTip1}</li>
            <li>{t.scanTip2}</li>
            <li>{t.scanTip3}</li>
            <li>{t.scanTip4}</li>
          </Box>
        </Box>

        {/* 3. Bottom Controls */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            width: '100%',
            maxWidth: '360px',
            py: 1,
          }}
        >
          <IconButton
            onClick={handleToggleTorch}
            sx={{
              color: torchOn ? '#FF6B00' : '#FFFFFF',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              width: 50,
              height: 50,
              borderRadius: '50%',
              border: torchOn ? '1.5px solid #FF6B00' : '1px solid rgba(255,255,255,0.2)',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
            }}
          >
            {torchOn ? <FlashOnIcon /> : <FlashOffIcon />}
          </IconButton>

          <IconButton
            onClick={handleCapture}
            disabled={isAnalyzing}
            sx={{
              width: 74,
              height: 74,
              borderRadius: '50%',
              border: '4px solid #FFFFFF',
              padding: '4px',
              backgroundColor: 'transparent',
              '&:hover': { transform: 'scale(1.03)' },
              '&:active': { transform: 'scale(0.96)' },
            }}
          >
            <Box
              sx={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: '#FF6B00',
              }}
            />
          </IconButton>

          <IconButton
            onClick={handleToggleFacingMode}
            disabled={isAnalyzing}
            sx={{
              color: '#FFFFFF',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              width: 50,
              height: 50,
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
            }}
          >
            <CameraswitchIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Hidden Canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Quality Check Modal */}
      <Dialog
        open={qualityDialogOpen}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '24px',
              p: 2,
              width: '92%',
              maxWidth: '380px',
              textAlign: 'center',
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, mb: 1.5 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: '#FFF7ED',
              border: '2px solid #FFEDD5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <WarningAmberRoundedIcon sx={{ fontSize: 32, color: '#EA580C' }} />
          </Box>
        </Box>

        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', fontSize: '19px', p: 0, mb: 1 }}>
          {t.qualityWarningTitle}
        </DialogTitle>

        <DialogContent sx={{ p: 0, px: 1, mb: 2.5 }}>
          <Typography sx={{ color: '#475569', fontSize: '14px', lineHeight: 1.5, mb: 1 }}>
            {t.qualityWarningDesc}
          </Typography>
          {qualityAssessment?.issues && qualityAssessment.issues.length > 0 && (
            <Typography sx={{ color: '#DC2626', fontSize: '12px', fontWeight: 600 }}>
              {qualityAssessment.issues.join(' • ')}
            </Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <PrimaryButton
            fullWidth
            onClick={() => {
              setQualityDialogOpen(false);
              setPendingCapturedPhoto(null);
            }}
            sx={{
              height: '52px',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: 800,
              backgroundColor: '#FF6B00',
              boxShadow: 'none',
              '&:hover': { backgroundColor: '#E66000', boxShadow: 'none' },
            }}
          >
            {t.qualityRetakeBtn}
          </PrimaryButton>

          <Button
            fullWidth
            onClick={() => {
              setQualityDialogOpen(false);
              if (pendingCapturedPhoto) proceedWithPhoto(pendingCapturedPhoto.processed, pendingCapturedPhoto.raw);
            }}
            sx={{
              height: '48px',
              borderRadius: '14px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#64748B',
              backgroundColor: '#F1F5F9',
              textTransform: 'none',
              '&:hover': { backgroundColor: '#E2E8F0' },
            }}
          >
            {t.useThisPhoto}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DriverScanLicenseBack;
