import { createWorker } from 'tesseract.js';
import type { MtopExtractedData } from './driverOnboardingCache';
import { cropRoiCanvas } from './imageEnhancementService';
import { formatDateToMmDdYyyy } from './licenseOcrService';

export interface OcrProgressCallback {
  (progress: number, status?: string): void;
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

  // Unify "Granted to\n..." across newlines
  const folded = normalized.replace(/(?:Granted|Awarded)\s*(?:to|fo|1o|2o)?[:\s]*\n\s*/gi, 'Granted to ');

  // 1. "Granted to ..." patterns in MTOP (with OCR typo tolerance)
  const grantedMatch =
    folded.match(/(?:Granted\s*(?:to|fo|1o|2o)?|Awarded\s+to)[:\s]+([A-Za-z\s,.-]+?)(?=\s+(?:residing|reslding|tesiding|at\s+Brgy|at|to\s+operate|with)\b|\r?\n\s*\r?\n|Subject|\.|$)/i) ||
    folded.match(/Granted\s+to\s+([A-Za-z\s,.-]{4,50})/i);

  if (grantedMatch) {
    const clean = grantedMatch[1]
      .replace(/residing.*/i, '')
      .replace(/to\s+operate.*/i, '')
      .replace(/[^A-Za-z\s,.-]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (clean.length > 3 && !/^(REPUBLIC|PERMIT|SECTION|BOARD|CALAPAN|PROVINCE|ORIENTAL)$/i.test(clean)) {
      return clean.toUpperCase();
    }
  }

  // 2. LTO OR / CR or form header patterns: "REGISTERED OWNER", "OPERATOR", "OWNER"
  const ownerMatch =
    normalized.match(/(?:COMPLETE\s*OWNER'?S?\s*NAME|REGISTERED\s*OWNER(?:\s*\/\s*OPERATOR)?|NAME\s*OF\s*OWNER|OPERATOR|OWNER)[:\s]*([A-Za-z\s,.-]{4,50})/i);

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

  // Priority 1: Direct 4-digit or 3-6 digit number labeled or adjacent to Franchise / Permit
  const franMatch =
    normalized.match(/(?:Fr[a-z]*nchise|OPERATORS?\s*PERMIT)[^\d\n]*(\d{3,6})\b/i) ||
    normalized.match(/\bFr[a-z]*nchise\s*(?:No\.?|Ro\.?|#)?[:\s]*([A-Z0-9-]{3,15})/i) ||
    normalized.match(/\b(?:MTOP|Permit|Case)\s*(?:No\.?|#)?[:\s]*([A-Z0-9-]{3,15})/i) ||
    normalized.match(/\b(?:Franchise|Franchise\s*No\.?|Franchise\s*#)\s*[:.-]?\s*(\d{3,6})\b/i);

  if (franMatch) {
    const candidate = franMatch[1].trim();
    if (!/^(AND|THE|REGULATORY|BOARD|PERMIT|SECTION|REGISTRATION)$/i.test(candidate)) {
      return candidate;
    }
  }

  // Priority 2: 4-digit number at the right side of the permit line
  const header4Digit = normalized.match(/(?:OPERATORS?\s*PERMIT|TFRB)[^\n]*?\b(\d{4})\b/i);
  if (header4Digit) {
    return header4Digit[1];
  }

  // Priority 3: Year-code franchise (e.g. 2025-0891)
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
export function parseMtopMotorNumber(text: string, chassisNumber?: string): string {
  if (!text) return '';
  const normalized = normalizeMtopText(text);

  const labeledMatch =
    normalized.match(/(?:MOTOR\s*NO\.?|ENGINE\s*NO\.?)[:\s]*([A-Z0-9-]{6,18})/i) ||
    normalized.match(/(?:MOTOR|ENGINE)\s*(?:NO\.?|#)?[:\s]*([A-Z0-9-]{5,18})/i);

  if (labeledMatch) {
    const res = labeledMatch[1].trim().toUpperCase();
    if (res.length >= 6 && /[0-9]/.test(res) && res !== chassisNumber && !/^(NUMBER|ENGINE|MOTOR|CHASSIS)$/i.test(res)) {
      return res;
    }
  }

  // Look for 6-14 char alphanumeric containing digits that is NOT chassis or plate
  const candidates = normalized.match(/\b([A-Z0-9]{6,14})\b/g) || [];
  for (const c of candidates) {
    const up = c.toUpperCase();
    if (/[0-9]/.test(up) && /[A-Z]/i.test(up) && up !== chassisNumber && up.length >= 7 && up.length <= 13) {
      if (!/^(PERMIT|SECTION|FRANCHISE|REGULATORY|DECEMBER|JANUARY|OPERATOR)$/i.test(up)) {
        return up;
      }
    }
  }

  return '';
}

/**
 * 6. Chassis Number / VIN Parser (Supports MTOP, OR, and CR)
 */
export function parseMtopChassisNumber(text: string): string {
  if (!text) return '';
  const normalized = normalizeMtopText(text);

  // Chassis / VIN is 14-18 alphanumeric characters containing both letters and digits
  const vinCandidates = normalized.match(/\b([A-HJ-NPR-Z0-9]{14,18})\b/g) || [];
  for (const c of vinCandidates) {
    if (/[A-Z]/i.test(c) && /[0-9]/.test(c) && !/^(OPERATORSPERMIT|REGULATORYBOARD|JURISDICTIONOF)$/i.test(c)) {
      return c.toUpperCase();
    }
  }

  const labeledMatch = normalized.match(/CHASSIS\s*(?:NO\.?|#)?[:\s]*([A-Z0-9-]{6,20})/i);
  if (labeledMatch) {
    const res = labeledMatch[1].trim().toUpperCase();
    if (res.length >= 10 && /[0-9]/.test(res) && !/^(NUMBER|CHASSIS|MOTOR)$/i.test(res)) {
      return res;
    }
  }

  return '';
}

/**
 * 7. Plate Number Parser (Supports Philippine Tricycle / Motorcycle Formats)
 */
export function parseMtopPlateNumber(text: string): string {
  if (!text) return '';
  const normalized = normalizeMtopText(text);

  // 1. Format: 3 digits + 3 letters (e.g. 261VPI)
  const d3L3 = normalized.match(/\b(\d{3}\s*[A-Z]{3})\b/);
  if (d3L3) return d3L3[1].replace(/\s+/g, '').toUpperCase();

  // 2. Format: 2-3 letters + 3-4 digits (e.g. ABC 123 or AB 1234)
  const l23D34 = normalized.match(/\b([A-Z]{2,3}\s*\d{3,4})\b/);
  if (l23D34) {
    const p = l23D34[1].replace(/\s+/g, ' ').toUpperCase();
    if (!/^(PHP|NO|OR)\s*\d+/i.test(p)) {
      return p;
    }
  }

  // 3. Format: 4 digits + 2 letters (e.g. 1234AB)
  const d4L2 = normalized.match(/\b(\d{4}\s*[A-Z]{2})\b/);
  if (d4L2) return d4L2[1].replace(/\s+/g, '').toUpperCase();

  // 4. Labeled plate number on single line
  const labelMatch = normalized.match(/(?:PLATE\s*NO\.?|MV\s*FILE\s*NO\.?)[:\s]+([A-Z0-9\s-]{4,10})/i);
  if (labelMatch) {
    const candidate = labelMatch[1].trim().toUpperCase();
    if (candidate.length >= 4 && !/^(NUMBER|MAKE|MOTOR|CHASSIS)$/i.test(candidate)) {
      return candidate;
    }
  }

  return '';
}

/**
 * 8. Expiration Date Parser (Supports MTOP, OR, and CR -> MM-DD-YYYY)
 */
export function parseMtopExpiration(text: string): string {
  if (!text) return '';
  const normalized = normalizeMtopText(text);

  const textMonthMatch =
    normalized.match(/(?:Valid\s*only\s*from[^\n]+?(?:to|fo|until)|Valid\s*until|Valid\s*to)[^\w]*([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i) ||
    normalized.match(/to\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i) ||
    normalized.match(/\b(December\s+31,?\s+\d{4})\b/i) ||
    normalized.match(/(?:Expiration|Expiry|Valid\s+until|Valid\s+to)[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i) ||
    normalized.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i);

  if (textMonthMatch) {
    const rawDateStr = textMonthMatch[1] || textMonthMatch[0];
    const mMatch = rawDateStr.match(/([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/);
    if (mMatch) {
      const monthMap: Record<string, string> = {
        january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
        july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
      };
      const mm = monthMap[mMatch[1].toLowerCase()] || '12';
      const dd = mMatch[2].padStart(2, '0');
      const yyyy = mMatch[3];
      return `${mm}-${dd}-${yyyy}`;
    }
  }

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
export function parseMtopTableLine(text: string, currentMake?: string): {
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
    const makeMatch = line.match(/\b(KAWASAKI|HONDA|YAMAHA|SUZUKI|BAJAJ|TVS|PIAGGIO|SYM|RUSI|EURO|MOTORSTAR|RATO|KYMCO|BENELLI|HAOJUE|LONCIN)\b/i);
    if (makeMatch) {
      result.make = makeMatch[1].toUpperCase();
      const cleanedLine = line.replace(/\|/g, ' ');
      const tokens = cleanedLine
        .split(/\s+/)
        .map((t) => t.replace(/[^A-Z0-9]/gi, '').trim())
        .filter(Boolean);
      const makeIdx = tokens.findIndex((t) => t.toUpperCase() === result.make);
      if (makeIdx !== -1) {
        const afterMake = tokens.slice(makeIdx + 1);
        // Look for Chassis No. (alphanumeric 14-18 chars)
        const chassisIdx = afterMake.findIndex(
          (t) => t.length >= 14 && t.length <= 18 && /[A-Z]/i.test(t) && /[0-9]/.test(t)
        );
        if (chassisIdx !== -1) {
          result.chassisNumber = afterMake[chassisIdx].toUpperCase();
          // Motor number is column before chassis
          if (chassisIdx > 0) {
            result.motorNumber = afterMake[chassisIdx - 1].toUpperCase();
          }
          // After chassis: Year Model (column 4) and Plate Number (column 5)
          const rest = afterMake.slice(chassisIdx + 1);
          const plateTokens: string[] = [];
          for (const r of rest) {
            if (/^\d{4}$/.test(r) && parseInt(r, 10) >= 1990 && parseInt(r, 10) <= 2035) {
              result.yearModel = r;
            } else if (/^[A-Z0-9]{2,8}$/i.test(r)) {
              plateTokens.push(r.toUpperCase());
            }
          }
          // Check if plateTokens match exact plate formats
          for (const t of plateTokens) {
            if (/^\d{3}[A-Z]{3}$/i.test(t) || /^\d{4}[A-Z]{2}$/i.test(t)) {
              result.plateNumber = t.toUpperCase();
              break;
            }
          }
          if (!result.plateNumber && plateTokens.length >= 2) {
            if (/^[A-Z]{2,3}$/i.test(plateTokens[0]) && /^\d{3,4}$/.test(plateTokens[1])) {
              result.plateNumber = `${plateTokens[0]} ${plateTokens[1]}`.toUpperCase();
            }
          }
          if (!result.plateNumber && plateTokens.length > 0) {
            result.plateNumber = plateTokens[0];
          }
        }
      }
    }
  }

  // Cross-line fallback: if table columns were parsed onto separate lines
  if (!result.chassisNumber) {
    const allTokens = text
      .replace(/\|/g, ' ')
      .split(/\s+/)
      .map((t) => t.replace(/[^A-Z0-9]/gi, '').trim())
      .filter(Boolean);

    const cIdx = allTokens.findIndex(
      (t) =>
        t.length >= 14 &&
        t.length <= 18 &&
        /[A-Z]/i.test(t) &&
        /[0-9]/.test(t) &&
        !/^(OPERATORSPERMIT|REGULATORYBOARD|JURISDICTIONOF|DESCRIPTIONOF)$/i.test(t)
    );

    if (cIdx !== -1) {
      result.chassisNumber = allTokens[cIdx].toUpperCase();
      // Motor number is column before chassis
      if (cIdx > 0 && allTokens[cIdx - 1].length >= 5 && allTokens[cIdx - 1].length <= 16) {
        result.motorNumber = allTokens[cIdx - 1].toUpperCase();
        // Make is column before motor
        if (cIdx > 1) {
          const candMake = allTokens[cIdx - 2].toUpperCase();
          if (/^(KAWASAKI|HONDA|YAMAHA|SUZUKI|BAJAJ|TVS|PIAGGIO|SYM|RUSI|EURO|MOTORSTAR|RATO|KYMCO|BENELLI|HAOJUE|LONCIN)$/i.test(candMake)) {
            result.make = candMake;
          }
        }
      }

      // Look ahead for Year Model and Plate Number
      const restTokens = allTokens.slice(cIdx + 1, cIdx + 6);
      for (const token of restTokens) {
        if (!result.yearModel && /^\d{4}$/.test(token) && parseInt(token, 10) >= 1990 && parseInt(token, 10) <= 2035) {
          result.yearModel = token;
        } else if (!result.plateNumber && (/^\d{3}[A-Z]{3}$/i.test(token) || /^\d{4}[A-Z]{2}$/i.test(token) || /^[A-Z]{2,3}\d{3,4}$/i.test(token))) {
          result.plateNumber = token.toUpperCase();
        }
      }
    }
  }

  if (!result.make) {
    result.make = parseMtopMake(text);
  }

  return result;
}

/**
 * Comprehensive parser for MTOP document text blocks
 */
export function extractAllMtopFields(text: string): Partial<MtopExtractedData> {
  const normalized = normalizeMtopText(text);

  let operatorName = parseMtopOperator(normalized);
  let franchiseNumber = parseMtopFranchiseNumber(normalized);
  let vehicleMake = parseMtopMake(normalized);
  let yearModel = parseMtopYearModel(normalized);
  let chassisNumber = '';
  let motorNumber = '';
  let plateNumber = '';
  const expirationDate = parseMtopExpiration(normalized);
  const orNumber = parseMtopOrNumber(normalized);
  const authorizedRoute = parseMtopAuthorizedRoute(normalized);

  // Table row parser for unit description row (Columns: Make | Motor | Chassis | Year | Plate)
  const tableData = parseMtopTableLine(normalized);
  if (tableData.make) vehicleMake = tableData.make;
  if (tableData.yearModel) yearModel = tableData.yearModel;
  if (tableData.motorNumber) motorNumber = tableData.motorNumber;
  if (tableData.chassisNumber) chassisNumber = tableData.chassisNumber;
  if (tableData.plateNumber) plateNumber = tableData.plateNumber;

  // Fallbacks if table row didn't catch everything
  if (!chassisNumber) chassisNumber = parseMtopChassisNumber(normalized);
  if (!motorNumber) motorNumber = parseMtopMotorNumber(normalized, chassisNumber);
  if (!plateNumber) plateNumber = parseMtopPlateNumber(normalized);

  return {
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
  };
}

/**
 * Executes high-precision OCR extraction on captured MTOP permit image
 */
export async function parseMtopImage(
  imageDataUrl: string,
  onProgress?: OcrProgressCallback,
  rawImageDataUrl?: string
): Promise<MtopOcrExtractionResult> {
  let worker: any = null;
  let rawText = '';

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

  try {
    onProgress?.(10, 'Initializing OCR Engine');
    worker = await createWorker('eng');

    // Helper to render image onto high-DPI canvas
    const createScaledCanvas = async (url: string): Promise<HTMLCanvasElement> => {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load MTOP image'));
        img.src = url;
      });

      const maxDim = Math.max(img.width || 0, img.height || 0);
      const scale = maxDim < 1800 ? 1800 / (maxDim || 1) : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round((img.width || 1200) * scale);
      canvas.height = Math.round((img.height || 1600) * scale);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      return canvas;
    };

    onProgress?.(25, 'Processing Primary Image');
    const primaryCanvas = await createScaledCanvas(imageDataUrl);

    // STEP 1: Full-document standard pass (PSM 3 accurately parses multi-column blocks and tables)
    onProgress?.(45, 'Scanning Document Structure');
    await worker.setParameters({
      tessedit_pageseg_mode: '3' as any,
      tessedit_char_whitelist: '',
    });
    const psm3Res = await worker.recognize(primaryCanvas);
    const psm3Txt = normalizeMtopText(psm3Res.data.text);
    rawText += `\n--- FULL PASS (PSM 3) ---\n${psm3Txt}\n`;

    const extracted = extractAllMtopFields(psm3Txt);
    if (extracted.operatorName) operatorName = extracted.operatorName;
    if (extracted.franchiseNumber) franchiseNumber = extracted.franchiseNumber;
    if (extracted.plateNumber) plateNumber = extracted.plateNumber;
    if (extracted.chassisNumber) chassisNumber = extracted.chassisNumber;
    if (extracted.vehicleMake) vehicleMake = extracted.vehicleMake;
    if (extracted.motorNumber) motorNumber = extracted.motorNumber;
    if (extracted.yearModel) yearModel = extracted.yearModel;
    if (extracted.orNumber) orNumber = extracted.orNumber;
    if (extracted.expirationDate) expirationDate = extracted.expirationDate;
    if (extracted.authorizedRoute) authorizedRoute = extracted.authorizedRoute;

    // STEP 1.5: If key fields missing and raw uncropped photo is provided, scan raw photo
    const isMissingKeyFields = !operatorName || !franchiseNumber || !plateNumber || !chassisNumber;
    if (isMissingKeyFields && rawImageDataUrl && rawImageDataUrl !== imageDataUrl) {
      onProgress?.(65, 'Analyzing Full Document Frame');
      try {
        const rawCanvas = await createScaledCanvas(rawImageDataUrl);
        const rawRes = await worker.recognize(rawCanvas);
        const rawTxt = normalizeMtopText(rawRes.data.text);
        rawText += `\n--- RAW FULL PASS (PSM 3) ---\n${rawTxt}\n`;

        const rawExtracted = extractAllMtopFields(rawTxt);
        if (!operatorName && rawExtracted.operatorName) operatorName = rawExtracted.operatorName;
        if (!franchiseNumber && rawExtracted.franchiseNumber) franchiseNumber = rawExtracted.franchiseNumber;
        if (!plateNumber && rawExtracted.plateNumber) plateNumber = rawExtracted.plateNumber;
        if (!chassisNumber && rawExtracted.chassisNumber) chassisNumber = rawExtracted.chassisNumber;
        if (!vehicleMake && rawExtracted.vehicleMake) vehicleMake = rawExtracted.vehicleMake;
        if (!motorNumber && rawExtracted.motorNumber) motorNumber = rawExtracted.motorNumber;
        if (!yearModel && rawExtracted.yearModel) yearModel = rawExtracted.yearModel;
        if (!expirationDate && rawExtracted.expirationDate) expirationDate = rawExtracted.expirationDate;
        if (!orNumber && rawExtracted.orNumber) orNumber = rawExtracted.orNumber;
      } catch (rawErr) {
        console.warn('[MTOP OCR] Raw frame analysis warning:', rawErr);
      }
    }

    // STEP 2: Sparse layout pass (PSM 11) if fields are still missing
    if (!operatorName || !franchiseNumber || !plateNumber || !expirationDate) {
      onProgress?.(80, 'Analyzing Sparse Text Regions');
      await worker.setParameters({
        tessedit_pageseg_mode: '11' as any,
        tessedit_char_whitelist: '',
      });
      const psm11Res = await worker.recognize(primaryCanvas);
      const psm11Txt = normalizeMtopText(psm11Res.data.text);
      rawText += `\n--- SPARSE PASS (PSM 11) ---\n${psm11Txt}\n`;

      const psm11Extracted = extractAllMtopFields(psm11Txt);
      if (!operatorName && psm11Extracted.operatorName) operatorName = psm11Extracted.operatorName;
      if (!franchiseNumber && psm11Extracted.franchiseNumber) franchiseNumber = psm11Extracted.franchiseNumber;
      if (!plateNumber && psm11Extracted.plateNumber) plateNumber = psm11Extracted.plateNumber;
      if (!chassisNumber && psm11Extracted.chassisNumber) chassisNumber = psm11Extracted.chassisNumber;
      if (!vehicleMake && psm11Extracted.vehicleMake) vehicleMake = psm11Extracted.vehicleMake;
      if (!motorNumber && psm11Extracted.motorNumber) motorNumber = psm11Extracted.motorNumber;
      if (!yearModel && psm11Extracted.yearModel) yearModel = psm11Extracted.yearModel;
      if (!expirationDate && psm11Extracted.expirationDate) expirationDate = psm11Extracted.expirationDate;
      if (!orNumber && psm11Extracted.orNumber) orNumber = psm11Extracted.orNumber;
    }

    onProgress?.(100, 'Extraction Complete');
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
    authorizedRoute: authorizedRoute || 'City of Calapan, Oriental Mindoro',
    rawOcrText: rawText,
    scannedAt: new Date().toISOString(),
  };

  const missingFields: string[] = [];
  if (!parsedData.franchiseNumber) missingFields.push('Franchise Number');
  if (!parsedData.operatorName) missingFields.push('Operator Name');
  if (!parsedData.plateNumber) missingFields.push('Plate Number');
  if (!parsedData.chassisNumber) missingFields.push('Chassis Number');

  const confidenceScore = Math.round(((10 - missingFields.length) / 10) * 100);

  return {
    data: parsedData,
    isSuccessful: true,
    confidenceScore,
    missingFields,
  };
}
