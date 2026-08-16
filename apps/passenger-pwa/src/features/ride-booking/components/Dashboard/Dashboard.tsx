import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import NavigationIcon from "@mui/icons-material/Navigation";

import { supabase } from "../../../../services/supabaseClient";
import MapView from "../../../../common/components/MapView";
import HomeHeader from "./HomeHeader";
import HomeBottomSheet from "./HomeBottomSheet";
import PassengerNavigationDrawer from "./PassengerNavigationDrawer";
import TulongDialog from "./TulongDialog";
import NotificationsDialog from "./NotificationsDialog";
import { getBooking } from "../../../../services/bookingService";
import {
  DEFAULT_CALAPAN_CENTER,
  getCurrentDevicePosition,
} from "../../../../services/locationService";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Active Trip State check
  const activeBookingId = sessionStorage.getItem("current_active_booking_id");
  const activeBooking = activeBookingId ? getBooking(activeBookingId) : null;
  const isTripInProgress = activeBooking && activeBooking.booking_status !== "Completed" && activeBooking.booking_status !== "Cancelled";

  // Passenger Identity State
  const [profileName, setProfileName] = useState<string>(() => {
    return (location.state as { name?: string; userName?: string })?.name ||
           (location.state as { name?: string; userName?: string })?.userName ||
           "John";
  });
  const [profilePhoto, setProfilePhoto] = useState<string>("");
  const [contactNumber, setContactNumber] = useState<string>("");

  // Drawer and Modal States
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [tulongOpen, setTulongOpen] = useState<boolean>(false);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);

  // Location Permission Modal State: Open if location has not been granted or if fresh login
  const [permissionModalOpen, setPermissionModalOpen] = useState<boolean>(() => {
    const isFresh = (location.state as { freshLogin?: boolean })?.freshLogin;
    if (isFresh) return true;
    const gpsPermission = localStorage.getItem("gps_permission");
    return gpsPermission === null;
  });
  const [permissionRequesting, setPermissionRequesting] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string>("");

  // Map coordinates and recenter trigger state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() => {
    const stateCoords = (location.state as { coords?: { lat: number; lng: number } })?.coords;
    if (stateCoords && stateCoords.lat !== 0) {
      return stateCoords;
    }
    const savedLat = localStorage.getItem("user_lat");
    const savedLng = localStorage.getItem("user_lng");
    if (savedLat && savedLng) {
      return { lat: parseFloat(savedLat), lng: parseFloat(savedLng) };
    }
    return null;
  });

  const [recenterTrigger, setRecenterTrigger] = useState<number>(0);

  // Fetch Supabase Passenger profile info
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("passenger")
            .select("full_name, profile_photo_url, contact_number")
            .eq("auth_user_id", user.id)
            .maybeSingle();

          if (profile) {
            setProfileName(profile.full_name || user.user_metadata?.full_name || "John");
            setProfilePhoto(profile.profile_photo_url || "");
            setContactNumber(profile.contact_number || "");
          } else if (user.user_metadata?.full_name) {
            setProfileName(user.user_metadata.full_name);
          }
        }
      } catch (err) {
        console.error("Error fetching passenger profile:", err);
      }
    };
    fetchProfile();
  }, []);

  // Handle Permission Request from Dialog
  const handleAllowLocation = async (persist: boolean) => {
    setPermissionRequesting(true);
    setPermissionError("");

    try {
      const coords = await getCurrentDevicePosition();
      if (persist) {
        localStorage.setItem("gps_permission", "true");
      } else {
        sessionStorage.setItem("gps_permission_session", "true");
      }

      setUserLocation({ lat: coords.latitude, lng: coords.longitude });
      setRecenterTrigger((prev) => prev + 1);
      setPermissionModalOpen(false);
      setPermissionRequesting(false);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Hindi makuha ang iyong lokasyon.";
      setPermissionError(errMsg);
      setPermissionRequesting(false);
      localStorage.setItem("gps_permission", "false");
      setTimeout(() => {
        setPermissionModalOpen(false);
      }, 1500);
    }
  };

  const handleDenyLocation = () => {
    localStorage.setItem("gps_permission", "false");
    setPermissionModalOpen(false);
  };

  // If location permission was already granted previously, quietly sync real position on mount
  useEffect(() => {
    const gpsPermission = localStorage.getItem("gps_permission");
    if (gpsPermission === "true" && !permissionModalOpen) {
      getCurrentDevicePosition()
        .then((coords) => {
          setUserLocation({ lat: coords.latitude, lng: coords.longitude });
          setRecenterTrigger((prev) => prev + 1);
        })
        .catch(() => {
          // Keep previous or default
        });
    }
  }, [permissionModalOpen]);

  // Extract first name for personalized greeting
  const firstName = profileName.trim().split(" ")[0] || "John";

  const handleLogout = async () => {
    setDrawerOpen(false);
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleStartNewTrip = () => {
    const gpsPermission = localStorage.getItem("gps_permission");
    if (gpsPermission === null) {
      navigate("/location-permission");
    } else {
      navigate("/new-trip", { state: { hasGps: gpsPermission === "true" } });
    }
  };

  const handleHomeTrip = () => {
    sessionStorage.setItem(
      "trip_dropoff",
      JSON.stringify({
        address: "Home (San Vicente, Calapan City)",
        lat: 13.4124,
        lng: 121.1834,
      })
    );
    handleStartNewTrip();
  };

  const handleAddPlace = () => {
    navigate("/set-place", {
      state: { target: "dropoff", address: "", lat: 0, lng: 0 },
    });
  };

  // Real recenter button handler: queries latest real GPS position and pans Google Map
  const handleRecenterGps = async () => {
    try {
      const coords = await getCurrentDevicePosition();
      setUserLocation({ lat: coords.latitude, lng: coords.longitude });
      setRecenterTrigger((prev) => prev + 1);
    } catch {
      // If geolocation not allowed or unavailable, fallback to default center
      setUserLocation({
        lat: DEFAULT_CALAPAN_CENTER.latitude,
        lng: DEFAULT_CALAPAN_CENTER.longitude,
      });
      setRecenterTrigger((prev) => prev + 1);
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        backgroundColor: "#E3ECEF",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 1. Real Google Maps View */}
      <MapView
        userLocation={userLocation}
        recenterTrigger={recenterTrigger}
      />

      {/* 2. Floating Header Controls respecting safe-area-inset-top */}
      <HomeHeader
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onOpenTulong={() => setTulongOpen(true)}
      />

      {/* Active Ongoing Trip Banner Pill */}
      {isTripInProgress && activeBookingId && (
        <Paper
          elevation={4}
          onClick={() => navigate('/trip-monitoring', { state: { bookingId: activeBookingId } })}
          sx={{
            position: "absolute",
            top: "calc(var(--safe-area-top) + 80px)",
            left: "16px",
            right: "16px",
            zIndex: 15,
            padding: "10px 16px",
            borderRadius: "16px",
            backgroundColor: "#0F172A",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            border: "1px solid rgba(255, 107, 0, 0.5)",
            transition: "transform 0.2s ease",
            "&:hover": { transform: "scale(1.02)" },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Box
              sx={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: "#FF6B00",
                animation: "pulse 1.5s infinite ease-in-out",
                "@keyframes pulse": {
                  "0%": { transform: "scale(0.8)", opacity: 1 },
                  "50%": { transform: "scale(1.3)", opacity: 0.7 },
                  "100%": { transform: "scale(0.8)", opacity: 1 },
                },
              }}
            />
            <Box>
              <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#FF6B00" }}>
                Aktibong Biyahe: {activeBooking.booking_status}
              </Typography>
              <Typography sx={{ fontSize: "11px", color: "#94A3B8" }}>
                {activeBooking.pickup_address.split(',')[0]} ➜ {activeBooking.dropoff_address.split(',')[0]}
              </Typography>
            </Box>
          </Box>
          <Typography sx={{ fontSize: "12px", fontWeight: 800, color: "#FFFFFF" }}>
            Subaybayan ➜
          </Typography>
        </Paper>
      )}

      {/* 3. Floating Recenter GPS Location Button */}
      <IconButton
        onClick={handleRecenterGps}
        aria-label="Recenter map location"
        sx={{
          position: "absolute",
          bottom: "calc(var(--safe-area-bottom) + 235px)",
          right: "16px",
          backgroundColor: "#FFFFFF",
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          boxShadow: "0 4px 14px rgba(15, 23, 42, 0.15)",
          color: "#0F172A",
          zIndex: 10,
          transition: "all 0.2s ease",
          "&:hover": {
            backgroundColor: "#F8FAFC",
            transform: "scale(1.05)",
          },
          "&:active": {
            transform: "scale(0.95)",
          },
        }}
      >
        <NavigationIcon sx={{ fontSize: 20, transform: "rotate(45deg)" }} />
      </IconButton>

      {/* 4. Bottom Sheet Card Container respecting safe-area-inset-bottom */}
      <HomeBottomSheet
        firstName={firstName}
        onStartNewTrip={handleStartNewTrip}
        onHomeTrip={handleHomeTrip}
        onAddPlace={handleAddPlace}
      />

      {/* 5. Mobile Navigation Drawer (Constrained to mobile viewport & safe areas) */}
      <PassengerNavigationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        profileName={profileName}
        profilePhoto={profilePhoto}
        contactNumber={contactNumber}
        onNavigateNewTrip={handleStartNewTrip}
        onNavigateProfile={() => navigate("/profile")}
        onOpenTulong={() => setTulongOpen(true)}
        onLogout={handleLogout}
      />

      {/* 6. Support & Notification Dialog Modals */}
      <TulongDialog open={tulongOpen} onClose={() => setTulongOpen(false)} />
      <NotificationsDialog
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />

      {/* 7. Location Permission Modal Card (Direct in-app prompt) */}
      {permissionModalOpen && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(3px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "calc(var(--safe-area-top) + 20px) 24px calc(var(--safe-area-bottom) + 20px) 24px",
          }}
        >
          <Paper
            elevation={10}
            className="anim-scale-in"
            sx={{
              width: "100%",
              maxWidth: "330px",
              backgroundColor: "#FFFFFF",
              borderRadius: "24px",
              overflow: "hidden",
              textAlign: "center",
              boxShadow: "0 24px 48px rgba(0,0,0,0.25)",
            }}
          >
            <Box sx={{ padding: "24px 20px 20px 20px" }}>
              <Typography
                sx={{
                  fontSize: "17px",
                  fontWeight: 800,
                  color: "#0F172A",
                  lineHeight: 1.35,
                  marginBottom: "12px",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                Payagan ang “SAKAY” na gamitin ang iyong lokasyon?
              </Typography>
              <Typography
                sx={{
                  fontSize: "13px",
                  fontWeight: 400,
                  color: "#475569",
                  lineHeight: 1.5,
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                Ginagamit ang iyong lokasyon para makahanap ng malapit na drayber at masubaybayan ang iyong biyahe sa mapa.
              </Typography>

              {permissionRequesting && (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "12px" }}>
                  <CircularProgress size={16} sx={{ color: "#FF6B00" }} />
                  <Typography sx={{ fontSize: "12px", color: "#FF6B00", fontWeight: 600 }}>
                    Humihingi ng pahintulot sa browser...
                  </Typography>
                </Box>
              )}

              {permissionError && (
                <Alert severity="warning" sx={{ marginTop: "12px", borderRadius: "10px", py: 0 }}>
                  {permissionError}
                </Alert>
              )}
            </Box>

            <Divider sx={{ borderColor: "#E2E8F0" }} />

            <Button
              fullWidth
              disabled={permissionRequesting}
              onClick={() => handleAllowLocation(false)}
              sx={{
                padding: "14px 16px",
                color: "#0F172A",
                fontWeight: 600,
                fontSize: "14px",
                textTransform: "none",
                "&:hover": { backgroundColor: "#F8FAFC" },
              }}
            >
              Payagan nang isang beses
            </Button>

            <Divider sx={{ borderColor: "#E2E8F0" }} />

            <Button
              fullWidth
              disabled={permissionRequesting}
              onClick={() => handleAllowLocation(true)}
              sx={{
                padding: "14px 16px",
                color: "#FF6B00",
                fontWeight: 700,
                fontSize: "14px",
                textTransform: "none",
                "&:hover": { backgroundColor: "#F8FAFC" },
              }}
            >
              Habang Ginagamit ang App
            </Button>

            <Divider sx={{ borderColor: "#E2E8F0" }} />

            <Button
              fullWidth
              disabled={permissionRequesting}
              onClick={handleDenyLocation}
              sx={{
                padding: "14px 16px",
                color: "#64748B",
                fontWeight: 600,
                fontSize: "14px",
                textTransform: "none",
                "&:hover": { backgroundColor: "#F8FAFC", color: "#EF4444" },
              }}
            >
              Huwag Payagan
            </Button>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default Dashboard;
