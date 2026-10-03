import { Router, Request, Response } from 'express';
import { sendOtpSms, verifyOtpCode } from '../services/smsService';
import { supabase } from '../config/supabase';

const router = Router();

// ── Rate-limit constants (Rule 4.6 / 4.7 / W7) ───────────────────────────────
const OTP_RESEND_COOLDOWN_SECONDS = 30;   // F2.4 approved: 30-second server-side cooldown
const OTP_DAILY_CAP               = 5;    // F2.4 approved: max 5 OTP sends per number per day
const OTP_MIN_AGE_YEARS           = 12;   // Rule 4.3: under-12 cannot hold a verified account

/**
 * Normalises a Philippine phone number to E.164 (+639xxxxxxxxx)
 */
function normalisePhone(raw: string): string {
  const d = (raw || '').replace(/\D/g, '');
  if (d.startsWith('639') && d.length === 12) return `+${d}`;
  if (d.startsWith('09')  && d.length === 11) return `+63${d.slice(1)}`;
  if (d.startsWith('9')   && d.length === 10) return `+63${d}`;
  if (d.length === 11) return `+63${d.slice(1)}`;
  return `+${d}`;
}

/**
 * Calculates age in completed years from a date-of-birth string (YYYY-MM-DD).
 * Returns null if the string is invalid.
 */
function calcAge(dobString: string): number | null {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

// ── POST /api/auth/send-otp ───────────────────────────────────────────────────
// Enforces server-side:
//   • OTP lockout (via check_otp_lockout RPC)
//   • 30-second resend cooldown (otp_last_sent_at column)
//   • 5-per-day cap (otp_daily_count / otp_daily_reset_at columns)
router.post('/send-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ success: false, error: 'Valid mobile number is required.' });
      return;
    }

    const e164Phone = normalisePhone(phone);

    // ── 1. OTP lockout check ──────────────────────────────────────────────────
    if (supabase) {
      const { data: lockoutData, error: lockoutErr } = await supabase.rpc('check_otp_lockout', {
        p_contact_number: e164Phone,
      });

      if (lockoutErr) {
        console.warn('[Auth Route /send-otp] check_otp_lockout RPC error:', lockoutErr.message);
      } else if (lockoutData?.is_locked) {
        const mins: number = lockoutData.minutes_remaining ?? 15;
        res.status(429).json({
          success: false,
          error: `Too many failed OTP attempts. Please try again in ${mins.toFixed(0)} minute(s).`,
          is_locked: true,
          minutes_remaining: mins,
        });
        return;
      }
    }

    // ── 2. Fetch passenger row for rate-limit columns ──────────────────────────
    if (supabase) {
      const digits = e164Phone.replace(/\D/g, '');
      const raw10   = digits.startsWith('639') ? digits.slice(2) : digits.startsWith('09') ? digits.slice(1) : digits;
      const phone09 = `0${raw10}`;
      const phone63 = `63${raw10}`;

      const { data: pRow } = await supabase
        .from('passenger')
        .select('passenger_id, otp_last_sent_at, otp_daily_count, otp_daily_reset_at')
        .or(`contact_number.eq.${e164Phone},contact_number.eq.${phone09},contact_number.eq.${phone63}`)
        .limit(1)
        .maybeSingle();

      if (pRow) {
        const now        = new Date();
        const today      = now.toISOString().slice(0, 10); // YYYY-MM-DD

        // ── 2a. 30-second resend cooldown ────────────────────────────────────
        if (pRow.otp_last_sent_at) {
          const lastSent   = new Date(pRow.otp_last_sent_at);
          const elapsedSec = (now.getTime() - lastSent.getTime()) / 1000;
          if (elapsedSec < OTP_RESEND_COOLDOWN_SECONDS) {
            const wait = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - elapsedSec);
            res.status(429).json({
              success: false,
              error: `Please wait ${wait} second(s) before requesting another OTP.`,
              cooldown_remaining_seconds: wait,
            });
            return;
          }
        }

        // ── 2b. Daily cap ─────────────────────────────────────────────────────
        const lastResetDay = pRow.otp_daily_reset_at
          ? String(pRow.otp_daily_reset_at).slice(0, 10)
          : null;
        const countToday   = lastResetDay === today ? (pRow.otp_daily_count || 0) : 0;

        if (countToday >= OTP_DAILY_CAP) {
          res.status(429).json({
            success: false,
            error: `Daily OTP limit (${OTP_DAILY_CAP}) reached. Please try again tomorrow.`,
            daily_cap_reached: true,
          });
          return;
        }

        // ── 2c. Update rate-limit counters ────────────────────────────────────
        await supabase
          .from('passenger')
          .update({
            otp_last_sent_at:  now.toISOString(),
            otp_daily_count:   lastResetDay === today ? countToday + 1 : 1,
            otp_daily_reset_at: today,
          })
          .eq('passenger_id', pRow.passenger_id);
      }
    }

    // ── 3. Dispatch OTP via SMS gateway ──────────────────────────────────────
    const result = await sendOtpSms(e164Phone);
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
    console.error('[Auth Route /send-otp] Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
// Enforces server-side:
//   • OTP lockout check BEFORE verification (a bypassed client cannot skip it)
//   • Age gate: refuses to activate if date_of_birth indicates age < 12 (Rule 4.3)
router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, code, role, date_of_birth } = req.body;
    if (!phone || !code) {
      res.status(400).json({ success: false, error: 'Phone and 6-digit code are required.' });
      return;
    }

    const e164Phone = normalisePhone(phone);

    // ── 1. OTP lockout gate (server-side, not bypassable from client) ─────────
    if (supabase) {
      const { data: lockoutData, error: lockoutErr } = await supabase.rpc('check_otp_lockout', {
        p_contact_number: e164Phone,
      });

      if (lockoutErr) {
        console.warn('[Auth Route /verify-otp] check_otp_lockout RPC error:', lockoutErr.message);
      } else if (lockoutData?.is_locked) {
        const mins: number = lockoutData.minutes_remaining ?? 15;
        res.status(429).json({
          success: false,
          error: `Too many failed OTP attempts. Please try again in ${mins.toFixed(0)} minute(s).`,
          is_locked: true,
          minutes_remaining: mins,
        });
        return;
      }
    }  // end if (supabase) lockout check

    // ── 2. Verify OTP code against in-memory store ────────────────────────────
    const result = verifyOtpCode(e164Phone, code);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    // ── 3. Age gate: under-12 passengers cannot be activated (Rule 4.3) ──────
    if (date_of_birth) {
      const age = calcAge(date_of_birth);
      if (age !== null && age < OTP_MIN_AGE_YEARS) {
        res.status(403).json({
          success: false,
          error: `Passengers under ${OTP_MIN_AGE_YEARS} years old cannot hold a verified account. ` +
                 `(Ang mga pasaherong wala pang ${OTP_MIN_AGE_YEARS} taong gulang ay hindi maaaring magkaroon ng verified account.)`,
          under_age: true,
        });
        return;
      }
    }

    // ── 4. Activate passenger in Supabase ─────────────────────────────────────
    if (supabase) {
      try {
        const { passengerName, fullName, auth_user_id, userId } = req.body;
        const targetUserId  = auth_user_id || userId;
        const resolvedName  = fullName || passengerName || 'Passenger';
        const digits        = (phone || '').replace(/\D/g, '');
        let   phoneRaw      = digits;
        if (digits.startsWith('639'))  phoneRaw = digits.slice(2);
        else if (digits.startsWith('09'))  phoneRaw = digits.slice(1);
        else if (digits.startsWith('63'))  phoneRaw = digits.slice(2);
        else if (digits.startsWith('0'))   phoneRaw = digits.slice(1);

        const phone09         = `0${phoneRaw}`;
        const phone63NoPlus   = `63${phoneRaw}`;
        const phone63WithPlus = `+63${phoneRaw}`;

        // 4a. Activate via SECURITY DEFINER RPC (bypasses RLS for this status transition)
        const { error: rpcErr } = await supabase.rpc('activate_passenger_otp', {
          p_contact_number: phone63WithPlus,
        });
        if (rpcErr) {
          console.log('[Auth Route /verify-otp] activate_passenger_otp note:', rpcErr.message);
        }

        // 4b. Update account_status to Active directly (belt-and-suspenders)
        const { data: existingRows } = await supabase
          .from('passenger')
          .select('passenger_id, account_status, auth_user_id')
          .or(
            `contact_number.eq.${phone63WithPlus},contact_number.eq.${phone09},contact_number.eq.${phone63NoPlus},contact_number.eq.${phoneRaw}` +
            (targetUserId ? `,auth_user_id.eq.${targetUserId}` : '')
          )
          .limit(1);

        if (existingRows && existingRows.length > 0) {
          const updateObj: Record<string, any> = {
            account_status: 'Active',
            full_name: resolvedName,
          };
          if (targetUserId && !existingRows[0].auth_user_id) {
            updateObj.auth_user_id = targetUserId;
          }
          // Persist DOB if provided (needed for future age-gating and profile display)
          if (date_of_birth) {
            updateObj.date_of_birth = date_of_birth;
          }
          const { error: pErr } = await supabase
            .from('passenger')
            .update(updateObj)
            .eq('passenger_id', existingRows[0].passenger_id);
          if (pErr) {
            console.warn('[Auth Route /verify-otp] passenger activation update warning:', pErr.message);
          }
        } else if (targetUserId) {
          const insertObj: Record<string, any> = {
            auth_user_id:   targetUserId,
            contact_number: phone63WithPlus,
            full_name:      resolvedName,
            account_status: 'Active',
          };
          if (date_of_birth) insertObj.date_of_birth = date_of_birth;
          const { error: insErr } = await supabase
            .from('passenger')
            .insert([insertObj])
            .select('passenger_id, account_status');
          if (insErr) {
            console.warn('[Auth Route /verify-otp] passenger creation insert warning:', insErr.message);
          }
        } else {
          console.warn('[Auth Route /verify-otp] Missing auth_user_id — cannot insert new passenger');
        }
      } catch (dbErr: any) {
        console.warn('[Auth Route /verify-otp] DB sync error:', dbErr.message);
      }
    }

    res.json({
      success: true,
      message: 'OTP verified successfully and account activated.',
    });
  } catch (err: any) {
    console.error('[Auth Route /verify-otp] Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

export default router;
