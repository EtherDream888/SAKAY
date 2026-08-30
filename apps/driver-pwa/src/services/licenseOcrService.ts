import { createWorker } from 'tesseract.js';
import type { LicenseExtractedData } from './driverOnboardingCache';
import { cropRoiCanvas } from './imageEnhancementService';

export interface OcrProgressCallback {
  (progress: number, status: string): void;
}

export interface OcrExtractionResult {
  data: LicenseExtractedData;
  isSuccessful: boolean;
  confidenceScore: number;
  missingFields: string[];
}

/**
 * Converts text into Proper/Title Case (e.g. "JUAN DELA CRUZ" -> "Juan Dela Cruz")
 */
function toTitleCase(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Normalizes any valid date string into MM-DD-YYYY format
 */
export function formatDateToMmDdYyyy(rawDate: string): string {
  if (!rawDate) return '';
  const clean = rawDate.replace(/[/.]/g, '-').trim();
  const matchIso = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchIso) {
    return `${matchIso[2]}-${matchIso[3]}-${matchIso[1]}`;
  }
  const matchUs = clean.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (matchUs) {
    return `${matchUs[1]}-${matchUs[2]}-${matchUs[3]}`;
  }
  return '';
}

/**
 * Splits Philippine DL name into firstName, middleName, lastName, and suffix
 */
export function splitNameParts(rawName: string): {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
} {
  let firstName = '';
  let middleName = '';
  let lastName = '';
  let suffix = '';

  if (!rawName) return { firstName: '', middleName: '', lastName: '', suffix: '' };

  const suffixes = ['JR', 'JR.', 'SR', 'SR.', 'III', 'IV', 'II', 'V'];

  let clean = rawName
    .replace(/^1\.\s*/, '')
    .replace(/Last\s*Name.*Middle\s*Name/gi, '')
    .replace(/Last\s*Name/gi, '')
    .replace(/First\s*Name/gi, '')
    .replace(/Middle\s*Name/gi, '')
    .replace(/NAME[:\s]*/gi, '')
    .replace(/[^A-Za-z\s,.-]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // If text contains pipe or comma separators (e.g. DELA CRUZ | JUAN PEDRO | GARCIA or DELA CRUZ, JUAN PEDRO GARCIA)
  if (clean.includes('|')) {
    const parts = clean.split('|').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      lastName = toTitleCase(parts[0]);
      firstName = toTitleCase(parts[1]);
      if (parts.length >= 3) {
        middleName = toTitleCase(parts[2]);
      }
      return { firstName, middleName, lastName, suffix };
    }
  }

  if (clean.includes(',')) {
    const commaSplit = clean.split(',').map((s) => s.trim()).filter(Boolean);
    if (commaSplit.length >= 2) {
      lastName = toTitleCase(commaSplit[0]);
      const restWords = commaSplit[1].split(/\s+/).filter(Boolean);

      const lastWordUpper = restWords[restWords.length - 1]?.toUpperCase();
      if (lastWordUpper && suffixes.includes(lastWordUpper)) {
        suffix = restWords.pop()?.toUpperCase() || '';
      }

      if (restWords.length > 0) {
        firstName = toTitleCase(restWords[0]);
        middleName = toTitleCase(restWords.slice(1).join(' '));
      }
      return { firstName, middleName, lastName, suffix };
    }
  }

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    const lastWordUpper = words[words.length - 1]?.toUpperCase();
    if (words.length > 1 && suffixes.includes(lastWordUpper)) {
      suffix = words.pop()?.toUpperCase() || '';
    }
    if (words.length === 1) {
      firstName = toTitleCase(words[0]);
    } else if (words.length === 2) {
      firstName = toTitleCase(words[0]);
      lastName = toTitleCase(words[1]);
    } else if (words.length >= 3) {
      firstName = toTitleCase(words[0]);
      lastName = toTitleCase(words[words.length - 1]);
      middleName = toTitleCase(words.slice(1, -1).join(' '));
    }
  }

  return { firstName, middleName, lastName, suffix };
}

/**
 * Converts Philippine DL name format "LASTNAME, FIRSTNAME MIDDLENAME"
 * into "Firstname Middlename Lastname" (FN MN LN in Title Case)
 */
export function formatPhilippineDlName(rawName: string): string {
  if (!rawName) return '';
  const { firstName, middleName, lastName, suffix } = splitNameParts(rawName);
  return [firstName, middleName, lastName, suffix].filter(Boolean).join(' ');
}

/**
 * 1. Dedicated Name Parser & Validator
 */
export function parseLicenseName(rawText: string): {
  fullName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
} {
  const empty = { fullName: '', firstName: '', middleName: '', lastName: '', suffix: '' };
  if (!rawText) return empty;

  const headerKeywords = ['republic', 'philippines', 'department', 'transportation', 'office', 'driver', 'license'];
  const lower = rawText.toLowerCase();
  if (headerKeywords.some((k) => lower.includes(k))) {
    return empty;
  }

  const cleanText = rawText.replace(/Last\s*Name.*Middle\s*Name/gi, '').replace(/[^A-Za-z\s,|.-]/g, ' ').trim();
  if (cleanText.length < 3) return empty;

  const split = splitNameParts(cleanText);
  if (!split.firstName && !split.lastName) return empty;

  const fullName = [split.firstName, split.middleName, split.lastName, split.suffix].filter(Boolean).join(' ');
  return {
    fullName,
    firstName: split.firstName,
    middleName: split.middleName,
    lastName: split.lastName,
    suffix: split.suffix,
  };
}

/**
 * 2. Dedicated Address Parser & Validator
 */
export function parseLicenseAddress(rawText: string): string {
  if (!rawText) return '';

  const clean = rawText
    .replace(/address[:\s]*/gi, '')
    .replace(/license\s*no[.:\s]*[A-Z0-9-]*/gi, '')
    .replace(/expiration\s*date[.:\s]*[0-9/-]*/gi, '')
    .replace(/agency\s*code[.:\s]*[A-Z0-9]*/gi, '')
    .replace(/blood\s*type[.:\s]*[A-Z0-9+-]*/gi, '')
    .replace(/eyes\s*color[.:\s]*[A-Z]*/gi, '')
    .replace(/restrictions[.:\s]*[A-Z0-9,\s]*/gi, '')
    .replace(/signature.*/gi, '')
    .replace(/[^A-Za-z0-9\s,.-]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Reject garbage like "Fe Fe: -- “ie E 4" or short noise symbols
  if (clean.length < 5 || /^[^A-Za-z0-9]+$/.test(clean) || clean.toLowerCase().includes('republic of')) {
    return '';
  }

  return toTitleCase(clean);
}

/**
 * 3. Dedicated License Number Parser & Validator
 */
export function parseLicenseNumber(rawText: string): string {
  if (!rawText) return '';
  const s = rawText.toUpperCase().replace(/[\s.]+/g, '-').replace(/--+/g, '-').trim();

  // Philippine DL format: e.g. N03-12-123456 (Letter + 2 digits + 2 digits + 6 digits)
  const match = s.match(/([A-Z0-9])(\d{2})[-]?(\d{2})[-]?(\d{6})/);
  if (match) {
    return `${match[1]}${match[2]}-${match[3]}-${match[4]}`;
  }

  const cleanChars = s.replace(/[^A-Z0-9]/g, '');
  if (cleanChars.length === 11) {
    const p1 = cleanChars.charAt(0);
    let rest = cleanChars.slice(1).replace(/O|Q/g, '0').replace(/I|L/g, '1').replace(/S/g, '5');
    if (/^\d{10}$/.test(rest)) {
      return `${p1}${rest.slice(0, 2)}-${rest.slice(2, 4)}-${rest.slice(4)}`;
    }
  }

  return '';
}

/**
 * 4. Dedicated Expiration Date Parser & Validator
 */
export function parseLicenseExpiration(rawText: string): string {
  if (!rawText) return '';
  const match = rawText.match(/(\d{4}[-/.]\d{2}[-/.]\d{2})/) || rawText.match(/(\d{2}[-/.]\d{2}[-/.]\d{4})/);
  if (!match) return '';

  const clean = match[1].replace(/[/.]/g, '-');
  const formatted = formatDateToMmDdYyyy(clean);

  if (formatted) {
    const parts = formatted.split('-');
    const year = parseInt(parts[2], 10);
    const currentYear = new Date().getFullYear();
    if (year >= currentYear - 5 && year <= 2050) {
      return formatted;
    }
  }
  return '';
}

/**
 * 5. Dedicated Restrictions Parser & Validator
 */
export function parseLicenseRestrictions(rawText: string): string {
  if (!rawText) return '';
  const upper = rawText.toUpperCase();

  const codesSet = new Set<string>();
  const validCodes = ['A1', 'A', 'B', 'B1', 'B2', 'C', 'D', 'BE', 'CE'];

  // Match explicit codes (e.g. A1, B2)
  validCodes.forEach((code) => {
    const reg = new RegExp(`\\b${code}\\b`, 'i');
    if (reg.test(upper)) {
      codesSet.add(code);
    }
  });

  // Match numeric restriction codes (e.g. 1, 2)
  if (/\b1\b/.test(upper)) codesSet.add('A1');
  if (/\b2\b/.test(upper)) codesSet.add('A');
  if (/\b3\b/.test(upper)) codesSet.add('B');
  if (/\b4\b/.test(upper)) codesSet.add('B1');
  if (/\b5\b/.test(upper)) codesSet.add('B2');

  const result = Array.from(codesSet);
  if (result.length > 0) {
    return result.join(', ');
  }

  // Fallback to default 'A1' if numeric restriction '1' was detected
  if (/\b1\b/.test(upper)) return 'A1';
  return '';
}

/**
 * Executes live Field-by-Field ROI OCR extraction.
 * Processes ONLY FRONT image. BACK photo is preserved for proof, but NO OCR is run on the back.
 */
export async function performLicenseOcr(
  frontPhotoDataUrl: string,
  backPhotoDataUrl: string,
  onProgress?: OcrProgressCallback
): Promise<OcrExtractionResult> {
  let rawText = '';
  let fullName = '';
  let firstName = '';
  let middleName = '';
  let lastName = '';
  let suffix = '';
  let dob = '';
  let gender = 'Male';
  let address = '';
  let licenseNumber = '';
  let dlCodes = '';
  let expirationDate = '';

  try {
    onProgress?.(0.1, 'Inihahanda ang OCR engine...');
    const worker = await createWorker('eng');

    // Create Image element from front photo data URL to crop ROIs
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load front photo image'));
      img.src = frontPhotoDataUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width || 1200;
    canvas.height = img.height || 756;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      onProgress?.(0.25, 'Binabasa ang pangalan ng drayber...');
      const nameRoi = cropRoiCanvas(canvas, 0.18, 0.22, 0.80, 0.20);
      if (nameRoi) {
        await worker.setParameters({
          tessedit_pageseg_mode: '6' as any,
          tessedit_char_whitelist: '',
        });
        const nameRes = await worker.recognize(nameRoi);
        rawText += `\n--- NAME ROI ---\n${nameRes.data.text}\n`;
        const parsedName = parseLicenseName(nameRes.data.text);
        fullName = parsedName.fullName;
        firstName = parsedName.firstName;
        middleName = parsedName.middleName;
        lastName = parsedName.lastName;
        suffix = parsedName.suffix;

        console.log('[LICENSE OCR DEBUG]', {
          field: 'NAME',
          region: 'x=0.18, y=0.22, w=0.80, h=0.20',
          raw: nameRes.data.text.trim(),
          cleaned: fullName,
          final: { firstName, middleName, lastName, suffix },
          confidence: nameRes.data.confidence,
        });
      }

      onProgress?.(0.38, 'Binabasa ang kasarian at petsa ng kapanganakan...');
      const infoRoi = cropRoiCanvas(canvas, 0.40, 0.38, 0.55, 0.16);
      if (infoRoi) {
        await worker.setParameters({
          tessedit_pageseg_mode: '6' as any,
          tessedit_char_whitelist: '',
        });
        const infoRes = await worker.recognize(infoRoi);
        rawText += `\n--- PERSONAL INFO ROI ---\n${infoRes.data.text}\n`;
        const txt = infoRes.data.text;

        // Extract Sex (M -> Lalaki, F -> Babae)
        if (/\bF\b|\bFEMALE\b|\bBABAE\b/i.test(txt)) {
          gender = 'Babae';
        } else if (/\bM\b|\bMALE\b|\bLALAKI\b/i.test(txt)) {
          gender = 'Lalaki';
        }

        // Extract DOB (YYYY/MM/DD or YYYY-MM-DD or MM-DD-YYYY)
        const dobMatch = txt.match(/(\d{4}[-/.]\d{2}[-/.]\d{2})/) || txt.match(/(\d{2}[-/.]\d{2}[-/.]\d{4})/);
        if (dobMatch) {
          dob = formatDateToMmDdYyyy(dobMatch[1]);
        }

        console.log('[LICENSE OCR DEBUG]', {
          field: 'PERSONAL_INFO',
          region: 'x=0.40, y=0.38, w=0.55, h=0.16',
          raw: txt.trim(),
          parsedSex: gender,
          parsedDob: dob,
          confidence: infoRes.data.confidence,
        });
      }

      onProgress?.(0.50, 'Binabasa ang numero ng lisensya...');
      const licRoi = cropRoiCanvas(canvas, 0.18, 0.67, 0.40, 0.14);
      if (licRoi) {
        await worker.setParameters({
          tessedit_pageseg_mode: '7' as any,
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
        });
        const licRes = await worker.recognize(licRoi);
        rawText += `\n--- LICENSE NO ROI ---\n${licRes.data.text}\n`;
        licenseNumber = parseLicenseNumber(licRes.data.text);

        console.log('[LICENSE OCR DEBUG]', {
          field: 'LICENSE_NUMBER',
          region: 'x=0.18, y=0.67, w=0.40, h=0.14',
          raw: licRes.data.text.trim(),
          cleaned: licenseNumber,
          final: licenseNumber,
          confidence: licRes.data.confidence,
        });
      }

      onProgress?.(0.65, 'Binabasa ang petsa ng pagkapaso...');
      const expRoi = cropRoiCanvas(canvas, 0.55, 0.67, 0.35, 0.14);
      if (expRoi) {
        await worker.setParameters({
          tessedit_pageseg_mode: '7' as any,
          tessedit_char_whitelist: '0123456789/-.',
        });
        const expRes = await worker.recognize(expRoi);
        rawText += `\n--- EXPIRATION ROI ---\n${expRes.data.text}\n`;
        expirationDate = parseLicenseExpiration(expRes.data.text);

        console.log('[LICENSE OCR DEBUG]', {
          field: 'EXPIRATION_DATE',
          region: 'x=0.55, y=0.67, w=0.35, h=0.14',
          raw: expRes.data.text.trim(),
          cleaned: expirationDate,
          final: expirationDate,
          confidence: expRes.data.confidence,
        });
      }

      onProgress?.(0.78, 'Binabasa ang tirahan ng drayber...');
      const addrRoi = cropRoiCanvas(canvas, 0.18, 0.50, 0.80, 0.18);
      if (addrRoi) {
        await worker.setParameters({
          tessedit_pageseg_mode: '6' as any,
          tessedit_char_whitelist: '',
        });
        const addrRes = await worker.recognize(addrRoi);
        rawText += `\n--- ADDRESS ROI ---\n${addrRes.data.text}\n`;
        address = parseLicenseAddress(addrRes.data.text);

        console.log('[LICENSE OCR DEBUG]', {
          field: 'ADDRESS',
          region: 'x=0.18, y=0.50, w=0.80, h=0.18',
          raw: addrRes.data.text.trim(),
          cleaned: address,
          final: address,
          confidence: addrRes.data.confidence,
        });
      }

      onProgress?.(0.88, 'Binabasa ang restriksyon...');
      const restRoi = cropRoiCanvas(canvas, 0.18, 0.79, 0.38, 0.16);
      if (restRoi) {
        await worker.setParameters({
          tessedit_pageseg_mode: '7' as any,
          tessedit_char_whitelist: '12345678ABCDE,',
        });
        const restRes = await worker.recognize(restRoi);
        rawText += `\n--- RESTRICTIONS ROI ---\n${restRes.data.text}\n`;
        dlCodes = parseLicenseRestrictions(restRes.data.text);

        console.log('[LICENSE OCR DEBUG]', {
          field: 'RESTRICTIONS',
          region: 'x=0.18, y=0.79, w=0.38, h=0.16',
          raw: restRes.data.text.trim(),
          cleaned: dlCodes,
          final: dlCodes,
          confidence: restRes.data.confidence,
        });
      }
    }

    await worker.terminate();
  } catch (err) {
    console.warn('[licenseOcrService] Field ROI OCR execution warning:', err);
  }

  const finalData: LicenseExtractedData = {
    frontPhoto: frontPhotoDataUrl,
    backPhoto: backPhotoDataUrl,
    fullName: fullName || '',
    firstName: firstName || '',
    middleName: middleName || '',
    lastName: lastName || '',
    suffix: suffix || '',
    dob: dob || '',
    gender: gender || 'Male',
    address: address || '',
    licenseNumber: licenseNumber || '',
    dlCodes: dlCodes || 'A1',
    expirationDate: expirationDate || '',
    rawOcrText: rawText,
    scannedAt: new Date().toISOString(),
  };

  const missingFields: string[] = [];
  if (!finalData.fullName) missingFields.push('Full Name');
  if (!finalData.licenseNumber) missingFields.push('License Number');
  if (!finalData.expirationDate) missingFields.push('Expiration Date');

  const confidenceScore = Math.round(((7 - missingFields.length) / 7) * 100);

  return {
    data: finalData,
    isSuccessful: true,
    confidenceScore,
    missingFields,
  };
}
