import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CameraswitchIcon from '@mui/icons-material/Cameraswitch';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import FlashOffIcon from '@mui/icons-material/FlashOff';

import Logo from '../../../common/components/Logo';
import {
  enhanceLicenseDocument,
  captureRawFrame,
} from '../../../services/imageEnhancementService';

export const DriverScanMtop: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewfinderRef = useRef<HTMLDivElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const startCamera = useCallback(async (targetFacing: 'environment' | 'user') => {
    setCameraError(null);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Hindi ma-access ang camera sa aparatong ito.');
      return;
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.warn('[DriverScanMtop] Camera start failed:', err);
      // Fallback without constraints
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
      } catch (fallbackErr) {
        setCameraError('Pakipahintulutan ang access sa camera upang ma-scan ang iyong MTOP.');
      }
    }
  }, [stream]);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleToggleCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
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
      console.warn('[DriverScanMtop] Torch toggle error:', err);
    }
  };

  const handleCapture = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      let rawPhoto = '';
      let processedPhoto = '';

      if (videoRef.current && viewfinderRef.current && canvasRef.current) {
        const rawCaptured = captureRawFrame(videoRef.current);
        if (rawCaptured) {
          rawPhoto = rawCaptured;
          const enhanced = await enhanceLicenseDocument(
            videoRef.current,
            viewfinderRef.current,
            'front'
          );
          processedPhoto = enhanced || rawCaptured;
        }
      }

      if (!processedPhoto) {
        // Fallback placeholder photo if camera stream is unavailable in desktop preview mode
        const dummyCanvas = document.createElement('canvas');
        dummyCanvas.width = 640;
        dummyCanvas.height = 400;
        const ctx = dummyCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(0, 0, 640, 400);
          ctx.fillStyle = '#FF6B00';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText('MTOP PERMIT SAMPLE SCAN', 180, 200);
        }
        processedPhoto = dummyCanvas.toDataURL('image/jpeg', 0.85);
        rawPhoto = processedPhoto;
      }

      // Stop camera stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      navigate('/driver/review-mtop', {
        state: {
          ...state,
          mtopPhoto: processedPhoto,
          rawMtopPhoto: rawPhoto,
        },
      });
    } catch (err) {
      console.error('[DriverScanMtop] Capture error:', err);
    } finally {
      setIsCapturing(false);
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
      {/* Hidden Canvas for Frame Processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* 1. Header Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          pt: 'calc(var(--safe-area-top) + 20px)',
          pb: 2,
          backgroundColor: '#000000',
          zIndex: 10,
        }}
      >
        <IconButton
          onClick={() => navigate('/driver/mtop-instructions', { state })}
          sx={{
            width: 44,
            height: 44,
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.2)',
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: '#FFFFFF',
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>

        <Logo color="orange" width={110} />

        <IconButton
          onClick={handleToggleCamera}
          sx={{
            width: 44,
            height: 44,
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.2)',
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: '#FFFFFF',
          }}
        >
          <CameraswitchIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      {/* 2. Sub-Header Instruction */}
      <Box sx={{ px: 3, py: 1.5, textAlign: 'center', zIndex: 10 }}>
        <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.4 }}>
          I-scan ang iyong{' '}
          <Box component="span" sx={{ color: '#FF6B00' }}>
            Motorized Tricycle Operator's Permit (MTOP)
          </Box>{' '}
          sa frame
        </Typography>
      </Box>

      {/* 3. Viewfinder Area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 3,
          position: 'relative',
        }}
      >
        {cameraError && (
          <Alert severity="warning" sx={{ mb: 2, width: '100%', borderRadius: '12px' }}>
            {cameraError}
          </Alert>
        )}

        <Box
          ref={viewfinderRef}
          sx={{
            width: '100%',
            maxWidth: 360,
            aspectRatio: '1.4 / 1',
            borderRadius: '18px',
            border: '2.5px solid #FF6B00',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#1E293B',
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
            }}
          />
        </Box>

        {/* Instructions Box */}
        <Box
          sx={{
            width: '100%',
            maxWidth: 360,
            mt: 3,
            p: 2,
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.15)',
            backgroundColor: 'rgba(255,255,255,0.06)',
            color: '#FFFFFF',
          }}
        >
          <Typography sx={{ fontSize: '13px', fontWeight: 700, mb: 1, color: '#F8FAFC' }}>
            Para kumuha ng perpektong litrato:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Typography sx={{ fontSize: '12px', color: '#94A3B8' }}>
              1. Ilagay ang iyong dokumento sa isang lugar na malinaw at maliwanag.
            </Typography>
            <Typography sx={{ fontSize: '12px', color: '#94A3B8' }}>
              2. Siguraduhing kasya nang buo ang dokumento sa loob ng frame.
            </Typography>
            <Typography sx={{ fontSize: '12px', color: '#94A3B8' }}>
              3. Manatiling hindi gumagalaw at pindutin ang button ng camera.
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
          maxWidth: '360px',
          mx: 'auto',
          py: 2,
          pb: 'calc(var(--safe-area-bottom) + 20px)',
          backgroundColor: '#000000',
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
          onClick={handleCapture}
          disabled={isCapturing}
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
          onClick={handleToggleCamera}
          disabled={isCapturing}
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
  );
};
