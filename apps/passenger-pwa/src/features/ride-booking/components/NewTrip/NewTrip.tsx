import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MessageIcon from "@mui/icons-material/Message";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LinearProgress from "@mui/material/LinearProgress";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import totoHeadImg from "@sakay/shared/src/assets/icons/toto-head.webp";
import { calculateFare } from "@sakay/shared";

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
  type BookingRecord,
} from "../../../../services/bookingService";
import { TYPOGRAPHY_TOKENS } from "@sakay/shared";

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

  // Dynamic Bottom Sheet Height tracking for floating Back & Location buttons
  const bottomSheetRef = useRef<HTMLDivElement | null>(null);
  const [bottomSheetHeight, setBottomSheetHeight] = useState<number>(380);

  useEffect(() => {
    const el = bottomSheetRef.current;
    if (!el) return;
    const updateHeight = () => {
      setBottomSheetHeight(el.offsetHeight);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const [noteText, setNoteText] = useState<string>(() => sessionStorage.getItem("trip_notes") || "");
  const [tempNoteText, setTempNoteText] = useState<string>("");
  const [tariffInfoOpen, setTariffInfoOpen] = useState<boolean>(false);
  const [tripTypeInfoOpen, setTripTypeInfoOpen] = useState<boolean>(false);

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
  const [dropoff, setDropoff] = useState<{ address: string; lat: number; lng: number }>(() => {
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
          succRate: Number(parsed.succeeding_rate) ?? 1.0,
        };
      }
    } catch {}
    return { baseFare: 15.0, baseKm: 2.0, succRate: 1.0 };
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
            succRate: Number(data.succeeding_rate) ?? 1.0,
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

  const [sharedDisclaimerAgreed, setSharedDisclaimerAgreed] = useState<boolean>(false);

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

    // Calculate official SAKAY estimated fare using central fare calculator
    const result = calculateFare({
      distanceKm: roadDist,
      tripType,
      passengerCount: passengers,
      tariff: {
        baseFare: activeTariff.baseFare,
        baseDistanceKm: activeTariff.baseKm,
        succeedingRate: activeTariff.succRate,
        capacity: 4
      }
    });

    setEstimatedFare(tripType === 'Shared' ? (result.sharedEstimate || result.finalFare) : result.finalFare);
  }, [pickup.lat, pickup.lng, dropoff.lat, dropoff.lng, tripType, passengers, activeTariff]);

  useEffect(() => {
    calculateDistanceAndFare();
  }, [calculateDistanceAndFare]);

  // Subscribe to real-time status updates while searching
  useEffect(() => {
    if (!activeBooking?.booking_id) return;

    // Polling fallback
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('booking')
          .select('booking_status, actual_fare, updated_at, driver_id')
          .eq('booking_id', activeBooking.booking_id)
          .maybeSingle();

        if (!error && data) {
          if (data.booking_status === "Accepted" || data.booking_status === "Driver Assigned") {
            clearInterval(pollInterval);
            navigate("/trip-monitoring", {
              state: { bookingId: activeBooking.booking_id },
            });
          }
        }
      } catch (err) {}
    }, 4000);

    // Realtime channel
    const channel = supabase
      .channel(`new_trip_wait_${activeBooking.booking_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'booking',
          filter: `booking_id=eq.${activeBooking.booking_id}`,
        },
        (payload: any) => {
          const row = payload.new;
          if (row.booking_status === "Accepted" || row.booking_status === "Driver Assigned") {
            clearInterval(pollInterval);
            navigate("/trip-monitoring", {
              state: { bookingId: activeBooking.booking_id },
            });
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
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

  const handleSetCurrentLocationFor = async (target: "pickup" | "dropoff", e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const coords = await getCurrentDevicePosition();
      let realAddr = "";
      try {
        realAddr = await reverseGeocodeCoordinates(coords.latitude, coords.longitude);
      } catch {}

      const finalAddr =
        realAddr && !realAddr.startsWith("Kasalukuyang Lokasyon")
          ? realAddr
          : language === "tl"
          ? "Kasalukuyang Lokasyon"
          : "Current Location";

      const locObj = {
        address: finalAddr,
        lat: coords.latitude,
        lng: coords.longitude,
        isCustom: target === "dropoff",
      };

      if (target === "pickup") {
        setPickup(locObj);
        sessionStorage.setItem("trip_pickup", JSON.stringify(locObj));
      } else {
        setDropoff(locObj);
        sessionStorage.setItem("trip_dropoff", JSON.stringify(locObj));
      }
      setRecenterTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Failed to set current location:", err);
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

      {/* 3. Floating Left Back Button over Map */}
      <IconButton
        onClick={() => {
          sessionStorage.removeItem("trip_dropoff");
          sessionStorage.removeItem("trip_notes");
          if (isSearching) {
            handleCancelBooking();
          } else {
            navigate("/dashboard");
          }
        }}
        aria-label="Back"
        sx={{
          position: "absolute",
          bottom: `calc(var(--safe-area-bottom) + ${bottomSheetHeight + 16}px)`,
          left: "16px",
          backgroundColor: "#FFFFFF",
          width: "44px",
          height: "44px",
          borderRadius: "14px",
          boxShadow: "0 4px 14px rgba(15, 23, 42, 0.12)",
          color: "#0F172A",
          zIndex: 10,
          transition: "bottom 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s ease",
          "&:hover": { backgroundColor: "#F8FAFC" },
        }}
      >
        <ArrowBackIcon sx={{ fontSize: 22 }} />
      </IconButton>

      {/* 4. Floating Right GPS Recenter Button over Map matching Dashboard.tsx */}
      <IconButton
        onClick={handleRecenterGps}
        aria-label="Recenter location"
        sx={{
          position: "absolute",
          bottom: `calc(var(--safe-area-bottom) + ${bottomSheetHeight + 16}px)`,
          right: "16px",
          backgroundColor: "#FFFFFF",
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          boxShadow: "0 4px 14px rgba(15, 23, 42, 0.15)",
          color: "#0F172A",
          zIndex: 10,
          transition: "bottom 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s ease",
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

      {/* 5. Bottom Sheet Container */}
      <Paper
        ref={bottomSheetRef}
        elevation={4}
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: "28px",
          borderTopRightRadius: "28px",
          padding: "16px 20px calc(var(--safe-area-bottom) + 20px) 20px",
          zIndex: 10,
          boxShadow: "0 -10px 30px rgba(15, 23, 42, 0.08)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
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
                    fontSize: "13px",
                    fontWeight: 600,
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

              {/* Quick 1-Tap Current Location Button */}
              <IconButton
                size="small"
                onClick={(e) => handleSetCurrentLocationFor("pickup", e)}
                title={language === "tl" ? "Gamitin ang Kasalukuyang Lokasyon" : "Use current location"}
                sx={{
                  backgroundColor: "rgba(255, 107, 0, 0.12)",
                  color: "#FF6B00",
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  flexShrink: 0,
                  "&:hover": { backgroundColor: "rgba(255, 107, 0, 0.22)" },
                }}
              >
                <MyLocationIcon sx={{ fontSize: "16px" }} />
              </IconButton>
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
              {/* High-Contrast Standalone Red Destination Location Pin */}
              <LocationOnIcon sx={{ color: "#EF4444", fontSize: "24px", flexShrink: 0 }} />

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
                    fontSize: "13px",
                    fontWeight: dropoff.address ? 600 : 400,
                    color: dropoff.address ? "#0F172A" : "#94A3B8",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  {dropoff.address ||
                    (language === "tl" ? "Saan pupunta?" : "Where to go?")}
                </Typography>
              </Box>

              {dropoff.address ? (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropoff({ address: "", lat: 0, lng: 0 });
                    sessionStorage.removeItem("trip_dropoff");
                    setRouteCoordinates([]);
                  }}
                  title={language === "tl" ? "Burahin ang destinasyon" : "Clear destination"}
                  sx={{
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    color: "#EF4444",
                    width: "32px",
                    height: "32px",
                    borderRadius: "10px",
                    flexShrink: 0,
                    "&:hover": { backgroundColor: "rgba(239, 68, 68, 0.2)" },
                  }}
                >
                  <CloseIcon sx={{ fontSize: "16px" }} />
                </IconButton>
              ) : (
                /* Quick 1-Tap Current Location Button for Dropoff */
                <IconButton
                  size="small"
                  onClick={(e) => handleSetCurrentLocationFor("dropoff", e)}
                  title={language === "tl" ? "Gamitin ang Kasalukuyang Lokasyon para sa Destinasyon" : "Use current location for destination"}
                  sx={{
                    backgroundColor: "rgba(15, 23, 42, 0.08)",
                    color: "#0F172A",
                    width: "32px",
                    height: "32px",
                    borderRadius: "10px",
                    flexShrink: 0,
                    "&:hover": { backgroundColor: "rgba(15, 23, 42, 0.16)" },
                  }}
                >
                  <MyLocationIcon sx={{ fontSize: "16px" }} />
                </IconButton>
              )}
            </Box>

            {/* 3. Consolidated Controls Row: TRIP TYPE | PASSENGERS | NOTES */}
            <Box
              sx={{
                width: "100%",
                backgroundColor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "16px",
                p: "10px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              {/* --- Section A: TRIP TYPE --- */}
              <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography
                    sx={{
                      fontSize: TYPOGRAPHY_TOKENS.fontSize.secondary,
                      fontWeight: 700,
                      color: "#64748B",
                      letterSpacing: "0.5px",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    {language === "tl" ? "URI NG BIYAHE" : "TRIP TYPE"}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setTripTypeInfoOpen(true)}
                    title={language === "tl" ? "Impormasyon sa Uri ng Biyahe" : "Trip Type Info"}
                    sx={{ p: 0, color: "#94A3B8", "&:hover": { color: "#64748B" } }}
                  >
                    <InfoOutlinedIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </Box>

                {/* Segmented Pill [ Solo | Share ] */}
                <Box
                  sx={{
                    backgroundColor: "#F1F5F9",
                    borderRadius: "10px",
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
                      borderRadius: "8px",
                      backgroundColor: tripType === "Solo" ? "#FFFFFF" : "transparent",
                      boxShadow: tripType === "Solo" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: TYPOGRAPHY_TOKENS.fontSize.buttonMobile,
                        fontWeight: tripType === "Solo" ? 700 : 500,
                        color: tripType === "Solo" ? "#0F172A" : "#64748B",
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      {language === "tl" ? "Solo" : "Solo"}
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
                      borderRadius: "8px",
                      backgroundColor: tripType === "Shared" ? "#FFFFFF" : "transparent",
                      boxShadow: tripType === "Shared" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: TYPOGRAPHY_TOKENS.fontSize.buttonMobile,
                        fontWeight: tripType === "Shared" ? 700 : 500,
                        color: tripType === "Shared" ? "#0F172A" : "#64748B",
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      {language === "tl" ? "Share" : "Share"}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Vertical Separator 1 */}
              <Box
                sx={{
                  width: "1px",
                  height: "44px",
                  backgroundColor: "#E2E8F0",
                  flexShrink: 0,
                }}
              />

              {/* --- Section B: PASSENGERS --- */}
              <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography
                    sx={{
                      fontSize: TYPOGRAPHY_TOKENS.fontSize.secondary,
                      fontWeight: 700,
                      color: "#64748B",
                      letterSpacing: "0.5px",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    {language === "tl" ? "PASAHERO" : "PASSENGERS"}
                  </Typography>
                </Box>

                {/* Counter [- 1 +] */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: "#F1F5F9",
                    borderRadius: "10px",
                    px: "4px",
                    height: "32px",
                  }}
                >
                  <IconButton
                    size="small"
                    disabled={passengers <= 1}
                    onClick={() => setPassengers((prev) => Math.max(1, prev - 1))}
                    sx={{ width: 24, height: 24, p: 0, color: "#0F172A" }}
                  >
                    <RemoveIcon sx={{ fontSize: 14 }} />
                  </IconButton>

                  <Typography
                    sx={{
                      fontSize: TYPOGRAPHY_TOKENS.fontSize.buttonMobile,
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
                    sx={{ width: 24, height: 24, p: 0, color: "#0F172A" }}
                  >
                    <AddIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              </Box>

              {/* Vertical Separator 2 */}
              <Box
                sx={{
                  width: "1px",
                  height: "44px",
                  backgroundColor: "#E2E8F0",
                  flexShrink: 0,
                }}
              />

              {/* --- Section C: NOTES --- */}
              <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography
                    sx={{
                      fontSize: TYPOGRAPHY_TOKENS.fontSize.secondary,
                      fontWeight: 700,
                      color: "#64748B",
                      letterSpacing: "0.5px",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    {language === "tl" ? "TALA" : "NOTES"}
                  </Typography>
                </Box>

                {/* Notes Button Pill */}
                <Box
                  onClick={() => {
                    setTempNoteText(noteText);
                    setNotesDialogOpen(true);
                  }}
                  sx={{
                    backgroundColor: "#F1F5F9",
                    borderRadius: "10px",
                    px: "6px",
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
                  <MessageIcon sx={{ fontSize: 13, color: noteText ? "#FF6B00" : "#64748B" }} />
                  <Typography
                    sx={{
                      fontSize: TYPOGRAPHY_TOKENS.fontSize.caption,
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
                      ? "Magdagdag ng tala"
                      : "Add notes"}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Shared Trip Disclaimer & Agreement (Combined Integrated Card) */}
            {tripType === "Shared" && (
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: "14px",
                  backgroundColor: "#EFF6FF",
                  border: "1px solid #BFDBFE",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.25,
                }}
              >
                <Checkbox
                  checked={sharedDisclaimerAgreed}
                  onChange={(e) => setSharedDisclaimerAgreed(e.target.checked)}
                  size="small"
                  sx={{ color: "#2563EB", "&.Mui-checked": { color: "#2563EB" }, p: 0, mt: 0.25 }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#1E40AF", display: "flex", alignItems: "center", mb: 0.25, fontFamily: "Poppins, sans-serif" }}>
                    {language === "tl" ? "Paunawa sa Shared Trip" : "Shared Trip Notice"}
                  </Typography>
                  <Typography sx={{ fontSize: "11.5px", color: "#1E3A8A", lineHeight: 1.45, fontFamily: "Poppins, sans-serif" }}>
                    {language === "tl"
                      ? "Naiintindihan ko na ang aking pamasahe ay mahahati kapag may na-match na kasabay, ngunit babayaran ko ang buong Solo fare kung walang mahanap na kapares."
                      : "I understand that my fare will be shared if matched with another commuter, but I will pay the full Solo fare if no shared match is found."}
                  </Typography>
                </Box>
              </Paper>
            )}

            {/* 4. ESTIMATED FARE Section */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                pt: "12px",
                pb: "4px",
                borderTop: "1px solid #F1F5F9",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Typography
                      sx={{
                        fontSize: TYPOGRAPHY_TOKENS.fontSize.secondary,
                        fontWeight: 700,
                        color: "#64748B",
                        letterSpacing: "0.5px",
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      {language === "tl" ? "TINATAYANG PAMASAHE" : "ESTIMATED FARE"}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => setTariffInfoOpen(true)}
                      title={language === "tl" ? "Taripa at Detalye ng Pamasahe" : "Tariff & Fare Details"}
                      sx={{ p: 0, color: "#94A3B8", "&:hover": { color: "#64748B" } }}
                    >
                      <InfoOutlinedIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: TYPOGRAPHY_TOKENS.fontSize.caption,
                      color: "#64748B",
                      mt: "1px",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    {language === "tl" ? "Bayad sa Cash" : "Cash Payment"}
                  </Typography>
                </Box>

                <Typography
                  sx={{
                    fontSize: TYPOGRAPHY_TOKENS.fontSize.display,
                    fontWeight: 800,
                    color: "#0F172A",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  ₱{estimatedFare.toFixed(2)}
                </Typography>
              </Box>
            </Box>

            {/* 5. Bottom Action Row: Mag-book ng Biyahe */}
            <Box sx={{ width: "100%", mt: "6px" }}>
              {/* Primary Mag-book ng Biyahe Button */}
              <Button
                variant="contained"
                fullWidth
                onClick={handleBookTrip}
                disabled={
                  bookingSubmitting ||
                  !dropoff.address ||
                  dropoff.lat === 0 ||
                  !pickup.lat ||
                  pickup.lat === 0 ||
                  (tripType === "Shared" && !sharedDisclaimerAgreed)
                }
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
            fontSize: TYPOGRAPHY_TOKENS.fontSize.pageTitle,
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
                fontSize: TYPOGRAPHY_TOKENS.fontSize.bodyMobile,
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
              fontSize: TYPOGRAPHY_TOKENS.fontSize.buttonMobile,
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
              fontSize: TYPOGRAPHY_TOKENS.fontSize.buttonMobile,
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

      {/* 7. Angkas-Style Fare Breakdown Popup Modal matching media_1790154119178.png */}
      <Dialog
        open={tariffInfoOpen}
        onClose={() => setTariffInfoOpen(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{
          paper: {
            sx: {
              borderRadius: "28px",
              overflow: "hidden",
              p: 0,
            },
          },
        }}
      >
        {/* Light Orange Top Header Box with Toto Head */}
        <Box
          sx={{
            backgroundColor: "#FFF5ED",
            p: 3,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
          }}
        >
          <IconButton
            onClick={() => setTariffInfoOpen(false)}
            sx={{ position: "absolute", top: 12, right: 12, color: "#64748B" }}
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          <Box component="img" src={totoHeadImg} alt="Toto Head" sx={{ width: 44, height: 44, objectFit: "contain", mb: 0.75 }} />
          <Typography sx={{ fontSize: "17px", fontWeight: 800, color: "#0F172A", fontFamily: "Poppins, sans-serif" }}>
            {language === "tl" ? "Kalkulasyon ng Pamasahe" : "Fare Breakdown"}
          </Typography>
          <Typography sx={{ fontSize: "11px", color: "#64748B", fontWeight: 600, mt: "2px", fontFamily: "Poppins, sans-serif" }}>
            Official City Tariff Rate • Calapan Ordinance No. 110
          </Typography>
        </Box>

        {/* Receipt Container Body */}
        {(() => {
          const breakdown = calculateFare({
            distanceKm: tripDistanceKm,
            tripType,
            passengerCount: passengers,
            tariff: {
              baseFare: activeTariff.baseFare,
              baseDistanceKm: activeTariff.baseKm,
              succeedingRate: activeTariff.succRate,
              capacity: 4
            }
          });

          // Compute equivalent values for UI presentation based on the new logic
          const displayedTotal = tripType === 'Shared' ? (breakdown.sharedEstimate || breakdown.finalFare) : breakdown.finalFare;
          const multiplier = tripType === 'Solo' ? 4 : passengers;
          const baseFareTotal = activeTariff.baseFare * multiplier;
          const succeedingChargeTotal = breakdown.breakdown.excessKm * activeTariff.succRate * multiplier;

          return (
            <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: "16px",
                  backgroundColor: "#F8FAFC",
                  border: "1px dashed #CBD5E1",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.25,
                }}
              >
                {/* Distance Row */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontSize: "12.5px", color: "#64748B", fontFamily: "Poppins, sans-serif" }}>
                    {language === "tl" ? "Kabuuang Distansya" : "Total Distance"}
                  </Typography>
                  <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#0F172A", fontFamily: "Poppins, sans-serif" }}>
                    {tripDistanceKm.toFixed(1)} km
                  </Typography>
                </Box>

                {/* Base Fare Row */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography sx={{ fontSize: "12.5px", color: "#64748B", fontFamily: "Poppins, sans-serif" }}>
                      {language === "tl" ? "Unang 2.0 km (Base Fare)" : "Base Fare (First 2.0 km)"}
                    </Typography>
                    {tripType === "Solo" && (
                      <Typography sx={{ fontSize: "11px", color: "#94A3B8", fontFamily: "Poppins, sans-serif" }}>
                        ₱15.00 × 4 {language === "tl" ? "upuan (Solo)" : "seats (Solo)"}
                      </Typography>
                    )}
                  </Box>
                  <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#0F172A", fontFamily: "Poppins, sans-serif" }}>
                    ₱{baseFareTotal.toFixed(2)}
                  </Typography>
                </Box>

                {/* Distance Charge Row */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography sx={{ fontSize: "12.5px", color: "#64748B", fontFamily: "Poppins, sans-serif" }}>
                      {language === "tl"
                        ? `Dagdag na Distansya (${breakdown.breakdown.excessKm.toFixed(1)} km)`
                        : `Distance Charge (${breakdown.breakdown.excessKm.toFixed(1)} km)`}
                    </Typography>
                    {tripType === "Solo" && breakdown.breakdown.excessKm > 0 && (
                      <Typography sx={{ fontSize: "11px", color: "#94A3B8", fontFamily: "Poppins, sans-serif" }}>
                        {breakdown.breakdown.excessKm.toFixed(1)} km × ₱1.00 × 4
                      </Typography>
                    )}
                  </Box>
                  <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#0F172A", fontFamily: "Poppins, sans-serif" }}>
                    ₱{succeedingChargeTotal.toFixed(2)}
                  </Typography>
                </Box>

                <Divider sx={{ borderColor: "#CBD5E1", borderStyle: "dashed", my: 0.5 }} />

                {/* Total Fare Row */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontSize: "14.5px", fontWeight: 800, color: "#0F172A", fontFamily: "Poppins, sans-serif" }}>
                    {language === "tl" ? "Kabuuan" : "Total Fare"}
                  </Typography>
                  <Typography sx={{ fontSize: "17px", fontWeight: 900, color: "#FF6B00", fontFamily: "Poppins, sans-serif" }}>
                    ₱{displayedTotal.toFixed(2)}
                  </Typography>
                </Box>
              </Box>

              {/* Payment Method Badge */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 0.5 }}>
                <Typography sx={{ fontSize: "12.5px", fontWeight: 700, color: "#64748B", fontFamily: "Poppins, sans-serif" }}>
                  {language === "tl" ? "Paraan ng Pagbayad" : "Pay Using"}
                </Typography>
                <Chip
                  label="₱ Cash"
                  size="small"
                  sx={{ backgroundColor: "#FF6B00", color: "#FFFFFF", fontWeight: 800, fontSize: "12px", height: "26px" }}
                />
              </Box>
            </Box>
          );
        })()}
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
            fontSize: TYPOGRAPHY_TOKENS.fontSize.pageTitle,
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
              <Typography sx={{ fontSize: TYPOGRAPHY_TOKENS.fontSize.bodyMobile, fontWeight: 700, color: "#FF6B00" }}>
                Solo Trip
              </Typography>
              <Typography sx={{ fontSize: TYPOGRAPHY_TOKENS.fontSize.secondary, color: "#64748B", mt: 0.5 }}>
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
              <Typography sx={{ fontSize: TYPOGRAPHY_TOKENS.fontSize.bodyMobile, fontWeight: 700, color: "#059669" }}>
                Share Trip (Carpool)
              </Typography>
              <Typography sx={{ fontSize: TYPOGRAPHY_TOKENS.fontSize.secondary, color: "#64748B", mt: 0.5 }}>
                {language === "tl"
                  ? "Makatipid ng pamasahe sa pamamagitan ng pag-share ng tricycle sa ibang pasaherong pareho ang ruta (hanggang 2 pasahero bawat booking)."
                  : "Save on fare by carpooling with passengers heading the same way (up to 2 passengers per booking)."}
              </Typography>
            </Paper>
          </Box>
        </DialogContent>
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
