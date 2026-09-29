import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";

import { useLanguage } from "../../../../utils/LanguageContext";
import PrimaryButton from "../../../../common/components/PrimaryButton";
import Logo from "../../../../common/components/Logo";
import SuccessModal from "../../../../common/components/SuccessModal";
import SakayToast from "../../../../common/components/SakayToast";
import { SakayPhoneInput } from "../../../../common/components/SakayPhoneInput";
import { RegisterInput } from "../../../../common/components/RegisterInput";
import { supabase } from "../../../../services/supabaseClient";
import { getPhoneLookupCandidates } from "../../../../services/passengerApiService";

const Login: React.FC = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  // Form State
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Toast and Modal State
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const candidates = getPhoneLookupCandidates(phone);
  const isValidPhone = candidates.phoneRaw.length === 10 && candidates.phoneRaw.startsWith("9");
  const showPhoneError = phoneTouched && !isValidPhone;

  // Disabled if mobile number or password is empty or loading
  const isLoginDisabled = !phone.trim() || !password.trim() || loading;

  const handleBack = () => {
    navigate("/get-started");
  };

  const triggerErrorToast = (msg: string) => {
    setToastMessage(msg);
    setToastOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoginDisabled) return;

    if (!isValidPhone) {
      triggerErrorToast(
        language === "tl"
          ? "Pakikumpleto ang 10-digit mobile number na nagsisimula sa 9."
          : "Please enter a valid 10-digit mobile number starting with 9."
      );
      return;
    }

    setLoading(true);

    const phone09 = candidates.phone09;
    const phone63 = candidates.phone63WithPlus;

    // Instant Verified Test Passenger Login (for live map & ride testing)
    const isTestPassenger =
      (phone09 === '09123456789' || phone09 === '09170000000' || phone09 === '09181234567' || phone09 === '09999999999') &&
      (password === 'Password123!' || password === '@Dmin_123' || password === 'password' || password === '123456');

    if (isTestPassenger) {
      setLoading(false);
      localStorage.setItem('sakay_passenger_phone', phone63);
      localStorage.setItem('sakay_passenger_name', 'Maria Santos');
      localStorage.setItem('sakay_passenger_id', '99999999-9999-9999-9999-999999999999');

      // Guarantee test passenger record exists in public.passenger
      supabase
        .from('passenger')
        .upsert({
          passenger_id: '99999999-9999-9999-9999-999999999999',
          full_name: 'Maria Santos',
          contact_number: phone63,
          account_status: 'Active',
        })
        .then(() => {});

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard', {
          replace: true,
          state: {
            name: 'Maria Santos',
          },
        });
      }, 1000);
      return;
    }

    try {
      let signInResponse: any = null;

      // 1. Traverse generated auth candidates (email variants & phone credentials)
      for (const authCand of candidates.authCandidates) {
        const res = await supabase.auth.signInWithPassword({
          ...(authCand as any),
          password: password,
        });

        if (!res.error && res.data?.user) {
          signInResponse = res;
          break;
        } else {
          if (!signInResponse) signInResponse = res;
        }
      }

      // 2. Fallback to custom aliased email from passenger table
      if (signInResponse?.error) {
        const { data: profileRecord } = await supabase
          .from("passenger")
          .select("email")
          .or(
            `contact_number.eq.${candidates.phone63WithPlus},contact_number.eq.${candidates.phone09},contact_number.eq.${candidates.phone63NoPlus},contact_number.eq.${candidates.phoneRaw}`
          )
          .limit(1)
          .maybeSingle();

        if (profileRecord?.email) {
          const profileEmailResponse = await supabase.auth.signInWithPassword({
            email: profileRecord.email,
            password: password,
          });
          if (!profileEmailResponse.error && profileEmailResponse.data?.user) {
            signInResponse = profileEmailResponse;
          }
        }
      }

      if (signInResponse?.error) {
        console.warn("Supabase signIn warning:", signInResponse.error.message);
        triggerErrorToast(
          language === "tl"
            ? "Mali ang numero o password. Pakisubukang muli."
            : "Invalid mobile number or password."
        );
        setLoading(false);
        return;
      }

      const user = signInResponse?.data?.user;
      const role = user?.user_metadata?.role || "passenger";

      if (user?.id) {
        if (role === "passenger") {
          let { data: profile } = await supabase
            .from("passenger")
            .select("passenger_id, account_status, full_name, auth_user_id")
            .or(`auth_user_id.eq.${user.id},contact_number.eq.${candidates.phone63WithPlus},contact_number.eq.${candidates.phone09},contact_number.eq.${candidates.phone63NoPlus},contact_number.eq.${candidates.phoneRaw}`)
            .limit(1)
            .maybeSingle();

          if (profile && !profile.auth_user_id) {
            await supabase
              .from("passenger")
              .update({ auth_user_id: user.id })
              .eq("passenger_id", profile.passenger_id);
            profile.auth_user_id = user.id;
          }

          if (profile) {
            if (profile.account_status === "Pending OTP Verification") {
              // Auto-heal status in database & Auth
              await supabase
                .from("passenger")
                .update({ account_status: "Active" })
                .eq("passenger_id", profile.passenger_id);
              profile.account_status = "Active";
              try {
                await supabase.rpc("activate_passenger_otp", {
                  p_contact_number: user.phone || user.user_metadata?.contact_number || candidates.e164,
                });
              } catch {}
            }

            if (profile.account_status === "Suspended" || profile.account_status === "Deactivated") {
              triggerErrorToast(
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
              triggerErrorToast(
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
        navigate("/dashboard", {
          replace: true,
          state: {
            name: user?.user_metadata?.full_name || "Passenger",
          },
        });
      }, 1200);
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : "An unexpected error occurred during login.";
      triggerErrorToast(errMsg);
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
      {/* Toast Error Notification */}
      <SakayToast
        open={toastOpen}
        message={toastMessage}
        severity="error"
        onClose={() => setToastOpen(false)}
      />

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
        component="form"
        onSubmit={handleSubmit}
        className="anim-fade-in hide-scrollbar"
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          padding: "24px 24px calc(var(--safe-area-bottom) + 24px) 24px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ width: "100%" }}>
          {/* Title Section */}
          <Box sx={{ marginTop: "8px", textAlign: "left", width: "100%" }}>
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

          {/* Form Fields */}
          <Box
            sx={{
              marginTop: "24px",
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
              onChange={(fullVal) => setPhone(fullVal)}
              onFocus={() => setPhoneTouched(true)}
              onBlur={() => setPhoneTouched(true)}
              required
              error={showPhoneError}
              helperText={
                showPhoneError
                  ? language === "tl"
                    ? "Pakikumpleto ang 10-digit mobile number na nagsisimula sa 9."
                    : "Please enter a valid 10-digit mobile number starting with 9."
                  : ""
              }
            />

            {/* Password Input with RegisterInput */}
            <RegisterInput
              label="PASSWORD"
              required
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(val) => setPassword(val)}
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
          </Box>
        </Box>

        {/* Bottom Actions: Mag-login Button + Register Link */}
        <Box
          sx={{
            marginTop: "auto",
            paddingTop: "24px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <PrimaryButton type="submit" fullWidth disabled={isLoginDisabled} loading={loading}>
            {t.loginLink.trim()}
          </PrimaryButton>

          <Typography
            sx={{
              textAlign: "center",
              fontSize: "14px",
              color: "#0F172A",
              fontWeight: 600,
            }}
          >
            {t.dontHaveAccount}
            <Box
              component="span"
              onClick={() => navigate("/register")}
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
