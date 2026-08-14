import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import NavigationIcon from "@mui/icons-material/Navigation";

import { supabase } from "../../../../services/supabaseClient";
import MapView from "../../../../common/components/MapView";
import HomeHeader from "./HomeHeader";
import HomeBottomSheet from "./HomeBottomSheet";
import PassengerNavigationDrawer from "./PassengerNavigationDrawer";
import TulongDialog from "./TulongDialog";
import NotificationsDialog from "./NotificationsDialog";
import {
  DEFAULT_CALAPAN_CENTER,
  getCurrentDevicePosition,
} from "../../../../services/locationService";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve profile state or default
  const state = location.state as { userName?: string } | undefined;
  const [profileName, setProfileName] = useState<string>(state?.userName || "John");
  const [profilePhoto, setProfilePhoto] = useState<string>("");
  const [contactNumber, setContactNumber] = useState<string>("");

  // Drawer and Modal States
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [tulongOpen, setTulongOpen] = useState<boolean>(false);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);

  // Map coordinates and recenter trigger state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() => {
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

  // Try reading real device position quietly if previously granted
  useEffect(() => {
    const gpsPermission = localStorage.getItem("gps_permission");
    if (gpsPermission === "true") {
      getCurrentDevicePosition()
        .then((coords) => {
          setUserLocation({ lat: coords.latitude, lng: coords.longitude });
        })
        .catch(() => {
          // Keep previous or default
        });
    }
  }, []);

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
    </Box>
  );
};

export default Dashboard;
