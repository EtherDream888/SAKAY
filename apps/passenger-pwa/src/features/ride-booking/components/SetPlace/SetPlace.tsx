import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import NorthWestIcon from "@mui/icons-material/NorthWest";

import type { PlaceSuggestion } from "../../../../services/locationService";
import {
  searchPlaces,
  DEFAULT_CALAPAN_CENTER,
} from "../../../../services/locationService";

const SetPlace: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
    if (saved) return JSON.parse(saved).address || "Lumangbayan Barangay Hall";
    return "Lumangbayan Barangay Hall";
  });

  const [dropoffText, setDropoffText] = useState<string>(() => {
    if (navState?.target === "dropoff" && navState?.address) return navState.address;
    const saved = sessionStorage.getItem("trip_dropoff");
    if (saved) return JSON.parse(saved).address || "";
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
      {/* Top Header Card: Background bleeds into safe area, interactive content clears safe area */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #FF5B00 0%, #FF6D00 100%)",
          padding: "calc(var(--safe-area-top) + 16px) 16px 20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          boxShadow: "0 4px 16px rgba(255, 91, 0, 0.25)",
          position: "relative",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Back Arrow Button */}
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

          {/* Input Stack: PICKUP & DESTINASYON */}
          <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* PICKUP Input Box */}
            <Box
              onClick={() => setActiveTarget("pickup")}
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.25)",
                backdropFilter: "blur(4px)",
                borderRadius: "14px",
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                border: activeTarget === "pickup" ? "1.5px solid #FFFFFF" : "1px solid rgba(255, 255, 255, 0.3)",
                cursor: "pointer",
              }}
            >
              {/* Orange Radio Dot */}
              <Box
                sx={{
                  width: "16px",
                  height: "16px",
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

              <Box sx={{ flexGrow: 1 }}>
                <Typography
                  sx={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "rgba(255, 255, 255, 0.8)",
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
                  placeholder="Saan ka susunduin?"
                  sx={{
                    color: "#FFFFFF",
                    fontSize: "14px",
                    fontWeight: 600,
                    width: "100%",
                    fontFamily: "Poppins, sans-serif",
                    "& input": { padding: 0 },
                  }}
                />
              </Box>
            </Box>

            {/* DESTINASYON Input Box */}
            <Box
              onClick={() => setActiveTarget("dropoff")}
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.25)",
                backdropFilter: "blur(4px)",
                borderRadius: "14px",
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                border: activeTarget === "dropoff" ? "1.5px solid #FFFFFF" : "1px solid rgba(255, 255, 255, 0.3)",
                cursor: "pointer",
              }}
            >
              {/* Location Pin Icon */}
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

              <Box sx={{ flexGrow: 1 }}>
                <Typography
                  sx={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "rgba(255, 255, 255, 0.8)",
                    letterSpacing: "0.5px",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  DESTINASYON
                </Typography>
                <InputBase
                  value={dropoffText}
                  onChange={(e) => setDropoffText(e.target.value)}
                  onFocus={() => setActiveTarget("dropoff")}
                  placeholder="I-type ang lugar"
                  autoFocus={initialTarget === "dropoff"}
                  sx={{
                    color: "#FFFFFF",
                    fontSize: "14px",
                    fontWeight: 600,
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
            sx={{
              color: "#FFFFFF",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.3)" },
            }}
          >
            <SwapVertIcon />
          </IconButton>
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

                {/* Center Title & Subtitle Address */}
                <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
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
                    {place.name}
                  </Typography>
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
                  <NorthWestIcon sx={{ fontSize: "18px" }} />
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
