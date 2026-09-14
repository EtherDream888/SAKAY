import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import NavigationIcon from "@mui/icons-material/Navigation";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import EventIcon from "@mui/icons-material/Event";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import MessageIcon from "@mui/icons-material/Message";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CloseIcon from "@mui/icons-material/Close";
import LinearProgress from "@mui/material/LinearProgress";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";

import MapView from "../../../../common/components/MapView";
import PassengerCancelModal from "../../../../common/components/PassengerCancelModal";
import HomeHeader from "../Dashboard/HomeHeader";
import PassengerNavigationDrawer from "../Dashboard/PassengerNavigationDrawer";
import TulongDialog from "../Dashboard/TulongDialog";
import NotificationsDialog from "../Dashboard/NotificationsDialog";
import { supabase } from "../../../../services/supabaseClient";
import { useLanguage } from "../../../../utils/LanguageContext";
import {
  DEFAULT_CALAPAN_CENTER,
  getCurrentDevicePosition,
  reverseGeocodeCoordinates,
  getOSRMRoute,
} from "../../../../services/locationService";
import {
  createBooking,
  cancelBooking,
  subscribeToBooking,
  type BookingRecord,
} from "../../../../services/bookingService";

const haversineDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const NewTrip: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();

  const navState = location.state as {
    hasGps?: boolean;
    coords?: { lat: number; lng: number };
  } | null;

  // Passenger Identity State from Supabase DB
  const [profileName, setProfileName] = useState<string>("");
  const [passengerPhone, setPassengerPhone] = useState<string>("");
  const [passengerId, setPassengerId] = useState<string>("");

  // UI Modals & Drawers
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [tulongOpen, setTulongOpen] = useState<boolean>(false);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [recenterTrigger, setRecenterTrigger] = useState<number>(0);
  const [validationError, setValidationError] = useState<string>("");
  const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(false);
  const [cancelling, setCancelling] = useState<boolean>(false);

  // Dialog States for Controls
  const [notesDialogOpen, setNotesDialogOpen] = useState<boolean>(false);
  const [noteText, setNoteText] = useState<string>(() => sessionStorage.getItem("trip_notes") || "");
  const [tempNoteText, setTempNoteText] = useState<string>("");
  const [tariffInfoOpen, setTariffInfoOpen] = useState<boolean>(false);
  const [tripTypeInfoOpen, setTripTypeInfoOpen] = useState<boolean>(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState<boolean>(false);
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [scheduleTime, setScheduleTime] = useState<string>("");

  // Trip Configuration State
  const [tripType, setTripType] = useState<"Solo" | "Shared">(() => {
    return (sessionStorage.getItem("trip_type") as "Solo" | "Shared") || "Solo";
  });
  const [passengers, setPassengers] = useState<number>(() => {
    const raw = sessionStorage.getItem("trip_passengers");
    return raw ? parseInt(raw, 10) : 1;
  });

  // Pickup Location State
  const [pickup, setPickup] = useState<{ address: string; lat: number; lng: number; isCustom?: boolean }>(() => {
    const saved = sessionStorage.getItem("trip_pickup");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.lat && parsed.address && parsed.isCustom) {
          return parsed;
        }
      } catch {}
    }

    const gpsLat = navState?.coords?.lat || parseFloat(localStorage.getItem("user_lat") || "");
    const gpsLng = navState?.coords?.lng || parseFloat(localStorage.getItem("user_lng") || "");

    if (gpsLat && gpsLng && !isNaN(gpsLat) && !isNaN(gpsLng) && gpsLat !== 0) {
      return {
        address: language === "tl" ? "Kasalukuyang Lokasyon" : "Current Location",
        lat: gpsLat,
        lng: gpsLng,
      };
    }

    return {
      address: language === "tl" ? "Kasalukuyang Lokasyon" : "Current Location",
      lat: DEFAULT_CALAPAN_CENTER.latitude,
      lng: DEFAULT_CALAPAN_CENTER.longitude,
    };
  });

  // Dropoff Location State
  const [dropoff] = useState<{ address: string; lat: number; lng: number }>(() => {
    const saved = sessionStorage.getItem("trip_dropoff");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      address: "",
      lat: 0,
      lng: 0,
    };
  });

  // Fare Matrix & Tariff State from DB
  const [activeTariff, setActiveTariff] = useState<{ baseFare: number; baseKm: number; succRate: number }>(() => {
    try {
      const cached = localStorage.getItem("sakay_active_fare_matrix");
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          baseFare: Number(parsed.base_fare) || 15.0,
          baseKm: Number(parsed.base_distance_km) || 2.0,
          succRate: Number(parsed.succeeding_rate) || 1.5,
        };
      }
    } catch {}
    return { baseFare: 15.0, baseKm: 2.0, succRate: 1.5 };
  });

  const [tripDistanceKm, setTripDistanceKm] = useState<number>(3.5);
  const [estimatedFare, setEstimatedFare] = useState<number>(60.0);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);

  // Searching State matching TIER 1 - SOLO.png
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [activeBooking, setActiveBooking] = useState<BookingRecord | null>(null);
  const [bookingSubmitting, setBookingSubmitting] = useState<boolean>(false);

  // Always query real device location on mount so passenger actual location is pinned
  useEffect(() => {
    if (navState?.coords && navState.coords.lat !== 0) {
      setPickup((prev) => {
        if (prev.isCustom) return prev;
        return {
          address: prev.address || (language === "tl" ? "Kasalukuyang Lokasyon" : "Current Location"),
          lat: navState.coords!.lat,
          lng: navState.coords!.lng,
        };
      });
      setRecenterTrigger((prev) => prev + 1);
    }

    getCurrentDevicePosition()
      .then((coords) => {
        setPickup((prev) => {
          if (prev.isCustom) return prev;
          const updated = {
            address: prev.address || (language === "tl" ? "Kasalukuyang Lokasyon" : "Current Location"),
            lat: coords.latitude,
            lng: coords.longitude,
          };
          sessionStorage.setItem("trip_pickup", JSON.stringify(updated));
          return updated;
        });
        setRecenterTrigger((prev) => prev + 1);
      })
      .catch((err) => {
        console.warn("[NewTrip] Note on device geolocation:", err);
      });
  }, []);

  // Fetch active municipal fare matrix from Supabase DB
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
            baseFare: Number(data.base_fare) || 15.0,
            baseKm: Number(data.base_distance_km) || 2.0,
            succRate: Number(data.succeeding_rate) || 1.5,
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

  // Reverse-geocode pickup coordinates if generic
  useEffect(() => {
    const isGeneric =
      !pickup.address ||
      pickup.address === "Kasalukuyang Lokasyon" ||
      pickup.address === "Current Location" ||
      pickup.address === "Pumili ng pickup location" ||
      pickup.address === "Choose pickup location";

    if (pickup.lat && pickup.lat !== 0 && isGeneric && !pickup.isCustom) {
      reverseGeocodeCoordinates(pickup.lat, pickup.lng).then((realAddress) => {
        if (realAddress && !realAddress.startsWith("Kasalukuyang Lokasyon")) {
          setPickup((prev) => {
            if (prev.isCustom) return prev;
            const updated = { ...prev, address: realAddress };
            sessionStorage.setItem("trip_pickup", JSON.stringify(updated));
            return updated;
          });
        }
      });
    }
  }, [pickup.lat, pickup.lng, pickup.address, pickup.isCustom]);

  // Load real passenger profile from Supabase
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from("passenger")
            .select("passenger_id, full_name, contact_number")
            .eq("auth_user_id", user.id)
            .maybeSingle();

          if (profile) {
            if (profile.full_name) setProfileName(profile.full_name);
            if (profile.contact_number) setPassengerPhone(profile.contact_number);
            if (profile.passenger_id) setPassengerId(profile.passenger_id);
          } else if (user.user_metadata?.full_name) {
            setProfileName(user.user_metadata.full_name);
          }
        }
      } catch (err) {
        console.error("Error fetching profile from database:", err);
      }
    };
    fetchProfile();
  }, []);

  // Recalculate distance, road coordinates, and fare dynamically when pickup or dropoff changes
  const calculateDistanceAndFare = useCallback(async () => {
    if (!pickup.lat || !dropoff.lat || pickup.lat === 0 || dropoff.lat === 0) {
      setEstimatedFare(60.0);
      setRouteCoordinates([]);
      return;
    }

    let roadDist = 0;
    try {
      const routeRes = await getOSRMRoute(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
      roadDist = routeRes.distanceKm;
      if (routeRes.coordinates && routeRes.coordinates.length >= 2) {
        setRouteCoordinates(routeRes.coordinates);
      }
    } catch {
      roadDist = haversineDistanceKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng) * 1.25;
    }

    if (roadDist <= 0) {
      roadDist = haversineDistanceKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng) * 1.25;
    }

    roadDist = Math.max(0.5, Number(roadDist.toFixed(2)));
    setTripDistanceKm(roadDist);

    // Calculate official fare from active tariff
    let fare = activeTariff.baseFare;
    if (roadDist > activeTariff.baseKm) {
      fare += (roadDist - activeTariff.baseKm) * activeTariff.succRate;
    }

    if (tripType === "Shared") {
      fare = Math.round(fare * 0.6);
    }

    // Reference minimum fare
    fare = Math.max(fare, 20.0);
    setEstimatedFare(fare);
  }, [pickup.lat, pickup.lng, dropoff.lat, dropoff.lng, tripType, activeTariff]);

  useEffect(() => {
    calculateDistanceAndFare();
  }, [calculateDistanceAndFare]);

  // Subscribe to real-time status updates while searching
  useEffect(() => {
    if (!activeBooking?.booking_id) return;

    const unsubscribe = subscribeToBooking(activeBooking.booking_id, (updated) => {
      setActiveBooking(updated);
      if (
        updated.booking_status === "Driver Assigned" ||
        updated.booking_status === "Driver En Route" ||
        updated.booking_status === "Driver Arrived" ||
        updated.booking_status === "Trip Ongoing"
      ) {
        navigate("/trip-monitoring", {
          state: { bookingId: updated.booking_id },
        });
      }
    });

    return () => unsubscribe();
  }, [activeBooking?.booking_id, navigate]);

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

  const handleRecenterGps = async () => {
    try {
      const coords = await getCurrentDevicePosition();
      let realAddr = "";
      try {
        realAddr = await reverseGeocodeCoordinates(coords.latitude, coords.longitude);
      } catch {}
      const updated = {
        address:
          realAddr && !realAddr.startsWith("Kasalukuyang Lokasyon")
            ? realAddr
            : language === "tl"
            ? "Kasalukuyang Lokasyon"
            : "Current Location",
        lat: coords.latitude,
        lng: coords.longitude,
      };
      setPickup(updated);
      sessionStorage.setItem("trip_pickup", JSON.stringify(updated));
      setRecenterTrigger((prev) => prev + 1);
    } catch {
      setRecenterTrigger((prev) => prev + 1);
    }
  };

  const handleBookTrip = async () => {
    if (!dropoff.address || dropoff.lat === 0) {
      setValidationError(
        language === "tl"
          ? "Mangyaring ilagay ang iyong destinasyon."
          : "Please enter your destination."
      );
      return;
    }
    if (!pickup.lat || pickup.lat === 0) {
      setValidationError(
        language === "tl"
          ? "Mangyaring pumili ng pickup point."
          : "Please select a pickup point."
      );
      return;
    }

    setValidationError("");
    setBookingSubmitting(true);

    try {
      const newBookingRecord = await createBooking({
        passenger_id: passengerId,
        passenger_name: profileName || "Passenger",
        passenger_phone: passengerPhone,
        booking_type: "Immediate",
        is_shared_trip: tripType === "Shared",
        passenger_count: passengers,
        pickup_address: pickup.address,
        pickup_latitude: pickup.lat,
        pickup_longitude: pickup.lng,
        dropoff_address: dropoff.address,
        dropoff_latitude: dropoff.lat,
        dropoff_longitude: dropoff.lng,
        estimated_distance_km: tripDistanceKm,
        estimated_fare: estimatedFare,
      });

      setActiveBooking(newBookingRecord);
      setIsSearching(true);
      setBookingSubmitting(false);
    } catch (err: unknown) {
      setBookingSubmitting(false);
      const msg = err instanceof Error ? err.message : "Booking submission error";
      setValidationError(msg);
    }
  };

  const handleConfirmCancelBooking = async (reasonText: string) => {
    try {
      setCancelling(true);
      if (activeBooking?.booking_id) {
        await cancelBooking(activeBooking.booking_id, reasonText);
      }
      setIsSearching(false);
      setActiveBooking(null);
      setCancelModalOpen(false);
    } catch (err) {
      console.warn("Error cancelling booking:", err);
      setIsSearching(false);
      setActiveBooking(null);
      setCancelModalOpen(false);
    } finally {
      setCancelling(false);
    }
  };

  const handleCancelBooking = () => {
    setCancelModalOpen(true);
  };

  const handleSaveNotes = () => {
    setNoteText(tempNoteText);
    sessionStorage.setItem("trip_notes", tempNoteText);
    setNotesDialogOpen(false);
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
        userLocation={pickup.lat ? { lat: pickup.lat, lng: pickup.lng } : undefined}
        pickupLocation={pickup.lat ? pickup : undefined}
        dropoffLocation={dropoff.lat ? dropoff : undefined}
        routeCoordinates={routeCoordinates}
        recenterTrigger={recenterTrigger}
      />

      {/* 2. Top Header Controls matching BOOK - SOLO.png (Menu, Bell, Tulong) */}
      <HomeHeader
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onOpenTulong={() => setTulongOpen(true)}
      />

      {/* 3. Floating Left Back Button over Map matching BOOK - SOLO.png */}
      <IconButton
        onClick={() => {
          if (isSearching) {
            handleCancelBooking();
          } else {
            navigate("/dashboard");
          }
        }}
        aria-label="Back"
        sx={{
          position: "absolute",
          bottom: "calc(var(--safe-area-bottom) + 380px)",
          left: "20px",
          backgroundColor: "#FFFFFF",
          width: "44px",
          height: "44px",
          borderRadius: "14px",
          boxShadow: "0 4px 14px rgba(15, 23, 42, 0.12)",
          color: "#0F172A",
          zIndex: 10,
          transition: "all 0.2s ease",
          "&:hover": { backgroundColor: "#F8FAFC" },
        }}
      >
        <ArrowBackIcon sx={{ fontSize: 22 }} />
      </IconButton>

      {/* 4. Floating Right GPS Recenter Button over Map matching BOOK - SOLO.png */}
      <IconButton
        onClick={handleRecenterGps}
        aria-label="Recenter location"
        sx={{
          position: "absolute",
          bottom: "calc(var(--safe-area-bottom) + 380px)",
          right: "20px",
          backgroundColor: "#FFFFFF",
          width: "44px",
          height: "44px",
          borderRadius: "14px",
          boxShadow: "0 4px 14px rgba(15, 23, 42, 0.12)",
          color: "#0F172A",
          zIndex: 10,
          transition: "all 0.2s ease",
          "&:hover": { backgroundColor: "#F8FAFC" },
        }}
      >
        <NavigationIcon sx={{ fontSize: 20, transform: "rotate(45deg)" }} />
      </IconButton>

      {/* 5. Bottom Sheet Container */}
      <Paper
        elevation={4}
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: "28px",
          borderTopRightRadius: "28px",
          padding: "12px 20px calc(var(--safe-area-bottom) + 20px) 20px",
          zIndex: 10,
          boxShadow: "0 -10px 30px rgba(15, 23, 42, 0.08)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {isSearching ? (
          /* ====================================================================
             TIER 1 - SOLO.png SEARCHING STATE
             ==================================================================== */
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              py: 2,
              gap: 2,
            }}
          >
            {/* Drag Handle Bar */}
            <Box
              sx={{
                width: "40px",
                height: "4px",
                backgroundColor: "#E2E8F0",
                borderRadius: "2px",
                mb: 1,
              }}
            />

            {/* Large Concentric Search Circle with Pulsing Animation */}
            <Box
              sx={{
                width: 84,
                height: 84,
                borderRadius: "50%",
                backgroundColor: "#FFE5D4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "pulseRing 2s infinite ease-in-out",
                "@keyframes pulseRing": {
                  "0%": { transform: "scale(0.96)", opacity: 0.9 },
                  "50%": { transform: "scale(1.05)", opacity: 1 },
                  "100%": { transform: "scale(0.96)", opacity: 0.9 },
                },
              }}
            >
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  backgroundColor: "#FF6B00",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <SearchIcon sx={{ color: "#FFFFFF", fontSize: 32 }} />
              </Box>
            </Box>

            {/* Search Status Headings matching TIER 1 - SOLO.png */}
            <Box sx={{ textAlign: "center", mt: 1 }}>
              <Typography
                sx={{
                  fontSize: "17px",
                  fontWeight: 800,
                  color: "#0F172A",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                {language === "tl"
                  ? "Naghahanap ng Drayber malapit sayo..."
                  : "Finding a driver near you..."}
              </Typography>
              <Typography
                sx={{
                  fontSize: "13px",
                  color: "#64748B",
                  mt: 0.5,
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                {language === "tl"
                  ? "Sinusuri ang pinakamalapit na terminal ng TODA."
                  : "Checking the nearest TODA terminal."}
              </Typography>
            </Box>

            {/* Smooth Linear Progress Bar */}
            <Box sx={{ width: "100%", px: 1, mt: 1 }}>
              <LinearProgress
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: "#E5E7EB",
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: "#FF6B00",
                    borderRadius: 3,
                  },
                }}
              />
            </Box>

            {/* Cancel Booking Button matching TIER 1 - SOLO.png */}
            <Button
              fullWidth
              onClick={() => setCancelModalOpen(true)}
              sx={{
                mt: 2,
                height: "50px",
                borderRadius: "16px",
                backgroundColor: "#FEE2E2",
                border: "1px solid #FCA5A5",
                color: "#EF4444",
                fontWeight: 700,
                fontSize: "15px",
                textTransform: "none",
                fontFamily: "Poppins, sans-serif",
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: "#FECACA",
                  boxShadow: "none",
                },
              }}
            >
              {language === "tl" ? "Ikansel ang Booking" : "Cancel Booking"}
            </Button>
          </Box>
        ) : (
          /* ====================================================================
             BOOK - SOLO.png NORMAL BOOKING STATE
             ==================================================================== */
          <>
            {/* Drag Handle Bar */}
            <Box
              sx={{
                width: "40px",
                height: "4px",
                backgroundColor: "#CBD5E1",
                borderRadius: "2px",
                margin: "0 auto 2px auto",
              }}
            />

            {/* Validation Error Alert */}
            {validationError && (
              <Alert severity="warning" sx={{ borderRadius: "12px", py: 0.5 }}>
                {validationError}
              </Alert>
            )}

            {/* 1. PICKUP Card (Soft Beige/Cream #FAF2EA) */}
            <Box
              onClick={() => handleOpenSetPlace("pickup")}
              sx={{
                backgroundColor: "#FAF2EA",
                borderRadius: "16px",
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                "&:hover": { backgroundColor: "#F5EBE1" },
              }}
            >
              {/* Orange Radio Circle Indicator */}
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

              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#64748B",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    fontFamily: "Poppins, sans-serif",
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
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  {pickup.address ||
                    (language === "tl" ? "Pumili ng pickup location" : "Choose pickup location")}
                </Typography>
              </Box>
            </Box>

            {/* 2. DESTINASYON Card (Soft Mint #F2F8F4) */}
            <Box
              onClick={() => handleOpenSetPlace("dropoff")}
              sx={{
                backgroundColor: "#F2F8F4",
                borderRadius: "16px",
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                "&:hover": { backgroundColor: "#E6F3EA" },
              }}
            >
              {/* Black Circular Location Pin */}
              <Box
                sx={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  backgroundColor: "#0F172A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <LocationOnIcon sx={{ color: "#FFFFFF", fontSize: "13px" }} />
              </Box>

              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#64748B",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  {language === "tl" ? "DESTINASYON" : "DESTINATION"}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "14px",
                    fontWeight: dropoff.address ? 700 : 400,
                    color: dropoff.address ? "#0F172A" : "#94A3B8",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  {dropoff.address ||
                    (language === "tl" ? "I-type ang lugar" : "Type destination")}
                </Typography>
              </Box>
            </Box>

            {/* 3. Three Controls Row matching BOOK - SOLO.png */}
            <Box sx={{ display: "flex", gap: "8px", width: "100%" }}>
              {/* Card A: TRIP TYPE ⓘ */}
              <Box
                sx={{
                  flex: 1,
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "16px",
                  p: "8px 10px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minWidth: 0,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: "6px",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#64748B",
                      letterSpacing: "0.5px",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    TRIP TYPE
                  </Typography>
                  <IconButton size="small" onClick={() => setTripTypeInfoOpen(true)} sx={{ p: 0 }}>
                    <InfoOutlinedIcon sx={{ fontSize: 13, color: "#94A3B8" }} />
                  </IconButton>
                </Box>

                {/* Segmented Pill [ Solo | Share ] */}
                <Box
                  sx={{
                    backgroundColor: "#F1F5F9",
                    borderRadius: "12px",
                    p: "2px",
                    display: "flex",
                    height: "32px",
                  }}
                >
                  <Box
                    onClick={() => setTripType("Solo")}
                    sx={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "10px",
                      backgroundColor: tripType === "Solo" ? "#FFFFFF" : "transparent",
                      boxShadow: tripType === "Solo" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "12px",
                        fontWeight: tripType === "Solo" ? 700 : 500,
                        color: tripType === "Solo" ? "#0F172A" : "#64748B",
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      Solo
                    </Typography>
                  </Box>

                  <Box
                    onClick={() => {
                      setTripType("Shared");
                      if (passengers > 2) setPassengers(2);
                    }}
                    sx={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "10px",
                      backgroundColor: tripType === "Shared" ? "#FFFFFF" : "transparent",
                      boxShadow: tripType === "Shared" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "12px",
                        fontWeight: tripType === "Shared" ? 700 : 500,
                        color: tripType === "Shared" ? "#0F172A" : "#64748B",
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      Share
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Card B: PASSENGERS ⓘ */}
              <Box
                sx={{
                  flex: 1,
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "16px",
                  p: "8px 10px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minWidth: 0,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: "6px",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#64748B",
                      letterSpacing: "0.5px",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    PASSENGERS
                  </Typography>
                  <IconButton size="small" onClick={() => setTariffInfoOpen(true)} sx={{ p: 0 }}>
                    <InfoOutlinedIcon sx={{ fontSize: 13, color: "#94A3B8" }} />
                  </IconButton>
                </Box>

                {/* Counter [- 1 +] */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: "#F1F5F9",
                    borderRadius: "12px",
                    p: "2px 4px",
                    height: "32px",
                  }}
                >
                  <IconButton
                    size="small"
                    disabled={passengers <= 1}
                    onClick={() => setPassengers((prev) => Math.max(1, prev - 1))}
                    sx={{ width: 26, height: 26, p: 0, color: "#0F172A" }}
                  >
                    <RemoveIcon sx={{ fontSize: 15 }} />
                  </IconButton>

                  <Typography
                    sx={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#0F172A",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    {passengers}
                  </Typography>

                  <IconButton
                    size="small"
                    disabled={tripType === "Shared" ? passengers >= 2 : passengers >= 4}
                    onClick={() => {
                      const max = tripType === "Shared" ? 2 : 4;
                      if (passengers < max) {
                        setPassengers((prev) => prev + 1);
                      }
                    }}
                    sx={{ width: 26, height: 26, p: 0, color: "#0F172A" }}
                  >
                    <AddIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Box>
              </Box>

              {/* Card C: NOTES ⓘ */}
              <Box
                sx={{
                  flex: 1,
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "16px",
                  p: "8px 10px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minWidth: 0,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: "6px",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#64748B",
                      letterSpacing: "0.5px",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    NOTES
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setTempNoteText(noteText);
                      setNotesDialogOpen(true);
                    }}
                    sx={{ p: 0 }}
                  >
                    <InfoOutlinedIcon sx={{ fontSize: 13, color: "#94A3B8" }} />
                  </IconButton>
                </Box>

                {/* Notes Button Pill */}
                <Box
                  onClick={() => {
                    setTempNoteText(noteText);
                    setNotesDialogOpen(true);
                  }}
                  sx={{
                    backgroundColor: "#F1F5F9",
                    borderRadius: "12px",
                    p: "4px 8px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    "&:hover": { backgroundColor: "#E2E8F0" },
                  }}
                >
                  <MessageIcon sx={{ fontSize: 14, color: "#64748B" }} />
                  <Typography
                    sx={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: noteText ? "#FF6B00" : "#64748B",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    {noteText
                      ? language === "tl"
                        ? "May tala"
                        : "Has note"
                      : language === "tl"
                      ? "Add notes"
                      : "Add notes"}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* 4. ESTIMATED FARE Section matching BOOK - SOLO.png */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                pt: "4px",
                borderTop: "1px solid #F1F5F9",
              }}
            >
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Typography
                    sx={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#64748B",
                      letterSpacing: "0.5px",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    {language === "tl" ? "ESTIMATED FARE" : "ESTIMATED FARE"}
                  </Typography>
                  <IconButton size="small" onClick={() => setTariffInfoOpen(true)} sx={{ p: 0 }}>
                    <InfoOutlinedIcon sx={{ fontSize: 13, color: "#94A3B8" }} />
                  </IconButton>
                </Box>
                <Typography
                  sx={{
                    fontSize: "12px",
                    color: "#64748B",
                    mt: "1px",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  {language === "tl" ? "Cash Payment" : "Cash Payment"}
                </Typography>
              </Box>

              <Typography
                sx={{
                  fontSize: "20px",
                  fontWeight: 800,
                  color: "#0F172A",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                ₱{estimatedFare.toFixed(2)}
              </Typography>
            </Box>

            {/* 5. Bottom Action Row: Calendar Schedule Button + Mag-book ng Biyahe */}
            <Box sx={{ display: "flex", alignItems: "center", gap: "10px", mt: "2px" }}>
              {/* Calendar Schedule Button */}
              <IconButton
                onClick={() => setScheduleDialogOpen(true)}
                aria-label="Schedule trip"
                sx={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "16px",
                  backgroundColor: "#FFF8F0",
                  border: "1.5px solid #FF6B00",
                  color: "#FF6B00",
                  flexShrink: 0,
                  boxShadow: "none",
                  "&:hover": { backgroundColor: "#FFF2E6" },
                }}
              >
                <EventIcon sx={{ fontSize: 24 }} />
              </IconButton>

              {/* Primary Mag-book ng Biyahe Button */}
              <Button
                variant="contained"
                fullWidth
                onClick={handleBookTrip}
                disabled={bookingSubmitting}
                sx={{
                  height: "52px",
                  borderRadius: "16px",
                  backgroundColor: "#FF6B00",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: "15px",
                  textTransform: "none",
                  fontFamily: "Poppins, sans-serif",
                  boxShadow: "none",
                  "&:hover": {
                    backgroundColor: "#E66000",
                    boxShadow: "none",
                  },
                }}
              >
                {bookingSubmitting
                  ? language === "tl"
                    ? "Inihahanda..."
                    : "Preparing..."
                  : language === "tl"
                  ? "Mag-book ng Biyahe"
                  : "Book Ride"}
              </Button>
            </Box>
          </>
        )}
      </Paper>

      {/* 6. Notes Modal */}
      <Dialog
        open={notesDialogOpen}
        onClose={() => setNotesDialogOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "20px",
              padding: "10px",
              maxWidth: "360px",
              width: "90%",
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 800,
            fontSize: "17px",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {language === "tl" ? "Mga Tala para sa Drayber" : "Notes for Driver"}
          <IconButton size="small" onClick={() => setNotesDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={3}
            fullWidth
            value={tempNoteText}
            onChange={(e) => setTempNoteText(e.target.value)}
            placeholder={
              language === "tl"
                ? "Hal. Sa tapat po ng tindahan maghintay, may dalang mabigat na gamit..."
                : "E.g. Please wait in front of the store, carrying heavy luggage..."
            }
            sx={{
              mt: 1,
              "& .MuiOutlinedInput-root": {
                borderRadius: "14px",
                fontFamily: "Poppins, sans-serif",
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setNotesDialogOpen(false)}
            sx={{
              color: "#64748B",
              fontWeight: 600,
              textTransform: "none",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            {language === "tl" ? "Kanselahin" : "Cancel"}
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveNotes}
            sx={{
              backgroundColor: "#FF6B00",
              color: "#FFFFFF",
              borderRadius: "12px",
              fontWeight: 700,
              textTransform: "none",
              boxShadow: "none",
              fontFamily: "Poppins, sans-serif",
              "&:hover": { backgroundColor: "#E66000", boxShadow: "none" },
            }}
          >
            {language === "tl" ? "I-save ang Tala" : "Save Note"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 7. Official Municipal Tariff Info Modal */}
      <Dialog
        open={tariffInfoOpen}
        onClose={() => setTariffInfoOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "20px",
              padding: "10px",
              maxWidth: "360px",
              width: "90%",
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 800,
            fontSize: "17px",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {language === "tl" ? "🏛️ Taripa ng Calapan City" : "🏛️ Calapan City Tariff"}
          <IconButton size="small" onClick={() => setTariffInfoOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                backgroundColor: "#FFF7ED",
                borderRadius: "14px",
                border: "1px solid #FFEDD5",
              }}
            >
              <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#C2410C" }}>
                {language === "tl" ? "Opisyal na Taripa ng Lungsod:" : "Official Municipal Matrix:"}
              </Typography>
              <Typography sx={{ fontSize: "12px", color: "#9A3412", mt: 0.5 }}>
                • Base Fare: ₱{activeTariff.baseFare.toFixed(2)} (unang {activeTariff.baseKm} km)
              </Typography>
              <Typography sx={{ fontSize: "12px", color: "#9A3412" }}>
                • Kada Karagdagang Kilometro: +₱{activeTariff.succRate.toFixed(2)}/km
              </Typography>
              <Typography sx={{ fontSize: "12px", color: "#9A3412" }}>
                • Tinatayang Distansya: {tripDistanceKm} km
              </Typography>
            </Paper>
            <Typography sx={{ fontSize: "12px", color: "#64748B", px: 0.5 }}>
              {language === "tl"
                ? "Lahat ng pamasahe sa SAKAY ay awtomatikong kinukwenta batay sa opisyal na ordinansa upang maiwasan ang paniningil nang higit sa taripa."
                : "All fares in SAKAY are automatically calculated based on official ordinances to prevent overcharging."}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => setTariffInfoOpen(false)}
            sx={{
              backgroundColor: "#FF6B00",
              color: "#FFFFFF",
              borderRadius: "12px",
              fontWeight: 700,
              textTransform: "none",
              boxShadow: "none",
              fontFamily: "Poppins, sans-serif",
              "&:hover": { backgroundColor: "#E66000", boxShadow: "none" },
            }}
          >
            {language === "tl" ? "Naintindihan Ko" : "Understood"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 8. Trip Type Info Modal */}
      <Dialog
        open={tripTypeInfoOpen}
        onClose={() => setTripTypeInfoOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "20px",
              padding: "10px",
              maxWidth: "360px",
              width: "90%",
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 800,
            fontSize: "17px",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {language === "tl" ? "Uri ng Biyahe" : "Trip Type"}
          <IconButton size="small" onClick={() => setTripTypeInfoOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                backgroundColor: "#FFF8F0",
                borderRadius: "14px",
                border: "1px solid #FFE4D6",
              }}
            >
              <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#FF6B00" }}>
                Solo Trip
              </Typography>
              <Typography sx={{ fontSize: "12px", color: "#64748B", mt: 0.5 }}>
                {language === "tl"
                  ? "Iyo ang buong tricycle (hanggang 4 na pasahero). Diretso ang biyahe nang walang kasabay."
                  : "You get the entire tricycle (up to 4 passengers). Direct route without other passengers."}
              </Typography>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                backgroundColor: "#ECFDF5",
                borderRadius: "14px",
                border: "1px solid #A7F3D0",
              }}
            >
              <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#059669" }}>
                Share Trip (Carpool)
              </Typography>
              <Typography sx={{ fontSize: "12px", color: "#64748B", mt: 0.5 }}>
                {language === "tl"
                  ? "Makatipid ng pamasahe sa pamamagitan ng pag-share ng tricycle sa ibang pasaherong pareho ang ruta (hanggang 2 pasahero bawat booking)."
                  : "Save on fare by carpooling with passengers heading the same way (up to 2 passengers per booking)."}
              </Typography>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => setTripTypeInfoOpen(false)}
            sx={{
              backgroundColor: "#FF6B00",
              color: "#FFFFFF",
              borderRadius: "12px",
              fontWeight: 700,
              textTransform: "none",
              boxShadow: "none",
              fontFamily: "Poppins, sans-serif",
              "&:hover": { backgroundColor: "#E66000", boxShadow: "none" },
            }}
          >
            {language === "tl" ? "Naintindihan Ko" : "Understood"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 9. Schedule Ride Dialog */}
      <Dialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "20px",
              padding: "10px",
              maxWidth: "360px",
              width: "90%",
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 800,
            fontSize: "17px",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {language === "tl" ? "Mag-iskedyul ng Biyahe" : "Schedule a Trip"}
          <IconButton size="small" onClick={() => setScheduleDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <Typography sx={{ fontSize: "12px", color: "#64748B" }}>
              {language === "tl"
                ? "Piliin ang petsa at oras kung kailan mo kailangan ang tricycle."
                : "Select the date and time when you need the tricycle."}
            </Typography>
            <TextField
              type="date"
              fullWidth
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              label={language === "tl" ? "Petsa" : "Date"}
            />
            <TextField
              type="time"
              fullWidth
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              label={language === "tl" ? "Oras" : "Time"}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setScheduleDialogOpen(false)}
            sx={{ color: "#64748B", textTransform: "none", fontFamily: "Poppins, sans-serif" }}
          >
            {language === "tl" ? "Kanselahin" : "Cancel"}
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setScheduleDialogOpen(false);
              handleBookTrip();
            }}
            sx={{
              backgroundColor: "#FF6B00",
              color: "#FFFFFF",
              borderRadius: "12px",
              fontWeight: 700,
              textTransform: "none",
              boxShadow: "none",
              fontFamily: "Poppins, sans-serif",
              "&:hover": { backgroundColor: "#E66000", boxShadow: "none" },
            }}
          >
            {language === "tl" ? "Kumpirmahin" : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 10. Navigation Drawer & Support Dialogs */}
      <PassengerNavigationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        profileName={profileName}
        onOpenTulong={() => setTulongOpen(true)}
        onLogout={async () => {
          try {
            await supabase.auth.signOut();
            localStorage.removeItem("sakay_passenger_phone");
            localStorage.removeItem("sakay_passenger_password");
            sessionStorage.clear();
          } catch (e) {
            console.warn("Logout error:", e);
          }
          navigate("/get-started", { replace: true });
        }}
      />
      <TulongDialog open={tulongOpen} onClose={() => setTulongOpen(false)} />
      <NotificationsDialog
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />

      {/* 11. Passenger Cancellation Modal matching PASSENGER CANCEL.png */}
      <PassengerCancelModal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirmCancel={handleConfirmCancelBooking}
        language={language}
        loading={cancelling}
      />
    </Box>
  );
};

export default NewTrip;
