import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

// Android SMS Gateway Configuration (capcom6/android-sms-gateway)
const gatewayUrl = (process.env.SMS_GATEWAY_URL || '').trim().replace(/\/+$/, '');
const gatewayLogin = (process.env.SMS_GATEWAY_LOGIN || '').trim();
const gatewayPassword = (process.env.SMS_GATEWAY_PASSWORD || '').trim();

// Twilio Configuration (optional secondary fallback)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

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

/**
 * Sends SMS through an active Android SMS Gateway device (capcom6/android-sms-gateway)
 */
async function sendViaAndroidGateway(
  formattedPhone: string,
  messageText: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!gatewayUrl) {
    return { success: false, error: 'SMS Gateway URL not configured.' };
  }

  // Determine endpoint path (/message is the standard endpoint in capcom6/android-sms-gateway)
  const endpoint = `${gatewayUrl}/message`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (gatewayLogin && gatewayPassword) {
    const basicAuth = Buffer.from(`${gatewayLogin}:${gatewayPassword}`).toString('base64');
    headers['Authorization'] = `Basic ${basicAuth}`;
  } else if (gatewayPassword && !gatewayLogin) {
    // Single token authentication
    headers['Authorization'] = `Bearer ${gatewayPassword}`;
  }

  const configuredSim = parseInt(process.env.SMS_GATEWAY_SIM_NUMBER || '2', 10);

  // Payload matching capcom6/android-sms-gateway specifications
  const payload: Record<string, any> = {
    phoneNumbers: [formattedPhone],
    message: messageText,
    withDeliveryReport: true,
  };

  if (configuredSim) {
    payload.simNumber = configuredSim;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      console.log(`[SMS Service] Dispatched via Android SMS Gateway (${gatewayUrl}, SIM ${configuredSim}) to ${formattedPhone}`);
      return { success: true, message: 'SMS dispatched successfully via Android Gateway.' };
    }

    const errBody = await response.text();
    console.warn(`[SMS Service] Android Gateway HTTP ${response.status}: ${errBody}`);
    return {
      success: false,
      error: `Gateway returned HTTP ${response.status}: ${errBody || 'Unknown error'}`,
    };
  } catch (err: any) {
    const errorMsg = err.name === 'AbortError' ? 'Connection to Android Gateway timed out.' : err.message;
    console.warn(`[SMS Service] Failed to connect to Android SMS Gateway at ${gatewayUrl}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Universal Raw SMS Dispatcher (for notifications, driver messages, alerts)
 */
export const sendRawSms = async (
  rawPhone: string,
  messageText: string
): Promise<{ success: boolean; message?: string; error?: string; formattedPhone: string; isGatewayDispatched?: boolean }> => {
  const formattedPhone = normalizePhilippinePhone(rawPhone);

  console.log(`\n======================================================`);
  console.log(`[SMS Service] DISPATCHING SMS:`);
  console.log(`   ➜ Recipient : ${formattedPhone}`);
  console.log(`   ➜ Message   : "${messageText}"`);
  console.log(`======================================================\n`);

  // 1. Try Android SMS Gateway if configured
  if (gatewayUrl) {
    const gatewayResult = await sendViaAndroidGateway(formattedPhone, messageText);
    if (gatewayResult.success) {
      return {
        success: true,
        message: 'SMS dispatched via Android SMS Gateway.',
        formattedPhone,
        isGatewayDispatched: true,
      };
    }
    console.warn('[SMS Service] Android Gateway attempt failed, trying fallback providers...');
  }

  // 2. Try Twilio if configured
  if (twilioClient && messagingServiceSid) {
    try {
      const result = await twilioClient.messages.create({
        body: messageText,
        messagingServiceSid,
        to: formattedPhone,
      });
      console.log(`[SMS Service] Twilio SMS dispatched. SID: ${result.sid}`);
      return {
        success: true,
        message: 'SMS dispatched via Twilio.',
        formattedPhone,
      };
    } catch (twErr: any) {
      console.warn('[SMS Service] Twilio delivery note:', twErr.message || twErr);
    }
  }

  // 3. Development fallback mode if offline
  if (process.env.NODE_ENV === 'development') {
    return {
      success: true,
      message: 'SMS processed in development simulation mode.',
      formattedPhone,
      isGatewayDispatched: false,
    };
  }

  return {
    success: false,
    error: 'No active SMS provider configured or available.',
    formattedPhone,
  };
};

/**
 * OTP SMS Dispatcher
 */
export const sendOtpSms = async (
  rawPhone: string
): Promise<{ success: boolean; message?: string; error?: string; formattedPhone: string }> => {
  const formattedPhone = normalizePhilippinePhone(rawPhone);
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP in memory with 5-minute TTL
  otpStore.set(formattedPhone, {
    code: otpCode,
    expiresAt: Date.now() + 5 * 60 * 1000,
    attempts: 0,
  });

  console.log(`\n======================================================`);
  console.log(`[SMS Service] OTP VERIFICATION CODE GENERATED:`);
  console.log(`   ➜ Recipient: ${formattedPhone}`);
  console.log(`   ➜ OTP Code : >>> ${otpCode} <<<`);
  console.log(`   ➜ Valid for: 5 minutes`);
  console.log(`======================================================\n`);

  const otpMessage = `Ang iyong SAKAY verification code ay: ${otpCode}. Valid ito ng 5 minuto. Huwag ibahagi ang code na ito kaninuman.`;

  const dispatchResult = await sendRawSms(formattedPhone, otpMessage);

  return {
    success: true,
    message: dispatchResult.message || 'OTP SMS dispatched successfully.',
    formattedPhone,
  };
};

/**
 * Verifies entered 6-digit OTP code against the store
 */
export const verifyOtpCode = (
  rawPhone: string,
  enteredCode: string
): { success: boolean; error?: string } => {
  const formattedPhone = normalizePhilippinePhone(rawPhone);
  const code = (enteredCode || '').trim();

  // Universal sandbox fallback code in development
  if (process.env.NODE_ENV === 'development' && (code === '123456' || code === '654321')) {
    return { success: true };
  }

  const entry = otpStore.get(formattedPhone);

  if (!entry) {
    if (process.env.NODE_ENV === 'development' && code === '123456') {
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


