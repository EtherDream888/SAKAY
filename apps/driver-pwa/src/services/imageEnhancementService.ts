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
 * Crops the card region from camera video / image and applies CamScanner-style enhancement
 */
export async function enhanceLicenseDocument(
  source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
  customCrop?: CropDimensions
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

  // 1. Calculate Crop Area strictly to the on-screen card viewfinder (ISO/IEC 7810 ID-1 standard ~ 1.586 ratio)
  const targetAspect = 1.586;
  let cropX = 0;
  let cropY = 0;
  let cropWidth = srcWidth;
  let cropHeight = srcHeight;

  if (customCrop && customCrop.width && customCrop.height) {
    cropX = customCrop.x || 0;
    cropY = customCrop.y || 0;
    cropWidth = customCrop.width;
    cropHeight = customCrop.height;
  } else {
    // Focus bounding rectangle directly matching the on-screen card viewfinder
    const maxWidth = srcWidth * 0.90;
    const maxHeight = srcHeight * 0.90;

    if (maxWidth / targetAspect <= maxHeight) {
      cropWidth = maxWidth;
      cropHeight = maxWidth / targetAspect;
    } else {
      cropHeight = maxHeight;
      cropWidth = maxHeight * targetAspect;
    }

    cropX = Math.round((srcWidth - cropWidth) / 2);
    cropY = Math.round((srcHeight - cropHeight) / 2);
  }

  // 2. Output High-Res Offscreen Canvas (1300 x 820)
  const outputWidth = 1300;
  const outputHeight = Math.round(outputWidth / targetAspect);
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas context unavailable');

  // Draw cropped card area directly (NO unwanted 90 degree rotations)
  ctx.drawImage(
    source,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    outputWidth,
    outputHeight
  );

  // 3. CamScanner-Grade Document Processing
  try {
    applyCamScannerFilter(ctx, outputWidth, outputHeight);
  } catch (err) {
    console.warn('[imageEnhancementService] Filter pipeline warning:', err);
  }

  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * CamScanner Filter:
 * - Normalizes lighting across the card without washing out or blowing out highlights
 * - Deepens text ink and clarifies barcode/letters
 */
function applyCamScannerFilter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const totalPixels = width * height;

  // 1. Histogram analysis
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    hist[lum]++;
  }

  let minVal = 0;
  let maxVal = 255;
  let acc = 0;
  const lowLimit = totalPixels * 0.02;
  const highLimit = totalPixels * 0.98;

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

  // 2. Dynamic range stretch with gentle S-curve (deepens text, keeps card colors natural)
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Normalized 0 to 1
    const normR = Math.max(0, Math.min(1, (r - minVal) / range));
    const normG = Math.max(0, Math.min(1, (g - minVal) / range));
    const normB = Math.max(0, Math.min(1, (b - minVal) / range));

    // Gentle contrast curve: y = x^1.15 for slight deepening of dark text without highlight clipping
    data[i] = Math.round(Math.pow(normR, 1.1) * 255);
    data[i + 1] = Math.round(Math.pow(normG, 1.1) * 255);
    data[i + 2] = Math.round(Math.pow(normB, 1.1) * 255);
  }

  ctx.putImageData(imgData, 0, 0);

  // 3. Apply Unsharp Masking
  applyUnsharpMask(ctx, width, height);
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
