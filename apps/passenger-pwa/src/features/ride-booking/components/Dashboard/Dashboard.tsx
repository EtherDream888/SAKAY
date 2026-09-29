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
import MyLocationIcon from "@mui/icons-material/MyLocation";

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
import { useLanguage } from "../../../../utils/LanguageContext";

const Dashboard: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Active Trip State check
  const activeBookingId = sessionStorage.getItem("current_active_booking_id");
  const activeBooking = activeBookingId ? getBooking(activeBookingId) : null;
  const isTripInProgress = Boolean(
    activeBookingId &&
    activeBooking &&
    activeBooking.booking_status !== "Completed" &&
    activeBooking.booking_status !== "Cancelled"
  );

  useEffect(() => {
    if (!activeBookingId) {
      // Clear temporary draft states when arriving at Dashboard without an active trip
      sessionStorage.removeItem("trip_dropoff");
      sessionStorage.removeItem("trip_notes");
      return;
    }

    if (!activeBooking || activeBooking.booking_status === "Completed" || activeBooking.booking_status === "Cancelled") {
      sessionStorage.removeItem("current_active_booking_id");
      sessionStorage.removeItem("trip_dropoff");
      sessionStorage.removeItem("trip_notes");
      return;
    }

    // Poll Supabase to check if the active trip was completed/cancelled by the driver
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from("booking")
          .select("booking_status")
          .eq("booking_id", activeBookingId)
          .maybeSingle();

        if (!error && data) {
          if (data.booking_status === "Completed" || data.booking_status === "Cancelled") {
            sessionStorage.removeItem("current_active_booking_id");
            sessionStorage.removeItem("trip_dropoff");
            sessionStorage.removeItem("trip_notes");
            // Force re-render to hide the banner
            window.location.reload();
          }
        }
      } catch (err) {}
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [activeBookingId, activeBooking]);

  // Passenger Identity State
  const [profileName, setProfileName] = useState<string>(() => {
    return (location.state as { name?: string; userName?: string })?.name ||
           (location.state as { name?: string; userName?: string })?.userName ||
           localStorage.getItem("sakay_passenger_name") ||
           "";
  });
  const [profilePhoto, setProfilePhoto] = useState<string>("");
  const [contactNumber, setContactNumber] = useState<string>("");

  // Drawer and Modal States
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [tulongOpen, setTulongOpen] = useState<boolean>(false);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);

  // Location Permission Modal State: Open ONLY on very first instance if never prompted before and not already granted
  const [permissionModalOpen, setPermissionModalOpen] = useState<boolean>(() => {
    const prompted = localStorage.getItem("sakay_passenger_location_prompted") === "true";
    const gpsPermission = localStorage.getItem("gps_permission");
    if (prompted || gpsPermission === "true") return false;
    return gpsPermission === null;
  });
  const [permissionRequesting, setPermissionRequesting] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string>("");

  // Check if browser native permission is already granted; if so, never prompt
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (result.state === "granted") {
          localStorage.setItem("gps_permission", "true");
          localStorage.setItem("sakay_passenger_location_prompted", "true");
          setPermissionModalOpen(false);
        }
      }).catch(() => {});
    }
  }, []);

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
            setProfileName(profile.full_name || user.user_metadata?.full_name || "");
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
  const handleAllowLocation = async (_persist: boolean) => {
    setPermissionRequesting(true);
    setPermissionError("");

    try {
      const coords = await getCurrentDevicePosition();
      localStorage.setItem("sakay_passenger_location_prompted", "true");
      localStorage.setItem("gps_permission", "true");

      setUserLocation({ lat: coords.latitude, lng: coords.longitude });
      setRecenterTrigger((prev) => prev + 1);
      setPermissionModalOpen(false);
      setPermissionRequesting(false);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : (language === 'tl' ? "Hindi makuha ang iyong lokasyon." : "Unable to get your location.");
      setPermissionError(errMsg);
      setPermissionRequesting(false);
      localStorage.setItem("sakay_passenger_location_prompted", "true");
      localStorage.setItem("gps_permission", "false");
      setTimeout(() => {
        setPermissionModalOpen(false);
      }, 1500);
    }
  };

  const handleDenyLocation = () => {
    localStorage.setItem("sakay_passenger_location_prompted", "true");
    localStorage.setItem("gps_permission", "false");
    setPermissionModalOpen(false);
  };

  // Always attempt to get actual passenger position on mount
  useEffect(() => {
    getCurrentDevicePosition()
      .then((coords) => {
        setUserLocation({ lat: coords.latitude, lng: coords.longitude });
        setRecenterTrigger((prev) => prev + 1);
      })
      .catch(() => {
        // Handled silently or by permission modal
      });
  }, [permissionModalOpen]);

  // Extract first name for personalized greeting
  const firstName = profileName.trim().split(" ")[0] || (language === "tl" ? "Pasahero" : "Passenger");

  const handleLogout = async () => {
    setDrawerOpen(false);
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("sakay_passenger_phone");
      localStorage.removeItem("sakay_passenger_name");
      localStorage.removeItem("sakay_passenger_id");
      localStorage.removeItem("sakay_passenger_password");
      sessionStorage.clear();
    } catch (e) {
      console.warn("Logout error:", e);
    }
    navigate("/get-started", { replace: true });
  };

  const handleStartNewTrip = () => {
    // Clear any previous unconfirmed destination and notes so new booking starts fresh
    sessionStorage.removeItem("trip_dropoff");
    sessionStorage.removeItem("trip_notes");
    const gpsPermission = localStorage.getItem("gps_permission");
    if (gpsPermission === null && !userLocation) {
      navigate("/location-permission");
    } else {
      navigate("/new-trip", {
        state: {
          hasGps: gpsPermission === "true" || !!userLocation,
          coords: userLocation,
        },
      });
    }
  };

  const handleHomeTrip = () => {
    const savedHomeAddress = localStorage.getItem("sakay_passenger_home_address") || "Home (San Vicente, Calapan City)";
    sessionStorage.setItem(
      "trip_dropoff",
      JSON.stringify({
        address: savedHomeAddress,
        lat: 13.4124,
        lng: 121.1834,
      })
    );
    navigate("/new-trip", {
      state: {
        hasGps: true,
        coords: userLocation,
      },
    });
  };

  const handleSelectPlaceTrip = (place: { address: string; lat: number; lng: number }) => {
    sessionStorage.setItem("trip_dropoff", JSON.stringify(place));
    navigate("/new-trip", {
      state: {
        hasGps: true,
        coords: userLocation,
      },
    });
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
      if (!userLocation) {
        setUserLocation({
          lat: DEFAULT_CALAPAN_CENTER.latitude,
          lng: DEFAULT_CALAPAN_CENTER.longitude,
        });
      }
      setRecenterTrigger((prev) => prev + 1);
    }
  };

  // Bottom Sheet & Home Address State
  const [isCardCollapsed, setIsCardCollapsed] = useState(false);
  const [sheetHeight, setSheetHeight] = useState<number>(220);
  const [isDraggingSheet, setIsDraggingSheet] = useState<boolean>(false);
  const [homeAddress, setHomeAddress] = useState<string>(() => {
    return localStorage.getItem("sakay_passenger_home_address") || "";
  });

  const handleSetHomeAddress = (newAddr: string) => {
    setHomeAddress(newAddr);
    localStorage.setItem("sakay_passenger_home_address", newAddr);
  };

  // Notifications State & Handlers with localStorage persistence
  const [notifications, setNotifications] = useState(() => {
    const rawRead = localStorage.getItem("sakay_read_notifications");
    let readIds: string[] = [];
    try {
      if (rawRead) readIds = JSON.parse(rawRead);
    } catch {}

    const items = [
      {
        id: "n1",
        titleTl: "Maligayang Pagdating sa SAKAY!",
        titleEn: "Welcome to SAKAY!",
        bodyTl: "Mabilis at tapat na pamasahe sa tricycle saan man sa Calapan City. Mag-book ng iyong unang biyahe ngayon!",
        bodyEn: "Fast and fair tricycle fares anywhere in Calapan City. Start booking your ride today!",
        timeTl: "Ngayon",
        timeEn: "Just now",
        isRead: readIds.includes("n1"),
        category: "promos" as const,
      },
    ];

    return items;
  });

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      const readIds = updated.filter((n) => n.isRead).map((n) => n.id);
      localStorage.setItem("sakay_read_notifications", JSON.stringify(readIds));
      return updated;
    });
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      const readIds = updated.map((n) => n.id);
      localStorage.setItem("sakay_read_notifications", JSON.stringify(readIds));
      return updated;
    });
  };

  const hasUnreadNotifications = notifications.some((n) => !n.isRead);

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
        hasUnread={hasUnreadNotifications}
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
                {language === 'tl' ? 'Aktibong Biyahe:' : 'Active Trip:'} {activeBooking.booking_status}
              </Typography>
              <Typography sx={{ fontSize: "11px", color: "#94A3B8" }}>
                {activeBooking.pickup_address.split(',')[0]} ➜ {activeBooking.dropoff_address.split(',')[0]}
              </Typography>
            </Box>
          </Box>
          <Typography sx={{ fontSize: "12px", fontWeight: 800, color: "#FFFFFF" }}>
            {language === 'tl' ? 'Subaybayan ➜' : 'Track ➜'}
          </Typography>
        </Paper>
      )}

      {/* 3. Floating Recenter GPS Location Button (Dynamically synced 16px above bottom sheet top edge) */}
      <IconButton
        onClick={handleRecenterGps}
        aria-label="Recenter map location"
        sx={{
          position: "absolute",
          bottom: `calc(var(--safe-area-bottom) + ${sheetHeight + 16}px)`,
          right: "16px",
          backgroundColor: "#FFFFFF",
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          boxShadow: "0 4px 14px rgba(15, 23, 42, 0.15)",
          color: "#0F172A",
          zIndex: 10,
          transition: isDraggingSheet
            ? "none"
            : "bottom 0.28s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s ease",
          "&:hover": {
            backgroundColor: "#F8FAFC",
            transform: "scale(1.05)",
          },
          "&:active": {
            transform: "scale(0.95)",
          },
        }}
      >
        <MyLocationIcon sx={{ fontSize: 22, color: "#0F172A" }} />
      </IconButton>

      {/* 4. Bottom Sheet Card Container respecting safe-area-inset-bottom */}
      <HomeBottomSheet
        firstName={firstName}
        onStartNewTrip={handleStartNewTrip}
        onHomeTrip={handleHomeTrip}
        onSelectPlaceTrip={handleSelectPlaceTrip}
        onAddPlace={handleAddPlace}
        isCollapsed={isCardCollapsed}
        onToggleCollapse={() => setIsCardCollapsed((prev) => !prev)}
        homeAddress={homeAddress}
        onSetHomeAddress={handleSetHomeAddress}
        onHeightChange={(h) => setSheetHeight(h)}
        onDragStateChange={(d) => setIsDraggingSheet(d)}
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
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
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
                {language === 'tl' ? 'Payagan ang “SAKAY” na gamitin ang iyong lokasyon?' : 'Allow “SAKAY” to use your location?'}
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
                {language === 'tl'
                  ? 'Ginagamit ang iyong lokasyon para makahanap ng malapit na drayber at masubaybayan ang iyong biyahe sa mapa.'
                  : 'Your location is used to find nearby drivers and track your ride on the map.'}
              </Typography>

              {permissionRequesting && (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "12px" }}>
                  <CircularProgress size={16} sx={{ color: "#FF6B00" }} />
                  <Typography sx={{ fontSize: "12px", color: "#FF6B00", fontWeight: 600 }}>
                    {language === 'tl' ? 'Humihingi ng pahintulot sa browser...' : 'Requesting browser permission...'}
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
              {language === 'tl' ? 'Payagan nang isang beses' : 'Allow Once'}
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
              {language === 'tl' ? 'Habang Ginagamit ang App' : 'While Using the App'}
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
              {language === 'tl' ? 'Huwag Payagan' : "Don't Allow"}
            </Button>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default Dashboard;
