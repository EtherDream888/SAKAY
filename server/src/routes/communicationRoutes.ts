import { Router, Request, Response } from 'express';
import { sendRawSms } from '../services/smsService';

const router = Router();

// POST /api/communication/send-sms
router.post('/send-sms', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, message, senderRole, senderName } = req.body;

    if (!phone || !message) {
      res.status(400).json({
        success: false,
        error: 'Both phone and message content are required.',
      });
      return;
    }

    const trimmedMsg = message.trim();
    if (trimmedMsg.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Message content cannot be empty.',
      });
      return;
    }

    // Format message with sender identity prefix if provided
    let formattedBody = trimmedMsg;
    if (senderRole === 'driver' && senderName) {
      formattedBody = `[SAKAY Driver ${senderName}]: ${trimmedMsg}`;
    } else if (senderRole === 'passenger' && senderName) {
      formattedBody = `[SAKAY Passenger ${senderName}]: ${trimmedMsg}`;
    }

    const result = await sendRawSms(phone, formattedBody);

    if (!result.success && process.env.NODE_ENV !== 'development') {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to dispatch SMS.',
      });
      return;
    }

    res.json({
      success: true,
      message: result.message || 'SMS sent successfully.',
      formattedPhone: result.formattedPhone,
    });
  } catch (err: any) {
    console.error('[Communication Route] Send SMS error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error while sending SMS.',
    });
  }
});

export default router;
