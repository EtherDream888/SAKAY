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
export function detectCard4Corners(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): { x: number; y: number; width: number; height: number } {
  const fallback = {
    x: Math.max(0, Math.round(width * 0.03)),
    y: Math.max(0, Math.round((height - (width * 0.94) / 1.586) / 2)),
    width: Math.min(width, Math.round(width * 0.94)),
    height: Math.min(height, Math.round((width * 0.94) / 1.586)),
  };

  try {
    const scale = Math.min(1, 500 / Math.max(width, height));
    const sw = Math.round(width * scale);
    const sh = Math.round(height * scale);

    const sCanvas = document.createElement('canvas');
    sCanvas.width = sw;
    sCanvas.height = sh;
    const sCtx = sCanvas.getContext('2d', { willReadFrequently: true });
    if (!sCtx) return fallback;

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
      // Comfort 6% safety margin around corners so all 4 corners are completely preserved
      const padX = Math.round(cW * 0.06);
      const padY = Math.round(cH * 0.06);

      const finalX = Math.max(0, Math.round(minX - padX));
      const finalY = Math.max(0, Math.round(minY - padY));
      const finalW = Math.min(width - finalX, Math.round(cW + padX * 2));
      const finalH = Math.min(height - finalY, Math.round(cH + padY * 2));

      return {
        x: finalX,
        y: finalY,
        width: finalW,
        height: finalH,
      };
    }
  } catch (e) {
    console.warn('[detectCard4Corners] Corner search fallback:', e);
  }

  return fallback;
}

/**
 * Preprocesses license card document (front or back) for optimal OCR extraction:
 * 1. Scans frame to locate the 4 corners of the driver's license ID card.
 * 2. Crops the document containing all 4 corners with a comfortable safety margin.
 * 3. Normalizes portrait/landscape pixel orientation to landscape (ID-1 aspect ratio).
 * 4. Checks 180° text orientation for front side.
 * 5. Applies high-definition image quality enhancement (contrast stretch & unsharp mask).
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

  // 1. Capture full source frame to working canvas for 4-corner scan
  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = srcWidth;
  fullCanvas.height = srcHeight;
  const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: true });
  if (!fullCtx) throw new Error('Full canvas context unavailable');
  fullCtx.drawImage(source, 0, 0, srcWidth, srcHeight);

  // 2. Scan 4 Corners of License Card
  const cornerCrop = detectCard4Corners(fullCtx, srcWidth, srcHeight);

  // 3. Extract Card Pixels (Preserving all 4 corners)
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cornerCrop.width;
  cropCanvas.height = cornerCrop.height;
  const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
  if (!cropCtx) throw new Error('Crop canvas context unavailable');

  cropCtx.drawImage(
    fullCanvas,
    cornerCrop.x,
    cornerCrop.y,
    cornerCrop.width,
    cornerCrop.height,
    0,
    0,
    cornerCrop.width,
    cornerCrop.height
  );

  // 4. Normalize Document Pixel Orientation (Rotate 90° if portrait scan box)
  let workingCanvas = cropCanvas;
  let workW = cornerCrop.width;
  let workH = cornerCrop.height;

  if (workW < workH) {
    const rotCanvas = document.createElement('canvas');
    rotCanvas.width = workH;
    rotCanvas.height = workW;
    const rotCtx = rotCanvas.getContext('2d', { willReadFrequently: true });
    if (rotCtx) {
      rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
      rotCtx.rotate((90 * Math.PI) / 180);
      rotCtx.drawImage(cropCanvas, -workW / 2, -workH / 2);
      workingCanvas = rotCanvas;
      workW = rotCanvas.width;
      workH = rotCanvas.height;
    }
  }

  // 5. Output Clean Resized Document to Standard OCR Resolution (1200 x 756 px)
  const targetAspect = 1.586; // ISO/IEC 7810 ID-1 standard aspect ratio
  const outputWidth = 1200;
  const outputHeight = Math.round(outputWidth / targetAspect);
  const outCanvas = document.createElement('canvas');
  outCanvas.width = outputWidth;
  outCanvas.height = outputHeight;

  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
  if (!outCtx) throw new Error('Output canvas context unavailable');

  outCtx.drawImage(
    workingCanvas,
    0,
    0,
    workW,
    workH,
    0,
    0,
    outputWidth,
    outputHeight
  );

  // 6. Header Edge Density Check for 180° Upside Down Auto-Correction (Front side only)
  // Philippine DL front side has top cyan header bar. Back side has barcode at bottom, so skip auto-flip for back side.
  if (documentSide === 'front') {
    try {
      const imgData = outCtx.getImageData(0, 0, outputWidth, outputHeight);
      const data = imgData.data;
      let topEdgeSum = 0;
      let bottomEdgeSum = 0;
      const topLimit = Math.round(outputHeight * 0.3);
      const bottomStart = Math.round(outputHeight * 0.7);

      for (let y = 1; y < topLimit; y += 2) {
        for (let x = 1; x < outputWidth - 1; x += 2) {
          const idx = (y * outputWidth + x) * 4;
          const mag = Math.abs(data[idx] - data[idx + 4]);
          topEdgeSum += mag;
        }
      }
      for (let y = bottomStart; y < outputHeight - 1; y += 2) {
        for (let x = 1; x < outputWidth - 1; x += 2) {
          const idx = (y * outputWidth + x) * 4;
          const mag = Math.abs(data[idx] - data[idx + 4]);
          bottomEdgeSum += mag;
        }
      }

      if (bottomEdgeSum > topEdgeSum * 1.6) {
        // Upside down front: rotate 180°
        const flipCanvas = document.createElement('canvas');
        flipCanvas.width = outputWidth;
        flipCanvas.height = outputHeight;
        const flipCtx = flipCanvas.getContext('2d');
        if (flipCtx) {
          flipCtx.translate(outputWidth / 2, outputHeight / 2);
          flipCtx.rotate(Math.PI);
          flipCtx.drawImage(outCanvas, -outputWidth / 2, -outputHeight / 2);
          outCtx.clearRect(0, 0, outputWidth, outputHeight);
          outCtx.drawImage(flipCanvas, 0, 0);
        }
      }
    } catch (e) {
      console.warn('[imageEnhancementService] 180-deg orientation check warning:', e);
    }
  }

  // 7. Apply Controlled Document Enhancement Filter for OCR
  try {
    applyControlledEnhancement(outCtx, outputWidth, outputHeight);
  } catch (err) {
    console.warn('[imageEnhancementService] Preprocessing filter warning:', err);
  }

  return outCanvas.toDataURL('image/jpeg', 0.92);
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
