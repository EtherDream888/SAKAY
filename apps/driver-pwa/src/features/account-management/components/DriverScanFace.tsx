import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, IconButton, Alert, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CameraswitchIcon from '@mui/icons-material/Cameraswitch';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import FlashOffIcon from '@mui/icons-material/FlashOff';
import FaceIcon from '@mui/icons-material/Face';

import Logo from '../../../common/components/Logo';
import { useLanguage } from '../../../utils/LanguageContext';
import { captureRawFrame } from '../../../services/imageEnhancementService';
import { detectFaceInCanvas } from '../../../services/faceMatchingService';

export const DriverScanFace: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const isTagalog = language === 'tl';
  const state = location.state as {
    phone?: string;
    driverName?: string;
    isEditMode?: boolean;
  } | undefined;

  const isEditMode = Boolean(state?.isEditMode);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [torchOn, setTorchOn] = useState(false);
  const [faceDetected, setFaceDetected] = useState(true);

  const startCamera = async (targetFacing: 'user' | 'environment') => {
    try {
      setCameraError(null);

      // Stop previous tracks cleanly
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream;
        oldStream.getTracks?.().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          isTagalog
            ? 'Hindi ma-access ang camera sa aparatong ito.'
            : 'Cannot access camera on this device.'
        );
        return;
      }

      let selectedDeviceId: string | undefined;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        if (targetFacing === 'user') {
          const frontDev = videoInputs.find((d) =>
            /front|user|facing\s*front|selfie|built-in|facetime/i.test(d.label)
          );
          if (frontDev) selectedDeviceId = frontDev.deviceId;
          else if (videoInputs.length > 0) selectedDeviceId = videoInputs[0].deviceId;
        } else {
          const backDev = videoInputs.find((d) =>
            /back|rear|environment|facing\s*back/i.test(d.label)
          );
          if (backDev) selectedDeviceId = backDev.deviceId;
          else if (videoInputs.length > 1) selectedDeviceId = videoInputs[videoInputs.length - 1].deviceId;
        }
      } catch {}

      const constraintsList: MediaStreamConstraints[] = [];

      if (selectedDeviceId) {
        constraintsList.push({
          video: {
            deviceId: { exact: selectedDeviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      }

      constraintsList.push({
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
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

      let mediaStream: MediaStream | null = null;
      let lastErr: unknown = null;

      for (const constraint of constraintsList) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraint);
          if (mediaStream) break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (!mediaStream) {
        throw lastErr || new Error('Camera access failed');
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('[DriverScanFace] Camera stream error:', err);
      setCameraError(
        isTagalog
          ? 'Hindi mabuksan ang camera. Siguraduhing pinayagan ang access sa camera.'
          : 'Unable to access camera. Please make sure camera permissions are allowed.'
      );
    }
  };

  // Initialize camera stream
  useEffect(() => {
    startCamera(facingMode);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  const handleToggleFacingMode = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
  };

  const handleToggleTorch = async () => {
    try {
      const track = (streamRef.current || stream)?.getVideoTracks()[0];
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
      console.warn('[DriverScanFace] Torch toggle error:', err);
    }
  };

  // Periodic face position monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        const detection = detectFaceInCanvas(videoRef.current);
        setFaceDetected(detection.hasFace);
      }
    }, 800);

    return () => clearInterval(interval);
  }, []);

  // Capture live selfie frame
  const handleCaptureSelfie = () => {
    let capturedPhoto = '';

    if (videoRef.current && canvasRef.current) {
      try {
        capturedPhoto = captureRawFrame(videoRef.current);
      } catch (e) {
        console.warn('[DriverScanFace] Frame capture fallback:', e);
      }
    }

    if (!capturedPhoto) {
      // Desktop camera simulation fallback frame
      const dummyCanvas = document.createElement('canvas');
      dummyCanvas.width = 640;
      dummyCanvas.height = 640;
      const ctx = dummyCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(0, 0, 640, 640);
        ctx.fillStyle = '#FF6B00';
        ctx.beginPath();
        ctx.arc(320, 320, 160, 0, Math.PI * 2);
        ctx.fill();
        capturedPhoto = dummyCanvas.toDataURL('image/jpeg', 0.9);
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    navigate('/driver/review-face', {
      state: {
        ...state,
        rawSelfie: capturedPhoto,
        selfiePhoto: capturedPhoto,
        isEditMode,
      },
    });
  };

  const handleBack = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (isEditMode) {
      navigate('/driver/confirm-all-info', { state });
    } else {
      navigate('/driver/review-tricycle', { state });
    }
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
      {/* 1. Top Header Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          pt: 'calc(var(--safe-area-top) + 20px)',
          pb: 2,
          backgroundColor: '#FFFFFF',
          flexShrink: 0,
          zIndex: 20,
        }}
      >
        <IconButton
          onClick={handleBack}
          sx={{
            width: 44,
            height: 44,
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            '&:hover': { backgroundColor: '#F8FAFC' },
          }}
        >
          <ArrowBackIcon sx={{ color: '#0F172A', fontSize: 20 }} />
        </IconButton>

        <Logo color="orange" width={110} />
      </Box>

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* 2. Main Viewfinder Container */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Instruction Banner */}
        <Typography
          sx={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#FFFFFF',
            textAlign: 'center',
            lineHeight: 1.4,
            maxWidth: 320,
            mt: 1,
            zIndex: 10,
          }}
        >
          {isTagalog ? (
            <>
              Ilagay ang iyong{' '}
              <Box component="span" sx={{ color: '#FF6B00', fontWeight: 800 }}>
                mukha
              </Box>{' '}
              sa loob ng frame at tumingin nang diretso sa camera.
            </>
          ) : (
            <>
              Position your{' '}
              <Box component="span" sx={{ color: '#FF6B00', fontWeight: 800 }}>
                face
              </Box>{' '}
              inside the frame and look straight at the camera.
            </>
          )}
        </Typography>

        {cameraError && (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => startCamera(facingMode)}
                sx={{ fontWeight: 700, textTransform: 'none' }}
              >
                {isTagalog ? 'Subukan Muli' : 'Retry'}
              </Button>
            }
            sx={{ width: '100%', maxWidth: 340, my: 1, borderRadius: '12px', zIndex: 10 }}
          >
            {cameraError}
          </Alert>
        )}

        {/* Circular Face Framing Viewfinder */}
        <Box
          sx={{
            position: 'relative',
            width: 270,
            height: 270,
            borderRadius: '50%',
            my: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Outer Corner Accent Brackets */}
          <Box sx={{ position: 'absolute', top: -14, left: -14, width: 28, height: 28, borderTop: '4px solid #FF6B00', borderLeft: '4px solid #FF6B00', borderTopLeftRadius: '12px' }} />
          <Box sx={{ position: 'absolute', top: -14, right: -14, width: 28, height: 28, borderTop: '4px solid #FF6B00', borderRight: '4px solid #FF6B00', borderTopRightRadius: '12px' }} />
          <Box sx={{ position: 'absolute', bottom: -14, left: -14, width: 28, height: 28, borderBottom: '4px solid #FF6B00', borderLeft: '4px solid #FF6B00', borderBottomLeftRadius: '12px' }} />
          <Box sx={{ position: 'absolute', bottom: -14, right: -14, width: 28, height: 28, borderBottom: '4px solid #FF6B00', borderRight: '4px solid #FF6B00', borderBottomRightRadius: '12px' }} />

          {/* Glowing Circular Frame */}
          <Box
            sx={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: faceDetected ? '3.5px solid #FF6B00' : '3.5px dashed #64748B',
              boxShadow: faceDetected
                ? '0 0 24px rgba(255, 107, 0, 0.45), inset 0 0 24px rgba(255, 107, 0, 0.2)'
                : 'none',
              overflow: 'hidden',
              position: 'relative',
              backgroundColor: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease-in-out',
            }}
          >
            {/* Live Camera Video Feed (Mirrored for Front Camera) */}
            <video
              ref={videoRef}
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
              }}
            />

            {/* Default Face Overlay Icon */}
            {!stream && (
              <FaceIcon
                sx={{
                  position: 'absolute',
                  fontSize: 120,
                  color: 'rgba(255, 255, 255, 0.25)',
                }}
              />
            )}
          </Box>
        </Box>

        {/* 3. Bottom Tips Container matching Reference Card */}
        <Box
          sx={{
            width: '100%',
            maxWidth: 340,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            p: 2,
            mb: 2,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            zIndex: 10,
          }}
        >
          <Typography
            sx={{
              color: '#FF6B00',
              fontWeight: 800,
              fontSize: '13.5px',
              mb: 1.25,
            }}
          >
            {isTagalog ? 'Para kumuha ng perpektong litrato:' : 'Tips for a clear photo:'}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  mt: 0.2,
                }}
              >
                1
              </Box>
              <Typography sx={{ fontSize: '12.5px', color: '#E2E8F0', lineHeight: 1.45 }}>
                {isTagalog ? 'Huwag magsuot ng sombrero, salamin, o face mask.' : 'Do not wear a hat, glasses, or face mask.'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  mt: 0.2,
                }}
              >
                2
              </Box>
              <Typography sx={{ fontSize: '12.5px', color: '#E2E8F0', lineHeight: 1.45 }}>
                {isTagalog ? 'Siguraduhing maliwanag ang paligid.' : 'Ensure your surroundings are well-lit.'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  mt: 0.2,
                }}
              >
                3
              </Box>
              <Typography sx={{ fontSize: '12.5px', color: '#E2E8F0', lineHeight: 1.45 }}>
                {isTagalog
                  ? 'Tumingin nang diretso sa camera at panatilihing nasa gitna ang iyong mukha.'
                  : 'Look straight at the camera and keep your face centered.'}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* 4. Bottom Controls Row matching Driver License & Reference Camera Bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            width: '100%',
            maxWidth: '340px',
            pb: 'calc(var(--safe-area-bottom) + 12px)',
            zIndex: 10,
          }}
        >
          {/* Flashlight / Torch Toggle */}
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

          {/* Concentric Ring SAKAY Orange Shutter Capture Button */}
          <IconButton
            onClick={handleCaptureSelfie}
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

          {/* Camera Flip (Front/Back) */}
          <IconButton
            onClick={handleToggleFacingMode}
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
    </Box>
  );
};
