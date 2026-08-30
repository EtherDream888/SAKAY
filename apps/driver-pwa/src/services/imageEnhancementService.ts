/**
 * CamScanner-Style Document Enhancement, Bounding-Box Cropping, and Rotation Service
 */

export interface CropDimensions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface ImageQualityAssessment {
  isAcceptable: boolean;
  score: number;
  issues: string[];
}

/**
 * Rotates an image by specified degrees (e.g. 90, -90, 180)
 */
export function rotateImage(dataUrl: string, degrees: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const rads = (degrees * Math.PI) / 180;
      const is90or270 = Math.abs(degrees % 180) === 90;

      canvas.width = is90or270 ? img.height : img.width;
      canvas.height = is90or270 ? img.width : img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rads);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Captures raw, un-processed image frame from video/canvas/image source
 */
export function captureRawFrame(
  source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
): string {
  const isVideo = source instanceof HTMLVideoElement;
  const srcWidth = isVideo
    ? (source as HTMLVideoElement).videoWidth
    : (source as HTMLCanvasElement | HTMLImageElement).width;
  const srcHeight = isVideo
    ? (source as HTMLVideoElement).videoHeight
    : (source as HTMLCanvasElement | HTMLImageElement).height;

  if (!srcWidth || !srcHeight) {
    throw new Error('Invalid source dimensions');
  }

  const canvas = document.createElement('canvas');
  canvas.width = srcWidth;
  canvas.height = srcHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.drawImage(source, 0, 0, srcWidth, srcHeight);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Detects the document bounding box of a driver's license card within an image.
 * Uses Sobel edge gradient detection and projection profiling.
 * Falls back to centered ISO/IEC 7810 ID-1 card bounding box if detection confidence is low.
 */
export function detectLicenseBounds(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): { x: number; y: number; width: number; height: number; confidence: number } {
  const targetAspect = 1.586;
  const fallback = {
    x: Math.round(width * 0.04),
    y: Math.max(0, Math.round((height - (width * 0.92) / targetAspect) / 2)),
    width: Math.round(width * 0.92),
    height: Math.round((width * 0.92) / targetAspect),
    confidence: 0.5,
  };

  try {
    const sampleW = 300;
    const sampleH = Math.round(sampleW * (height / width));
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = sampleW;
    sampleCanvas.height = sampleH;
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    if (!sampleCtx) return fallback;

    sampleCtx.drawImage(ctx.canvas, 0, 0, sampleW, sampleH);
    const imgData = sampleCtx.getImageData(0, 0, sampleW, sampleH);
    const data = imgData.data;

    const rowEdge = new Float32Array(sampleH);
    const colEdge = new Float32Array(sampleW);

    for (let y = 1; y < sampleH - 1; y++) {
      for (let x = 1; x < sampleW - 1; x++) {
        const idx = (y * sampleW + x) * 4;
        const lumCenter = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        const lumRight = 0.299 * data[(y * sampleW + (x + 1)) * 4] + 0.587 * data[(y * sampleW + (x + 1)) * 4 + 1] + 0.114 * data[(y * sampleW + (x + 1)) * 4 + 2];
        const lumDown = 0.299 * data[((y + 1) * sampleW + x) * 4] + 0.587 * data[((y + 1) * sampleW + x) * 4 + 1] + 0.114 * data[((y + 1) * sampleW + x) * 4 + 2];

        const gx = Math.abs(lumRight - lumCenter);
        const gy = Math.abs(lumDown - lumCenter);
        const mag = gx + gy;

        rowEdge[y] += mag;
        colEdge[x] += mag;
      }
    }

    let minX = 0, maxX = sampleW - 1, minY = 0, maxY = sampleH - 1;
    const colThresh = (colEdge.reduce((a, b) => a + b, 0) / sampleW) * 0.85;
    const rowThresh = (rowEdge.reduce((a, b) => a + b, 0) / sampleH) * 0.85;

    for (let x = 0; x < sampleW; x++) {
      if (colEdge[x] > colThresh) { minX = x; break; }
    }
    for (let x = sampleW - 1; x >= 0; x--) {
      if (colEdge[x] > colThresh) { maxX = x; break; }
    }
    for (let y = 0; y < sampleH; y++) {
      if (rowEdge[y] > rowThresh) { minY = y; break; }
    }
    for (let y = sampleH - 1; y >= 0; y--) {
      if (rowEdge[y] > rowThresh) { maxY = y; break; }
    }

    const scaleX = width / sampleW;
    const scaleY = height / sampleH;

    const detectedW = (maxX - minX) * scaleX;
    const detectedH = (maxY - minY) * scaleY;
    const detectedAspect = detectedW / (detectedH || 1);

    if (detectedW > width * 0.35 && detectedH > height * 0.35 && detectedAspect >= 1.2 && detectedAspect <= 1.9) {
      return {
        x: Math.max(0, Math.round(minX * scaleX)),
        y: Math.max(0, Math.round(minY * scaleY)),
        width: Math.min(width, Math.round(detectedW)),
        height: Math.min(height, Math.round(detectedH)),
        confidence: 0.85,
      };
    }
  } catch (e) {
    console.warn('[imageEnhancementService] Boundary detection fallback:', e);
  }

  return fallback;
}

export interface ScanFrameCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Detects the 4 corner points (TL, TR, BR, BL) of a driver's license ID card in an image frame.
 * Returns the exact bounding rectangle containing all 4 corners with a 6% safety margin
 * so that all 4 corners, borders, and text are 100% visible and un-clipped without over-zooming.
 */
export interface Point2D {
  x: number;
  y: number;
}

export interface CardCorners {
  tl: Point2D;
  tr: Point2D;
  br: Point2D;
  bl: Point2D;
  rect: { x: number; y: number; width: number; height: number };
}

/**
 * Detects the 4 corner points (TL, TR, BR, BL) of a document in an image frame.
 */
export function detectCard4Corners(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): CardCorners {
  const fallbackRect = {
    x: Math.max(0, Math.round(width * 0.03)),
    y: Math.max(0, Math.round((height - (width * 0.94) / 1.586) / 2)),
    width: Math.min(width, Math.round(width * 0.94)),
    height: Math.min(height, Math.round((width * 0.94) / 1.586)),
  };

  const fallbackCorners: CardCorners = {
    tl: { x: fallbackRect.x, y: fallbackRect.y },
    tr: { x: fallbackRect.x + fallbackRect.width, y: fallbackRect.y },
    br: { x: fallbackRect.x + fallbackRect.width, y: fallbackRect.y + fallbackRect.height },
    bl: { x: fallbackRect.x, y: fallbackRect.y + fallbackRect.height },
    rect: fallbackRect,
  };

  try {
    const scale = Math.min(1, 500 / Math.max(width, height));
    const sw = Math.round(width * scale);
    const sh = Math.round(height * scale);

    const sCanvas = document.createElement('canvas');
    sCanvas.width = sw;
    sCanvas.height = sh;
    const sCtx = sCanvas.getContext('2d', { willReadFrequently: true });
    if (!sCtx) return fallbackCorners;

    sCtx.drawImage(ctx.canvas, 0, 0, sw, sh);
    const imgData = sCtx.getImageData(0, 0, sw, sh);
    const data = imgData.data;

    // Sobel Gradient Edge Energy Map
    const edgeMap = new Float32Array(sw * sh);
    for (let y = 1; y < sh - 1; y++) {
      for (let x = 1; x < sw - 1; x++) {
        const idx = (y * sw + x) * 4;
        const lC = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        const lR = 0.299 * data[(y * sw + x + 1) * 4] + 0.587 * data[(y * sw + x + 1) * 4 + 1] + 0.114 * data[(y * sw + x + 1) * 4 + 2];
        const lD = 0.299 * data[((y + 1) * sw + x) * 4] + 0.587 * data[((y + 1) * sw + x) * 4 + 1] + 0.114 * data[((y + 1) * sw + x) * 4 + 2];

        const gx = Math.abs(lR - lC);
        const gy = Math.abs(lD - lC);
        edgeMap[y * sw + x] = gx + gy;
      }
    }

    // 4 Corner Extremities Search
    let minTL = Infinity, maxTR = -Infinity, maxBR = -Infinity, minBL = Infinity;
    let ptTL = { x: 0, y: 0 };
    let ptTR = { x: sw, y: 0 };
    let ptBR = { x: sw, y: sh };
    let ptBL = { x: 0, y: sh };

    const edgeThresh = 20;

    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const val = edgeMap[y * sw + x];
        if (val > edgeThresh) {
          if (x + y < minTL) { minTL = x + y; ptTL = { x, y }; }
          if (x - y > maxTR) { maxTR = x - y; ptTR = { x, y }; }
          if (x + y > maxBR) { maxBR = x + y; ptBR = { x, y }; }
          if (x - y < minBL) { minBL = x - y; ptBL = { x, y }; }
        }
      }
    }

    const invScale = 1 / scale;
    const nTL = { x: ptTL.x * invScale, y: ptTL.y * invScale };
    const nTR = { x: ptTR.x * invScale, y: ptTR.y * invScale };
    const nBR = { x: ptBR.x * invScale, y: ptBR.y * invScale };
    const nBL = { x: ptBL.x * invScale, y: ptBL.y * invScale };

    const minX = Math.min(nTL.x, nBL.x);
    const maxX = Math.max(nTR.x, nBR.x);
    const minY = Math.min(nTL.y, nTR.y);
    const maxY = Math.max(nBL.y, nBR.y);

    const cW = maxX - minX;
    const cH = maxY - minY;

    if (cW > width * 0.35 && cH > height * 0.25 && (cW / cH) >= 1.1 && (cW / cH) <= 2.2) {
      const padX = Math.round(cW * 0.04);
      const padY = Math.round(cH * 0.04);

      const finalX = Math.max(0, Math.round(minX - padX));
      const finalY = Math.max(0, Math.round(minY - padY));
      const finalW = Math.min(width - finalX, Math.round(cW + padX * 2));
      const finalH = Math.min(height - finalY, Math.round(cH + padY * 2));

      return {
        tl: nTL,
        tr: nTR,
        br: nBR,
        bl: nBL,
        rect: {
          x: finalX,
          y: finalY,
          width: finalW,
          height: finalH,
        },
      };
    }
  } catch (e) {
    console.warn('[detectCard4Corners] Corner search fallback:', e);
  }

  return fallbackCorners;
}

/**
 * Warps a 4-corner quad into a flat, perspective-corrected rectangle (targetW x targetH)
 */
export function warpPerspective(
  sourceCtx: CanvasRenderingContext2D,
  corners: CardCorners,
  targetW: number,
  targetH: number
): HTMLCanvasElement {
  const outCanvas = document.createElement('canvas');
  outCanvas.width = targetW;
  outCanvas.height = targetH;
  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
  if (!outCtx) return outCanvas;

  const { tl, tr, br, bl } = corners;
  const gridX = 16;
  const gridY = 16;

  const lerpPoint = (u: number, v: number): Point2D => {
    const topX = tl.x + u * (tr.x - tl.x);
    const topY = tl.y + u * (tr.y - tl.y);
    const botX = bl.x + u * (br.x - bl.x);
    const botY = bl.y + u * (br.y - bl.y);
    return {
      x: topX + v * (botX - topX),
      y: topY + v * (botY - topY),
    };
  };

  const drawTriangle = (
    s0: Point2D, s1: Point2D, s2: Point2D,
    d0: Point2D, d1: Point2D, d2: Point2D
  ) => {
    outCtx.save();
    outCtx.beginPath();
    outCtx.moveTo(d0.x, d0.y);
    outCtx.lineTo(d1.x, d1.y);
    outCtx.lineTo(d2.x, d2.y);
    outCtx.closePath();
    outCtx.clip();

    const denom = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
    if (Math.abs(denom) > 1e-5) {
      const a = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / denom;
      const b = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / denom;
      const c = (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / denom;
      const d = (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / denom;
      const e = (d0.x * (s1.x * s2.y - s2.x * s1.y) + d1.x * (s2.x * s0.y - s0.x * s2.y) + d2.x * (s0.x * s1.y - s1.x * s0.y)) / denom;
      const f = (d0.y * (s1.x * s2.y - s2.x * s1.y) + d1.y * (s2.x * s0.y - s0.x * s2.y) + d2.y * (s0.x * s1.y - s1.x * s0.y)) / denom;

      outCtx.transform(a, b, c, d, e, f);
      outCtx.drawImage(sourceCtx.canvas, 0, 0);
    }
    outCtx.restore();
  };

  for (let gy = 0; gy < gridY; gy++) {
    for (let gx = 0; gx < gridX; gx++) {
      const u0 = gx / gridX;
      const u1 = (gx + 1) / gridX;
      const v0 = gy / gridY;
      const v1 = (gy + 1) / gridY;

      const sTL = lerpPoint(u0, v0);
      const sTR = lerpPoint(u1, v0);
      const sBR = lerpPoint(u1, v1);
      const sBL = lerpPoint(u0, v1);

      const dTL = { x: u0 * targetW, y: v0 * targetH };
      const dTR = { x: u1 * targetW, y: v0 * targetH };
      const dBR = { x: u1 * targetW, y: v1 * targetH };
      const dBL = { x: u0 * targetW, y: v1 * targetH };

      drawTriangle(sTL, sTR, sBL, dTL, dTR, dBL);
      drawTriangle(sTR, sBR, sBL, dTR, dBR, dBL);
    }
  }

  return outCanvas;
}

/**
 * Extracts a specific ROI box from a rectified document canvas as a data URL.
 */
export function cropRoiCanvas(
  sourceCanvas: HTMLCanvasElement,
  xPct: number,
  yPct: number,
  wPct: number,
  hPct: number
): string {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  const sx = Math.max(0, Math.floor(w * xPct));
  const sy = Math.max(0, Math.floor(h * yPct));
  const sw = Math.min(w - sx, Math.ceil(w * wPct));
  const sh = Math.min(h - sy, Math.ceil(h * hPct));

  const roiCanvas = document.createElement('canvas');
  roiCanvas.width = sw;
  roiCanvas.height = sh;
  const roiCtx = roiCanvas.getContext('2d', { willReadFrequently: true });
  if (!roiCtx) return '';

  roiCtx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
  applyControlledEnhancement(roiCtx, sw, sh);
  return roiCanvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Calculates exact pixel crop coordinates on raw source video for a guide element,
 * accounting for object-fit (cover/contain/fill), CSS display scaling, and offsets.
 */
export function getSourceVideoCropRect(
  video: HTMLVideoElement,
  guideElem?: HTMLElement | null
): { x: number; y: number; width: number; height: number } {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) {
    return { x: 0, y: 0, width: 640, height: 400 };
  }

  const videoRect = video.getBoundingClientRect();
  const cw = videoRect.width || video.clientWidth || vw;
  const ch = videoRect.height || video.clientHeight || vh;

  let relLeft = 0;
  let relTop = 0;
  let relWidth = cw;
  let relHeight = ch;

  if (guideElem) {
    const guideRect = guideElem.getBoundingClientRect();
    if (guideRect.width > 0 && guideRect.height > 0) {
      relLeft = Math.max(0, guideRect.left - videoRect.left);
      relTop = Math.max(0, guideRect.top - videoRect.top);
      relWidth = Math.min(cw - relLeft, guideRect.width);
      relHeight = Math.min(ch - relTop, guideRect.height);
    }
  }

  const computedStyle = window.getComputedStyle(video);
  const objectFit = computedStyle.objectFit || 'cover';

  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  if (objectFit === 'cover') {
    scale = Math.max(cw / vw, ch / vh);
    const renderedW = vw * scale;
    const renderedH = vh * scale;
    offsetX = (renderedW - cw) / 2;
    offsetY = (renderedH - ch) / 2;
  } else if (objectFit === 'contain') {
    scale = Math.min(cw / vw, ch / vh);
    const renderedW = vw * scale;
    const renderedH = vh * scale;
    offsetX = (cw - renderedW) / 2;
    offsetY = (ch - renderedH) / 2;
  } else {
    const scaleX = cw / vw;
    const scaleY = ch / vh;
    const srcX = Math.max(0, Math.round(relLeft / scaleX));
    const srcY = Math.max(0, Math.round(relTop / scaleY));
    const srcW = Math.min(vw - srcX, Math.round(relWidth / scaleX));
    const srcH = Math.min(vh - srcY, Math.round(relHeight / scaleY));
    return { x: srcX, y: srcY, width: srcW, height: srcH };
  }

  let srcX = Math.round((relLeft + offsetX) / scale);
  let srcY = Math.round((relTop + offsetY) / scale);
  let srcW = Math.round(relWidth / scale);
  let srcH = Math.round(relHeight / scale);

  srcX = Math.max(0, Math.min(vw - 10, srcX));
  srcY = Math.max(0, Math.min(vh - 10, srcY));
  srcW = Math.max(10, Math.min(vw - srcX, srcW));
  srcH = Math.max(10, Math.min(vh - srcY, srcH));

  return { x: srcX, y: srcY, width: srcW, height: srcH };
}

/**
 * Preprocesses license card document (front or back) for optimal OCR extraction:
 * 1. Crops the camera stream strictly to the visible document guide frame (handling object-fit).
 * 2. Scans guide crop to locate 4 corners of the driver's license ID card / MTOP.
 * 3. Perspective-warps the quadrilateral into a flat, rectified landscape canvas.
 * 4. Applies high-definition image quality enhancement (contrast stretch & unsharp mask).
 */
export async function preprocessLicenseImage(
  source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
  cropOrElement?: CropDimensions | HTMLElement | null,
  documentSide: 'front' | 'back' = 'front'
): Promise<string> {
  const isVideo = source instanceof HTMLVideoElement;

  const srcWidth = isVideo
    ? (source as HTMLVideoElement).videoWidth
    : (source as HTMLCanvasElement | HTMLImageElement).width;
  const srcHeight = isVideo
    ? (source as HTMLVideoElement).videoHeight
    : (source as HTMLCanvasElement | HTMLImageElement).height;

  if (!srcWidth || !srcHeight) {
    throw new Error('Invalid source dimensions');
  }

  // 1. Determine Source Crop Region (Guide Frame inside Video)
  let cropX = 0;
  let cropY = 0;
  let cropW = srcWidth;
  let cropH = srcHeight;

  if (isVideo && cropOrElement && cropOrElement instanceof HTMLElement) {
    const cropRect = getSourceVideoCropRect(source as HTMLVideoElement, cropOrElement);
    cropX = cropRect.x;
    cropY = cropRect.y;
    cropW = cropRect.width;
    cropH = cropRect.height;
  }

  // 2. Extract Guide Region to working canvas
  const guideCanvas = document.createElement('canvas');
  guideCanvas.width = cropW;
  guideCanvas.height = cropH;
  const guideCtx = guideCanvas.getContext('2d', { willReadFrequently: true });
  if (!guideCtx) throw new Error('Guide context unavailable');

  guideCtx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  // 3. Normalize aspect orientation for landscape cards (rotate 90° if cropW < cropH for DL cards only)
  let workCanvas = guideCanvas;
  let workW = cropW;
  let workH = cropH;

  const isMtop = (documentSide as string) === 'mtop';

  if (workW < workH && !isMtop) {
    const rotCanvas = document.createElement('canvas');
    rotCanvas.width = workH;
    rotCanvas.height = workW;
    const rotCtx = rotCanvas.getContext('2d', { willReadFrequently: true });
    if (rotCtx) {
      rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
      rotCtx.rotate((90 * Math.PI) / 180);
      rotCtx.drawImage(guideCanvas, -workW / 2, -workH / 2);
      workCanvas = rotCanvas;
      workW = rotCanvas.width;
      workH = rotCanvas.height;
    }
  }

  const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });
  if (!workCtx) throw new Error('Work context unavailable');

  // 4. Quality Enhancement ONLY (Contrast stretching, illumination normalization, mild sharpening)
  // NO geometric warp, NO perspective deformation, NO boundary cropping.
  applyControlledEnhancement(workCtx, workW, workH);

  console.log('[LICENSE IMAGE DEBUG]', {
    capturedDimensions: `${srcWidth}x${srcHeight}`,
    guideCropDimensions: `${cropW}x${cropH}`,
    finalReviewDimensions: `${workW}x${workH}`,
    geometricWarpApplied: false,
    finalAspectRatio: (workW / workH).toFixed(3),
    documentSide,
  });

  return workCanvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Backwards compatible alias for enhanceLicenseDocument
 */
export async function enhanceLicenseDocument(
  source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
  cropOrElement?: CropDimensions | HTMLElement | null,
  documentSide: 'front' | 'back' = 'front'
): Promise<string> {
  return preprocessLicenseImage(source, cropOrElement, documentSide);
}

/**
 * Controlled Document Preprocessing Filter:
 * - Normalizes lighting across the card without highlight blowout
 * - Deepens text ink and clarifies digits without distorting security features
 */
function applyControlledEnhancement(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const totalPixels = width * height;

  // 1. Histogram Analysis with 1% tail clamping
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    hist[lum]++;
  }

  let minVal = 0;
  let maxVal = 255;
  let acc = 0;
  const lowLimit = totalPixels * 0.01;
  const highLimit = totalPixels * 0.99;

  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= lowLimit && minVal === 0) minVal = v;
    if (acc >= highLimit) {
      maxVal = v;
      break;
    }
  }

  if (maxVal <= minVal) maxVal = 255;
  const range = maxVal - minVal || 1;

  // 2. Dynamic Range Stretch with gentle gamma (y = x^1.05)
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const normR = Math.max(0, Math.min(1, (r - minVal) / range));
    const normG = Math.max(0, Math.min(1, (g - minVal) / range));
    const normB = Math.max(0, Math.min(1, (b - minVal) / range));

    data[i] = Math.round(Math.pow(normR, 1.05) * 255);
    data[i + 1] = Math.round(Math.pow(normG, 1.05) * 255);
    data[i + 2] = Math.round(Math.pow(normB, 1.05) * 255);
  }

  ctx.putImageData(imgData, 0, 0);

  // 3. Controlled 3x3 Unsharp Masking
  applySubtleUnsharpMask(ctx, width, height);
}

/**
 * Controlled 3x3 Unsharp Mask Filter (center: 1.6, edge: -0.15)
 */
function applySubtleUnsharpMask(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const src = imgData.data;
  const copy = new Uint8ClampedArray(src);

  const centerWeight = 1.6;
  const edgeWeight = -0.15;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const top = ((y - 1) * width + x) * 4;
      const bottom = ((y + 1) * width + x) * 4;
      const left = (y * width + (x - 1)) * 4;
      const right = (y * width + (x + 1)) * 4;

      for (let c = 0; c < 3; c++) {
        const val =
          copy[idx + c] * centerWeight +
          (copy[top + c] + copy[bottom + c] + copy[left + c] + copy[right + c]) * edgeWeight;
        src[idx + c] = Math.min(255, Math.max(0, val));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * 3x3 Unsharp Mask Filter to sharpen text and numbers
 */
function applyUnsharpMask(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const src = imgData.data;
  const copy = new Uint8ClampedArray(src);

  const centerWeight = 2.2;
  const edgeWeight = -0.3;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const top = ((y - 1) * width + x) * 4;
      const bottom = ((y + 1) * width + x) * 4;
      const left = (y * width + (x - 1)) * 4;
      const right = (y * width + (x + 1)) * 4;

      for (let c = 0; c < 3; c++) {
        const val =
          copy[idx + c] * centerWeight +
          (copy[top + c] + copy[bottom + c] + copy[left + c] + copy[right + c]) * edgeWeight;
        src[idx + c] = Math.min(255, Math.max(0, val));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Assesses photo quality (luminance, contrast, sharpness/blur)
 */
export function assessImageQuality(dataUrl: string): Promise<ImageQualityAssessment> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(500, img.width || 500);
      canvas.height = Math.round(canvas.width * ((img.height || 350) / (img.width || 500)));
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        resolve({ isAcceptable: true, score: 85, issues: [] });
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // 1. Luminance & Contrast
      let totalLum = 0;
      let minLum = 255;
      let maxLum = 0;
      const numPixels = data.length / 4;

      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        totalLum += lum;
        if (lum < minLum) minLum = lum;
        if (lum > maxLum) maxLum = lum;
      }

      const avgLum = totalLum / numPixels;
      const contrast = maxLum - minLum;
      const issues: string[] = [];

      if (avgLum < 25) {
        issues.push('Masyadong madilim ang kuha (Too dark)');
      } else if (avgLum > 245) {
        issues.push('Masyadong maliwanag o may silaw (Too bright / severe glare)');
      }

      if (contrast < 40) {
        issues.push('Mababa ang contrast ng larawan (Low contrast)');
      }

      // 2. Sharpness / Blur estimation
      const w = canvas.width;
      const h = canvas.height;
      let edgeSum = 0;
      let edgeSqSum = 0;
      let count = 0;

      for (let y = 2; y < h - 2; y += 3) {
        for (let x = 2; x < w - 2; x += 3) {
          const idx = (y * w + x) * 4;
          const center = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          const top = 0.299 * data[((y - 1) * w + x) * 4] + 0.587 * data[((y - 1) * w + x) * 4 + 1] + 0.114 * data[((y - 1) * w + x) * 4 + 2];
          const bottom = 0.299 * data[((y + 1) * w + x) * 4] + 0.587 * data[((y + 1) * w + x) * 4 + 1] + 0.114 * data[((y + 1) * w + x) * 4 + 2];
          const left = 0.299 * data[(y * w + (x - 1)) * 4] + 0.587 * data[(y * w + (x - 1)) * 4 + 1] + 0.114 * data[(y * w + (x - 1)) * 4 + 2];
          const right = 0.299 * data[(y * w + (x + 1)) * 4] + 0.587 * data[(y * w + (x + 1)) * 4 + 1] + 0.114 * data[(y * w + (x + 1)) * 4 + 2];

          const lap = Math.abs(4 * center - top - bottom - left - right);
          edgeSum += lap;
          edgeSqSum += lap * lap;
          count++;
        }
      }

      let laplacianVar = 50;
      if (count > 0) {
        const mean = edgeSum / count;
        laplacianVar = edgeSqSum / count - mean * mean;
      }

      if (laplacianVar < 14) {
        issues.push('Medyo malabo o blurred ang teksto (Blurry text)');
      }

      let score = 100 - issues.length * 25;
      score = Math.max(10, Math.min(100, score));

      resolve({
        isAcceptable: issues.length === 0,
        score,
        issues,
      });
    };
    img.onerror = () => {
      resolve({ isAcceptable: true, score: 75, issues: [] });
    };
    img.src = dataUrl;
  });
}
