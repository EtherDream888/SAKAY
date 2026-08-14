import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import BadgeIcon from "@mui/icons-material/Badge";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ContactPageIcon from "@mui/icons-material/ContactPage";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import PersonIcon from "@mui/icons-material/Person";
import SportsMotorsportsIcon from "@mui/icons-material/SportsMotorsports";
import { useLanguage } from "../../../../utils/LanguageContext";
import PrimaryButton from "../../../../common/components/PrimaryButton";
import Logo from "../../../../common/components/Logo";
import SuccessModal from "../../../../common/components/SuccessModal";
import { supabase } from "../../../../services/supabaseClient";
import { formatPhoneToE164 } from "../../../../utils/phone";

const Register: React.FC = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve selected role from AccountSelection page state
  const selectedRole = (location.state as { role?: "passenger" | "driver" })?.role || "passenger";

  // Common Form State
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Passenger Specific Form State
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  
  // Driver Form State
  const [todaName, setTodaName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [plateNumber, setPlateNumber] = useState("");

  // Loading/Feedback State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validations
    if (!name.trim()) {
      setError(t.nameRequired);
      return;
    }
    if (!identifier.trim()) {
      setError(t.phoneRequired);
      return;
    }

    // Driver Specific Validations
    if (selectedRole === "driver") {
      if (!todaName.trim()) {
        setError(language === "tl" ? "Kailangan ang TODA Name/Number" : "TODA Name/Number is required");
        return;
      }
      if (!licenseNumber.trim()) {
        setError(language === "tl" ? "Kailangan ang Driver's License" : "Driver's License is required");
        return;
      }
      if (!plateNumber.trim()) {
        setError(language === "tl" ? "Kailangan ang Plate Number" : "Tricycle Plate Number is required");
        return;
      }
    }

    if (!password) {
      setError(t.passwordRequired);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.passwordsMustMatch);
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = formatPhoneToE164(identifier);

      // 1. Run duplicate checks in app code BEFORE calling signUp()
      const { data: existingPassengerPhone, error: pPhoneErr } = await supabase
        .from('passenger')
        .select('passenger_id')
        .eq('contact_number', formattedPhone)
        .maybeSingle();

      if (pPhoneErr) {
        console.error("Passenger phone check error:", pPhoneErr);
      }

      const { data: existingDriverPhone, error: dPhoneErr } = await supabase
        .from('driver')
        .select('driver_id')
        .eq('contact_number', formattedPhone)
        .maybeSingle();

      if (dPhoneErr) {
        console.error("Driver phone check error:", dPhoneErr);
      }

      if (existingPassengerPhone || existingDriverPhone) {
        setError(language === "tl" ? "Ang mobile number na ito ay rehistrado na." : "This mobile number is already registered.");
        setLoading(false);
        return;
      }

      let matchedTodaId: string | null = null;

      if (selectedRole === "driver") {
        const { data: existingDriverLicense, error: dLicenseErr } = await supabase
          .from('driver')
          .select('driver_id')
          .eq('license_number', licenseNumber.trim())
          .maybeSingle();

        if (dLicenseErr) {
          console.error("Driver license check error:", dLicenseErr);
        }

        if (existingDriverLicense) {
          setError(language === "tl" ? "Ang license number na ito ay rehistrado na." : "This license number is already registered.");
          setLoading(false);
          return;
        }

        // Lookup matching TODA id by acronym or name if possible
        const { data: matchedToda, error: todaErr } = await supabase
          .from('toda')
          .select('toda_id')
          .or(`toda_name.ilike.%${todaName}%,toda_acronym.ilike.%${todaName}%`)
          .limit(1)
          .maybeSingle();

        if (todaErr) {
          console.error("TODA lookup error:", todaErr);
        }

        if (matchedToda) {
          matchedTodaId = matchedToda.toda_id;
        }
      }

      // 2. Call Supabase Auth signUp()
      const { error: signUpError } = await supabase.auth.signUp({
        phone: formattedPhone,
        password: password,
        options: {
          data: {
            role: selectedRole,
            full_name: name,
            contact_number: formattedPhone,
            email: email.trim() || null,
            date_of_birth: dob || null,
            residential_address: address.trim() || null,
            profile_photo_url: null,
            // For drivers, pass the collected metadata fields
            ...(selectedRole === "driver" && {
              toda_id: matchedTodaId,
              license_number: licenseNumber.trim(),
              plate_number: plateNumber.trim(),
            })
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      setSuccess(true);

      setTimeout(() => {
        // Navigate to verify OTP, passing phone and metadata context
        navigate("/verify-otp", {
          state: {
            identifier: formattedPhone,
            role: selectedRole,
          },
        });
      }, 1500);

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred during registration.";
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
          onClick={() => navigate("/account-selection")}
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

      {/* Title Section */}
      <Box sx={{ marginTop: "24px", textAlign: "left", width: "100%" }}>
        <Typography
          component="h2"
          sx={{
            fontSize: "26px",
            fontWeight: 800,
            color: "#0F172A",
            lineHeight: 1.3,
          }}
        >
          {t.registerTitle}
        </Typography>
        <Typography
          sx={{
            fontSize: "15px",
            color: "#64748B",
            marginTop: "6px",
          }}
        >
          {t.registerSubtitle}
        </Typography>
      </Box>

      {/* Selected Role Badge */}
      <Box className="anim-scale-in" sx={{ marginTop: "16px", display: "flex", justifyContent: "flex-start", width: "100%" }}>
        <Chip
          icon={selectedRole === "passenger" ? <PersonIcon /> : <SportsMotorsportsIcon />}
          label={`${selectedRole === "passenger" ? t.passenger : t.driver} Account`}
          color="primary"
          variant="outlined"
          sx={{
            fontWeight: 600,
            borderRadius: "10px",
            backgroundColor: "rgba(255, 107, 0, 0.05)",
            borderColor: "rgba(255, 107, 0, 0.3)",
            color: "#FF6B00",
            "& .MuiChip-icon": { color: "#FF6B00" },
            height: "36px",
            padding: "4px 8px",
          }}
        />
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ width: "100%", marginTop: "16px", borderRadius: "12px" }}>
          {error}
        </Alert>
      )}

      {/* Form */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        className="anim-fade-in"
        sx={{
          marginTop: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          width: "100%",
        }}
      >
        {/* Full Name */}
        <Box sx={{ width: "100%" }}>
          <TextField
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            placeholder={t.fullName}
            type="text"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlinedIcon sx={{ color: "#94A3B8" }} />
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

        {/* Email or Mobile Number */}
        <Box sx={{ width: "100%" }}>
          <TextField
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={loading}
            placeholder={selectedRole === "passenger" ? (language === "tl" ? "Numero ng Mobile" : "Mobile Number") : t.phoneOrEmail}
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

        {/* Passenger Specific Fields */}
        {selectedRole === "passenger" && (
          <>
            {/* Email */}
            <Box sx={{ width: "100%" }}>
              <TextField
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder={language === "tl" ? "Email Address (Opsyonal)" : "Email (Optional)"}
                type="email"
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

            {/* Date of Birth */}
            <Box sx={{ width: "100%" }}>
              <TextField
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                disabled={loading}
                type="date"
                label={language === "tl" ? "Araw ng Kapanganakan (Opsyonal)" : "Date of Birth (Optional)"}
                slotProps={{
                  inputLabel: { shrink: true },
                  input: {
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

            {/* Residential Address */}
            <Box sx={{ width: "100%" }}>
              <TextField
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={loading}
                placeholder={language === "tl" ? "Tirahan (Opsyonal)" : "Residential Address (Optional)"}
                type="text"
                multiline
                rows={2}
                slotProps={{
                  input: {
                    sx: {
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
          </>
        )}

        {/* Driver Specific Fields */}
        {selectedRole === "driver" && (
          <>
            {/* TODA Number / Name */}
            <Box sx={{ width: "100%" }}>
              <TextField
                value={todaName}
                onChange={(e) => setTodaName(e.target.value)}
                disabled={loading}
                placeholder={language === "tl" ? "TODA Name / Operator No." : "TODA Name / Operator No."}
                type="text"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <AssignmentIcon sx={{ color: "#94A3B8" }} />
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

            {/* Driver's License Number */}
            <Box sx={{ width: "100%" }}>
              <TextField
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                disabled={loading}
                placeholder={language === "tl" ? "Driver's License Number" : "Driver's License Number"}
                type="text"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeIcon sx={{ color: "#94A3B8" }} />
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

            {/* Tricycle Plate Number */}
            <Box sx={{ width: "100%" }}>
              <TextField
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                disabled={loading}
                placeholder={language === "tl" ? "Tricycle Plate Number" : "Tricycle Plate Number"}
                type="text"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <ContactPageIcon sx={{ color: "#94A3B8" }} />
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
          </>
        )}

        {/* Password */}
        <Box sx={{ width: "100%" }}>
          <TextField
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder={t.password}
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

        {/* Confirm Password */}
        <Box sx={{ width: "100%" }}>
          <TextField
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            placeholder={t.confirmPassword}
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

        {/* Signup Button */}
        <Box sx={{ marginTop: "16px", width: "100%" }}>
          <PrimaryButton type="submit" fullWidth loading={loading}>
            {t.createAccountBtn}
          </PrimaryButton>
        </Box>
      </Box>

      {/* Bottom Link */}
      <Box
        className="anim-fade-in-up"
        sx={{
          marginTop: "auto",
          paddingTop: "24px",
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
          {t.hasAccount}
          <Box
            component="span"
            onClick={() => navigate("/login")}
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
            {t.loginLink.trim()}
          </Box>
        </Typography>
      </Box>

      {/* Success Modal */}
      <SuccessModal
        open={success}
        title={language === "tl" ? "Matagumpay na Pagrehistro!" : "Registration Successful!"}
        message={t.successRegister}
      />
    </Box>
  );
};

export default Register;
