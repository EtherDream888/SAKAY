import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import InputBase from "@mui/material/InputBase";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import NorthEastIcon from "@mui/icons-material/NorthEast";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import splashBg from "@sakay/shared/src/assets/images/splash-bg.png";

import type { PlaceSuggestion } from "../../../../services/locationService";
import {
  searchPlaces,
  DEFAULT_CALAPAN_CENTER,
  getCurrentDevicePosition,
  reverseGeocodeCoordinates,
} from "../../../../services/locationService";
import { useLanguage } from "../../../../utils/LanguageContext";

const SetPlace: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();

  const navState = location.state as {
    target?: "pickup" | "dropoff";
    address?: string;
    lat?: number;
    lng?: number;
  } | null;

  const initialTarget = navState?.target || "dropoff";

  const [activeTarget, setActiveTarget] = useState<"pickup" | "dropoff">(initialTarget);

  const [pickupText, setPickupText] = useState<string>(() => {
    if (navState?.target === "pickup" && navState?.address) return navState.address;
    const saved = sessionStorage.getItem("trip_pickup");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.address) return parsed.address;
      } catch {}
    }
    return language === "tl" ? "Kasalukuyang Lokasyon" : "Current Location";
  });

  const [dropoffText, setDropoffText] = useState<string>(() => {
    if (navState?.target === "dropoff" && navState?.address) return navState.address;
    const saved = sessionStorage.getItem("trip_dropoff");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.address) return parsed.address;
      } catch {}
    }
    return "";
  });

  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Retrieve user's current GPS coordinates if available
  const userLat = parseFloat(localStorage.getItem("user_lat") || DEFAULT_CALAPAN_CENTER.latitude.toString());
  const userLng = parseFloat(localStorage.getItem("user_lng") || DEFAULT_CALAPAN_CENTER.longitude.toString());

  const currentSearchQuery = activeTarget === "pickup" ? pickupText : dropoffText;

  // Live debounced place search
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchPlaces(currentSearchQuery, userLat, userLng);
        setSuggestions(results);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [currentSearchQuery, userLat, userLng]);

  const handleSwap = () => {
    const temp = pickupText;
    setPickupText(dropoffText);
    setDropoffText(temp);
  };

  const handleSelectPlace = (place: PlaceSuggestion) => {
    const selectedObj = {
      address: place.name,
      lat: place.lat,
      lng: place.lng,
      isCustom: true,
    };

    if (activeTarget === "pickup") {
      setPickupText(place.name);
      sessionStorage.setItem("trip_pickup", JSON.stringify(selectedObj));
    } else {
      setDropoffText(place.name);
      sessionStorage.setItem("trip_dropoff", JSON.stringify(selectedObj));
    }

    navigate("/new-trip");
  };

  const [locatingCurrent, setLocatingCurrent] = useState<boolean>(false);

  const handleUseCurrentLocation = async (target: "pickup" | "dropoff" = activeTarget) => {
    setLocatingCurrent(true);
    try {
      const coords = await getCurrentDevicePosition();
      let realAddr = "";
      try {
        realAddr = await reverseGeocodeCoordinates(coords.latitude, coords.longitude);
      } catch (e) {
        console.warn("Reverse geocoding error:", e);
      }

      const displayAddress =
        realAddr && !realAddr.startsWith("Kasalukuyang Lokasyon")
          ? realAddr
          : language === "tl"
          ? "Kasalukuyang Lokasyon"
          : "Current Location";

      const selectedObj = {
        address: displayAddress,
        lat: coords.latitude,
        lng: coords.longitude,
        isCustom: target === "dropoff",
      };

      if (target === "pickup") {
        setPickupText(displayAddress);
        sessionStorage.setItem("trip_pickup", JSON.stringify(selectedObj));
      } else {
        setDropoffText(displayAddress);
        sessionStorage.setItem("trip_dropoff", JSON.stringify(selectedObj));
      }

      navigate("/new-trip", {
        state: {
          hasGps: true,
          coords: { lat: coords.latitude, lng: coords.longitude },
        },
      });
    } catch (err) {
      console.error("GPS Error:", err);
      // Fallback to cached or default coordinates
      const fallbackLat = userLat || DEFAULT_CALAPAN_CENTER.latitude;
      const fallbackLng = userLng || DEFAULT_CALAPAN_CENTER.longitude;
      const displayAddress = language === "tl" ? "Kasalukuyang Lokasyon" : "Current Location";
      const selectedObj = {
        address: displayAddress,
        lat: fallbackLat,
        lng: fallbackLng,
        isCustom: target === "dropoff",
      };

      if (target === "pickup") {
        sessionStorage.setItem("trip_pickup", JSON.stringify(selectedObj));
      } else {
        sessionStorage.setItem("trip_dropoff", JSON.stringify(selectedObj));
      }

      navigate("/new-trip");
    } finally {
      setLocatingCurrent(false);
    }
  };

  const renderHighlightedPlaceName = (name: string, query: string) => {
    if (!query || !query.trim()) {
      return (
        <Typography
          sx={{
            fontSize: "15px",
            color: "#0F172A",
            fontWeight: 700,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {name}
        </Typography>
      );
    }

    const q = query.trim().toLowerCase();
    const lower = name.toLowerCase();
    const matchIndex = lower.indexOf(q);

    if (matchIndex === -1) {
      return (
        <Typography
          sx={{
            fontSize: "15px",
            color: "#0F172A",
            fontWeight: 700,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {name}
        </Typography>
      );
    }

    const before = name.slice(0, matchIndex);
    const matched = name.slice(matchIndex, matchIndex + q.length);
    const after = name.slice(matchIndex + q.length);

    return (
      <Typography
        sx={{
          fontSize: "15px",
          color: "#0F172A",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        {before && <Box component="span" sx={{ fontWeight: 500 }}>{before}</Box>}
        <Box component="span" sx={{ fontWeight: 400 }}>{matched}</Box>
        {after && <Box component="span" sx={{ fontWeight: 800 }}>{after}</Box>}
      </Typography>
    );
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        backgroundColor: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Top Header Card matching SET PLACE.png & SET PLACE (1).png */}
      <Box
        sx={{
          backgroundImage: `linear-gradient(135deg, rgba(255, 91, 0, 0.94) 0%, rgba(255, 109, 0, 0.94) 100%), url(${splashBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          padding: "calc(var(--safe-area-top) + 16px) 16px 20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          boxShadow: "0 4px 16px rgba(255, 91, 0, 0.25)",
          position: "relative",
        }}
      >
        {/* Row 1: Back Button */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton
            onClick={() => navigate("/new-trip")}
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              color: "#FFFFFF",
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.3)" },
            }}
          >
            <ArrowBackIcon />
          </IconButton>
        </Box>

        {/* Row 2: Inputs and Swap Button */}
        <Box sx={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
          {/* Stack of Pickup & Dropoff Cards */}
          <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* PICKUP Card */}
            <Box
              onClick={() => setActiveTarget("pickup")}
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.25)",
                backdropFilter: "blur(6px)",
                borderRadius: "16px",
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                border: activeTarget === "pickup" ? "1.5px solid #FFFFFF" : "1px solid rgba(255, 255, 255, 0.3)",
                cursor: "pointer",
              }}
            >
              {/* Radio Circle Indicator */}
              <Box
                sx={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  border: "2px solid #FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Box
                  sx={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#FFFFFF",
                  }}
                />
              </Box>

              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "rgba(255, 255, 255, 0.85)",
                    letterSpacing: "0.5px",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  PICKUP
                </Typography>
                <InputBase
                  value={pickupText}
                  onChange={(e) => setPickupText(e.target.value)}
                  onFocus={() => setActiveTarget("pickup")}
                  placeholder={language === "tl" ? "Saan ka susunduin?" : "Where should we pick you up?"}
                  sx={{
                    color: "#FFFFFF",
                    fontSize: "15px",
                    fontWeight: 500,
                    width: "100%",
                    fontFamily: "Poppins, sans-serif",
                    "& input": { padding: 0 },
                  }}
                />
              </Box>
            </Box>

            {/* DESTINASYON Card */}
            <Box
              onClick={() => setActiveTarget("dropoff")}
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.25)",
                backdropFilter: "blur(6px)",
                borderRadius: "16px",
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                border: activeTarget === "dropoff" ? "1.5px solid #FFFFFF" : "1px solid rgba(255, 255, 255, 0.3)",
                cursor: "pointer",
              }}
            >
              {/* Black Location Pin Icon */}
              <Box
                sx={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  backgroundColor: "#000000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <LocationOnIcon sx={{ color: "#FFFFFF", fontSize: "12px" }} />
              </Box>

              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "rgba(255, 255, 255, 0.85)",
                    letterSpacing: "0.5px",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  {language === "tl" ? "DESTINASYON" : "DESTINATION"}
                </Typography>
                <InputBase
                  value={dropoffText}
                  onChange={(e) => setDropoffText(e.target.value)}
                  onFocus={() => setActiveTarget("dropoff")}
                  placeholder={language === "tl" ? "I-type ang lugar" : "Type destination"}
                  autoFocus={initialTarget === "dropoff"}
                  sx={{
                    color: "#FFFFFF",
                    fontSize: "15px",
                    fontWeight: 500,
                    width: "100%",
                    fontFamily: "Poppins, sans-serif",
                    "& input": { padding: 0 },
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* Swap Places Button */}
          <IconButton
            onClick={handleSwap}
            aria-label="Swap pickup and destination"
            sx={{
              color: "#FFFFFF",
              backgroundColor: "transparent",
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              flexShrink: 0,
              "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.15)" },
            }}
          >
            <SwapVertIcon sx={{ fontSize: "24px" }} />
          </IconButton>
        </Box>
      </Box>

      {/* Visually Appealing "Use Current Location" Option */}
      <Box
        sx={{
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #F1F5F9",
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.03)",
        }}
      >
        {/* Main One-Tap Target Card */}
        <Box
          onClick={() => handleUseCurrentLocation(activeTarget)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "12px 16px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)",
            border: "1.5px solid #FDBA74",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(255, 107, 0, 0.08)",
            transition: "all 0.18s ease-in-out",
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: "0 4px 12px rgba(255, 107, 0, 0.16)",
              borderColor: "#FB923C",
            },
            "&:active": {
              transform: "scale(0.99)",
            },
          }}
        >
          {/* Pulsing GPS Badge Icon */}
          <Box
            sx={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              backgroundColor: "#FF6B00",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(255, 107, 0, 0.35)",
            }}
          >
            {locatingCurrent ? (
              <CircularProgress size={20} sx={{ color: "#FFFFFF" }} />
            ) : (
              <MyLocationIcon sx={{ fontSize: "22px" }} />
            )}
          </Box>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Typography
                sx={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#0F172A",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                {language === "tl" ? "Gamitin ang Kasalukuyang Lokasyon" : "Use current location"}
              </Typography>
              <Box
                sx={{
                  backgroundColor: "#22C55E",
                  color: "#FFFFFF",
                  fontSize: "9px",
                  fontWeight: 800,
                  px: "6px",
                  py: "2px",
                  borderRadius: "6px",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                GPS
              </Box>
            </Box>

            <Typography
              sx={{
                fontSize: "12px",
                color: "#EA580C",
                fontWeight: 600,
                fontFamily: "Poppins, sans-serif",
                mt: 0.25,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {activeTarget === "pickup"
                ? (language === "tl" ? "I-tap upang itakda bilang PICKUP" : "Tap to set as PICKUP point")
                : (language === "tl" ? "I-tap upang itakda bilang DESTINASYON" : "Tap to set as DESTINATION")}
            </Typography>
          </Box>

          <IconButton
            size="small"
            sx={{
              backgroundColor: "rgba(255, 107, 0, 0.12)",
              color: "#FF6B00",
              "&:hover": { backgroundColor: "rgba(255, 107, 0, 0.2)" },
            }}
          >
            <NorthEastIcon sx={{ fontSize: "18px" }} />
          </IconButton>
        </Box>

        {/* Dual Quick Option Buttons: Explicitly set as Pickup or Destination */}
        <Box sx={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Typography
            sx={{
              fontSize: "11px",
              color: "#64748B",
              fontWeight: 600,
              fontFamily: "Poppins, sans-serif",
              flexShrink: 0,
            }}
          >
            {language === "tl" ? "O i-set bilang:" : "Or set as:"}
          </Typography>

          <Button
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleUseCurrentLocation("pickup");
            }}
            disabled={locatingCurrent}
            startIcon={
              <Box
                sx={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#FF6B00",
                }}
              />
            }
            sx={{
              flex: 1,
              borderRadius: "10px",
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "none",
              backgroundColor: activeTarget === "pickup" ? "#FFE8D6" : "#F8FAFC",
              color: "#EA580C",
              border: activeTarget === "pickup" ? "1.5px solid #FDBA74" : "1px solid #E2E8F0",
              py: "5px",
              fontFamily: "Poppins, sans-serif",
              "&:hover": { backgroundColor: "#FFEDD5" },
            }}
          >
            {language === "tl" ? "Pickup Point" : "Pickup Point"}
          </Button>

          <Button
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleUseCurrentLocation("dropoff");
            }}
            disabled={locatingCurrent}
            startIcon={
              <Box
                sx={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#0F172A",
                }}
              />
            }
            sx={{
              flex: 1,
              borderRadius: "10px",
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "none",
              backgroundColor: activeTarget === "dropoff" ? "#E2E8F0" : "#F8FAFC",
              color: "#0F172A",
              border: activeTarget === "dropoff" ? "1.5px solid #94A3B8" : "1px solid #E2E8F0",
              py: "5px",
              fontFamily: "Poppins, sans-serif",
              "&:hover": { backgroundColor: "#E2E8F0" },
            }}
          >
            {language === "tl" ? "Destinasyon" : "Destination"}
          </Button>
        </Box>
      </Box>

      {/* Autocomplete Suggestions List matching SET PLACE.png and SET PLACE (1).png */}
      <Box
        className="hide-scrollbar"
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          backgroundColor: "#FFFFFF",
          paddingBottom: "calc(var(--safe-area-bottom) + 20px)",
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", padding: "32px" }}>
            <CircularProgress size={28} sx={{ color: "#FF6B00" }} />
          </Box>
        ) : (
          suggestions.map((place, idx) => (
            <React.Fragment key={place.id}>
              <Box
                onClick={() => handleSelectPlace(place)}
                sx={{
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                  "&:hover": { backgroundColor: "#F8FAFC" },
                }}
              >
                {/* Left Pin Icon in grey circle + Distance label */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px",
                    minWidth: "40px",
                  }}
                >
                  <Box
                    sx={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      backgroundColor: "#F1F5F9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <LocationOnOutlinedIcon sx={{ color: "#64748B", fontSize: "20px" }} />
                  </Box>
                  <Typography
                    sx={{
                      fontSize: "11px",
                      fontWeight: 500,
                      color: "#94A3B8",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    {place.distance}
                  </Typography>
                </Box>

                {/* Center Title with query highlight & Subtitle Address */}
                <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
                  {renderHighlightedPlaceName(place.name, currentSearchQuery)}
                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: "#64748B",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      marginTop: "2px",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    {place.address}
                  </Typography>
                </Box>

                {/* Right Top-Right Arrow Icon */}
                <IconButton size="small" sx={{ color: "#0F172A" }}>
                  <NorthEastIcon sx={{ fontSize: "20px" }} />
                </IconButton>
              </Box>
              {idx < suggestions.length - 1 && (
                <Divider sx={{ borderColor: "#F1F5F9" }} />
              )}
            </React.Fragment>
          ))
        )}
      </Box>
    </Box>
  );
};

export default SetPlace;
