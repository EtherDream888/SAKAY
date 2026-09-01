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
            'mtop' as any
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

      {/* 1. Header Bar (White Top Section) */}
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
          onClick={() => navigate('/driver/mtop-instructions', { state })}
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
          I-scan ang{' '}
          <Box component="span" sx={{ color: '#FF6B00', fontWeight: 800 }}>
            Motorized Tricycle Operator's Permit (MTOP)
          </Box>{' '}
          sa frame
        </Typography>

        {/* Viewfinder Target Area with Dashed Frame & 4 Corner L-Brackets */}
        <Box
          ref={viewfinderRef}
          sx={{
            width: '100%',
            maxWidth: '370px',
            aspectRatio: '4 / 3',
            minHeight: '275px',
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
            }}
          />

          {/* Card Boundary Dashed Frame with 4-Corner L-Brackets */}
          <Box
            sx={{
              position: 'absolute',
              inset: '8px',
              border: '1.5px dashed rgba(255, 255, 255, 0.75)',
              borderRadius: '12px',
              pointerEvents: 'none',
            }}
          >
            {/* Top-Left Corner L Bracket */}
            <Box
              sx={{
                position: 'absolute',
                top: '-2px',
                left: '-2px',
                width: '28px',
                height: '28px',
                borderTop: '4px solid #FF6B00',
                borderLeft: '4px solid #FF6B00',
                borderTopLeftRadius: '12px',
              }}
            />
            {/* Top-Right Corner L Bracket */}
            <Box
              sx={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '28px',
                height: '28px',
                borderTop: '4px solid #FF6B00',
                borderRight: '4px solid #FF6B00',
                borderTopRightRadius: '12px',
              }}
            />
            {/* Bottom-Left Corner L Bracket */}
            <Box
              sx={{
                position: 'absolute',
                bottom: '-2px',
                left: '-2px',
                width: '28px',
                height: '28px',
                borderBottom: '4px solid #FF6B00',
                borderLeft: '4px solid #FF6B00',
                borderBottomLeftRadius: '12px',
              }}
            />
            {/* Bottom-Right Corner L Bracket */}
            <Box
              sx={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '28px',
                height: '28px',
                borderBottom: '4px solid #FF6B00',
                borderRight: '4px solid #FF6B00',
                borderBottomRightRadius: '12px',
              }}
            />
          </Box>
        </Box>

        {/* Camera Permission Alert */}
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

        {/* Scanning Tips Card (Identical to Driver's License) */}
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
            }}
          >
            Para kumuha ng perpektong litrato:
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
            <li>Ilagay ang iyong dokumento sa isang lugar na malinaw at maliwanag.</li>
            <li>Siguraduhing kasya nang buo ang dokumento sa loob ng frame.</li>
            <li>I-tap ang capture area para mag-focus.</li>
            <li>Manatiling hindi gumagalaw at pindutin ang button ng camera.</li>
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
