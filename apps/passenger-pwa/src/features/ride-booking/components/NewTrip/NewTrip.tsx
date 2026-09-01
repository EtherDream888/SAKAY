import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import NavigationIcon from "@mui/icons-material/Navigation";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import EventIcon from "@mui/icons-material/Event";
import PersonIcon from "@mui/icons-material/Person";
import GroupsIcon from "@mui/icons-material/Groups";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import Alert from "@mui/material/Alert";

import MapView from "../../../../common/components/MapView";
import HomeHeader from "../Dashboard/HomeHeader";
import PassengerNavigationDrawer from "../Dashboard/PassengerNavigationDrawer";
import TulongDialog from "../Dashboard/TulongDialog";
import NotificationsDialog from "../Dashboard/NotificationsDialog";
import { supabase } from "../../../../services/supabaseClient";
import {
  DEFAULT_CALAPAN_CENTER,
  getCurrentDevicePosition,
  reverseGeocodeCoordinates,
} from "../../../../services/locationService";

const NewTrip: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve route state from location permission or dashboard
  const navState = location.state as {
    hasGps?: boolean;
    coords?: { lat: number; lng: number };
  } | null;

  // Retrieve user name / profile
  const [profileName, setProfileName] = useState<string>("John");
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [tulongOpen, setTulongOpen] = useState<boolean>(false);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [recenterTrigger, setRecenterTrigger] = useState<number>(0);
  const [validationError, setValidationError] = useState<string>("");

  // Trip Type State (Solo vs Shared) & Passenger Count
  const [tripType, setTripType] = useState<"Solo" | "Shared">(() => {
    return (sessionStorage.getItem("trip_type") as "Solo" | "Shared") || "Solo";
  });
  const [passengers, setPassengers] = useState<number>(() => {
    const raw = sessionStorage.getItem("trip_passengers");
    return raw ? parseInt(raw, 10) : 1;
  });

  // Pickup location state
  const [pickup, setPickup] = useState<{ address: string; lat: number; lng: number }>(() => {
    const saved = sessionStorage.getItem("trip_pickup");
    if (saved) return JSON.parse(saved);

    const gpsLat = navState?.coords?.lat || parseFloat(localStorage.getItem("user_lat") || "");
    const gpsLng = navState?.coords?.lng || parseFloat(localStorage.getItem("user_lng") || "");

    if (gpsLat && gpsLng) {
      return {
        address: "Kasalukuyang Lokasyon",
        lat: gpsLat,
        lng: gpsLng,
      };
    }

    return {
      address: "Pumili ng pickup location",
      lat: DEFAULT_CALAPAN_CENTER.latitude,
      lng: DEFAULT_CALAPAN_CENTER.longitude,
    };
  });

  // Dropoff location state
  const [dropoff] = useState<{ address: string; lat: number; lng: number }>(() => {
    const saved = sessionStorage.getItem("trip_dropoff");
    if (saved) return JSON.parse(saved);
    return {
      address: "",
      lat: 0,
      lng: 0,
    };
  });

  const [activeTariff, setActiveTariff] = useState<{ baseFare: number; baseKm: number; succRate: number }>(() => {
    try {
      const cached = localStorage.getItem("sakay_active_fare_matrix");
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          baseFare: Number(parsed.base_fare) || 15.0,
          baseKm: Number(parsed.base_distance_km) || 2.0,
          succRate: Number(parsed.succeeding_rate) || 1.0,
        };
      }
    } catch {
      // ignore
    }
    return { baseFare: 15.0, baseKm: 2.0, succRate: 1.0 };
  });

  // Fetch active municipal fare matrix
  useEffect(() => {
    const fetchMatrix = async () => {
      try {
        const { data } = await supabase
          .from("fare_matrix")
          .select("base_fare, base_distance_km, succeeding_rate")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          const formatted = {
            baseFare: Number(data.base_fare),
            baseKm: Number(data.base_distance_km),
            succRate: Number(data.succeeding_rate),
          };
          setActiveTariff(formatted);
          localStorage.setItem("sakay_active_fare_matrix", JSON.stringify(data));
        }
      } catch (err) {
        console.warn("[NewTrip] Fare matrix fetch note:", err);
      }
    };
    fetchMatrix();
  }, []);

  // Fetch real reverse-geocoded address for GPS pickup if not yet labeled
  useEffect(() => {
    if (pickup.lat && pickup.address === "Kasalukuyang Lokasyon") {
      reverseGeocodeCoordinates(pickup.lat, pickup.lng).then((realAddress) => {
        if (realAddress) {
          setPickup((prev) => {
            const updated = { ...prev, address: realAddress };
            sessionStorage.setItem("trip_pickup", JSON.stringify(updated));
            return updated;
          });
        }
      });
    }
  }, [pickup.lat, pickup.lng]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.user_metadata?.full_name) {
          setProfileName(user.user_metadata.full_name);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };
    fetchProfile();
  }, []);

  const firstName = profileName.trim().split(" ")[0] || "John";

  const handleOpenSetPlace = (target: "pickup" | "dropoff") => {
    navigate("/set-place", {
      state: {
        target,
        address: target === "pickup" ? pickup.address : dropoff.address,
        lat: target === "pickup" ? pickup.lat : dropoff.lat,
        lng: target === "pickup" ? pickup.lng : dropoff.lng,
      },
    });
  };

  const handleBookTrip = () => {
    if (!dropoff.address || dropoff.lat === 0) {
      setValidationError("Mangyaring ilagay ang iyong destinasyon.");
      return;
    }
    if (!pickup.lat || pickup.lat === 0) {
      setValidationError("Mangyaring pumili ng pickup point.");
      return;
    }

    setValidationError("");
    sessionStorage.setItem("trip_pickup", JSON.stringify(pickup));
    sessionStorage.setItem("trip_dropoff", JSON.stringify(dropoff));
    sessionStorage.setItem("trip_type", tripType);
    sessionStorage.setItem("trip_passengers", passengers.toString());
    navigate("/book-summary");
  };

  const handleRecenterGps = async () => {
    try {
      const coords = await getCurrentDevicePosition();
      setPickup({
        address: "Kasalukuyang Lokasyon",
        lat: coords.latitude,
        lng: coords.longitude,
      });
      setRecenterTrigger((prev) => prev + 1);
    } catch {
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
        pickupLocation={pickup.lat ? pickup : undefined}
        dropoffLocation={dropoff.lat ? dropoff : undefined}
        recenterTrigger={recenterTrigger}
      />

      {/* 2. Floating Top Header Controls */}
      <HomeHeader
        onBack={() => navigate('/dashboard')}
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onOpenTulong={() => setTulongOpen(true)}
      />

      {/* 3. Floating GPS Recenter FAB */}
      <IconButton
        onClick={handleRecenterGps}
        aria-label="Recenter location"
        sx={{
          position: "absolute",
          bottom: "calc(var(--safe-area-bottom) + 310px)",
          right: "16px",
          backgroundColor: "#FFFFFF",
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          boxShadow: "0 4px 14px rgba(15, 23, 42, 0.15)",
          color: "#0F172A",
          zIndex: 10,
          transition: "all 0.2s ease",
          "&:hover": { backgroundColor: "#F8FAFC" },
        }}
      >
        <NavigationIcon sx={{ fontSize: 20, transform: "rotate(45deg)" }} />
      </IconButton>

      {/* 4. Bottom Sheet Container matching PASSENGER NEW TRIP.png */}
      <Paper
        elevation={4}
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#F4FBF7",
          borderTopLeftRadius: "28px",
          borderTopRightRadius: "28px",
          padding: "16px 20px calc(var(--safe-area-bottom) + 24px) 20px",
          zIndex: 10,
          boxShadow: "0 -10px 30px rgba(15, 23, 42, 0.08)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {/* Drag Handle Bar */}
        <Box
          sx={{
            width: "40px",
            height: "4px",
            backgroundColor: "#CBD5E1",
            borderRadius: "2px",
            margin: "0 auto 4px auto",
          }}
        />

        {/* Greeting Text */}
        <Typography
          sx={{
            fontSize: "15px",
            color: "#0F172A",
            fontWeight: 400,
            fontFamily: "Poppins, sans-serif",
          }}
        >
          Kamusta, {firstName}!{" "}
          <Box component="span" sx={{ fontWeight: 800 }}>
            Saan tayo pupunta?
          </Box>
        </Typography>

        {/* Validation Error Alert */}
        {validationError && (
          <Alert severity="warning" sx={{ borderRadius: "12px", py: 0 }}>
            {validationError}
          </Alert>
        )}

        {/* PICKUP Card Box matching PASSENGER NEW TRIP.png */}
        <Box
          onClick={() => handleOpenSetPlace("pickup")}
          sx={{
            backgroundColor: "#FFF8F0",
            border: "1px solid #FFE4D6",
            borderRadius: "16px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            "&:hover": { backgroundColor: "#FFF2E6" },
          }}
        >
          {/* Orange Radio Dot */}
          <Box
            sx={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              border: "2px solid #FF6B00",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: "#FF6B00",
              }}
            />
          </Box>

          <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
            <Typography
              sx={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#64748B",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              PICKUP
            </Typography>
            <Typography
              sx={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#0F172A",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {pickup.address || "Pumili ng pickup location"}
            </Typography>
          </Box>
        </Box>

        {/* DESTINASYON Card Box matching PASSENGER NEW TRIP.png */}
        <Box
          onClick={() => handleOpenSetPlace("dropoff")}
          sx={{
            backgroundColor: "#F0F4F2",
            border: "1px solid #E2E8F0",
            borderRadius: "16px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            "&:hover": { backgroundColor: "#E5ECE8" },
          }}
        >
          {/* Black Location Pin Icon inside circle */}
          <Box
            sx={{
              width: "22px",
              height: "22px",
              borderRadius: "50%",
              backgroundColor: "#0F172A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <LocationOnIcon sx={{ color: "#FFFFFF", fontSize: "14px" }} />
          </Box>

          <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
            <Typography
              sx={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#64748B",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              DESTINASYON
            </Typography>
            <Typography
              sx={{
                fontSize: "14px",
                fontWeight: dropoff.address ? 700 : 400,
                color: dropoff.address ? "#0F172A" : "#94A3B8",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {dropoff.address || "I-type ang lugar"}
            </Typography>
          </Box>
        </Box>

        {/* Trip Type Selector (Solo vs Shared) */}
        <Box sx={{ display: "flex", gap: "10px" }}>
          {/* Solo Card */}
          <Box
            onClick={() => {
              setTripType("Solo");
              setValidationError("");
            }}
            sx={{
              flex: 1,
              p: "10px 12px",
              borderRadius: "16px",
              border: tripType === "Solo" ? "2px solid #FF6B00" : "1px solid #E2E8F0",
              backgroundColor: tripType === "Solo" ? "#FFF8F0" : "#FFFFFF",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: tripType === "Solo" ? "0 4px 12px rgba(255, 107, 0, 0.12)" : "none",
            }}
          >
            <PersonIcon sx={{ color: tripType === "Solo" ? "#FF6B00" : "#64748B", fontSize: 24 }} />
            <Box>
              <Typography sx={{ fontSize: "13px", fontWeight: 800, color: "#0F172A", lineHeight: 1.2 }}>
                Solo Trip
              </Typography>
              <Typography sx={{ fontSize: "10px", color: "#64748B", mt: "2px" }}>
                Buong Tricycle (4 seats)
              </Typography>
            </Box>
          </Box>

          {/* Shared Card */}
          <Box
            onClick={() => {
              setTripType("Shared");
              if (passengers > 2) setPassengers(2);
              setValidationError("");
            }}
            sx={{
              flex: 1,
              p: "10px 12px",
              borderRadius: "16px",
              border: tripType === "Shared" ? "2px solid #10B981" : "1px solid #E2E8F0",
              backgroundColor: tripType === "Shared" ? "#ECFDF5" : "#FFFFFF",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: tripType === "Shared" ? "0 4px 12px rgba(16, 185, 129, 0.12)" : "none",
            }}
          >
            <GroupsIcon sx={{ color: tripType === "Shared" ? "#10B981" : "#64748B", fontSize: 24 }} />
            <Box>
              <Typography sx={{ fontSize: "13px", fontWeight: 800, color: "#0F172A", lineHeight: 1.2 }}>
                Shared Trip
              </Typography>
              <Typography sx={{ fontSize: "10px", color: "#047857", fontWeight: 600, mt: "2px" }}>
                Makatipid (Carpool)
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Municipal Tariff Indicator Pill */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: "12px",
            py: "6px",
            backgroundColor: "rgba(255, 107, 0, 0.08)",
            borderRadius: "10px",
            border: "1px dashed rgba(255, 107, 0, 0.3)",
          }}
        >
          <Typography sx={{ fontSize: "11px", color: "#C2410C", fontWeight: 700 }}>
            🏛️ Taripa: Calapan City Ord. 118
          </Typography>
          <Typography sx={{ fontSize: "11px", color: "#9A3412", fontWeight: 600 }}>
            ₱{activeTariff.baseFare.toFixed(2)} ({activeTariff.baseKm}km) + ₱{activeTariff.succRate.toFixed(2)}/km
          </Typography>
        </Box>

        {/* Passenger Count Counter Row */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: "8px 14px",
            borderRadius: "14px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PersonIcon sx={{ color: "#FF6B00", fontSize: 18 }} />
            <Box>
              <Typography sx={{ fontSize: "12.5px", fontWeight: 700, color: "#0F172A" }}>
                Bilang ng Pasahero:
              </Typography>
              <Typography sx={{ fontSize: "10px", color: "#64748B" }}>
                {tripType === "Shared" ? "Max 2 bawat shared booking" : "Hanggang 4 pasahero sa Solo"}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <IconButton
              size="small"
              disabled={passengers <= 1}
              onClick={() => setPassengers((prev) => Math.max(1, prev - 1))}
              sx={{
                width: 28,
                height: 28,
                backgroundColor: "#F1F5F9",
                color: "#0F172A",
                "&:hover": { backgroundColor: "#E2E8F0" },
              }}
            >
              <RemoveIcon sx={{ fontSize: 16 }} />
            </IconButton>

            <Typography sx={{ fontWeight: 800, fontSize: "14px", color: "#0F172A", minWidth: "16px", textAlign: "center" }}>
              {passengers}
            </Typography>

            <IconButton
              size="small"
              disabled={tripType === "Shared" ? passengers >= 2 : passengers >= 4}
              onClick={() => {
                const max = tripType === "Shared" ? 2 : 4;
                if (passengers < max) {
                  setPassengers((prev) => prev + 1);
                } else if (tripType === "Shared") {
                  setValidationError("Ang Shared Trip ay limitado sa 2 pasahero bawat booking upang makapag-pares ng hanggang 4 na pasahero.");
                }
              }}
              sx={{
                width: 28,
                height: 28,
                backgroundColor: "#F1F5F9",
                color: "#0F172A",
                "&:hover": { backgroundColor: "#E2E8F0" },
              }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Bottom Actions Row: Schedule Calendar Button + Mag-book ng Biyahe Button */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginTop: "2px",
          }}
        >
          {/* Calendar Icon Button */}
          <IconButton
            sx={{
              width: "52px",
              height: "52px",
              borderRadius: "16px",
              backgroundColor: "#FFF8F0",
              border: "1px solid #FFE4D6",
              color: "#D97706",
              "&:hover": { backgroundColor: "#FFF2E6" },
            }}
          >
            <EventIcon sx={{ fontSize: "24px" }} />
          </IconButton>

          {/* Primary Action Button: Mag-book ng Biyahe */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleBookTrip}
            sx={{
              height: "52px",
              borderRadius: "16px",
              backgroundColor: "#F5A664",
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: "15px",
              textTransform: "none",
              fontFamily: "Poppins, sans-serif",
              boxShadow: "0 4px 14px rgba(245, 166, 100, 0.3)",
              "&:hover": {
                backgroundColor: "#E59553",
              },
            }}
          >
            Mag-book ng Biyahe
          </Button>
        </Box>
      </Paper>

      {/* 5. Mobile Navigation Drawer & Support Dialogs */}
      <PassengerNavigationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        profileName={profileName}
        onOpenTulong={() => setTulongOpen(true)}
        onLogout={async () => {
          await supabase.auth.signOut();
          navigate("/");
        }}
      />
      <TulongDialog open={tulongOpen} onClose={() => setTulongOpen(false)} />
      <NotificationsDialog
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </Box>
  );
};

export default NewTrip;
