import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Alert from "@mui/material/Alert";
import { useLanguage } from "../../../../utils/LanguageContext";
import PrimaryButton from "../../../../common/components/PrimaryButton";
import Logo from "../../../../common/components/Logo";
import SuccessModal from "../../../../common/components/SuccessModal";
import { supabase } from "../../../../services/supabaseClient";

const ResetPassword: React.FC = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve state passed from ForgotPassword
  const state = location.state as {
    identifier?: string;
  };

  const identifier = state?.identifier || "";

  // Form states
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (!password) {
      setError(t.passwordRequired);
      return;
    }
    if (password.length < 6) {
      setError(language === "tl" ? "Dapat hindi bababa sa 6 na karakter ang password" : "Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError(t.passwordsMustMatch);
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred while resetting password.';
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
        overflowY: "auto",
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
          onClick={() => navigate("/forgot-password")}
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
          {language === "tl" ? "I-reset ang Password" : "Reset Password"}
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
            ? `Gumawa ng bagong password para sa iyong account (${identifier})`
            : `Create a new password for your account (${identifier})`}
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
        {/* New Password */}
        <Box sx={{ width: "100%" }}>
          <TextField
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder={language === "tl" ? "Bagong Password" : "New Password"}
            type={showPassword ? "text" : "password"}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ color: "#94A3B8" }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={loading}
                    >
                      {showPassword ? <VisibilityOff sx={{ color: "#94A3B8" }} /> : <Visibility sx={{ color: "#94A3B8" }} />}
                    </IconButton>
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

        {/* Confirm New Password */}
        <Box sx={{ width: "100%" }}>
          <TextField
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            placeholder={language === "tl" ? "Kumpirmahin ang Bagong Password" : "Confirm New Password"}
            type={showConfirmPassword ? "text" : "password"}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ color: "#94A3B8" }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      disabled={loading}
                    >
                      {showConfirmPassword ? <VisibilityOff sx={{ color: "#94A3B8" }} /> : <Visibility sx={{ color: "#94A3B8" }} />}
                    </IconButton>
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
            {language === "tl" ? "I-update ang Password" : "Update Password"}
          </PrimaryButton>
        </Box>
      </Box>

      {/* Success Modal */}
      <SuccessModal
        open={success}
        title={language === "tl" ? "Matagumpay na Nireset!" : "Password Reset Successful!"}
        message={language === "tl" ? "Matagumpay na na-reset ang password ng iyong account." : "Your account password was successfully reset."}
      />
    </Box>
  );
};

export default ResetPassword;
