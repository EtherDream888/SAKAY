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

      if (restWords.length === 1) {
        firstName = toTitleCase(restWords[0]);
      } else if (restWords.length === 2) {
        firstName = toTitleCase(restWords[0]);
        middleName = toTitleCase(restWords[1]);
      } else if (restWords.length >= 3) {
        // Last word is middle name (mother's maiden surname), preceding words are first name
        middleName = toTitleCase(restWords[restWords.length - 1]);
        firstName = toTitleCase(restWords.slice(0, -1).join(' '));
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

  let clean = rawText
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

  // Fix common OCR misrecognitions on Philippine addresses
  clean = clean
    .replace(/\b8rgy\b|\bSrgy\b|\bBrey\b|\bBrgv\b/gi, 'Brgy.')
    .replace(/\bBarangav\b|\bBparanagay\b/gi, 'Barangay')
    .replace(/\bCalanan\b|\bCalagan\b/gi, 'Calapan')
    .replace(/\bMindara\b|\bMindoro\b/gi, 'Mindoro')
    .replace(/\bQriental\b|\bOnental\b/gi, 'Oriental')
    .replace(/\bPoblacion\b|\bPob\b/gi, 'Poblacion')
    .replace(/\bSta\b|\bSta\.\b/gi, 'Sta.')
    .replace(/\bSto\b|\bSto\.\b/gi, 'Sto.');

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
      if (/\b1\b/.test(upper)) return 'A1';
      return '';
    }

    /**
     * Comprehensive Full Document Parser for Philippine Driver's License.
     * Scans the complete raw OCR output to extract all fields semantically.
     */
    export function parseFullLicenseText(rawText: string): Partial<LicenseExtractedData> {
      const result: Partial<LicenseExtractedData> = {};
      if (!rawText) return result;

      const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

      // 1. License Number extraction
      const licMatch = rawText.match(/\b([A-Z0-9]\d{2}[-\s]?\d{2}[-\s]?\d{6})\b/i) ||
                       rawText.match(/License\s*No[.:\s]*([A-Z0-9-]{10,15})/i);
      if (licMatch) {
        result.licenseNumber = parseLicenseNumber(licMatch[1]);
      }

      // 2. Dates extraction (DOB and Expiration Date)
      const allDates = rawText.match(/(\d{4}[-/.]\d{2}[-/.]\d{2})|(\d{2}[-/.]\d{2}[-/.]\d{4})/g) || [];
      for (const rawDate of allDates) {
        const formatted = formatDateToMmDdYyyy(rawDate);
        if (!formatted) continue;
        const year = parseInt(formatted.split('-')[2], 10);
        if (year >= 1930 && year <= 2010 && !result.dob) {
          result.dob = formatted;
        } else if (year >= 2023 && year <= 2050 && !result.expirationDate) {
          result.expirationDate = formatted;
        }
      }

      // 3. Gender extraction
      if (/\bSex[:\s]*F\b|\bFEMALE\b|\bBABAE\b/i.test(rawText)) {
        result.gender = 'Babae';
      } else if (/\bSex[:\s]*M\b|\bMALE\b|\bLALAKI\b/i.test(rawText)) {
        result.gender = 'Lalaki';
      } else {
        result.gender = 'Lalaki';
      }

      // 4. Name extraction
      let nameLine = '';
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (/Last\s*Name.*First\s*Name/i.test(l)) {
          if (i + 1 < lines.length && !/Republic|Department|Office|Driver/i.test(lines[i + 1])) {
            nameLine = lines[i + 1];
            break;
          }
        }
        if (l.includes(',') && !/Republic|Department|Transportation|Office|Street|Brgy|Barangay|City|Province/i.test(l)) {
          const parts = l.split(',');
          if (parts[0].trim().length >= 2 && parts[1]?.trim().length >= 2 && !/[0-9]/.test(l)) {
            nameLine = l;
          }
        }
      }

      if (nameLine) {
        const parsedName = parseLicenseName(nameLine);
        result.fullName = parsedName.fullName;
        result.firstName = parsedName.firstName;
        result.middleName = parsedName.middleName;
        result.lastName = parsedName.lastName;
        result.suffix = parsedName.suffix;
      }

      // 5. Address extraction
      const addrKeywords = ['Brgy', 'Barangay', 'St', 'Street', 'City', 'Province', 'Mindoro', 'Calapan', 'Manila', 'Quezon', 'Poblacion', 'San'];
      let foundAddress = '';
      let collectingAddress = false;

      for (const line of lines) {
        if (/Address[:\s]*/i.test(line)) {
          collectingAddress = true;
          const stripped = line.replace(/Address[:\s]*/i, '').trim();
          if (stripped.length > 3) foundAddress += (foundAddress ? ' ' : '') + stripped;
          continue;
        }
        if (collectingAddress) {
          if (/License\s*No|Expiration|Agency\s*Code|Blood|Weight|Height|Restrictions/i.test(line)) {
            collectingAddress = false;
            break;
          }
          foundAddress += (foundAddress ? ' ' : '') + line;
        } else if (addrKeywords.some((k) => new RegExp(`\\b${k}\\b`, 'i').test(line)) && !/Republic|Department/i.test(line)) {
          if (!foundAddress) foundAddress = line;
          else foundAddress += ', ' + line;
        }
      }

      if (foundAddress) {
        result.address = parseLicenseAddress(foundAddress);
      }

      // 6. Restrictions
      if (/Restrictions|DL\s*Codes/i.test(rawText)) {
        result.dlCodes = parseLicenseRestrictions(rawText);
      } else {
        result.dlCodes = 'A1';
      }

      return result;
    }

    /**
     * Executes live Field-by-Field ROI OCR extraction with Full-Document Fallback.
     * Processes ONLY FRONT image. BACK photo is preserved for proof.
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
      let gender = 'Lalaki';
      let address = '';
      let licenseNumber = '';
      let dlCodes = 'A1';
      let expirationDate = '';

      let worker: any = null;

      try {
        onProgress?.(0.1, 'Inihahanda ang OCR engine...');
        worker = await createWorker('eng');

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

          // STEP 1: Full-card recognition pass (Guarantees every field is detected)
          onProgress?.(0.30, 'Binabasa ang buong lisensya...');
          await worker.setParameters({
            tessedit_pageseg_mode: '3' as any,
            tessedit_char_whitelist: '',
          });
          const fullRes = await worker.recognize(canvas);
          rawText += `\n--- FULL CARD PASS ---\n${fullRes.data.text}\n`;
          const fullParsed = parseFullLicenseText(fullRes.data.text);

          if (fullParsed.fullName) {
            fullName = fullParsed.fullName;
            firstName = fullParsed.firstName || '';
            middleName = fullParsed.middleName || '';
            lastName = fullParsed.lastName || '';
            suffix = fullParsed.suffix || '';
          }
          if (fullParsed.licenseNumber) licenseNumber = fullParsed.licenseNumber;
          if (fullParsed.expirationDate) expirationDate = fullParsed.expirationDate;
          if (fullParsed.dob) dob = fullParsed.dob;
          if (fullParsed.gender) gender = fullParsed.gender;
          if (fullParsed.address) address = fullParsed.address;
          if (fullParsed.dlCodes) dlCodes = fullParsed.dlCodes;

          // STEP 2: Targeted Field ROIs for high-precision refinement
          onProgress?.(0.50, 'Pinapahusay ang pangalan...');
          const nameRoi = cropRoiCanvas(canvas, 0.15, 0.18, 0.82, 0.26);
          if (nameRoi) {
            await worker.setParameters({
              tessedit_pageseg_mode: '6' as any,
              tessedit_char_whitelist: '',
            });
            const nameRes = await worker.recognize(nameRoi);
            rawText += `\n--- NAME ROI ---\n${nameRes.data.text}\n`;
            const parsedName = parseLicenseName(nameRes.data.text);
            if (parsedName.fullName && (!fullName || parsedName.lastName)) {
              fullName = parsedName.fullName;
              firstName = parsedName.firstName;
              middleName = parsedName.middleName;
              lastName = parsedName.lastName;
              suffix = parsedName.suffix;
            }
          }

          onProgress?.(0.65, 'Pinapahusay ang numero ng lisensya...');
          if (!licenseNumber) {
            const licRoi = cropRoiCanvas(canvas, 0.14, 0.60, 0.46, 0.20);
            if (licRoi) {
              await worker.setParameters({
                tessedit_pageseg_mode: '7' as any,
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
              });
              const licRes = await worker.recognize(licRoi);
              rawText += `\n--- LICENSE NO ROI ---\n${licRes.data.text}\n`;
              const parsedLic = parseLicenseNumber(licRes.data.text);
              if (parsedLic) licenseNumber = parsedLic;
            }
          }

          onProgress?.(0.78, 'Pinapahusay ang petsa ng pagkapaso...');
          if (!expirationDate) {
            const expRoi = cropRoiCanvas(canvas, 0.48, 0.60, 0.48, 0.20);
            if (expRoi) {
              await worker.setParameters({
                tessedit_pageseg_mode: '7' as any,
                tessedit_char_whitelist: '0123456789/-.',
              });
              const expRes = await worker.recognize(expRoi);
              rawText += `\n--- EXPIRATION ROI ---\n${expRes.data.text}\n`;
              const parsedExp = parseLicenseExpiration(expRes.data.text);
              if (parsedExp) expirationDate = parsedExp;
            }
          }

          onProgress?.(0.88, 'Pinapahusay ang tirahan...');
          if (!address || address.length < 8) {
            const addrRoi = cropRoiCanvas(canvas, 0.15, 0.44, 0.82, 0.24);
            if (addrRoi) {
              await worker.setParameters({
                tessedit_pageseg_mode: '6' as any,
                tessedit_char_whitelist: '',
              });
              const addrRes = await worker.recognize(addrRoi);
              rawText += `\n--- ADDRESS ROI ---\n${addrRes.data.text}\n`;
              const parsedAddr = parseLicenseAddress(addrRes.data.text);
              if (parsedAddr && parsedAddr.length >= 6) address = parsedAddr;
            }
          }
        }

        onProgress?.(1.0, 'Kumpleto na ang pagbasa ng lisensya!');
      } catch (err) {
        console.warn('[licenseOcrService] Hybrid OCR execution warning:', err);
      } finally {
        if (worker) {
          await worker.terminate();
        }
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
        gender: gender || 'Lalaki',
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
