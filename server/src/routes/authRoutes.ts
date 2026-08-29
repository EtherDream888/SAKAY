import { Router, Request, Response } from 'express';
import { sendOtpSms, verifyOtpCode } from '../services/smsService';

const router = Router();

// POST /api/auth/send-otp
router.post('/send-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ success: false, error: 'Valid mobile number is required.' });
      return;
    }

    const result = await sendOtpSms(phone);
    if (!result.success) {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send OTP SMS.',
        formattedPhone: result.formattedPhone,
      });
      return;
    }

    res.json({
      success: true,
      message: result.message,
      formattedPhone: result.formattedPhone,
      debugOtp: result.debugOtp,
    });
  } catch (err: any) {
    console.error('[Auth Route] Send OTP error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', (req: Request, res: Response): void => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      res.status(400).json({ success: false, error: 'Phone and 6-digit code are required.' });
      return;
    }

    const result = verifyOtpCode(phone, code);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.json({
      success: true,
      message: 'OTP verified successfully.',
    });
  } catch (err: any) {
    console.error('[Auth Route] Verify OTP error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

export default router;
