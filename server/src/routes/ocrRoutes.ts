import { Router, Request, Response } from 'express';
import { extractMtopWithGemini, extractLicenseWithGemini } from '../services/geminiOcrService';

const router = Router();

// POST /api/ocr/mtop
router.post('/mtop', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      res.status(400).json({
        success: false,
        error: 'Missing imageBase64 in request body.',
      });
      return;
    }

    // Strip data:image/...;base64, prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const result = await extractMtopWithGemini(buffer, mimeType);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to extract MTOP details with Gemini.',
      });
      return;
    }

    res.json({
      success: true,
      data: result.data,
      engine: 'gemini-vision',
    });
  } catch (err: any) {
    console.error('[OCR Route] MTOP error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error during MTOP OCR.',
    });
  }
});

// POST /api/ocr/license
router.post('/license', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      res.status(400).json({
        success: false,
        error: 'Missing imageBase64 in request body.',
      });
      return;
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const result = await extractLicenseWithGemini(buffer, mimeType);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to extract license details with Gemini.',
      });
      return;
    }

    res.json({
      success: true,
      data: result.data,
      engine: 'gemini-vision',
    });
  } catch (err: any) {
    console.error('[OCR Route] License error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error during License OCR.',
    });
  }
});

export default router;
