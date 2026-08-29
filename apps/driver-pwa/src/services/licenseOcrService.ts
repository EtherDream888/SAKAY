import { createWorker } from 'tesseract.js';
import type { LicenseExtractedData } from './driverOnboardingCache';

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
 * Converts Philippine DL name format "LASTNAME, FIRSTNAME MIDDLENAME"
 * into "Firstname Middlename Lastname" (FN MN LN in Title Case)
 */
export function formatPhilippineDlName(rawName: string): string {
  if (!rawName) return '';

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

  // If contains comma "DELA CRUZ, JUAN MANALO" -> parts: ["DELA CRUZ", "JUAN MANALO"]
  if (clean.includes(',')) {
    const parts = clean.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const lastName = parts[0];
      const firstAndMiddle = parts.slice(1).join(' ');
      return toTitleCase(`${firstAndMiddle} ${lastName}`);
    }
  }

  // If stacked or newline separated
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2) {
    const lastName = lines[0];
    const firstAndMiddle = lines.slice(1).join(' ');
    return toTitleCase(`${firstAndMiddle} ${lastName}`);
  }

  return toTitleCase(clean);
}

/**
 * Parses raw text extracted from Philippine Driver's License
 * Accurately extracts FN MN LN for name and cleanly isolates ADDRESS from metadata.
 */
export function parsePhilippineLicenseText(rawText: string): Partial<LicenseExtractedData> {
  const result: Partial<LicenseExtractedData> = {
    fullName: '',
    dob: '',
    gender: 'Male',
    address: '',
    licenseNumber: '',
    dlCodes: '',
    expirationDate: '',
    rawOcrText: rawText,
  };

  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. License Number extraction (e.g. N03-12-123456, D01-23-456789, P03-54-458061)
  const licMatch =
    rawText.match(/([A-Z0-9]\d{2}[-\s]\d{2}[-\s]\d{6})/i) ||
    rawText.match(/License\s*No[.:\s]*([A-Z0-9-]+)/i) ||
    rawText.match(/DL\s*No[.:\s]*([A-Z0-9-]+)/i);
  if (licMatch) {
    const rawNum = licMatch[1].replace(/\s+/g, '-').replace(/--+/g, '-');
    result.licenseNumber = rawNum.toUpperCase();
  }

  // 2. Expiration Date (YYYY/MM/DD, YYYY-MM-DD)
  const expMatch =
    rawText.match(/Expiration\s*Date[:\s]*(\d{4}[-/.]\d{2}[-/.]\d{2})/i) ||
    rawText.match(/Exp[.:\s]*(\d{4}[-/.]\d{2}[-/.]\d{2})/i) ||
    rawText.match(/202[4-9][-/.]\d{2}[-/.]\d{2}/) ||
    rawText.match(/203\d[-/.]\d{2}[-/.]\d{2}/);
  if (expMatch) {
    const rawExp = expMatch[1] || expMatch[0];
    result.expirationDate = rawExp.replace(/[/.]/g, '-');
  }

  // 3. Date of Birth (YYYY/MM/DD, YYYY-MM-DD)
  const dobMatch =
    rawText.match(/Date\s*of\s*Birth[:\s]*(\d{4}[-/.]\d{2}[-/.]\d{2})/i) ||
    rawText.match(/Birth\s*Date[:\s]*(\d{4}[-/.]\d{2}[-/.]\d{2})/i) ||
    rawText.match(/DOB[:\s]*(\d{4}[-/.]\d{2}[-/.]\d{2})/i) ||
    rawText.match(/(?:19\d{2}|200[0-8])[-/.]\d{2}[-/.]\d{2}/);
  if (dobMatch) {
    const rawDob = dobMatch[1] || dobMatch[0];
    result.dob = rawDob.replace(/[/.]/g, '-');
  }

  // 4. Gender (Male / Female)
  if (/\b(SEX|GENDER)[:\s]*F\b/i.test(rawText) || /\bFEMALE\b/i.test(rawText)) {
    result.gender = 'Female';
  } else if (/\b(SEX|GENDER)[:\s]*M\b/i.test(rawText) || /\bMALE\b/i.test(rawText)) {
    result.gender = 'Male';
  }

  // 5. Restrictions / DL Codes (e.g. 1, 2 or A, A1, B, B1)
  const restMatch =
    rawText.match(/Restrictions[:\s]*([12345678,\sA-Z]+)/i) ||
    rawText.match(/DL\s*Codes[:\s]*([12345678,\sA-Z]+)/i) ||
    rawText.match(/\b([1-8](?:\s*,\s*[1-8])+)\b/) ||
    rawText.match(/\b([A-E]\d?(?:\s*,\s*[A-E]\d?)+)\b/);
  if (restMatch && restMatch[1].trim()) {
    const cleanRest = restMatch[1].trim().replace(/\s{2,}/g, ' ');
    if (cleanRest.length <= 15) {
      result.dlCodes = cleanRest;
    }
  }

  // Keywords that identify address, headers, or metadata to exclude from Name
  const addressKeywords = [
    'barangay',
    'brgy',
    'street',
    'st.',
    'st,',
    'avenue',
    'ave',
    'highway',
    'hwy',
    'purok',
    'zone',
    'sitio',
    'city',
    'municipality',
    'province',
    'calapan',
    'mindoro',
    'oriental',
    'occidental',
    'batangas',
    'laguna',
    'cavite',
    'rizal',
    'bulacan',
    'pampanga',
    'manila',
    'quezon',
  ];

  const headerKeywords = [
    'republic',
    'philippines',
    'department',
    'transportation',
    'land',
    'office',
    'driver',
    'license',
    'non-professional',
    'professional',
    'student',
    'permit',
    'official',
    'receipt',
  ];

  // 6. FULL NAME Extraction (Target: Last Name, First Name Middle Name -> converted to FN MN LN)
  let rawExtractedName = '';

  // Strategy A: Find line with "Last Name, First Name" or explicitly formatted "SURNAME, FIRSTNAME..."
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Check for "SURNAME, GIVEN NAME" pattern (e.g. DELA CRUZ, JUAN MANALO)
    if (
      line.includes(',') &&
      /^[A-Z\s,.-]+$/.test(line) &&
      !headerKeywords.some((k) => lower.includes(k)) &&
      !addressKeywords.some((k) => lower.includes(k))
    ) {
      const words = line.split(/[,\s]+/).filter((w) => w.length > 1);
      if (words.length >= 2) {
        rawExtractedName = line;
        break;
      }
    }

    if (lower.includes('last name') || lower.includes('1. last') || lower.includes('name:')) {
      const nameParts: string[] = [];
      const inline = line
        .replace(/1\.\s*/g, '')
        .replace(/Last\s*Name.*Middle\s*Name/gi, '')
        .replace(/Last\s*Name/gi, '')
        .replace(/NAME[:\s]*/gi, '')
        .trim();
      if (inline.length > 2) nameParts.push(inline);

      // Collect consecutive name lines before nationality/sex/address
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const next = lines[j].trim();
        const nextLower = next.toLowerCase();
        if (
          nextLower.includes('nationality') ||
          nextLower.includes('sex') ||
          nextLower.includes('birth') ||
          nextLower.includes('address') ||
          nextLower.includes('phl') ||
          addressKeywords.some((k) => nextLower.includes(k))
        ) {
          break;
        }
        if (/^[A-Za-z\s,.-]+$/.test(next) && next.length > 1) {
          nameParts.push(next);
        }
      }

      if (nameParts.length > 0) {
        rawExtractedName = nameParts.join(', ');
        break;
      }
    }
  }

  // Strategy B: First block of uppercase words before Nationality/Sex/DOB that isn't a government header
  if (!rawExtractedName) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lower = line.toLowerCase();
      const isHeader = headerKeywords.some((k) => lower.includes(k));
      const isAddr = addressKeywords.some((k) => lower.includes(k));

      if (!isHeader && !isAddr && /^[A-Z\s,.-]{4,}$/.test(line)) {
        const words = line.split(/[,\s]+/).filter((w) => w.length > 1);
        if (words.length >= 2 && !lower.includes('philippines') && !lower.includes('signature')) {
          rawExtractedName = line;
          break;
        }
      }
    }
  }

  if (rawExtractedName) {
    result.fullName = formatPhilippineDlName(rawExtractedName);
  }

  // 7. ADDRESS Extraction (Strictly isolative: stop before License No, Exp Date, Agency Code)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    const isAddressLine =
      lower.includes('address') ||
      lower.includes('barangay') ||
      lower.includes('brgy') ||
      addressKeywords.some((k) => lower.includes(k));

    if (isAddressLine && !headerKeywords.some((k) => lower.includes(k))) {
      const addressParts: string[] = [];

      let firstLine = line.replace(/address[:\s]*/gi, '').trim();
      if (firstLine) addressParts.push(firstLine);

      // Collect following address lines until reaching metadata stop keywords
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const next = lines[j].trim();
        const nextLower = next.toLowerCase();

        // Stop immediately at metadata boundaries
        if (
          /license\s*no|dl\s*no|lic\s*no|[a-z0-9]\d{2}-\d{2}-\d{6}/i.test(next) ||
          /expiration|exp\s*date|202[4-9]|203\d/i.test(next) ||
          /agency\s*code|agency|branch/i.test(next) ||
          /blood\s*type|eye\s*color|height|weight/i.test(next) ||
          /restrictions|dl\s*codes|conditions/i.test(next) ||
          /signature\s*of\s*licensee/i.test(next) ||
          headerKeywords.some((k) => nextLower.includes(k))
        ) {
          break;
        }

        if (next.length > 2) {
          addressParts.push(next);
        }
      }

      const joinedRaw = addressParts.join(' ');
      // Clean any accidental metadata trailing on the line
      let cleaned = joinedRaw
        .replace(/Address[:\s]*/gi, '')
        .replace(/License\s*No[.:\s]*[A-Z0-9-]*/gi, '')
        .replace(/DL\s*No[.:\s]*[A-Z0-9-]*/gi, '')
        .replace(/Expiration\s*Date[.:\s]*[0-9/-]*/gi, '')
        .replace(/Exp[.:\s]*[0-9/-]*/gi, '')
        .replace(/Agency\s*Code[.:\s]*[A-Z0-9]*/gi, '')
        .replace(/Blood\s*Type[.:\s]*[A-Z0-9+-]*/gi, '')
        .replace(/Eyes\s*Color[.:\s]*[A-Z]*/gi, '')
        .replace(/Restrictions[.:\s]*[A-Z0-9,\s]*/gi, '')
        .replace(/DL\s*Codes[.:\s]*[A-Z0-9,\s]*/gi, '')
        .replace(/Conditions[.:\s]*[A-Z0-9]*/gi, '')
        .replace(/Weight[.:\s]*[0-9.]*/gi, '')
        .replace(/Height[.:\s]*[0-9.]*/gi, '')
        .replace(/Nationality[.:\s]*[A-Z]*/gi, '')
        .replace(/Sex[.:\s]*[MF]/gi, '')
        .replace(/PHL/gi, '')
        .replace(/Signature.*/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

      if (cleaned.length > 5) {
        result.address = toTitleCase(cleaned);
        break;
      }
    }
  }

  return result;
}

/**
 * Executes live OCR extraction with progress telemetry.
 */
export async function performLicenseOcr(
  frontPhotoDataUrl: string,
  backPhotoDataUrl: string,
  onProgress?: OcrProgressCallback
): Promise<OcrExtractionResult> {
  let rawText = '';

  try {
    onProgress?.(0.1, 'Initializing OCR Engine...');
    const worker = await createWorker('eng');

    onProgress?.(0.35, 'Processing front card...');
    const frontResult = await worker.recognize(frontPhotoDataUrl);
    rawText += `\n--- FRONT ---\n${frontResult.data.text}\n`;

    if (backPhotoDataUrl) {
      onProgress?.(0.65, 'Processing back card...');
      const backResult = await worker.recognize(backPhotoDataUrl);
      rawText += `\n--- BACK ---\n${backResult.data.text}\n`;
    }

    onProgress?.(0.9, 'Parsing extracted text...');
    await worker.terminate();
  } catch (err) {
    console.warn('[licenseOcrService] OCR Engine fallback execution:', err);
  }

  const parsed = parsePhilippineLicenseText(rawText);

  const finalData: LicenseExtractedData = {
    frontPhoto: frontPhotoDataUrl,
    backPhoto: backPhotoDataUrl,
    fullName: parsed.fullName || '',
    dob: parsed.dob || '',
    gender: parsed.gender || 'Male',
    address: parsed.address || '',
    licenseNumber: parsed.licenseNumber || '',
    dlCodes: parsed.dlCodes || '',
    expirationDate: parsed.expirationDate || '',
    rawOcrText: rawText,
    scannedAt: new Date().toISOString(),
  };

  const missingFields: string[] = [];
  if (!finalData.fullName) missingFields.push('Full Name');
  if (!finalData.licenseNumber) missingFields.push('License Number');
  if (!finalData.expirationDate) missingFields.push('Expiration Date');

  const confidenceScore = Math.round(
    ((7 - missingFields.length) / 7) * 100
  );

  return {
    data: finalData,
    isSuccessful: true,
    confidenceScore,
    missingFields,
  };
}
