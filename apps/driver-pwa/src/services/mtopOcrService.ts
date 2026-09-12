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
/**
 * Normalizes text lines to recover wrapped or broken words from OCR scans
 */
export function normalizeMtopText(text: string): string {
  if (!text) return '';
  return text
    .replace(/Decembe\s*\n[^\n]*\s*r/gi, 'December')
    .replace(/Januar\s*\n[^\n]*\s*y/gi, 'January')
    .replace(/Februar\s*\n[^\n]*\s*y/gi, 'February')
    .replace(/Novembe\s*\n[^\n]*\s*r/gi, 'November')
    .replace(/Octobe\s*\n[^\n]*\s*r/gi, 'October')
    .replace(/Septembe\s*\n[^\n]*\s*r/gi, 'September');
}

/**
 * 1. Operator / Owner Name Parser (Supports MTOP, OR, and CR)
 */
export function parseMtopOperator(text: string): string {
  if (!text) return '';
  const normalized = normalizeMtopText(text);

  // Check "Granted to ..." patterns in MTOP
  const grantedMatch =
    normalized.match(/Granted\s+to\s+([A-Za-z\s,.-]+?)\s+residing/i) ||
    normalized.match(/Granted\s+to\s+([A-Za-z\s,.-]+?)(?=\s+to\s+operate|\s+with|$)/i);

  if (grantedMatch) {
    const clean = grantedMatch[1]
      .replace(/[^A-Za-z\s,.-]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (clean.length > 3 && !/^(REPUBLIC|PERMIT|SECTION|BOARD|CALAPAN)$/i.test(clean)) {
      return clean.toUpperCase();
    }
  }

  // Check LTO OR / CR patterns: "REGISTERED OWNER", "COMPLETE OWNER'S NAME", "OPERATOR"
  const ownerMatch =
    normalized.match(/(?:COMPLETE\s*OWNER'?S?\s*NAME|REGISTERED\s*OWNER|NAME\s*OF\s*OWNER|OPERATOR|OWNER)[:\s]*([A-Za-z\s,.-]{4,50})/i);

  if (ownerMatch) {
    const clean = ownerMatch[1]
      .replace(/ADDRESS.*/i, '')
      .replace(/[^A-Za-z\s,.-]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (clean.length > 3 && !/^(REPUBLIC|PERMIT|SECTION|BOARD|CALAPAN|LTO)$/i.test(clean)) {
      return clean.toUpperCase();
    }
  }

  return '';
}

/**
 * 2. Franchise Number Parser (Supports MTOP, Franchise, Permit, Case No.)
 */
export function parseMtopFranchiseNumber(text: string): string {
  if (!text) return '';
  const normalized = normalizeMtopText(text);

  // Exact word boundary to avoid matching "FRANCHISING"
  const franMatch =
    normalized.match(/\bFranchise\s*(?:No\.?|#)?[:\s]*([A-Z0-9-]{3,15})/i) ||
    normalized.match(/\b(?:MTOP|Permit|Case)\s*(?:No\.?|#)?[:\s]*([A-Z0-9-]{3,15})/i);

  if (franMatch) {
    const candidate = franMatch[1].trim();
    if (!/^(AND|THE|REGULATORY|BOARD|PERMIT|SECTION|REGISTRATION)$/i.test(candidate)) {
      return candidate;
    }
  }

  // Common franchise year-code or numeric patterns
  const yearCodeMatch = normalized.match(/\b(202[0-9]-\d{3,6})\b/);
  if (yearCodeMatch) return yearCodeMatch[1];

  return '';
}

/**
 * 3. Make Parser (Supports MTOP, OR, and CR)
 */
export function parseMtopMake(text: string): string {
  if (!text) return '';
  const normalized = normalizeMtopText(text);
  const match = normalized.match(/\b(KAWASAKI|HONDA|YAMAHA|SUZUKI|BAJAJ|TVS|SYM|RUSI|EURO|MOTORSTAR|RATO|KYMCO|BENELLI)\b/i);
  if (match) {
    return match[1].toUpperCase();
  }

  const fieldMatch = normalized.match(/MAKE[:\s]*([A-Za-z]{3,15})/i);
  if (fieldMatch) {
    return fieldMatch[1].trim().toUpperCase();
  }

  return '';
}

/**
 * 4. Year Model Parser (Supports MTOP, OR, and CR)
 */
export function parseMtopYearModel(text: string): string {
  if (!text) return '';
  const normalized = normalizeMtopText(text);

  const yearMatch =
    normalized.match(/(?:YEAR\s*MODEL|MODEL\s*YEAR|YEAR)[:\s]*(\d{4})/i) ||
    normalized.match(/\b(?:MODEL)\s*[:\s]*(\d{4})\b/i);

  if (yearMatch) {
    const yr = parseInt(yearMatch[1], 10);
    if (yr >= 1990 && yr <= 2035) {
      return yearMatch[1];
    }
  }

  return '';
}

/**
 * 5. Motor / Engine Number Parser (Supports MTOP, OR, and CR)
 */
export function parseMtopMotorNumber(text: string): string {
  if (!text) return '';
  const normalized = normalizeMtopText(text);

  const match =
    normalized.match(/(?:MOTOR\s*NO\.?|ENGINE\s*NO\.?)[\s\S]{1,40}?([A-Z0-9-]{6,18})/i) ||
    normalized.match(/(?:MOTOR|ENGINE)\s*(?:NO\.?|#)?[:\s]*([A-Z0-9-]{5,18})/i);

  if (match) {
    const res = match[1].trim().toUpperCase();
    if (res.length >= 6 && /[0-9]/.test(res) && !/^(NUMBER|ENGINE|MOTOR|CHASSIS)$/i.test(res)) {
      return res;
    }
  }

  const codeMatch = normalized.match(/\b([A-Z]{3,7}\d{5,8})\b/i);
  if (codeMatch) {
    return codeMatch[1].toUpperCase();
  }

  return '';
}

/**
 * 6. Chassis Number / VIN Parser (Supports MTOP, OR, and CR)
 */
export function parseMtopChassisNumber(text: string): string {
  if (!text) return '';
  const normalized = normalizeMtopText(text);

  const match =
    normalized.match(/(?:CHASSIS\s*NO\.?|VIN)[\s\S]{1,40}?([A-Z0-9-]{10,22})/i) ||
    normalized.match(/CHASSIS\s*(?:NO\.?|#)?[:\s]*([A-Z0-9-]{6,20})/i);

  if (match) {
    const res = match[1].trim().toUpperCase();
    if (res.length >= 10 && /[0-9]/.test(res) && !/^(NUMBER|CHASSIS|MOTOR)$/i.test(res)) {
      return res;
    }
  }

  const vinMatch = normalized.match(/\b([A-Z0-9]{15,18})\b/);
  if (vinMatch && /[A-Z]/.test(vinMatch[1]) && /[0-9]/.test(vinMatch[1])) {
    return vinMatch[1].toUpperCase();
  }

  return '';
}

/**
 * 7. Plate Number Parser (Supports Philippine Tricycle / Motorcycle Formats)
 */
export function parseMtopPlateNumber(text: string): string {
  if (!text) return '';
  const normalized = normalizeMtopText(text);

  const labelMatch =
    normalized.match(/(?:PLATE\s*NO\.?|MV\s*FILE\s*NO\.?)[\s\S]{1,60}?(?:\|\s*)?([A-Z0-9\s-]{4,10})/i) ||
    normalized.match(/PLATE\s*(?:NO\.?|#)?[:\s]*([A-Z0-9\s-]{4,10})/i);

  if (labelMatch) {
    const candidate = labelMatch[1].replace(/^[|\s]+/, '').trim().toUpperCase();
    if (candidate.length >= 4 && !/^(NUMBER|MAKE|MOTOR|CHASSIS)$/i.test(candidate)) {
      return candidate;
    }
  }

  // 1. Format: 3 digits + 3 letters (e.g. 261VPI from MTOP_SAMPLE.jpg)
  const d3L3 = normalized.match(/\b(\d{3}[A-Z]{3})\b/);
  if (d3L3) return d3L3[1].toUpperCase();

  // 2. Format: 2-3 letters + 3-4 digits (e.g. AB 1234 or ABC 123)
  const l23D34 = normalized.match(/\b([A-Z]{2,3}\s*\d{3,4})\b/);
  if (l23D34) return l23D34[1].replace(/\s+/g, ' ').toUpperCase();

  // 3. Format: 4 digits + 2 letters (e.g. 1234AB)
  const d4L2 = normalized.match(/\b(\d{4}[A-Z]{2})\b/);
  if (d4L2) return d4L2[1].toUpperCase();

  return '';
}

/**
 * 8. Expiration Date Parser (Supports MTOP, OR, and CR -> MM-DD-YYYY)
 */
export function parseMtopExpiration(text: string): string {
  if (!text) return '';
  const normalized = normalizeMtopText(text);

  // 1. Text Month dates: e.g. "to December 31, 2026" or "December 31, 2026"
  const textMonthMatch =
    normalized.match(/to\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i) ||
    normalized.match(/December\s+31,?\s+(\d{4})/i) ||
    normalized.match(/(?:Expiration|Expiry|Valid\s+until|Valid\s+to)[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i) ||
    normalized.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i);

  if (textMonthMatch) {
    const rawDateStr = textMonthMatch[1] || textMonthMatch[0];
    const d = new Date(rawDateStr);
    if (!isNaN(d.getTime())) {
      const iso = d.toISOString().split('T')[0];
      return formatDateToMmDdYyyy(iso);
    }
  }

  // 2. Numeric dates in year range 2023-2040
  const allDates = normalized.match(/(\d{4}[-/.]\d{2}[-/.]\d{2})|(\d{2}[-/.]\d{2}[-/.]\d{4})/g) || [];
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
 * 9. OR Number Parser (Extracts OR Number from MTOP / OR)
 */
export function parseMtopOrNumber(text: string): string {
  if (!text) return '';
  const normalized = normalizeMtopText(text);

  const match =
    normalized.match(/OR[.\s]*(?:Number|No\.?|#)?[:\s]*(\d{5,12})/i) ||
    normalized.match(/(?:Official\s*Receipt)[.\s]*(?:Number|No\.?|#)?[:\s]*(\d{5,12})/i) ||
    normalized.match(/\bOR\s*#?\s*(\d{5,12})\b/i);

  if (match) {
    return match[1].trim();
  }

  return '';
}

/**
 * 10. Authorized Route / Zone Parser
 */
export function parseMtopAuthorizedRoute(text: string): string {
  const fallback = 'City of Calapan, Oriental Mindoro';
  if (!text) return fallback;
  const normalized = normalizeMtopText(text);

  const match =
    normalized.match(/within\s+the\s+jurisdiction\s+of\s+([A-Za-z0-9\s,.-]+?)(?=\.\s*(?:Subject|under|\n|$)|$)/i) ||
    normalized.match(/jurisdiction\s+of\s+([A-Za-z0-9\s,.-]+?)(?=\.\s*(?:Subject|under|\n|$)|$)/i) ||
    normalized.match(/(?:Route|Zone)[:\s]*([A-Za-z0-9\s,.-]{6,60})/i);

  if (match) {
    let route = match[1]
      .replace(/under\s+OR.*/i, '')
      .replace(/Subject\s+to.*/i, '')
      .replace(/^the\s+/i, '')
      .replace(/\.$/, '')
      .replace(/\bOr\.\s*Mindoro\b/i, 'Oriental Mindoro')
      .replace(/\bOr\.\b/i, 'Oriental')
      .trim();
    if (route.length > 4 && !route.toLowerCase().includes('granted to')) {
      return route;
    }
  }
  return fallback;
}

/**
 * 11. Table Row Parser (Extracts Make, Motor No, Chassis No, Year Model, Plate No from table row)
 */
export function parseMtopTableLine(text: string, currentMake: string): {
  make?: string;
  motorNumber?: string;
  chassisNumber?: string;
  yearModel?: string;
  plateNumber?: string;
} {
  const result: {
    make?: string;
    motorNumber?: string;
    chassisNumber?: string;
    yearModel?: string;
    plateNumber?: string;
  } = {};

  if (!text) return result;
  const lines = text.split('\n');

  for (const line of lines) {
    const upper = line.toUpperCase();
    const targetBrand = currentMake || 'KAWASAKI';
    if (upper.includes(targetBrand) || /HONDA|YAMAHA|SUZUKI|BAJAJ|TVS|SYM|RUSI|EURO|MOTORSTAR|RATO/.test(upper)) {
      const tokens = line.split(/[|\s]+/).map((t) => t.trim()).filter(Boolean);
      for (const tok of tokens) {
        const cleanTok = tok.toUpperCase();
        if (/KAWASAKI|HONDA|YAMAHA|SUZUKI|BAJAJ|TVS|SYM|RUSI|EURO|MOTORSTAR|RATO/.test(cleanTok)) {
          if (!result.make) result.make = cleanTok;
          continue;
        }
        if (/^\d{4}$/.test(cleanTok)) {
          const yr = parseInt(cleanTok, 10);
          if (yr >= 1990 && yr <= 2035) {
            result.yearModel = cleanTok;
          }
        } else if (/^[A-Z0-9]{15,18}$/.test(cleanTok) && /[A-Z]/.test(cleanTok) && /[0-9]/.test(cleanTok)) {
          result.chassisNumber = cleanTok;
        } else if (/^[A-Z0-9]{8,14}$/.test(cleanTok) && /[0-9]/.test(cleanTok)) {
          result.motorNumber = cleanTok;
        } else if (/^(\d{3}[A-Z]{3}|[A-Z]{2,3}\d{3,4}|\d{4}[A-Z]{2})$/.test(cleanTok)) {
          result.plateNumber = cleanTok;
        }
      }
    }
  }

  return result;
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
  let yearModel = '';
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

      // STEP 1: Full-document standard pass (PSM 3 accurately parses multi-column blocks and tables)
      onProgress?.(30, 'Binabasa ang buong dokumento...');
      await worker.setParameters({
        tessedit_pageseg_mode: '3' as any,
        tessedit_char_whitelist: '',
      });
      const psm3Res = await worker.recognize(canvas);
      const psm3Txt = normalizeMtopText(psm3Res.data.text);
      rawText += `\n--- FULL PASS (PSM 3) ---\n${psm3Txt}\n`;

      franchiseNumber = parseMtopFranchiseNumber(psm3Txt);
      operatorName = parseMtopOperator(psm3Txt);
      vehicleMake = parseMtopMake(psm3Txt);
      yearModel = parseMtopYearModel(psm3Txt);
      motorNumber = parseMtopMotorNumber(psm3Txt);
      chassisNumber = parseMtopChassisNumber(psm3Txt);
      plateNumber = parseMtopPlateNumber(psm3Txt);
      expirationDate = parseMtopExpiration(psm3Txt);
      orNumber = parseMtopOrNumber(psm3Txt);
      authorizedRoute = parseMtopAuthorizedRoute(psm3Txt);

      // Table line extraction for unit description row
      const tableData = parseMtopTableLine(psm3Txt, vehicleMake);
      if (tableData.make && !vehicleMake) vehicleMake = tableData.make;
      if (tableData.yearModel && !yearModel) yearModel = tableData.yearModel;
      if (tableData.motorNumber && !motorNumber) motorNumber = tableData.motorNumber;
      if (tableData.chassisNumber && !chassisNumber) chassisNumber = tableData.chassisNumber;
      if (tableData.plateNumber && !plateNumber) plateNumber = tableData.plateNumber;

      // STEP 1.5: If key fields missing, run PSM 11 (sparse text pass)
      if (!operatorName || !franchiseNumber || !plateNumber || !expirationDate) {
        onProgress?.(50, 'Sinusuri ang bawat bahagi ng dokumento...');
        await worker.setParameters({
          tessedit_pageseg_mode: '11' as any,
          tessedit_char_whitelist: '',
        });
        const psm11Res = await worker.recognize(canvas);
        const psm11Txt = normalizeMtopText(psm11Res.data.text);
        rawText += `\n--- FULL PASS (PSM 11) ---\n${psm11Txt}\n`;

        if (!operatorName) operatorName = parseMtopOperator(psm11Txt);
        if (!franchiseNumber) franchiseNumber = parseMtopFranchiseNumber(psm11Txt);
        if (!vehicleMake) vehicleMake = parseMtopMake(psm11Txt);
        if (!yearModel) yearModel = parseMtopYearModel(psm11Txt);
        if (!motorNumber) motorNumber = parseMtopMotorNumber(psm11Txt);
        if (!chassisNumber) chassisNumber = parseMtopChassisNumber(psm11Txt);
        if (!plateNumber) plateNumber = parseMtopPlateNumber(psm11Txt);
        if (!expirationDate) expirationDate = parseMtopExpiration(psm11Txt);
        if (!orNumber) orNumber = parseMtopOrNumber(psm11Txt);

        const tableData11 = parseMtopTableLine(psm11Txt, vehicleMake);
        if (tableData11.make && !vehicleMake) vehicleMake = tableData11.make;
        if (tableData11.yearModel && !yearModel) yearModel = tableData11.yearModel;
        if (tableData11.motorNumber && !motorNumber) motorNumber = tableData11.motorNumber;
        if (tableData11.chassisNumber && !chassisNumber) chassisNumber = tableData11.chassisNumber;
        if (tableData11.plateNumber && !plateNumber) plateNumber = tableData11.plateNumber;
      }

      // STEP 2: Targeted Field Refinements
      onProgress?.(70, 'Pinapahusay ang numero ng prangkisa...');
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

      onProgress?.(85, 'Pinapahusay ang detalye ng sasakyan...');
      if (!plateNumber || !motorNumber || !chassisNumber || !yearModel) {
        const tableRoi = cropRoiCanvas(canvas, 0.05, 0.38, 0.90, 0.28);
        if (tableRoi) {
          await worker.setParameters({ tessedit_pageseg_mode: '6' as any, tessedit_char_whitelist: '' });
          const tableRes = await worker.recognize(tableRoi);
          const tableTxt = normalizeMtopText(tableRes.data.text);
          rawText += `\n--- TABLE ROI ---\n${tableTxt}\n`;

          const tableRoiData = parseMtopTableLine(tableTxt, vehicleMake);
          if (tableRoiData.make && !vehicleMake) vehicleMake = tableRoiData.make;
          if (tableRoiData.yearModel && !yearModel) yearModel = tableRoiData.yearModel;
          if (tableRoiData.motorNumber && !motorNumber) motorNumber = tableRoiData.motorNumber;
          if (tableRoiData.chassisNumber && !chassisNumber) chassisNumber = tableRoiData.chassisNumber;
          if (tableRoiData.plateNumber && !plateNumber) plateNumber = tableRoiData.plateNumber;

          if (!vehicleMake) vehicleMake = parseMtopMake(tableTxt);
          if (!yearModel) yearModel = parseMtopYearModel(tableTxt);
          if (!motorNumber) motorNumber = parseMtopMotorNumber(tableTxt);
          if (!chassisNumber) chassisNumber = parseMtopChassisNumber(tableTxt);
          if (!plateNumber) plateNumber = parseMtopPlateNumber(tableTxt);
        }
      }

      onProgress?.(95, 'Pinapahusay ang petsa at resibo...');
      if (!expirationDate || !orNumber) {
        const botRoi = cropRoiCanvas(canvas, 0.05, 0.58, 0.90, 0.24);
        if (botRoi) {
          await worker.setParameters({ tessedit_pageseg_mode: '6' as any, tessedit_char_whitelist: '' });
          const botRes = await worker.recognize(botRoi);
          const botTxt = normalizeMtopText(botRes.data.text);
          rawText += `\n--- BOTTOM LINE ROI ---\n${botTxt}\n`;
          if (!expirationDate) expirationDate = parseMtopExpiration(botTxt);
          if (!orNumber) orNumber = parseMtopOrNumber(botTxt);
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
    yearModel: yearModel || '',
    orNumber: orNumber || '',
    expirationDate: expirationDate || '',
    authorizedRoute: authorizedRoute || '',
    rawOcrText: rawText,
    scannedAt: new Date().toISOString(),
  };

  const missingFields: string[] = [];
  if (!parsedData.franchiseNumber) missingFields.push('Franchise Number');
  if (!parsedData.operatorName) missingFields.push('Operator Name');

  const confidenceScore = Math.round(((10 - missingFields.length) / 10) * 100);

  return {
    data: parsedData,
    isSuccessful: true,
    confidenceScore,
    missingFields,
  };
}
