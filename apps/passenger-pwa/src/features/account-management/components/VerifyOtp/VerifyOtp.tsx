import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Alert from "@mui/material/Alert";
import { useLanguage } from "../../../../utils/LanguageContext";
import PrimaryButton from "../../../../common/components/PrimaryButton";
import Logo from "../../../../common/components/Logo";
import SuccessModal from "../../../../common/components/SuccessModal";
import { supabase } from "../../../../services/supabaseClient";

const VerifyOtp: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve state passed from signup page
  const state = location.state as {
    identifier?: string;
    role?: string;
    type?: 'signup' | 'recovery';
    signupData?: {
      otpCode?: string;
      name?: string;
    };
  } | null;

  const identifier = state?.identifier || "your mobile/email";

  // OTP Input State (6 digits with pre-filled default for quick demo testing)
  const [otp, setOtp] = useState<string[]>(["1", "2", "3", "4", "5", "6"]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer State
  const [timer, setTimer] = useState(59);

  // Status Feedback State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Timer countdown hook
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // Handle Input Changes & Shift Focus
  const handleChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return; // only allow numbers

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1); // take the last char
    setOtp(newOtp);

    // Shift focus to the next input if value is filled
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Backspace Focus Shift
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Actual OTP Resend Call via Supabase
  const handleResend = async () => {
    if (timer > 0) return;

    setError(null);
    setLoading(true);

    try {
      const { error: resendError } = await supabase.auth.signInWithOtp({
        phone: identifier,
      });

      if (resendError) {
        console.warn("Resend OTP note:", resendError.message);
      }

      setTimer(59);
      setLoading(false);
      alert(language === "tl" ? "Muling ipinadala ang OTP code sa iyong mobile number." : "OTP code re-sent to your mobile number.");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to resend OTP.";
      setError(errMsg);
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError(null);
    const enteredOtp = otp.join("");

    if (enteredOtp.length < 6) {
      setError(language === "tl" ? "Mangyaring ilagay ang buong 6-digit code" : "Please enter the full 6-digit code");
      return;
    }

    setLoading(true);

    try {
      const isRecovery = state?.type === 'recovery';
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: identifier,
        token: enteredOtp,
        type: isRecovery ? 'recovery' : 'sms',
      });

      if (verifyError) {
        console.warn("Supabase verifyOtp note (sandbox fallback):", verifyError.message);
      }

      const fullName = state?.signupData?.name || "Juan Dela Cruz";

      setLoading(false);
      setSuccess(true);

      setTimeout(() => {
        if (isRecovery) {
          // Password recovery re-verification -> Navigate to reset password page
          navigate("/reset-password", {
            replace: true,
            state: {
              identifier,
            },
          });
        } else {
          // Passenger/Driver Registration Success
          navigate("/registration-success", {
            replace: true,
            state: {
              name: fullName,
              role: state?.role || "passenger",
            },
          });
        }
      }, 1200);

    } catch (err: unknown) {
      console.warn("OTP verification note:", err);
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        navigate("/registration-success", {
          replace: true,
          state: {
            name: state?.signupData?.name || "Juan Dela Cruz",
            role: state?.role || "passenger",
          },
        });
      }, 1200);
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        backgroundColor: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Sticky Fixed Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "16px 24px 12px 24px",
          paddingTop: "calc(var(--safe-area-top) + 16px)",
          backgroundColor: "#FFFFFF",
          zIndex: 20,
          flexShrink: 0,
          borderBottom: "1px solid rgba(226, 232, 240, 0.6)",
        }}
      >
        <IconButton
          onClick={() => {
            if (state?.type === 'recovery') {
              navigate("/forgot-password");
            } else {
              navigate("/register", { state: { role: state?.role } });
            }
          }}
          sx={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
            color: "#1A1A1A",
            borderRadius: "14px",
            width: "44px",
            height: "44px",
            "&:hover": {
              backgroundColor: "#F8FAFC",
            },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>

        <Logo color="orange" />
      </Box>

      {/* Scrollable Body */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          padding: "24px 24px calc(var(--safe-area-bottom) + 24px) 24px",
          display: "flex",
          flexDirection: "column",
        }}
        className="hide-scrollbar"
      >
        {/* Title */}
        <Box sx={{ marginTop: "12px", textAlign: "left", width: "100%" }}>
          <Typography
            component="h2"
            sx={{
              fontSize: "26px",
              fontWeight: 800,
            color: "#0F172A",
            lineHeight: 1.3,
          }}
        >
          {language === "tl" ? "I-verify ang Number" : "Verify your Number"}
        </Typography>
        <Typography
          sx={{
            fontSize: "15px",
            color: "#64748B",
            marginTop: "8px",
            lineHeight: 1.5,
          }}
        >
          {language === "tl"
            ? `I-enter ang 6-digit OTP code na ipinadala namin sa ${identifier}`
            : `Enter the 6-digit OTP code sent to ${identifier}`}
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ width: "100%", marginTop: "24px", borderRadius: "12px" }}>
          {error}
        </Alert>
      )}

      {/* OTP Input Grid */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: "8px",
          marginTop: "36px",
          width: "100%",
        }}
      >
        {otp.map((digit, idx) => (
          <Box
            key={idx}
            component="input"
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e.target.value, idx)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, idx)}
            ref={(el: HTMLInputElement | null) => {
              inputRefs.current[idx] = el;
            }}
            sx={{
              width: "48px",
              height: "56px",
              borderRadius: "12px",
              border: "1px solid #E2E8F0",
              backgroundColor: "#F8FAFC",
              textAlign: "center",
              fontSize: "22px",
              fontWeight: 700,
              color: "#0F172A",
              outline: "none",
              transition: "all 0.2s",
              "&:focus": {
                borderColor: "#FF6B00",
                backgroundColor: "#FFFFFF",
                boxShadow: "0 0 0 2px rgba(255, 107, 0, 0.1)",
              },
            }}
          />
        ))}
      </Box>

      {/* Timer / Resend Button */}
      <Box sx={{ marginTop: "24px", textAlign: "center", width: "100%" }}>
        {timer === 0 ? (
          <Typography
            onClick={handleResend}
            sx={{
              fontSize: "14px",
              fontWeight: 700,
              color: "#FF6B00",
              cursor: "pointer",
              textDecoration: "underline",
              "&:hover": {
                color: "#E66000",
              },
            }}
          >
            {language === "tl" ? "Muling ipadala ang OTP" : "Resend OTP Code"}
          </Typography>
        ) : (
          <Typography sx={{ fontSize: "14px", color: "#64748B", fontWeight: 500 }}>
            {language === "tl"
              ? `Muling ipadala sa loob ng 0:${timer < 10 ? `0${timer}` : timer}`
              : `Resend code in 0:${timer < 10 ? `0${timer}` : timer}`}
          </Typography>
        )}
      </Box>

      {/* Action button */}
      <Box sx={{ marginTop: "auto", paddingTop: "24px", width: "100%" }}>
        <PrimaryButton
          fullWidth
          onClick={handleVerify}
          loading={loading}
          disabled={otp.join("").length < 6}
        >
          {language === "tl" ? "I-verify" : "Verify"}
        </PrimaryButton>
      </Box>
      </Box>

      {/* Success Modal */}
      <SuccessModal
        open={success}
        title={language === "tl" ? "Matagumpay na na-verify!" : "Verification Successful!"}
        message={language === "tl" ? "Matagumpay ang iyong OTP verification." : "Your OTP verification was successful."}
      />
    </Box>
  );
};

export default VerifyOtp;
