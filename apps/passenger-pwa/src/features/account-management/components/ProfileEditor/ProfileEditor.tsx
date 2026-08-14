import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import Avatar from "@mui/material/Avatar";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { useLanguage } from "../../../../utils/LanguageContext";
import PrimaryButton from "../../../../common/components/PrimaryButton";
import SuccessModal from "../../../../common/components/SuccessModal";
import { supabase } from "../../../../services/supabaseClient";

const ProfileEditor: React.FC = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  // Load States
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Profile Form States
  const [fullName, setFullName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Feedback State
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchUserProfile = useCallback(async (showLoading = false) => {
    try {
      // Get current authenticated user (first async step)
      const { data: { user }, error: authErr } = await supabase.auth.getUser();

      if (showLoading) {
        setLoadingProfile(true);
      }
      setError(null);

      if (authErr || !user) {
        setError(language === "tl" ? "Mangyaring mag-login muli." : "Please log in again.");
        setLoadingProfile(false);
        navigate("/login");
        return;
      }

      setContactNumber(user.phone || "");
      setEmail(user.email || "");

      // Fetch passenger profile from database
      const { data: profile, error: dbErr } = await supabase
        .from("passenger")
        .select("full_name, residential_address, profile_photo_url")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (dbErr) {
        console.error("Error fetching database profile:", dbErr);
      }

      if (profile) {
        setFullName(profile.full_name || user.user_metadata?.full_name || "");
        setAddress(profile.residential_address || "");
        setProfilePhotoUrl(profile.profile_photo_url || "");
      } else {
        // Fallback to auth metadata if profile doesn't exist
        setFullName(user.user_metadata?.full_name || "");
      }

      setLoadingProfile(false);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to load user profile.";
      setError(errMsg);
      setLoadingProfile(false);
    }
  }, [language, navigate]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  // Upload Profile Picture to Supabase Storage
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadingPhoto(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User session not found.");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload file to 'profiles' storage bucket
      const { error: uploadErr } = await supabase.storage
        .from("profiles")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) {
        throw new Error(uploadErr.message);
      }

      // Retrieve public URL
      const { data: { publicUrl } } = supabase.storage
        .from("profiles")
        .getPublicUrl(filePath);

      setProfilePhotoUrl(publicUrl);
      
      // Update database profile photo URL immediately
      const { error: updateErr } = await supabase
        .from("passenger")
        .update({ profile_photo_url: publicUrl })
        .eq("auth_user_id", user.id);

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      // Also update auth user metadata
      await supabase.auth.updateUser({
        data: { profile_photo_url: publicUrl }
      });

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to upload photo. Make sure a public storage bucket named 'profiles' is configured.";
      setError(errMsg);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError(t.nameRequired || "Name is required");
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No active user session.");

      // 1. Update passenger details in public schema
      const { error: dbUpdateErr } = await supabase
        .from("passenger")
        .update({
          full_name: fullName.trim(),
          residential_address: address.trim(),
        })
        .eq("auth_user_id", user.id);

      if (dbUpdateErr) {
        throw new Error(dbUpdateErr.message);
      }

      // 2. Update metadata in Auth
      const { error: authUpdateErr } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
        }
      });

      if (authUpdateErr) {
        throw new Error(authUpdateErr.message);
      }

      // 3. Update password if provided
      if (newPassword.trim()) {
        if (newPassword.length < 6) {
          throw new Error(language === "tl" ? "Dapat hindi bababa sa 6 na karakter ang password" : "Password must be at least 6 characters");
        }
        const { error: passErr } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (passErr) {
          throw new Error(passErr.message);
        }
        setNewPassword(""); // Reset password field on success
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        fetchUserProfile(); // Refresh profile state
      }, 1500);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to update profile.";
      setError(errMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loadingProfile) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#FFFFFF",
        }}
      >
        <CircularProgress sx={{ color: "#FF6B00" }} />
        <Typography sx={{ marginTop: "16px", color: "#64748B", fontWeight: 500 }}>
          {language === "tl" ? "Kinukuha ang profile..." : "Loading profile..."}
        </Typography>
      </Box>
    );
  }

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
          onClick={() => navigate("/dashboard")}
          sx={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
            color: "#1A1A1A",
            borderRadius: "14px",
            width: "44px",
            height: "44px",
            "&:hover": { backgroundColor: "#F8FAFC" },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>

        <Typography sx={{ fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
          {language === "tl" ? "I-edit ang Profile" : "Edit Profile"}
        </Typography>

        <Box sx={{ width: "44px" }} /> {/* spacer */}
      </Box>

      {/* Profile Photo Upload Section */}
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "32px" }}>
        <Box sx={{ position: "relative" }}>
          <Avatar
            src={profilePhotoUrl}
            sx={{
              width: "96px",
              height: "96px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              border: "3px solid #FFF",
              outline: "2px solid #E2E8F0"
            }}
          >
            {fullName.charAt(0).toUpperCase()}
          </Avatar>
          <IconButton
            component="label"
            disabled={uploadingPhoto}
            sx={{
              position: "absolute",
              bottom: 0,
              right: 0,
              backgroundColor: "#FF6B00",
              color: "#FFFFFF",
              "&:hover": { backgroundColor: "#E05300" },
              width: "32px",
              height: "32px",
              boxShadow: "0 4px 10px rgba(255,107,0,0.3)"
            }}
          >
            {uploadingPhoto ? (
              <CircularProgress size={16} sx={{ color: "#FFF" }} />
            ) : (
              <PhotoCameraIcon sx={{ fontSize: 16 }} />
            )}
            <input type="file" accept="image/*" hidden onChange={handlePhotoUpload} />
          </IconButton>
        </Box>
        <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "#475569", marginTop: "12px" }}>
          {contactNumber}
        </Typography>
      </Box>

      {/* Feedback Alert */}
      {error && (
        <Alert severity="error" sx={{ width: "100%", marginTop: "24px", borderRadius: "12px" }}>
          {error}
        </Alert>
      )}

      {/* Profile Edit Form */}
      <Box
        component="form"
        onSubmit={handleSave}
        sx={{
          marginTop: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          flexGrow: 1,
        }}
      >
        {/* Full Name */}
        <Box sx={{ width: "100%" }}>
          <Typography sx={{ fontSize: "13px", fontWeight: 600, color: "#64748B", marginBottom: "6px" }}>
            {language === "tl" ? "Buong Pangalan" : "Full Name"}
          </Typography>
          <TextField
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={saving}
            placeholder="E.g. Juan Dela Cruz"
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
            fullWidth
          />
        </Box>

        {/* Email (Read-Only) */}
        <Box sx={{ width: "100%" }}>
          <Typography sx={{ fontSize: "13px", fontWeight: 600, color: "#94A3B8", marginBottom: "6px" }}>
            {language === "tl" ? "Email (Hindi pwedeng baguhin)" : "Email Address (Read-only)"}
          </Typography>
          <TextField
            value={email}
            disabled
            slotProps={{
              input: {
                sx: {
                  height: "56px",
                  backgroundColor: "#F1F5F9",
                  borderRadius: "14px",
                  color: "#64748B",
                  "& fieldset": { borderColor: "#E2E8F0" },
                },
              },
            }}
            fullWidth
          />
        </Box>

        {/* Address */}
        <Box sx={{ width: "100%" }}>
          <Typography sx={{ fontSize: "13px", fontWeight: 600, color: "#64748B", marginBottom: "6px" }}>
            {language === "tl" ? "Residential Address" : "Residential Address"}
          </Typography>
          <TextField
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={saving}
            placeholder="Barangay, Calapan City, Oriental Mindoro"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <HomeOutlinedIcon sx={{ color: "#94A3B8" }} />
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
            fullWidth
          />
        </Box>

        {/* Change Password */}
        <Box sx={{ width: "100%" }}>
          <Typography sx={{ fontSize: "13px", fontWeight: 600, color: "#64748B", marginBottom: "6px" }}>
            {language === "tl" ? "Bagong Password (Iwanang bakante kung walang babaguhin)" : "New Password (Leave blank to keep current)"}
          </Typography>
          <TextField
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={saving}
            placeholder="••••••"
            type="password"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ color: "#94A3B8" }} />
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
            fullWidth
          />
        </Box>

        {/* Save Button */}
        <Box sx={{ marginTop: "auto", paddingTop: "24px" }}>
          <PrimaryButton type="submit" loading={saving} fullWidth>
            {language === "tl" ? "I-save ang mga Pagbabago" : "Save Changes"}
          </PrimaryButton>
        </Box>
      </Box>

      <SuccessModal
        open={success}
        title={language === "tl" ? "Tagumpay!" : "Success!"}
        message={language === "tl" ? "Matagumpay na na-update ang iyong profile." : "Your profile details have been successfully updated."}
      />
    </Box>
  );
};

export default ProfileEditor;
