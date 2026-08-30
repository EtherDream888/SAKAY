import { createWorker } from 'tesseract.js';
import type { MtopExtractedData } from './driverOnboardingCache';
import { cropRoiCanvas } from './imageEnhancementService';
import { formatDateToMmDdYyyy } from './licenseOcrService';

export interface OcrProgressCallback {
  (progress: number, status: string): void;
}

export interface MtopOcrExtractionResult {
  data: MtopExtractedData;
  isSuccessful: boolean;
  confidenceScore: number;
  missingFields: string[];
}

/**
 * 1. Operator Name Parser
 */
export function parseMtopOperator(text: string): string {
  if (!text) return '';
  const match = text.match(/Granted\s+to\s+([A-Za-z\s,.-]+?)(?=,|\s+residing|\s+to\s+operate|$)/i) ||
    text.match(/(?:Owner|Operator|Granted\s+to)[:\s]*([A-Za-z\s,.-]{5,40})/i);

  if (match) {
    let name = match[1].replace(/residing.*/i, '').replace(/to\s+operate.*/i, '').trim();
    if (name.length > 4 && !name.toLowerCase().includes('republic') && !name.toLowerCase().includes('permit')) {
      return name.toUpperCase();
    }
  }
  return '';
}

/**
 * 2. Franchise Number Parser
 */
export function parseMtopFranchiseNumber(text: string): string {
  if (!text) return '';
  const match = text.match(/Franchise\s*(?:No\.?|#)?[:\s]*([A-Z0-9-]{3,15})/i) ||
    text.match(/(?:Permit|MTOP)\s*(?:No\.?|#)?[:\s]*([A-Z0-9-]{3,15})/i) ||
    text.match(/\b(\d{3,6})\b/);

  if (match) {
    const num = match[1].trim();
    if (/^[A-Z0-9-]{3,12}$/.test(num)) {
      return num;
    }
  }
  return '';
}

/**
 * 3. Make Parser
 */
export function parseMtopMake(text: string): string {
  if (!text) return '';
  const match = text.match(/\b(YAMAHA|HONDA|KAWASAKI|SUZUKI|BAJAJ|TVS|SYM|RUSI)\b/i);
  if (match) {
    return match[1].toUpperCase();
  }
  return '';
}

/**
 * 4. Motor Number Parser
 */
export function parseMtopMotorNumber(text: string): string {
  if (!text) return '';
  const match = text.match(/(?:MOTOR|ENGINE)\s*(?:NO\.?|#)?[:\s]*([A-Z0-9]{6,18})/i) ||
    text.match(/\b([A-Z0-9]{6,18})\b/);

  if (match) {
    const res = match[1].trim();
    if (res.length >= 6 && /[0-9]/.test(res)) {
      return res;
    }
  }
  return '';
}

/**
 * 5. Chassis Number Parser
 */
export function parseMtopChassisNumber(text: string): string {
  if (!text) return '';
  const match = text.match(/CHASSIS\s*(?:NO\.?|#)?[:\s]*([A-Z0-9]{8,20})/i) ||
    text.match(/\b([A-Z0-9]{10,20})\b/);

  if (match) {
    const res = match[1].trim();
    if (res.length >= 8 && /[0-9]/.test(res)) {
      return res;
    }
  }
  return '';
}

/**
 * 6. Plate Number Parser
 */
export function parseMtopPlateNumber(text: string): string {
  if (!text) return '';
  const match = text.match(/PLATE\s*(?:NO\.?|#)?[:\s]*([A-Z0-9\s-]{4,10})/i) ||
    text.match(/\b([A-Z]{2,3}\s*\d{3,4})\b/i);

  if (match) {
    const res = match[1].trim();
    if (res.length >= 4) {
      return res.toUpperCase();
    }
  }
  return '';
}

/**
 * 7. Expiration Date Parser (Extracts END DATE of validity statement -> MM-DD-YYYY)
 */
export function parseMtopExpiration(text: string): string {
  if (!text) return '';

  // E.g. "Valid only from January 1 to December 31, 2026"
  const endMatch = text.match(/to\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i) ||
    text.match(/(?:Expiration|Expiry|Valid\s+until)[:\s]*([A-Za-z0-9,\s-]{8,25})/i) ||
    text.match(/(\d{4}[-/.]\d{2}[-/.]\d{2})/) ||
    text.match(/([A-Za-z]+\s+\d{1,2},?\s+\d{4})/);

  if (endMatch) {
    const rawDateStr = endMatch[1].trim();
    const d = new Date(rawDateStr);
    if (!isNaN(d.getTime())) {
      const iso = d.toISOString().split('T')[0];
      return formatDateToMmDdYyyy(iso);
    }
  }
  return '';
}

/**
 * 8. OR Number Parser
 */
export function parseMtopOrNumber(text: string): string {
  if (!text) return '';
  const match = text.match(/(?:OR|Official\s*Receipt)\s*(?:Number|No\.?|#)?[:\s]*([A-Z0-9-]{5,15})/i);
  if (match) {
    const num = match[1].trim();
    if (/^\d{5,12}$/.test(num)) {
      return num;
    }
  }
  return '';
}

/**
 * 9. Authorized Route / Zone Parser
 */
export function parseMtopAuthorizedRoute(text: string): string {
  if (!text) return '';
  const match = text.match(/(?:within\s+the\s+jurisdiction\s+of|jurisdiction\s+of|Route|Zone)[:\s]*([A-Za-z0-9\s,.-]{6,60})/i) ||
    text.match(/jurisdiction\s+of\s+the\s+([A-Za-z0-9\s,.-]{6,60})/i);

  if (match) {
    let route = match[1].replace(/under\s+OR.*/i, '').replace(/Subject\s+to.*/i, '').trim();
    // Trim trailing punctuation or legal prefixes
    route = route.replace(/^the\s+/i, '').replace(/\.$/, '').trim();
    if (route.length > 5 && !route.toLowerCase().includes('granted to')) {
      return route;
    }
  }
  return '';
}

/**
 * Executes Field-by-Field ROI OCR on captured MTOP permit image
 */
export async function parseMtopImage(
  imageDataUrl: string,
  onProgress?: OcrProgressCallback
): Promise<MtopOcrExtractionResult> {
  let worker: any = null;

  let operatorName = '';
  let franchiseNumber = '';
  let plateNumber = '';
  let chassisNumber = '';
  let vehicleMake = '';
  let motorNumber = '';
  let orNumber = '';
  let expirationDate = '';
  let authorizedRoute = '';
  let rawText = '';

  try {
    onProgress?.(10, 'Inihahanda ang OCR engine...');
    worker = await createWorker('eng');

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load MTOP image'));
      img.src = imageDataUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width || 1200;
    canvas.height = img.height || 1600;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      onProgress?.(25, 'Binabasa ang numero ng prangkisa...');
      // Top Right Franchise No ROI
      const franRoi = cropRoiCanvas(canvas, 0.60, 0.20, 0.38, 0.12);
      if (franRoi) {
        const franRes = await worker.recognize(franRoi);
        rawText += `\n--- FRANCHISE ROI ---\n${franRes.data.text}\n`;
        franchiseNumber = parseMtopFranchiseNumber(franRes.data.text);

        console.log('[LICENSE OCR DEBUG]', {
          field: 'MTOP_FRANCHISE_NUMBER',
          region: 'x=0.60, y=0.20, w=0.38, h=0.12',
          raw: franRes.data.text.trim(),
          cleaned: franchiseNumber,
          final: franchiseNumber,
          confidence: franRes.data.confidence,
        });
      }

      onProgress?.(45, 'Binabasa ang May-ari at Ruta...');
      // Middle Operator & Jurisdiction Paragraph ROI
      const midRoi = cropRoiCanvas(canvas, 0.05, 0.28, 0.90, 0.18);
      if (midRoi) {
        const midRes = await worker.recognize(midRoi);
        rawText += `\n--- OPERATOR & ROUTE ROI ---\n${midRes.data.text}\n`;
        operatorName = parseMtopOperator(midRes.data.text);
        authorizedRoute = parseMtopAuthorizedRoute(midRes.data.text);

        console.log('[LICENSE OCR DEBUG]', {
          field: 'MTOP_OPERATOR_AND_ROUTE',
          region: 'x=0.05, y=0.28, w=0.90, h=0.18',
          raw: midRes.data.text.trim(),
          operatorName,
          authorizedRoute,
          confidence: midRes.data.confidence,
        });
      }

      onProgress?.(65, 'Binabasa ang impormasyon ng sasakyan...');
      // Table Row ROI (Make, Motor, Chassis, Plate)
      const tableRoi = cropRoiCanvas(canvas, 0.05, 0.44, 0.90, 0.20);
      if (tableRoi) {
        const tableRes = await worker.recognize(tableRoi);
        rawText += `\n--- TABLE ROI ---\n${tableRes.data.text}\n`;
        vehicleMake = parseMtopMake(tableRes.data.text);
        motorNumber = parseMtopMotorNumber(tableRes.data.text);
        chassisNumber = parseMtopChassisNumber(tableRes.data.text);
        plateNumber = parseMtopPlateNumber(tableRes.data.text);

        console.log('[LICENSE OCR DEBUG]', {
          field: 'MTOP_VEHICLE_INFO',
          region: 'x=0.05, y=0.44, w=0.90, h=0.20',
          raw: tableRes.data.text.trim(),
          vehicleMake,
          motorNumber,
          chassisNumber,
          plateNumber,
          confidence: tableRes.data.confidence,
        });
      }

      onProgress?.(85, 'Binabasa ang petsa at OR Number...');
      // Bottom Line ROI (Validity & OR Number)
      const botRoi = cropRoiCanvas(canvas, 0.05, 0.64, 0.90, 0.15);
      if (botRoi) {
        const botRes = await worker.recognize(botRoi);
        rawText += `\n--- BOTTOM LINE ROI ---\n${botRes.data.text}\n`;
        expirationDate = parseMtopExpiration(botRes.data.text);
        orNumber = parseMtopOrNumber(botRes.data.text);

        console.log('[LICENSE OCR DEBUG]', {
          field: 'MTOP_VALIDITY_AND_OR',
          region: 'x=0.05, y=0.64, w=0.90, h=0.15',
          raw: botRes.data.text.trim(),
          expirationDate,
          orNumber,
          confidence: botRes.data.confidence,
        });
      }
    }

    onProgress?.(100, 'Kumpleto na ang pagkuha ng impormasyon!');
  } catch (err: any) {
    console.error('[MTOP OCR Error]:', err);
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }

  const parsedData: MtopExtractedData = {
    photoUrl: imageDataUrl,
    operatorName: operatorName || '',
    franchiseNumber: franchiseNumber || '',
    plateNumber: plateNumber || '',
    chassisNumber: chassisNumber || '',
    vehicleMake: vehicleMake || '',
    motorNumber: motorNumber || '',
    orNumber: orNumber || '',
    expirationDate: expirationDate || '',
    authorizedRoute: authorizedRoute || '',
    rawOcrText: rawText,
    scannedAt: new Date().toISOString(),
  };

  const missingFields: string[] = [];
  if (!parsedData.franchiseNumber) missingFields.push('Franchise Number');
  if (!parsedData.operatorName) missingFields.push('Operator Name');

  const confidenceScore = Math.round(((9 - missingFields.length) / 9) * 100);

  return {
    data: parsedData,
    isSuccessful: true,
    confidenceScore,
    missingFields,
  };
}
