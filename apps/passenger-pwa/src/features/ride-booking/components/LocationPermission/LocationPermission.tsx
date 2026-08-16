import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";

import MapView from "../../../../common/components/MapView";
import HomeHeader from "../Dashboard/HomeHeader";
import { getCurrentDevicePosition } from "../../../../services/locationService";

const LocationPermission: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as { from?: string })?.from || "/new-trip";

  const [requesting, setRequesting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleRequestLocation = async (persistPermission: boolean) => {
    setRequesting(true);
    setErrorMessage("");

    try {
      // Trigger real browser/device Geolocation API
      const coords = await getCurrentDevicePosition();

      if (persistPermission) {
        localStorage.setItem("gps_permission", "true");
      } else {
        sessionStorage.setItem("gps_permission_session", "true");
      }

      // Real coordinates acquired -> proceed
      navigate(destination, {
        replace: true,
        state: {
          hasGps: true,
          coords: {
            lat: coords.latitude,
            lng: coords.longitude,
          },
        },
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Hindi makuha ang iyong lokasyon.";
      setErrorMessage(errMsg);
      setRequesting(false);

      // Store explicit denial/failure
      localStorage.setItem("gps_permission", "false");

      // Give user 1.5s to read the message before moving forward
      setTimeout(() => {
        navigate(destination, {
          replace: true,
          state: {
            hasGps: false,
          },
        });
      }, 1500);
    }
  };

  const handleDeny = () => {
    localStorage.setItem("gps_permission", "false");
    navigate(destination, { replace: true, state: { hasGps: false } });
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
      {/* Background Google Map */}
      <MapView interactive={false} />

      {/* Header behind overlay */}
      <HomeHeader
        onOpenDrawer={() => {}}
        onOpenNotifications={() => {}}
        onOpenTulong={() => {}}
      />

      {/* Dark translucent overlay backdrop */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(2px)",
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "calc(var(--safe-area-top) + 20px) 24px calc(var(--safe-area-bottom) + 20px) 24px",
        }}
      >
        {/* Permission Modal Card matching PASSENGER LOCATION PERMISSION.png */}
        <Paper
          elevation={8}
          sx={{
            width: "100%",
            maxWidth: "320px",
            backgroundColor: "#FFFFFF",
            borderRadius: "24px",
            overflow: "hidden",
            textAlign: "center",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          }}
        >
          {/* Modal Title & Description */}
          <Box sx={{ padding: "24px 20px 20px 20px" }}>
            <Typography
              sx={{
                fontSize: "17px",
                fontWeight: 800,
                color: "#0F172A",
                lineHeight: 1.3,
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
              Ginagamit ang iyong lokasyon para makahanap ng malapit na drayber at masubaybayan ang iyong biyahe.
            </Typography>

            {/* Live feedback alert during permission request or denial */}
            {requesting && (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "12px" }}>
                <CircularProgress size={16} sx={{ color: "#FF6B00" }} />
                <Typography sx={{ fontSize: "12px", color: "#FF6B00", fontWeight: 600 }}>
                  Humihingi ng pahintulot sa browser...
                </Typography>
              </Box>
            )}

            {errorMessage && (
              <Alert severity="warning" sx={{ marginTop: "12px", borderRadius: "10px", py: 0 }}>
                {errorMessage}
              </Alert>
            )}
          </Box>

          <Divider sx={{ borderColor: "#E2E8F0" }} />

          {/* Action Option 1: Payagan nang isang beses */}
          <Button
            fullWidth
            disabled={requesting}
            onClick={() => handleRequestLocation(false)}
            sx={{
              padding: "14px 16px",
              color: "#0F172A",
              fontWeight: 600,
              fontSize: "14px",
              textTransform: "none",
              fontFamily: "Poppins, sans-serif",
              borderRadius: 0,
              "&:hover": { backgroundColor: "#F8FAFC" },
            }}
          >
            Payagan nang isang beses
          </Button>

          <Divider sx={{ borderColor: "#E2E8F0" }} />

          {/* Action Option 2: Payagan Habang Ginagamit ang App */}
          <Button
            fullWidth
            disabled={requesting}
            onClick={() => handleRequestLocation(true)}
            sx={{
              padding: "14px 16px",
              color: "#0F172A",
              fontWeight: 600,
              fontSize: "14px",
              textTransform: "none",
              fontFamily: "Poppins, sans-serif",
              borderRadius: 0,
              "&:hover": { backgroundColor: "#F8FAFC" },
            }}
          >
            Payagan Habang Ginagamit ang App
          </Button>

          <Divider sx={{ borderColor: "#E2E8F0" }} />

          {/* Action Option 3: Huwag payagan */}
          <Button
            fullWidth
            disabled={requesting}
            onClick={handleDeny}
            sx={{
              padding: "14px 16px",
              color: "#0F172A",
              fontWeight: 600,
              fontSize: "14px",
              textTransform: "none",
              fontFamily: "Poppins, sans-serif",
              borderRadius: 0,
              "&:hover": { backgroundColor: "#F8FAFC" },
            }}
          >
            Huwag payagan
          </Button>
        </Paper>
      </Box>
    </Box>
  );
};

export default LocationPermission;
