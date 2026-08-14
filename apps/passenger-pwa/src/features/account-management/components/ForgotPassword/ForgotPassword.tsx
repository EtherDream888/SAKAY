import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import Alert from "@mui/material/Alert";
import { useLanguage } from "../../../../utils/LanguageContext";
import PrimaryButton from "../../../../common/components/PrimaryButton";
import Logo from "../../../../common/components/Logo";
import SuccessModal from "../../../../common/components/SuccessModal";
import { supabase } from "../../../../services/supabaseClient";
import { formatPhoneToE164 } from "../../../../utils/phone";

const ForgotPassword: React.FC = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  // Input states
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError(t.phoneRequired);
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = formatPhoneToE164(identifier);

      // Check if user exists before triggering OTP
      const { data: existingPassenger } = await supabase
        .from('passenger')
        .select('passenger_id')
        .eq('contact_number', formattedPhone)
        .maybeSingle();

      const { data: existingDriver } = await supabase
        .from('driver')
        .select('driver_id')
        .eq('contact_number', formattedPhone)
        .maybeSingle();

      if (!existingPassenger && !existingDriver) {
        setError(language === "tl" ? "Hindi rehistrado ang mobile number na ito." : "This mobile number is not registered.");
        setLoading(false);
        return;
      }

      // Request recovery OTP via Supabase
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (otpError) {
        setError(otpError.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      setSuccess(true);
      
      setTimeout(() => {
        // Navigate to verify OTP, passing phone and recovery type in state
        navigate("/verify-otp", {
          state: {
            identifier: formattedPhone,
            type: 'recovery',
          },
        });
      }, 1500);

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred while requesting reset.';
      setError(errMsg);
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        padding: "24px",
        paddingTop: "calc(var(--safe-area-top) + 16px)",
        paddingBottom: "calc(var(--safe-area-bottom) + 24px)",
        backgroundColor: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
      }}
      className="hide-scrollbar"
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <IconButton
          onClick={() => navigate("/login")}
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

      {/* Title */}
      <Box sx={{ marginTop: "44px", textAlign: "left", width: "100%" }}>
        <Typography
          component="h2"
          sx={{
            fontSize: "26px",
            fontWeight: 800,
            color: "#0F172A",
            lineHeight: 1.3,
          }}
        >
          {language === "tl" ? "Nakalimutan ang Password?" : "Forgot Password?"}
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
            ? "Ilagay ang iyong email o mobile number para i-reset ang iyong password."
            : "Enter your email or mobile number to reset your password."}
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ width: "100%", marginTop: "24px", borderRadius: "12px" }}>
          {error}
        </Alert>
      )}

      {/* Form */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        className="anim-fade-in"
        sx={{
          marginTop: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          width: "100%",
        }}
      >
        <Box sx={{ width: "100%" }}>
          <TextField
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={loading}
            placeholder={t.phoneOrEmail}
            type="text"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon sx={{ color: "#94A3B8" }} />
                  </InputAdornment>
                ),
                sx: {
                  height: "56px",
                  backgroundColor: "#F8FAFC",
                  borderRadius: "14px",
                  "& fieldset": { borderColor: "#F1F5F9" },
                  "&:hover fieldset": { borderColor: "#CBD5E1" },
                  "&.Mui-focused fieldset": { borderColor: "#FF6B00" },
                },
              },
            }}
          />
        </Box>

        <Box sx={{ marginTop: "24px", width: "100%" }}>
          <PrimaryButton type="submit" fullWidth loading={loading}>
            {language === "tl" ? "Ipadala ang Reset Code" : "Send Reset Code"}
          </PrimaryButton>
        </Box>
      </Box>

      {/* Success Modal */}
      <SuccessModal
        open={success}
        title={language === "tl" ? "Naipadala na ang Code!" : "Code Sent!"}
        message={language === "tl" ? "Naipadala na ang reset code sa iyong email o mobile number." : "Reset code has been sent to your email or mobile number."}
      />
    </Box>
  );
};

export default ForgotPassword;
