import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import InfoIcon from "@mui/icons-material/Info";
import LocalTaxiIcon from "@mui/icons-material/LocalTaxi";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import RouteIcon from "@mui/icons-material/Route";
import PersonIcon from "@mui/icons-material/Person";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import GroupsIcon from "@mui/icons-material/Groups";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import { useLanguage } from "../../../../utils/LanguageContext";
import { supabase } from "../../../../services/supabaseClient";
import SuccessModal from "../../../../common/components/SuccessModal";
import { createBooking } from "../../../../services/bookingService";

interface LocationState {
  address: string;
  lat: number;
  lng: number;
}

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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

const BookSummary: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  // Retrieve states from sessionStorage
  const [pickup, setPickup] = useState<LocationState | null>(null);
  const [dropoff, setDropoff] = useState<LocationState | null>(null);
  const [passengers, setPassengers] = useState<number>(1);
  const [tripType, setTripType] = useState<"Solo" | "Shared">("Solo");
  const [unmatchedPreference, setUnmatchedPreference] = useState<"proceed" | "cancel">("proceed");

  // Calculation & API states
  const [loading, setLoading] = useState<boolean>(true);
  const [distance, setDistance] = useState<number>(0);
  const [distanceSource, setDistanceSource] = useState<"osrm" | "fallback">("osrm");
  const [fare, setFare] = useState<number>(0);
  const [seatFare, setSeatFare] = useState<number>(0);
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);
  const [successOpen, setSuccessOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const rawPickup = sessionStorage.getItem("trip_pickup");
    const rawDropoff = sessionStorage.getItem("trip_dropoff");
    const rawPassengers = sessionStorage.getItem("trip_passengers");
    const rawType = sessionStorage.getItem("trip_type");

    if (!rawPickup || !rawDropoff) {
      navigate("/new-trip");
      return;
    }

    const p: LocationState = JSON.parse(rawPickup);
    const d: LocationState = JSON.parse(rawDropoff);
    const count = rawPassengers ? parseInt(rawPassengers, 10) : 1;
    const type = (rawType as "Solo" | "Shared") || "Solo";

    setPickup(p);
    setDropoff(d);
    setPassengers(count);
    setTripType(type);

    calculateTripData(p, d, type, count);
  }, []);

  const calculateTripData = async (
    p: LocationState,
    d: LocationState,
    type: "Solo" | "Shared",
    passengerCount: number
  ) => {
    setLoading(true);
    let roadDistance = 0;
    let source: "osrm" | "fallback" = "osrm";

    let baseFare = 15.0; // covers first 2km
    let baseDistance = 2.0; // base km
    let succeedingRate = 1.0; // succeeding rate per km

    // Read from localStorage cache first
    try {
      const cached = localStorage.getItem("sakay_active_fare_matrix");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.base_fare) baseFare = Number(parsed.base_fare);
        if (parsed.base_distance_km) baseDistance = Number(parsed.base_distance_km);
        if (parsed.succeeding_rate) succeedingRate = Number(parsed.succeeding_rate);
      }
    } catch {
      // ignore
    }

    try {
      const { data: activeMatrix } = await supabase
        .from("fare_matrix")
        .select("base_fare, base_distance_km, succeeding_rate")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeMatrix) {
        baseFare = Number(activeMatrix.base_fare);
        baseDistance = Number(activeMatrix.base_distance_km);
        succeedingRate = Number(activeMatrix.succeeding_rate);
        localStorage.setItem("sakay_active_fare_matrix", JSON.stringify(activeMatrix));
      }
    } catch (err) {
      console.warn("Could not query fare_matrix from database, using cached/defaults:", err);
    }

    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${p.lng},${p.lat};${d.lng},${d.lat}?overview=false`
      );
      if (!res.ok) throw new Error("OSRM routing request failed");
      const data = await res.json();
      
      if (data.routes && data.routes.length > 0) {
        roadDistance = data.routes[0].distance / 1000;
      } else {
        throw new Error("No routes returned by OSRM");
      }
    } catch {
      roadDistance = haversineDistance(p.lat, p.lng, d.lat, d.lng) * 1.3;
      source = "fallback";
    }

    roadDistance = Math.round(roadDistance * 100) / 100;
    setDistance(roadDistance);
    setDistanceSource(source);

    // Compute Seat Fare: base_fare + (max(0, distance - base_distance) * succeeding_rate)
    const extraDistance = Math.max(0, roadDistance - baseDistance);
    const computedSeatFare = baseFare + extraDistance * succeedingRate;
    const roundedSeat = Math.round(computedSeatFare * 100) / 100;
    setSeatFare(roundedSeat);

    // Solo Trip: Seat Fare * 4 (exclusive tricycle capacity)
    // Shared Trip: Seat Fare * passengerCount (proportionately divided by seat count)
    const computedTotalFare = type === "Solo" ? roundedSeat * 4 : roundedSeat * passengerCount;
    setFare(Math.round(computedTotalFare * 100) / 100);

    setLoading(false);
  };

  const handleToggleTripType = (newType: "Solo" | "Shared") => {
    setTripType(newType);
    let newPassengers = passengers;
    if (newType === "Shared" && passengers > 2) {
      newPassengers = 2;
      setPassengers(2);
    }
    sessionStorage.setItem("trip_type", newType);
    sessionStorage.setItem("trip_passengers", newPassengers.toString());
    if (seatFare > 0) {
      const newTotal = newType === "Solo" ? seatFare * 4 : seatFare * newPassengers;
      setFare(Math.round(newTotal * 100) / 100);
    }
  };

  const handleChangePassengers = (delta: number) => {
    const max = tripType === "Shared" ? 2 : 4;
    const next = Math.max(1, Math.min(max, passengers + delta));
    setPassengers(next);
    sessionStorage.setItem("trip_passengers", next.toString());
    if (seatFare > 0) {
      const newTotal = tripType === "Solo" ? seatFare * 4 : seatFare * next;
      setFare(Math.round(newTotal * 100) / 100);
    }
  };

  const [createdBookingId, setCreatedBookingId] = useState<string>("");

  const handleConfirmBooking = async () => {
    if (!pickup || !dropoff) return;
    setBookingLoading(true);
    setErrorMessage("");

    try {
      // Create mock booking through our reactive mock service layer
      const newBooking = await createBooking({
        is_shared_trip: tripType === "Shared",
        passenger_count: passengers,
        pickup_address: pickup.address,
        pickup_latitude: pickup.lat,
        pickup_longitude: pickup.lng,
        dropoff_address: dropoff.address,
        dropoff_latitude: dropoff.lat,
        dropoff_longitude: dropoff.lng,
        estimated_distance_km: distance,
        estimated_fare: fare,
      });

      setCreatedBookingId(newBooking.booking_id);
      setBookingLoading(false);
      setSuccessOpen(true);
    } catch (err: any) {
      console.error("Booking error:", err);
      setErrorMessage("May aberya sa pag-book. Pakisubukang muli.");
      setBookingLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessOpen(false);
    // Clear trip input session data
    sessionStorage.removeItem("trip_pickup");
    sessionStorage.removeItem("trip_dropoff");
    sessionStorage.removeItem("trip_passengers");
    sessionStorage.removeItem("trip_type");
    // Transition directly into Trip Monitoring screen with history replacement
    navigate("/trip-monitoring", { replace: true, state: { bookingId: createdBookingId } });
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        backgroundColor: "#F8FAFC",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Header respecting safe-area-inset-top */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          paddingTop: "calc(var(--safe-area-top) + 16px)",
          paddingBottom: "16px",
          paddingLeft: "20px",
          paddingRight: "20px",
        }}
      >
        <IconButton onClick={() => navigate("/new-trip")} sx={{ color: "#0F172A", padding: 0 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography sx={{ fontSize: "18px", fontWeight: 800, marginLeft: "12px", color: "#0F172A" }}>
          {language === "tl" ? "Kumpirmahin ang Biyahe" : "Booking Details"}
        </Typography>
      </Box>

      {errorMessage && (
        <Box sx={{ paddingX: "20px" }}>
          <Alert severity="error" sx={{ borderRadius: "12px", marginBottom: "16px" }}>
            {errorMessage}
          </Alert>
        </Box>
      )}

      {loading ? (
        <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "16px" }}>
          <CircularProgress sx={{ color: "#FF6B00" }} />
          <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "#64748B" }}>
            {language === "tl" ? "Kinakalkula ang distansya at pamasahe..." : "Calculating distance & fare..."}
          </Typography>
        </Box>
      ) : (
        <Box
          className="hide-scrollbar"
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            padding: "0 20px 16px 20px",
          }}
        >
          {/* Route Summary Card */}
          <Paper
            elevation={0}
            sx={{
              padding: "18px",
              borderRadius: "20px",
              border: "1px solid #E2E8F0",
              backgroundColor: "#FFFFFF",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {/* Pickup Address */}
            <Box sx={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <LocationOnIcon sx={{ color: "#34A853", marginTop: "2px" }} />
              <Box>
                <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#94A3B8" }}>
                  {language === "tl" ? "MULA SA (PICKUP)" : "PICKUP POINT"}
                </Typography>
                <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>
                  {pickup?.address}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ borderLeft: "2px dashed #CBD5E1", height: "16px", marginLeft: "11px", marginTop: "-12px", marginBottom: "-12px" }} />

            {/* Dropoff Address */}
            <Box sx={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <LocationOnIcon sx={{ color: "#EF4444", marginTop: "2px" }} />
              <Box>
                <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#94A3B8" }}>
                  {language === "tl" ? "PUPUNTA SA (DESTINASYON)" : "DESTINATION"}
                </Typography>
                <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>
                  {dropoff?.address}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Trip Parameters Info */}
          <Paper
            elevation={0}
            sx={{
              padding: "16px 20px",
              borderRadius: "20px",
              border: "1px solid #E2E8F0",
              backgroundColor: "#FFFFFF",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {/* Distance Detail */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box sx={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <RouteIcon sx={{ color: "#FF6B00", fontSize: "20px" }} />
                <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#475569" }}>
                  {language === "tl" ? "Distansya" : "Distance"}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography sx={{ fontSize: "14px", fontWeight: 800, color: "#0F172A" }}>
                  {distance} km
                </Typography>
                <Typography sx={{ fontSize: "9px", color: "#94A3B8", fontWeight: 600 }}>
                  {distanceSource === "osrm" ? "via OSRM road-network" : "estimated road distance"}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ borderBottom: "1px solid #F1F5F9" }} />

            {/* Service Type Detail & Interactive Toggle */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box sx={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <LocalTaxiIcon sx={{ color: "#FF6B00", fontSize: "20px" }} />
                <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#475569" }}>
                  {language === "tl" ? "Uri ng Biyahe" : "Trip Type"}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: "6px" }}>
                <Button
                  size="small"
                  onClick={() => handleToggleTripType("Solo")}
                  startIcon={<PersonIcon sx={{ fontSize: "14px !important" }} />}
                  sx={{
                    borderRadius: "12px",
                    px: "10px",
                    py: "3px",
                    fontSize: "12px",
                    fontWeight: 700,
                    textTransform: "none",
                    backgroundColor: tripType === "Solo" ? "#FF6B00" : "#F1F5F9",
                    color: tripType === "Solo" ? "#FFFFFF" : "#64748B",
                    "&:hover": { backgroundColor: tripType === "Solo" ? "#E66000" : "#E2E8F0" },
                  }}
                >
                  Solo
                </Button>
                <Button
                  size="small"
                  onClick={() => handleToggleTripType("Shared")}
                  startIcon={<GroupsIcon sx={{ fontSize: "14px !important" }} />}
                  sx={{
                    borderRadius: "12px",
                    px: "10px",
                    py: "3px",
                    fontSize: "12px",
                    fontWeight: 700,
                    textTransform: "none",
                    backgroundColor: tripType === "Shared" ? "#10B981" : "#F1F5F9",
                    color: tripType === "Shared" ? "#FFFFFF" : "#64748B",
                    "&:hover": { backgroundColor: tripType === "Shared" ? "#059669" : "#E2E8F0" },
                  }}
                >
                  Shared
                </Button>
              </Box>
            </Box>

            <Box sx={{ borderBottom: "1px solid #F1F5F9" }} />

            {/* Passenger Detail & Dynamic +/- Counter */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box sx={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <PersonIcon sx={{ color: "#FF6B00", fontSize: "20px" }} />
                <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#475569" }}>
                  {language === "tl" ? "Bilang ng Pasahero" : "Passenger Count"}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <IconButton
                  size="small"
                  disabled={passengers <= 1}
                  onClick={() => handleChangePassengers(-1)}
                  sx={{
                    width: 24,
                    height: 24,
                    backgroundColor: "#F1F5F9",
                    color: "#0F172A",
                    "&:hover": { backgroundColor: "#E2E8F0" },
                  }}
                >
                  <RemoveIcon sx={{ fontSize: 14 }} />
                </IconButton>
                <Typography sx={{ fontSize: "13px", fontWeight: 800, color: "#0F172A", minWidth: "16px", textAlign: "center" }}>
                  {passengers}
                </Typography>
                <IconButton
                  size="small"
                  disabled={tripType === "Shared" ? passengers >= 2 : passengers >= 4}
                  onClick={() => handleChangePassengers(1)}
                  sx={{
                    width: 24,
                    height: 24,
                    backgroundColor: "#F1F5F9",
                    color: "#0F172A",
                    "&:hover": { backgroundColor: "#E2E8F0" },
                  }}
                >
                  <AddIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            </Box>
          </Paper>

          {/* Fare Presentation Box */}
          <Paper
            elevation={0}
            sx={{
              padding: "20px",
              borderRadius: "24px",
              background: "linear-gradient(135deg, #1F1F1F 0%, #0A0A0A 100%)",
              color: "#FFFFFF",
              boxShadow: "0 12px 24px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Graphic background highlights */}
            <Box
              sx={{
                position: "absolute",
                right: "-20px",
                top: "-20px",
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 107, 0, 0.1)",
                filter: "blur(10px)",
              }}
            />

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Box sx={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <AccountBalanceWalletIcon sx={{ color: "#FF6B00" }} />
                <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "#94A3B8" }}>
                  {tripType === "Shared"
                    ? language === "tl" ? "SHARED FARE ESTIMATE" : "SHARED FARE ESTIMATE"
                    : language === "tl" ? "ESTIMASYON NG PAMASAHE" : "ESTIMATED FARE"}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                <Typography sx={{ fontSize: "16px", fontWeight: 800, color: "#FF6B00" }}>
                  ₱
                </Typography>
                <Typography sx={{ fontSize: "32px", fontWeight: 800, color: "#FFFFFF", lineHeight: 1 }}>
                  {fare.toFixed(2)}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }} />

            {/* Fare calculation rules explained */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {tripType === "Solo" ? (
                <>
                  <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94A3B8" }}>
                    <Typography>{language === "tl" ? "Bawat Upuan (Seat Fare):" : "Fare per seat:"}</Typography>
                    <Typography>₱{seatFare.toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94A3B8" }}>
                    <Typography>{language === "tl" ? "Solo Trip multiplier (Buong Kapasidad):" : "Full capacity multiplier:"}</Typography>
                    <Typography>× 4</Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: "6px", alignItems: "flex-start", marginTop: "4px", backgroundColor: "rgba(255, 107, 0, 0.08)", padding: "10px", borderRadius: "12px" }}>
                    <InfoIcon sx={{ color: "#FF6B00", fontSize: "16px", marginTop: "2px" }} />
                    <Typography sx={{ fontSize: "10.5px", color: "#FF8533", lineHeight: 1.4 }}>
                      {language === "tl"
                        ? "Dahil ito ay Solo Trip, sisingilin ang kabuuang pamasahe para sa buong kapasidad ng tricycle (4 na upuan), kahit ilan pa ang sumakay."
                        : "As a Solo Trip, the total fare represents the exclusive capacity of the tricycle (4 seats multiplied), regardless of passenger headcount entered."}
                    </Typography>
                  </Box>
                </>
              ) : (
                <>
                  <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94A3B8" }}>
                    <Typography>{language === "tl" ? "Matched Shared Fare (Kaparehas):" : "Matched Shared Fare Estimate:"}</Typography>
                    <Typography sx={{ color: "#34A853", fontWeight: 700 }}>₱{(seatFare * passengers).toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94A3B8" }}>
                    <Typography>{language === "tl" ? "Maximum Unmatched Fare (Solo Rate):" : "Maximum Unmatched Fare (Solo Rate):"}</Typography>
                    <Typography sx={{ color: "#FFA726", fontWeight: 700 }}>₱{(seatFare * 4).toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: "6px", alignItems: "flex-start", marginTop: "4px", backgroundColor: "rgba(52, 168, 83, 0.08)", padding: "10px", borderRadius: "12px" }}>
                    <InfoIcon sx={{ color: "#34A853", fontSize: "16px", marginTop: "2px" }} />
                    <Typography sx={{ fontSize: "10.5px", color: "#81C784", lineHeight: 1.4 }}>
                      {language === "tl"
                        ? `Makatipid sa Shared Trip! Magbabayad ka para sa ${passengers} upuan (₱${(seatFare * passengers).toFixed(2)}). Kung walang makitang kapares bago ang 50% ng biyahe, ang Solo Fare (₱${(seatFare * 4).toFixed(2)}) ang gagamitin.`
                        : `Save with Shared Trip! You pay for ${passengers} seat(s) (₱${(seatFare * passengers).toFixed(2)}). If no match is found before 50% route cutoff, standard Solo Fare (₱${(seatFare * 4).toFixed(2)}) applies.`}
                    </Typography>
                  </Box>

                  {/* Unmatched preference choice */}
                  <Box sx={{ mt: 1, p: "10px", borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.05)" }}>
                    <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#E2E8F0", mb: 0.5 }}>
                      {language === "tl" ? "Kung Walang Makitang Kapares:" : "If No Shared Passenger Is Matched:"}
                    </Typography>
                    <RadioGroup
                      value={unmatchedPreference}
                      onChange={(e) => setUnmatchedPreference(e.target.value as "proceed" | "cancel")}
                    >
                      <FormControlLabel
                        value="proceed"
                        control={<Radio size="small" sx={{ color: "#FF6B00", "&.Mui-checked": { color: "#FF6B00" } }} />}
                        label={
                          <Typography sx={{ fontSize: "11px", color: "#CBD5E1" }}>
                            {language === "tl" ? "Magpatuloy sa Solo Fare (₱" + (seatFare * 4).toFixed(2) + ")" : "Proceed at Solo Fare (₱" + (seatFare * 4).toFixed(2) + ")"}
                          </Typography>
                        }
                      />
                      <FormControlLabel
                        value="cancel"
                        control={<Radio size="small" sx={{ color: "#FF6B00", "&.Mui-checked": { color: "#FF6B00" } }} />}
                        label={
                          <Typography sx={{ fontSize: "11px", color: "#CBD5E1" }}>
                            {language === "tl" ? "Awtomatikong kanselahin ang biyahe" : "Auto-cancel if unmatched"}
                          </Typography>
                        }
                      />
                    </RadioGroup>
                  </Box>
                </>
              )}
            </Box>
          </Paper>
        </Box>
      )}

      {/* Action Button respecting safe-area-inset-bottom */}
      {!loading && (
        <Box sx={{ padding: "0 20px calc(var(--safe-area-bottom) + 16px) 20px" }}>
          <Button
            variant="contained"
            onClick={handleConfirmBooking}
            disabled={bookingLoading}
            sx={{
              height: "56px",
              borderRadius: "16px",
              fontWeight: 700,
              fontSize: "1rem",
              background: "linear-gradient(135deg, #FF6B00 0%, #FF8533 100%)",
              color: "#FFFFFF",
              "&:hover": {
                background: "linear-gradient(135deg, #E66000 0%, #FF7315 100%)",
              },
              boxShadow: "0 8px 20px rgba(255, 107, 0, 0.25)",
              textTransform: "none",
              width: "100%",
            }}
          >
            {bookingLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : language === "tl" ? (
              "Kumpirmahin ang Booking"
            ) : (
              "Confirm & Book Tricycle"
            )}
          </Button>
        </Box>
      )}

      {/* Success Modal Popup */}
      <SuccessModal
        open={successOpen}
        title={language === "tl" ? "Nahanap na ang Drayber!" : "Booking Request Sent!"}
        message={
          language === "tl"
            ? "Matagumpay na naipadala ang iyong booking. Naghahanap na kami ng tricycle drayber na malapit sa iyo."
            : "Your tricycle booking has been registered. We are locating the nearest TODA driver to assign to your ride."
        }
      />

      {/* Action helper button inside success screen overlay to redirect back */}
      {successOpen && (
        <Button
          onClick={handleSuccessClose}
          sx={{
            position: "absolute",
            bottom: "calc(var(--safe-area-bottom) + 40px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 99999,
            color: "#FFFFFF",
            fontWeight: 700,
            backgroundColor: "#FF6B00",
            padding: "10px 24px",
            borderRadius: "10px",
            boxShadow: "0 4px 12px rgba(255, 107, 0, 0.3)",
            "&:hover": { backgroundColor: "#D65A00" },
            textTransform: "none",
          }}
        >
          {language === "tl" ? "Pumunta sa Dashboard" : "Go to Dashboard"}
        </Button>
      )}
    </Box>
  );
};

export default BookSummary;
