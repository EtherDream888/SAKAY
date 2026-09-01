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
  const match = text.match(/Granted\s+to\s+([A-Za-z\s,.-]+?)(?=,|\s+residing|\s+to\s+operate|\s+with|$)/i) ||
    text.match(/(?:Owner|Operator|Granted\s+to|Name\s+of\s+Operator)[:\s]*([A-Za-z\s,.-]{4,45})/i);

  if (match) {
    let name = match[1]
      .replace(/residing.*/i, '')
      .replace(/to\s+operate.*/i, '')
      .replace(/[^A-Za-z\s,.-]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
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
  const match = text.match(/(?:Franchise|Permit|MTOP|Case)\s*(?:No\.?|#)?[:\s]*([A-Z0-9-]{3,15})/i) ||
    text.match(/\b(202[0-9]-\d{3,6})\b/) ||
    text.match(/\b(\d{3,6})\b/);

  if (match) {
    const num = match[1].trim();
    if (/^[A-Z0-9-]{3,15}$/.test(num)) {
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
  const match = text.match(/\b(YAMAHA|HONDA|KAWASAKI|SUZUKI|BAJAJ|TVS|SYM|RUSI|EURO|MOTORSTAR|RATO)\b/i);
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
  const match = text.match(/(?:MOTOR\s*NO\.?|ENGINE\s*NO\.?)[\s\S]{1,40}?([A-Z0-9-]{6,18})/i) ||
    text.match(/(?:MOTOR|ENGINE)\s*(?:NO\.?|#)?[:\s]*([A-Z0-9-]{5,18})/i) ||
    text.match(/\b([A-Z0-9]{2,4}\d{4,10}[A-Z0-9]*)\b/i) ||
    text.match(/\b([A-Z]\d[A-Z]\d{5,10})\b/i);
  if (match) {
    const res = (match[1] || match[0]).trim();
    if (res.length >= 5 && /[0-9]/.test(res)) {
      return res.toUpperCase();
    }
  }
  return '';
}

/**
 * 5. Chassis Number Parser
 */
export function parseMtopChassisNumber(text: string): string {
  if (!text) return '';
  const match = text.match(/(?:CHASSIS\s*NO\.?)[\s\S]{1,40}?([A-Z0-9-]{10,22})/i) ||
    text.match(/CHASSIS\s*(?:NO\.?|#)?[:\s]*([A-Z0-9-]{6,20})/i) ||
    text.match(/\b([A-Z0-9]{12,20})\b/);
  if (match) {
    const res = (match[1] || match[0]).trim();
    if (res.length >= 8 && /[0-9]/.test(res)) {
      return res.toUpperCase();
    }
  }
  return '';
}

/**
 * 6. Plate Number Parser
 */
export function parseMtopPlateNumber(text: string): string {
  if (!text) return '';
  const match = text.match(/(?:PLATE\s*NO\.?)[\s\S]{1,60}?(?:\|\s*)?([A-Z0-9\s-]{4,10})/i) ||
    text.match(/PLATE\s*(?:NO\.?|#)?[:\s]*([A-Z0-9\s-]{4,10})/i) ||
    text.match(/\b([A-Z]{2,3}[-\s]?\d{3,5})\b/i) ||
    text.match(/\b(\d{3,4}[-\s]?[A-Z]{2,3})\b/i);
  if (match) {
    const res = match[1].replace(/^[|\s]+/, '').trim().toUpperCase();
    if (res.length >= 4) {
      return res;
    }
  }
  return '';
}

/**
 * 7. Expiration Date Parser (Extracts END DATE of validity statement -> MM-DD-YYYY)
 */
export function parseMtopExpiration(text: string): string {
  if (!text) return '';

  // 1. Text Month dates: e.g. "to December 31, 2026" or "December 31, 2026"
  const textMonthMatch = text.match(/to\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i) ||
    text.match(/(?:Expiration|Expiry|Valid\s+until|Valid\s+to)[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i) ||
    text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i);

  if (textMonthMatch) {
    const rawDateStr = textMonthMatch[1] || textMonthMatch[0];
    const d = new Date(rawDateStr);
    if (!isNaN(d.getTime())) {
      const iso = d.toISOString().split('T')[0];
      return formatDateToMmDdYyyy(iso);
    }
  }

  // 2. Numeric dates in year range 2024-2040
  const allDates = text.match(/(\d{4}[-/.]\d{2}[-/.]\d{2})|(\d{2}[-/.]\d{2}[-/.]\d{4})/g) || [];
  for (const rawDate of allDates) {
    const formatted = formatDateToMmDdYyyy(rawDate);
    if (formatted) {
      const parts = formatted.split('-');
      const year = parseInt(parts[2], 10);
      if (year >= 2023 && year <= 2040) {
        return formatted;
      }
    }
  }

  return '';
}

/**
 * 8. OR Number Parser
 */
export function parseMtopOrNumber(text: string): string {
  if (!text) return '';
  const match = text.match(/(?:under\s+)?OR\s*(?:Number|No\.?|#)?[:\s]*([A-Z0-9-]{4,15})/i) ||
    text.match(/(?:OR|Official\s*Receipt)\s*(?:Number|No\.?|#)?[:\s]*([A-Z0-9-]{4,15})/i) ||
    text.match(/OR\s*#?\s*(\d{5,12})/i);
  if (match) {
    const num = match[1].replace(/amounting.*/i, '').trim();
    if (/^\d{4,12}$/.test(num)) {
      return num;
    }
  }
  return '';
}

/**
 * 9. Authorized Route / Zone Parser
 */
export function parseMtopAuthorizedRoute(text: string): string {
  if (!text) return 'City of Calapan, Oriental Mindoro';
  const match = text.match(/within\s+the\s+jurisdiction\s+of\s+([A-Za-z0-9\s,.-]+?)(?=\.|\s+Subject|\s+under|$)/i) ||
    text.match(/jurisdiction\s+of\s+([A-Za-z0-9\s,.-]+?)(?=\.|\s+Subject|\s+under|$)/i) ||
    text.match(/(?:Route|Zone)[:\s]*([A-Za-z0-9\s,.-]{6,60})/i);

  if (match) {
    let route = match[1]
      .replace(/under\s+OR.*/i, '')
      .replace(/Subject\s+to.*/i, '')
      .replace(/^the\s+/i, '')
      .replace(/\.$/, '')
      .trim();
    if (route.length > 4 && !route.toLowerCase().includes('granted to')) {
      return route;
    }
  }
  return 'City of Calapan, Oriental Mindoro';
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

      // STEP 1: Full-document sparse semantic pass (PSM 11 extracts all text including watermark-covered table cells)
      onProgress?.(30, 'Binabasa ang buong MTOP permit...');
      await worker.setParameters({
        tessedit_pageseg_mode: '11' as any,
        tessedit_char_whitelist: '',
      });
      const fullRes = await worker.recognize(canvas);
      const fullTxt = fullRes.data.text;
      rawText += `\n--- FULL MTOP PASS (PSM 11) ---\n${fullTxt}\n`;

      franchiseNumber = parseMtopFranchiseNumber(fullTxt);
      operatorName = parseMtopOperator(fullTxt);
      plateNumber = parseMtopPlateNumber(fullTxt);
      vehicleMake = parseMtopMake(fullTxt);
      motorNumber = parseMtopMotorNumber(fullTxt);
      chassisNumber = parseMtopChassisNumber(fullTxt);
      expirationDate = parseMtopExpiration(fullTxt);
      orNumber = parseMtopOrNumber(fullTxt);
      authorizedRoute = parseMtopAuthorizedRoute(fullTxt);

      // STEP 1.5: If any key field missing, run standard PSM 3 pass
      if (!operatorName || !franchiseNumber || !expirationDate) {
        await worker.setParameters({
          tessedit_pageseg_mode: '3' as any,
          tessedit_char_whitelist: '',
        });
        const psm3Res = await worker.recognize(canvas);
        const psm3Txt = psm3Res.data.text;
        rawText += `\n--- FULL MTOP PASS (PSM 3) ---\n${psm3Txt}\n`;

        if (!operatorName) operatorName = parseMtopOperator(psm3Txt);
        if (!franchiseNumber) franchiseNumber = parseMtopFranchiseNumber(psm3Txt);
        if (!plateNumber) plateNumber = parseMtopPlateNumber(psm3Txt);
        if (!vehicleMake) vehicleMake = parseMtopMake(psm3Txt);
        if (!motorNumber) motorNumber = parseMtopMotorNumber(psm3Txt);
        if (!chassisNumber) chassisNumber = parseMtopChassisNumber(psm3Txt);
        if (!expirationDate) expirationDate = parseMtopExpiration(psm3Txt);
        if (!orNumber) orNumber = parseMtopOrNumber(psm3Txt);
      }

      // STEP 2: Targeted Field Refinements
      onProgress?.(55, 'Pinapahusay ang numero ng prangkisa...');
      if (!franchiseNumber) {
        const franRoi = cropRoiCanvas(canvas, 0.55, 0.15, 0.44, 0.16);
        if (franRoi) {
          await worker.setParameters({ tessedit_pageseg_mode: '7' as any, tessedit_char_whitelist: '0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ' });
          const franRes = await worker.recognize(franRoi);
          rawText += `\n--- FRANCHISE ROI ---\n${franRes.data.text}\n`;
          const pFran = parseMtopFranchiseNumber(franRes.data.text);
          if (pFran) franchiseNumber = pFran;
        }
      }

      onProgress?.(75, 'Pinapahusay ang detalye ng sasakyan...');
      if (!plateNumber || !motorNumber || !chassisNumber) {
        const tableRoi = cropRoiCanvas(canvas, 0.05, 0.40, 0.90, 0.25);
        if (tableRoi) {
          await worker.setParameters({ tessedit_pageseg_mode: '6' as any, tessedit_char_whitelist: '' });
          const tableRes = await worker.recognize(tableRoi);
          rawText += `\n--- TABLE ROI ---\n${tableRes.data.text}\n`;
          if (!vehicleMake) vehicleMake = parseMtopMake(tableRes.data.text);
          if (!motorNumber) motorNumber = parseMtopMotorNumber(tableRes.data.text);
          if (!chassisNumber) chassisNumber = parseMtopChassisNumber(tableRes.data.text);
          if (!plateNumber) plateNumber = parseMtopPlateNumber(tableRes.data.text);
        }
      }

      onProgress?.(90, 'Pinapahusay ang petsa at resibo...');
      if (!expirationDate || !orNumber) {
        const botRoi = cropRoiCanvas(canvas, 0.05, 0.60, 0.90, 0.20);
        if (botRoi) {
          await worker.setParameters({ tessedit_pageseg_mode: '6' as any, tessedit_char_whitelist: '' });
          const botRes = await worker.recognize(botRoi);
          rawText += `\n--- BOTTOM LINE ROI ---\n${botRes.data.text}\n`;
          if (!expirationDate) expirationDate = parseMtopExpiration(botRes.data.text);
          if (!orNumber) orNumber = parseMtopOrNumber(botRes.data.text);
        }
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
