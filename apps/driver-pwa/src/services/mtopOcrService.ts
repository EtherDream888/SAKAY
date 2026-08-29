import { createWorker } from 'tesseract.js';
import type { MtopExtractedData } from './driverOnboardingCache';

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
 * Parses raw OCR text from a Motorized Tricycle Operator's Permit (MTOP) document
 * to extract standard fields (Franchise #, Operator, Plate #, Chassis #, Make, Motor #, OR #, Expiration, Route).
 */
export function parseMtopOcrText(rawText: string, imageUri = ''): MtopExtractedData {
  const cleanText = rawText || '';

  let operatorName = '';
  let franchiseNumber = '';
  let plateNumber = '';
  let chassisNumber = '';
  let vehicleMake = '';
  let motorNumber = '';
  let orNumber = '';
  let expirationDate = '';
  let authorizedRoute = '';

  // 1. Franchise Number (e.g., Franchise No. 1234 or MTOP-2025-0891)
  const franchiseMatch =
    cleanText.match(/(?:Franchise|MTOP|Permit)\s*(?:No\.?|Number|#)?[:\s]*([A-Z0-9-]{3,20})/i) ||
    cleanText.match(/Franchise\s+No\.\s*(\d+)/i);
  if (franchiseMatch) {
    franchiseNumber = franchiseMatch[1].trim();
  }

  // 2. Operator / Owner Name (e.g. Granted to DELA CRUZ, JUAN R.)
  const operatorMatch =
    cleanText.match(/(?:Granted to|Registered Owner|Operator|Owner)[:\s]*([A-Za-z\s,.-]{5,40})/i) ||
    cleanText.match(/Granted\s+to\s+([A-Za-z\s,.-]+?)(?=,|\s+residing|\s+to operate)/i);
  if (operatorMatch) {
    operatorName = operatorMatch[1].replace(/residing at.*/i, '').trim();
  }

  // 3. Plate Number (e.g., Plate No. ABC 123)
  const plateMatch = cleanText.match(/(?:Plate|Plate No|Plate #)[:\s]*([A-Z0-9\s-]{4,10})/i);
  if (plateMatch) {
    plateNumber = plateMatch[1].trim();
  }

  // 4. Chassis Number (e.g., Chassis No. AB1CDEFGHIJK23456)
  const chassisMatch = cleanText.match(/(?:Chassis|Chassis No|Chassis #)[:\s]*([A-Z0-9]{8,20})/i);
  if (chassisMatch) {
    chassisNumber = chassisMatch[1].trim();
  }

  // 5. Vehicle Make (e.g., Yamaha, Honda, Kawasaki, Suzuki, Bajaj, TVS)
  const makeMatch = cleanText.match(/(?:Make|Brand|Vehicle Make)[:\s]*([A-Za-z]{3,15})/i) ||
    cleanText.match(/\b(YAMAHA|HONDA|KAWASAKI|SUZUKI|BAJAJ|TVS|SYM|RUSI)\b/i);
  if (makeMatch) {
    vehicleMake = makeMatch[1].toUpperCase();
  }

  // 6. Motor Number (e.g., Motor No. A1B2345678)
  const motorMatch = cleanText.match(/(?:Motor|Motor No|Engine No|Engine #)[:\s]*([A-Z0-9]{6,20})/i);
  if (motorMatch) {
    motorNumber = motorMatch[1].trim();
  }

  // 7. OR Number (e.g., OR Number 1234567 or OR No. 123456)
  const orMatch = cleanText.match(/(?:OR|Official Receipt|OR No|OR #)[:\s]*([A-Z0-9-]{5,15})/i);
  if (orMatch) {
    orNumber = orMatch[1].trim();
  }

  // 8. Expiration Date (e.g., Valid until December 31, 2026 or 2027-01-01)
  const dateMatch = cleanText.match(/(?:Valid until|Valid only from.*to|Expiry|Expiration Date)[:\s]*([A-Za-z0-9,\s-]{8,25})/i) ||
    cleanText.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    expirationDate = dateMatch[1].trim();
  }

  // 9. Authorized Route / Zone
  const routeMatch = cleanText.match(/(?:jurisdiction of the|within the|Route|Zone)[:\s]*([A-Za-z0-9\s,.-]{6,50})/i);
  if (routeMatch) {
    authorizedRoute = routeMatch[1].trim();
  }

  return {
    photoUrl: imageUri,
    operatorName: operatorName || '',
    franchiseNumber: franchiseNumber || '',
    plateNumber: plateNumber || '',
    chassisNumber: chassisNumber || '',
    vehicleMake: vehicleMake || '',
    motorNumber: motorNumber || '',
    orNumber: orNumber || '',
    expirationDate: expirationDate || '',
    authorizedRoute: authorizedRoute || '',
    rawOcrText: cleanText,
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Runs Tesseract OCR on a captured MTOP image file/data URL
 */
export async function parseMtopImage(
  imageDataUrl: string,
  onProgress?: OcrProgressCallback
): Promise<MtopOcrExtractionResult> {
  let worker: any = null;
  try {
    onProgress?.(10, 'Inihahanda ang OCR engine...');

    worker = await createWorker('eng');

    onProgress?.(35, 'Binabasa ang mga teksto mula sa MTOP...');

    const ret = await worker.recognize(imageDataUrl);
    const rawText = ret.data.text || '';
    const confidenceScore = Math.round(ret.data.confidence || 0);

    onProgress?.(85, 'Sinusuri ang impormasyon ng prangkisa...');

    const parsedData = parseMtopOcrText(rawText, imageDataUrl);

    onProgress?.(100, 'Kumpleto na ang pagkuha ng impormasyon!');

    const missingFields: string[] = [];
    if (!parsedData.franchiseNumber) missingFields.push('Franchise Number');
    if (!parsedData.operatorName) missingFields.push('Operator Name');

    return {
      data: parsedData,
      isSuccessful: true,
      confidenceScore,
      missingFields,
    };
  } catch (err: any) {
    console.error('[MTOP OCR Error]:', err);
    return {
      data: {
        photoUrl: imageDataUrl,
        operatorName: '',
        franchiseNumber: '',
        plateNumber: '',
        chassisNumber: '',
        vehicleMake: '',
        motorNumber: '',
        orNumber: '',
        expirationDate: '',
        authorizedRoute: '',
        scannedAt: new Date().toISOString(),
      },
      isSuccessful: false,
      confidenceScore: 0,
      missingFields: ['All Fields'],
    };
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}
