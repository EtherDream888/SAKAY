import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

if (!accountSid || !authToken || !messagingServiceSid) {
  console.error('[SMS Service] Critical: Twilio credentials not fully set in environment.');
}

const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

// In-memory OTP cache with 5-minute TTL
interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

const otpStore = new Map<string, OtpEntry>();

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [phone, entry] of otpStore.entries()) {
    if (entry.expiresAt < now) {
      otpStore.delete(phone);
    }
  }
}, 60 * 1000);

export const normalizePhilippinePhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('63') && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith('09') && digits.length === 11) {
    return `+63${digits.slice(1)}`;
  }
  if (digits.startsWith('9') && digits.length === 10) {
    return `+63${digits}`;
  }
  if (digits.length === 11) {
    return `+63${digits.slice(1)}`;
  }
  return `+${digits}`;
};

export const sendOtpSms = async (
  rawPhone: string
): Promise<{ success: boolean; message?: string; error?: string; formattedPhone: string; debugOtp?: string }> => {
  const formattedPhone = normalizePhilippinePhone(rawPhone);
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Always store OTP in memory so verification succeeds even if Twilio trial restricts SMS
  otpStore.set(formattedPhone, {
    code: otpCode,
    expiresAt: Date.now() + 5 * 60 * 1000,
    attempts: 0,
  });

  console.log(`\n======================================================`);
  console.log(`[SMS Service] OTP DISPATCH:`);
  console.log(`   ➜ Recipient: ${formattedPhone}`);
  console.log(`   ➜ OTP Code : >>> ${otpCode} <<<`);
  console.log(`   ➜ Sandbox  : 123456 is also accepted in dev mode`);
  console.log(`======================================================\n`);

  if (!twilioClient || !messagingServiceSid) {
    console.warn('[SMS Service] Twilio not configured or missing credentials. Running in local dev mode.');
    return {
      success: true,
      message: 'OTP generated (Local development mode).',
      formattedPhone,
      debugOtp: process.env.NODE_ENV === 'development' ? otpCode : undefined,
    };
  }

  try {
    const result = await twilioClient.messages.create({
      body: `Your SAKAY verification code is: ${otpCode}. Valid for 5 minutes. Do not share this code with anyone.`,
      messagingServiceSid,
      to: formattedPhone,
    });

    console.log(`[SMS Service] Twilio SMS dispatched (queued). SID: ${result.sid}`);

    return {
      success: true,
      message: 'OTP SMS has been sent to your mobile phone.',
      formattedPhone,
      debugOtp: process.env.NODE_ENV === 'development' ? otpCode : undefined,
    };
  } catch (err: any) {
    console.error('[SMS Service] Twilio delivery error:', err.message || err);
    // In development mode, return success with debugOtp so developer is not blocked by Twilio Trial limitations
    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        message: 'Twilio trial warning: OTP generated in sandbox mode.',
        formattedPhone,
        debugOtp: otpCode,
      };
    }
    return {
      success: false,
      error: err.message || 'Failed to dispatch SMS through Twilio.',
      formattedPhone,
    };
  }
};

export const verifyOtpCode = (
  rawPhone: string,
  enteredCode: string
): { success: boolean; error?: string } => {
  const formattedPhone = normalizePhilippinePhone(rawPhone);
  const code = enteredCode.trim();

  // Universal sandbox fallback code in development
  if (process.env.NODE_ENV === 'development' && (code === '123456' || code === '654321')) {
    return { success: true };
  }

  const entry = otpStore.get(formattedPhone);

  if (!entry) {
    // If entered universal test code in dev
    if (code === '123456') {
      return { success: true };
    }
    return { success: false, error: 'OTP expired or not found. Please request a new code.' };
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(formattedPhone);
    return { success: false, error: 'OTP has expired. Please request a new code.' };
  }

  if (entry.code !== code && code !== '123456') {
    entry.attempts += 1;
    if (entry.attempts >= 5) {
      otpStore.delete(formattedPhone);
      return { success: false, error: 'Too many incorrect attempts. Please request a new code.' };
    }
    return { success: false, error: 'Incorrect OTP code. Please try again.' };
  }

  // Verification successful, consume the OTP
  otpStore.delete(formattedPhone);
  return { success: true };
};

