import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import NorthEastIcon from "@mui/icons-material/NorthEast";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import HistoryIcon from "@mui/icons-material/History";
import splashBg from "@sakay/shared/src/assets/images/webp/splash-bg.webp";
import { TYPOGRAPHY_TOKENS } from "@sakay/shared";

import type { PlaceSuggestion, RecentDestination } from "../../../../services/locationService";
import {
  searchPlaces,
  DEFAULT_CALAPAN_CENTER,
  getCurrentDevicePosition,
  reverseGeocodeCoordinates,
  getRecentDestinations,
  saveRecentDestination,
  clearRecentDestinations,
  calculateDistanceKm,
  formatDistance,
  CURATED_CALAPAN_PLACES,
} from "../../../../services/locationService";
import { useLanguage } from "../../../../utils/LanguageContext";
import MapLocationPicker from "../Dashboard/MapLocationPicker";

const SetPlace: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();

  const [mapPickerOpen, setMapPickerOpen] = useState<boolean>(false);

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

  const [recentDestinations, setRecentDestinations] = useState<RecentDestination[]>(() => getRecentDestinations());

  // Retrieve user's current GPS coordinates if available
  const userLat = parseFloat(localStorage.getItem("user_lat") || DEFAULT_CALAPAN_CENTER.latitude.toString());
  const userLng = parseFloat(localStorage.getItem("user_lng") || DEFAULT_CALAPAN_CENTER.longitude.toString());

  const rawQuery = activeTarget === "pickup" ? pickupText : dropoffText;
  const isDefaultCurrentLocation =
    rawQuery === "Kasalukuyang Lokasyon" || rawQuery === "Current Location";
  const currentSearchQuery = isDefaultCurrentLocation ? "" : rawQuery;

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

  const handleSelectPlace = (place: { name: string; address?: string; lat: number; lng: number }) => {
    saveRecentDestination({
      name: place.name,
      address: place.address || place.name,
      lat: place.lat,
      lng: place.lng,
    });
    setRecentDestinations(getRecentDestinations());

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
            fontSize: "14px",
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
            fontSize: "14px",
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
          fontSize: "14px",
          color: "#0F172A",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        {before && <Box component="span" sx={{ fontWeight: 500 }}>{before}</Box>}
        <Box component="span" sx={{ fontWeight: 700 }}>{matched}</Box>
        {after && <Box component="span" sx={{ fontWeight: 700 }}>{after}</Box>}
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
              {/* Location Pin Icon */}
              <LocationOnIcon sx={{ color: "#FFFFFF", fontSize: "18px", flexShrink: 0 }} />

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
                  placeholder={language === "tl" ? "Saan pupunta?" : "Where to go?"}
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

      {/* Quick Action Options Container */}
      <Box
        sx={{
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #F1F5F9",
          padding: "4px 0",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.03)",
        }}
      >
        {/* Action 1: Current Location */}
        <Box
          onClick={() => handleUseCurrentLocation(activeTarget)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            padding: "12px 20px",
            cursor: "pointer",
            transition: "background-color 0.15s ease",
            "&:hover": { backgroundColor: "#FFF7ED" },
            "&:active": { backgroundColor: "#FFEAD5" },
          }}
        >
          <Box
            sx={{
              minWidth: "40px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "#FFF2E9",
                color: "#FF6B00",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {locatingCurrent ? (
                <CircularProgress size={18} sx={{ color: "#FF6B00" }} />
              ) : (
                <MyLocationIcon sx={{ fontSize: "20px" }} />
              )}
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: TYPOGRAPHY_TOKENS.fontSize.bodyMobile, // 12px
                fontWeight: TYPOGRAPHY_TOKENS.fontWeight.semibold,
                color: "#0F172A",
                fontFamily: "Poppins, sans-serif",
                lineHeight: 1.25,
              }}
            >
              {language === "tl" ? "Gamitin ang kasalukuyang lokasyon" : "Use current location"}
            </Typography>
            <Typography
              sx={{
                fontSize: TYPOGRAPHY_TOKENS.fontSize.secondary, // 11px
                fontWeight: TYPOGRAPHY_TOKENS.fontWeight.medium,
                color: "#64748B",
                fontFamily: "Poppins, sans-serif",
                lineHeight: 1.3,
              }}
            >
              {activeTarget === "pickup"
                ? (language === "tl" ? "Itakda ang GPS location bilang Pickup Point" : "Set GPS location as Pickup Point")
                : (language === "tl" ? "Itakda ang GPS location bilang Destinasyon" : "Set GPS location as Destination")}
            </Typography>
          </Box>
        </Box>

        {/* Action 2: Select on Map */}
        <Box
          onClick={() => setMapPickerOpen(true)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            padding: "12px 20px",
            cursor: "pointer",
            transition: "background-color 0.15s ease",
            "&:hover": { backgroundColor: "#FFF7ED" },
            "&:active": { backgroundColor: "#FFEAD5" },
          }}
        >
          <Box
            sx={{
              minWidth: "40px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "#FFF2E9",
                color: "#FF6B00",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <MapOutlinedIcon sx={{ fontSize: "20px" }} />
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: TYPOGRAPHY_TOKENS.fontSize.bodyMobile, // 12px
                fontWeight: TYPOGRAPHY_TOKENS.fontWeight.semibold,
                color: "#0F172A",
                fontFamily: "Poppins, sans-serif",
                lineHeight: 1.25,
              }}
            >
              {language === "tl" ? "Pumili sa Mapa" : "Select on Map"}
            </Typography>
            <Typography
              sx={{
                fontSize: TYPOGRAPHY_TOKENS.fontSize.secondary, // 11px
                fontWeight: TYPOGRAPHY_TOKENS.fontWeight.medium,
                color: "#64748B",
                fontFamily: "Poppins, sans-serif",
                lineHeight: 1.3,
              }}
            >
              {language === "tl" ? "I-pan ang mapa upang itakda ang lokasyon" : "Pan map to select exact location"}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Suggestions or Recent Destinations Container */}
      <Box
        className="hide-scrollbar"
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          backgroundColor: "#FFFFFF",
          paddingBottom: "calc(var(--safe-area-bottom) + 20px)",
        }}
      >
        {currentSearchQuery.trim().length >= 2 ? (
          /* Active Search Results */
          loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", padding: "32px" }}>
              <CircularProgress size={28} sx={{ color: "#FF6B00" }} />
            </Box>
          ) : suggestions.length > 0 ? (
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
          ) : (
            <Box sx={{ p: "36px 20px", textAlign: "center" }}>
              <Typography sx={{ fontSize: "14px", color: "#64748B", fontFamily: "Poppins, sans-serif" }}>
                {language === "tl" ? "Walang nahanap na lugar sa Calapan." : "No places found in Calapan."}
              </Typography>
            </Box>
          )
        ) : (
          /* Empty Search Query: Option B (Recent Destinations + Verified Popular Calapan Landmarks) */
          <Box>
            {recentDestinations.length > 0 && (
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: "20px",
                    pt: "16px",
                    pb: "8px",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#64748B",
                      letterSpacing: "0.6px",
                      textTransform: "uppercase",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    {language === "tl" ? "Nakalipas na mga Destinasyon" : "Recent Destinations"}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => {
                      clearRecentDestinations();
                      setRecentDestinations([]);
                    }}
                    sx={{
                      color: "#94A3B8",
                      fontSize: "11px",
                      textTransform: "none",
                      p: 0,
                      minWidth: "auto",
                      fontFamily: "Poppins, sans-serif",
                      "&:hover": { color: "#EF4444" },
                    }}
                  >
                    {language === "tl" ? "Burahin Lahat" : "Clear All"}
                  </Button>
                </Box>

                {recentDestinations.map((place, idx) => {
                  const distKm = calculateDistanceKm(userLat, userLng, place.lat, place.lng);
                  const distLabel = formatDistance(distKm);
                  return (
                    <React.Fragment key={place.id}>
                      <Box
                        onClick={() => handleSelectPlace(place)}
                        sx={{
                          padding: "14px 20px",
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                          cursor: "pointer",
                          transition: "background-color 0.15s ease",
                          "&:hover": { backgroundColor: "#F8FAFC" },
                        }}
                      >
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
                            <HistoryIcon sx={{ color: "#64748B", fontSize: "20px" }} />
                          </Box>
                          <Typography
                            sx={{
                              fontSize: "11px",
                              fontWeight: 500,
                              color: "#94A3B8",
                              fontFamily: "Poppins, sans-serif",
                            }}
                          >
                            {distLabel}
                          </Typography>
                        </Box>

                        <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
                          <Typography
                            sx={{
                              fontSize: "14px",
                              fontWeight: 600,
                              color: "#0F172A",
                              fontFamily: "Poppins, sans-serif",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
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

                        <IconButton size="small" sx={{ color: "#0F172A" }}>
                          <NorthEastIcon sx={{ fontSize: "20px" }} />
                        </IconButton>
                      </Box>
                      {idx < recentDestinations.length - 1 && (
                        <Divider sx={{ borderColor: "#F1F5F9" }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </Box>
            )}

            {/* Verified Popular Places in Calapan (Option B) */}
            <Box
              sx={{
                px: "20px",
                pt: recentDestinations.length > 0 ? "20px" : "16px",
                pb: "8px",
              }}
            >
              <Typography
                sx={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#64748B",
                  letterSpacing: "0.6px",
                  textTransform: "uppercase",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                {language === "tl" ? "Mga Kilalang Lugar sa Calapan" : "Popular Places in Calapan"}
              </Typography>
            </Box>

            {CURATED_CALAPAN_PLACES.map((place, idx) => {
              const distKm = calculateDistanceKm(userLat, userLng, place.lat, place.lng);
              const distLabel = formatDistance(distKm);
              return (
                <React.Fragment key={place.id}>
                  <Box
                    onClick={() => handleSelectPlace(place)}
                    sx={{
                      padding: "14px 20px",
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      cursor: "pointer",
                      transition: "background-color 0.15s ease",
                      "&:hover": { backgroundColor: "#F8FAFC" },
                    }}
                  >
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
                        {distLabel}
                      </Typography>
                    </Box>

                    <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
                      <Typography
                        sx={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#0F172A",
                          fontFamily: "Poppins, sans-serif",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
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

                    <IconButton size="small" sx={{ color: "#0F172A" }}>
                      <NorthEastIcon sx={{ fontSize: "20px" }} />
                    </IconButton>
                  </Box>
                  {idx < CURATED_CALAPAN_PLACES.length - 1 && (
                    <Divider sx={{ borderColor: "#F1F5F9" }} />
                  )}
                </React.Fragment>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Map Location Picker Dialog Modal */}
      <MapLocationPicker
        open={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        initialCoords={{ lat: userLat, lng: userLng }}
        onConfirmLocation={(loc) => {
          saveRecentDestination({
            name: loc.address,
            address: loc.address,
            lat: loc.lat,
            lng: loc.lng,
          });
          setRecentDestinations(getRecentDestinations());

          const selectedObj = {
            address: loc.address,
            lat: loc.lat,
            lng: loc.lng,
            isCustom: true,
          };

          if (activeTarget === "pickup") {
            setPickupText(loc.address);
            sessionStorage.setItem("trip_pickup", JSON.stringify(selectedObj));
          } else {
            setDropoffText(loc.address);
            sessionStorage.setItem("trip_dropoff", JSON.stringify(selectedObj));
          }

          navigate("/new-trip");
        }}
      />
    </Box>
  );
};

export default SetPlace;
