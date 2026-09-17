import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export interface MtopParsedData {
  operatorName: string;
  franchiseNumber: string;
  plateNumber: string;
  make: string;
  engineNumber: string;
  chassisNumber: string;
  expirationDate: string;
  issuedDate: string;
  rawConfidence?: number;
}

export interface LicenseParsedData {
  licenseNumber: string;
  fullName: string;
  expirationDate: string;
  birthDate: string;
  address: string;
  nationality: string;
  rawConfidence?: number;
}

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * Extracts MTOP data using Gemini Vision with structured JSON output
 */
export async function extractMtopWithGemini(
  imageBuffer: Buffer,
  mimeType = 'image/jpeg'
): Promise<{ success: boolean; data?: MtopParsedData; error?: string }> {
  if (!ai || !apiKey) {
    return {
      success: false,
      error: 'GEMINI_API_KEY is not configured in server/.env. Please add your free Google AI Studio API key to enable high-accuracy Gemini OCR.',
    };
  }

  try {
    const base64Image = imageBuffer.toString('base64');

    const prompt = `You are an expert document understanding engine for Philippine government transport documents.
Analyze this image of a Motorized Tricycle Operator's Permit (MTOP) / Tricycle Franchise Permit (often from Calapan City or other Philippine LGUs).
Extract the permit details with high precision even if there are official wet ink stamps, dot-matrix typography, signatures, folds, or angled captures.

Return ONLY a valid JSON object with EXACTLY these keys:
{
  "operatorName": string, // Full name of the operator/grantee/owner (in UPPERCASE)
  "franchiseNumber": string, // The 3 to 6-digit MTOP / Franchise / Case number
  "plateNumber": string, // Plate number or MV file number
  "make": string, // Motorcycle brand (e.g. KAWASAKI, BAJAJ, HONDA, YAMAHA, TVS, SUZUKI)
  "engineNumber": string, // Motor / Engine number
  "chassisNumber": string, // Chassis / Frame number
  "expirationDate": string, // Expiration or validity date formatted as MM/DD/YYYY
  "issuedDate": string // Date granted or issued formatted as MM/DD/YYYY
}

Do not include markdown fences, code blocks, or extra commentary. Return only the JSON object.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Image,
                mimeType,
              },
            },
          ],
        },
      ],
    });

    const text = response.text || '';
    const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed: MtopParsedData = JSON.parse(cleanJson);

    return {
      success: true,
      data: parsed,
    };
  } catch (err: any) {
    console.error('[geminiOcrService] MTOP Extraction Error:', err);
    return {
      success: false,
      error: err.message || 'Failed to extract MTOP details with Gemini.',
    };
  }
}

/**
 * Extracts Philippine Driver's License data using Gemini Vision
 */
export async function extractLicenseWithGemini(
  imageBuffer: Buffer,
  mimeType = 'image/jpeg'
): Promise<{ success: boolean; data?: LicenseParsedData; error?: string }> {
  if (!ai || !apiKey) {
    return {
      success: false,
      error: 'GEMINI_API_KEY is not configured in server/.env.',
    };
  }

  try {
    const base64Image = imageBuffer.toString('base64');

    const prompt = `You are an expert document understanding engine for Philippine Land Transportation Office (LTO) Driver's Licenses.
Analyze this driver's license image and extract the key details with high precision.

Return ONLY a valid JSON object with EXACTLY these keys:
{
  "licenseNumber": string, // LTO license number (e.g. N03-12-123456 or D01-20-123456)
  "fullName": string, // Driver full legal name (in UPPERCASE, LAST NAME, FIRST NAME MIDDLE NAME)
  "expirationDate": string, // Expiration date formatted as MM/DD/YYYY
  "birthDate": string, // Date of birth formatted as MM/DD/YYYY
  "address": string, // Residential address
  "nationality": string // Nationality (usually PHL or Filipino)
}

Do not include markdown fences, code blocks, or extra commentary. Return only the JSON object.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Image,
                mimeType,
              },
            },
          ],
        },
      ],
    });

    const text = response.text || '';
    const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed: LicenseParsedData = JSON.parse(cleanJson);

    return {
      success: true,
      data: parsed,
    };
  } catch (err: any) {
    console.error('[geminiOcrService] License Extraction Error:', err);
    return {
      success: false,
      error: err.message || 'Failed to extract license details with Gemini.',
    };
  }
}
