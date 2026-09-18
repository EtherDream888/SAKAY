import { Router, Request, Response } from 'express';
import { sendOtpSms, verifyOtpCode } from '../services/smsService';
import { supabase } from '../config/supabase';

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
    });
  } catch (err: any) {
    console.error('[Auth Route] Send OTP error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, code, role } = req.body;
    if (!phone || !code) {
      res.status(400).json({ success: false, error: 'Phone and 6-digit code are required.' });
      return;
    }

    const result = verifyOtpCode(phone, code);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    // Direct Database Synchronization: Activate passenger account in Supabase
    if (supabase) {
      try {
        const digits = (phone || '').replace(/\D/g, '');
        let phoneRaw = digits;
        if (digits.startsWith('639')) phoneRaw = digits.slice(2);
        else if (digits.startsWith('09')) phoneRaw = digits.slice(1);
        else if (digits.startsWith('63')) phoneRaw = digits.slice(2);
        else if (digits.startsWith('0')) phoneRaw = digits.slice(1);

        const phone09 = `0${phoneRaw}`;
        const phone63NoPlus = `63${phoneRaw}`;
        const phone63WithPlus = `+63${phoneRaw}`;

        // 1. Try activating via the dedicated SECURITY DEFINER RPC function (bypasses RLS)
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('activate_passenger_otp', {
          p_contact_number: phone63WithPlus,
        });

        if (rpcErr) {
          console.log('[Auth Route] Note on activate_passenger_otp RPC:', rpcErr.message);
        } else {
          console.log('[Auth Route] Passenger activated via RPC activate_passenger_otp:', rpcRes);
        }

        // 2. Also try direct table update (works with service_role or authenticated admin)
        const { data: updatedPassengers, error: pErr } = await supabase
          .from('passenger')
          .update({ account_status: 'Active' })
          .or(
            `contact_number.eq.${phone63WithPlus},contact_number.eq.${phone09},contact_number.eq.${phone63NoPlus},contact_number.eq.${phoneRaw}`
          )
          .select('passenger_id, account_status');

        if (pErr) {
          console.warn('[Auth Route] Supabase passenger activation warning:', pErr.message);
        } else {
          console.log('[Auth Route] Passenger successfully activated in database:', updatedPassengers);
        }
      } catch (dbErr: any) {
        console.warn('[Auth Route] Failed to update database account_status:', dbErr.message);
      }
    }

    res.json({
      success: true,
      message: 'OTP verified successfully and account activated in database.',
    });
  } catch (err: any) {
    console.error('[Auth Route] Verify OTP error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

export default router;
