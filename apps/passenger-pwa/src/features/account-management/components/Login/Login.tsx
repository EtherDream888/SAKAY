import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import Alert from "@mui/material/Alert";

import { useLanguage } from "../../../../utils/LanguageContext";
import PrimaryButton from "../../../../common/components/PrimaryButton";
import Logo from "../../../../common/components/Logo";
import SuccessModal from "../../../../common/components/SuccessModal";
import { SakayPhoneInput } from "../../../../common/components/SakayPhoneInput";
import { RegisterInput } from "../../../../common/components/RegisterInput";
import { supabase } from "../../../../services/supabaseClient";
import { formatPhoneToE164 } from "../../../../utils/phone";

const Login: React.FC = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  // Form State - Mobile Number and Password only (consistent with Sign Up)
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Validation / Message State
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const cleanPhoneDigits = phone.replace(/\D/g, "");
  const isValidPhone = cleanPhoneDigits.length === 11 && cleanPhoneDigits.startsWith("09");

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/get-started");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setHasAttemptedSubmit(true);

    // Form Validations
    if (!phone.trim() || !isValidPhone) {
      setError(
        language === "tl"
          ? "Pakikumpleto ang 10-digit mobile number na nagsisimula sa 9."
          : "Please enter a valid 10-digit mobile number starting with 9."
      );
      return;
    }
    if (!password) {
      setError(t.passwordRequired);
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = formatPhoneToE164(cleanPhoneDigits);
      const phone63NoPlus = `63${cleanPhoneDigits.slice(1)}`;
      const passengerEmail = `passenger_${phone63NoPlus}@sakay.ph`;

      // 1. Attempt phone sign-in first
      let signInResponse = await supabase.auth.signInWithPassword({
        phone: formattedPhone,
        password: password,
      });

      // 2. Fallback to generated passenger email
      if (signInResponse.error) {
        const emailResponse = await supabase.auth.signInWithPassword({
          email: passengerEmail,
          password: password,
        });
        if (!emailResponse.error && emailResponse.data?.user) {
          signInResponse = emailResponse;
        } else {
          // Check if passenger record has custom/aliased email registered
          const { data: profileRecord } = await supabase
            .from("passenger")
            .select("email")
            .or(
              `contact_number.eq.${formattedPhone},contact_number.eq.0${cleanPhoneDigits.slice(-10)},contact_number.eq.+63${cleanPhoneDigits.slice(-10)}`
            )
            .limit(1)
            .maybeSingle();

          if (profileRecord?.email && profileRecord.email !== passengerEmail) {
            const profileEmailResponse = await supabase.auth.signInWithPassword({
              email: profileRecord.email,
              password: password,
            });
            if (!profileEmailResponse.error && profileEmailResponse.data?.user) {
              signInResponse = profileEmailResponse;
            }
          }
        }
      }

      if (signInResponse.error) {
        console.warn("Supabase signIn warning:", signInResponse.error.message);
        setError(
          language === "tl"
            ? "Mali ang numero o password. Pakisubukang muli."
            : "Invalid mobile number or password."
        );
        setLoading(false);
        return;
      }

      const user = signInResponse.data?.user;
      const role = user?.user_metadata?.role || "passenger";

      if (user?.id) {
        if (role === "passenger") {
          const { data: profile } = await supabase
            .from("passenger")
            .select("account_status, full_name")
            .eq("auth_user_id", user.id)
            .maybeSingle();

          if (profile) {
            if (profile.account_status === "Pending OTP Verification") {
              // Show error clearly without automatic hijacking/redirect
              setError(
                language === "tl"
                  ? "Kailangan munang ma-verify ang inyong numero gamit ang OTP bago makapag-login."
                  : "Your mobile number needs to be verified with OTP before logging in."
              );
              setLoading(false);
              await supabase.auth.signOut();
              return;
            }

            if (profile.account_status === "Suspended" || profile.account_status === "Deactivated") {
              setError(
                language === "tl"
                  ? "Ang inyong account ay suspendido o na-deactivate."
                  : "Your account has been suspended or deactivated."
              );
              setLoading(false);
              await supabase.auth.signOut();
              return;
            }
          }
        } else if (role === "driver") {
          const { data: profile } = await supabase
            .from("driver")
            .select("account_status")
            .eq("auth_user_id", user.id)
            .maybeSingle();

          if (profile) {
            if (profile.account_status === "Suspended" || profile.account_status === "Deactivated") {
              setError(
                language === "tl"
                  ? "Ang inyong account ay suspendido o na-deactivate."
                  : "Your account has been suspended or deactivated."
              );
              setLoading(false);
              await supabase.auth.signOut();
              return;
            }
          }
        }
      }

      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        // Reset location permission cache for fresh login prompt
        localStorage.removeItem("gps_permission");
        sessionStorage.removeItem("gps_permission_session");

        // Redirect to dashboard with history replacement
        navigate("/dashboard", {
          replace: true,
          state: {
            name: user?.user_metadata?.full_name || "Passenger",
            freshLogin: true,
          },
        });
      }, 1200);
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : "An unexpected error occurred during login.";
      setError(errMsg);
      setLoading(false);
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
          onClick={handleBack}
          sx={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
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

        <Logo color="orange" width={110} />
      </Box>

      {/* Scrollable Form Body */}
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
        {/* Title Section */}
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
            {t.loginTitle}
          </Typography>
          <Typography
            sx={{
              fontSize: "15px",
              color: "#64748B",
              marginTop: "8px",
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            {language === "tl"
              ? "Ilagay ang inyong numero ng telepono at password upang mag-login."
              : "Enter your mobile number and password to log in."}
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ width: "100%", marginTop: "16px", borderRadius: "12px" }}>
            {error}
          </Alert>
        )}

        {/* Form - Styled Identically to Register.tsx */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          className="anim-fade-in"
          sx={{
            marginTop: "28px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            width: "100%",
          }}
        >
          {/* Mobile Number with SakayPhoneInput */}
          <SakayPhoneInput
            label={language === "tl" ? "NUMERO NG TELEPONO" : "MOBILE NUMBER"}
            value={phone}
            onChange={(fullVal) => {
              setPhone(fullVal);
              if (error) setError(null);
            }}
            required
            error={hasAttemptedSubmit && !isValidPhone}
            helperText={
              hasAttemptedSubmit && !isValidPhone
                ? language === "tl"
                  ? "Pakikumpleto ang 10-digit mobile number na nagsisimula sa 9."
                  : "Please enter a valid 10-digit mobile number starting with 9."
                : ""
            }
          />

          {/* Password Input with RegisterInput */}
          <RegisterInput
            label="PASSWORD"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(val) => {
              setPassword(val);
              if (error) setError(null);
            }}
            error={hasAttemptedSubmit && !password}
            helperText={hasAttemptedSubmit && !password ? t.passwordRequired : ""}
            endAdornment={
              <IconButton
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
                size="small"
                sx={{ color: "#64748B" }}
              >
                {showPassword ? (
                  <VisibilityOffOutlinedIcon fontSize="small" />
                ) : (
                  <VisibilityOutlinedIcon fontSize="small" />
                )}
              </IconButton>
            }
          />

          {/* Forgot Password Link */}
          <Box sx={{ width: "100%", display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
            <Typography
              onClick={() => navigate("/forgot-password")}
              sx={{
                fontSize: "14px",
                color: "#FF6B00",
                fontWeight: 600,
                cursor: "pointer",
                "&:hover": {
                  textDecoration: "underline",
                  color: "#E66000",
                },
              }}
            >
              {t.forgotPassword}
            </Typography>
          </Box>

          <Box sx={{ marginTop: "20px", width: "100%" }}>
            <PrimaryButton type="submit" fullWidth loading={loading}>
              {t.loginLink.trim()}
            </PrimaryButton>
          </Box>
        </Box>

        {/* Bottom Link */}
        <Box
          className="anim-fade-in-up"
          sx={{
            marginTop: "auto",
            paddingTop: "28px",
            textAlign: "center",
            width: "100%",
          }}
        >
          <Typography
            sx={{
              fontSize: "14px",
              color: "#0F172A",
              fontWeight: 600,
            }}
          >
            {t.dontHaveAccount}
            <Box
              component="span"
              onClick={() => navigate("/account-selection")}
              sx={{
                color: "#FF6B00",
                fontWeight: 700,
                cursor: "pointer",
                marginLeft: "6px",
                transition: "color 0.2s",
                "&:hover": {
                  color: "#E66000",
                  textDecoration: "underline",
                },
              }}
            >
              {t.registerLink.trim()}
            </Box>
          </Typography>
        </Box>
      </Box>

      {/* Success Modal */}
      <SuccessModal
        open={success}
        title={language === "tl" ? "Matagumpay na Login!" : "Login Successful!"}
        message={t.successLogin}
      />
    </Box>
  );
};

export default Login;
