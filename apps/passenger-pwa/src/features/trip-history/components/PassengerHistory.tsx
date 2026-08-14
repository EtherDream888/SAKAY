import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CircularProgress from "@mui/material/CircularProgress";

import type { HistoryTrip } from "../../../services/tripService";
import { fetchTripHistory } from "../../../services/tripService";

const PassengerHistory: React.FC = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<HistoryTrip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDetails, setSelectedDetails] = useState<HistoryTrip | null>(null);

  useEffect(() => {
    fetchTripHistory()
      .then((data) => setTrips(data))
      .finally(() => setLoading(false));
  }, []);

  const handleRebook = (trip: HistoryTrip) => {
    sessionStorage.setItem(
      "trip_pickup",
      JSON.stringify({
        address: trip.pickup,
        lat: trip.pickupLat,
        lng: trip.pickupLng,
      })
    );
    sessionStorage.setItem(
      "trip_dropoff",
      JSON.stringify({
        address: trip.dropoff,
        lat: trip.dropoffLat,
        lng: trip.dropoffLng,
      })
    );
    navigate("/new-trip");
  };

  const todayTrips = trips.filter((t) => t.dateGroup === "NGAYONG ARAW");
  const pastTrips = trips.filter((t) => t.dateGroup === "NAKARAANG ARAW");

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        backgroundColor: "#FAFAFA",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Top Header Card matching PASSENGER HISTORY.png with safe-area support */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #FF5B00 0%, #FF6D00 100%)",
          padding: "calc(var(--safe-area-top) + 16px) 20px 20px 20px",
          display: "flex",
          alignItems: "center",
          boxShadow: "0 4px 16px rgba(255, 91, 0, 0.25)",
          position: "relative",
        }}
      >
        <IconButton
          onClick={() => navigate("/dashboard")}
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
        <Typography
          sx={{
            flexGrow: 1,
            textAlign: "center",
            fontSize: "22px",
            fontWeight: 800,
            color: "#FFFFFF",
            marginRight: "44px",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          History
        </Typography>
      </Box>

      {/* Scrollable Content Container */}
      <Box
        className="hide-scrollbar"
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          padding: "16px 20px calc(var(--safe-area-bottom) + 32px) 20px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "40px" }}>
            <CircularProgress sx={{ color: "#FF6B00" }} />
          </Box>
        ) : (
          <>
            {/* Section 1: NGAYONG ARAW */}
            {todayTrips.length > 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <Typography
                  sx={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#64748B",
                    letterSpacing: "0.5px",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  NGAYONG ARAW
                </Typography>

                {todayTrips.map((trip) => (
                  <Paper
                    key={trip.id}
                    elevation={0}
                    sx={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #F1F5F9",
                      borderRadius: "20px",
                      padding: "16px",
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                  >
                    {/* Upper Details Row */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      {/* Left Timeline & Locations */}
                      <Box sx={{ display: "flex", gap: "12px", flexGrow: 1, overflow: "hidden" }}>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            paddingTop: "4px",
                          }}
                        >
                          <Box
                            sx={{
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              border: "2px solid #64748B",
                              backgroundColor: "#FFFFFF",
                            }}
                          />
                          <Box
                            sx={{
                              width: "1.5px",
                              height: "26px",
                              backgroundColor: "#CBD5E1",
                              margin: "2px 0",
                            }}
                          />
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
                          <Box sx={{ marginBottom: "10px" }}>
                            <Typography sx={{ fontSize: "11px", color: "#64748B", fontWeight: 500 }}>
                              Pickup
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "14px",
                                fontWeight: 800,
                                color: "#0F172A",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {trip.pickup}
                            </Typography>
                          </Box>

                          <Box>
                            <Typography sx={{ fontSize: "11px", color: "#64748B", fontWeight: 500 }}>
                              Drop-off
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "14px",
                                fontWeight: 800,
                                color: "#0F172A",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {trip.dropoff}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* Right Price & Badge */}
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: "4px",
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "18px",
                            fontWeight: 800,
                            color: "#FF6B00",
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          {trip.price}
                        </Typography>

                        <Box
                          sx={{
                            backgroundColor: "#FFF5EB",
                            color: "#FF6B00",
                            fontSize: "12px",
                            fontWeight: 600,
                            padding: "2px 14px",
                            borderRadius: "12px",
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          {trip.type}
                        </Box>

                        <Typography
                          sx={{
                            fontSize: "11px",
                            color: "#94A3B8",
                            fontWeight: 500,
                            marginTop: "2px",
                          }}
                        >
                          {trip.time}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Bottom Buttons Row: Rebook -> & See Details */}
                    <Box sx={{ display: "flex", gap: "10px" }}>
                      <Button
                        variant="contained"
                        onClick={() => handleRebook(trip)}
                        endIcon={<ArrowForwardIcon />}
                        sx={{
                          flexGrow: 1,
                          backgroundColor: "#FF5B00",
                          color: "#FFFFFF",
                          borderRadius: "14px",
                          fontWeight: 700,
                          fontSize: "13px",
                          textTransform: "none",
                          height: "42px",
                          boxShadow: "none",
                          "&:hover": { backgroundColor: "#E05000" },
                        }}
                      >
                        Rebook
                      </Button>

                      <Button
                        variant="contained"
                        onClick={() => setSelectedDetails(trip)}
                        sx={{
                          flexGrow: 1,
                          backgroundColor: "#F1F5F9",
                          color: "#475569",
                          borderRadius: "14px",
                          fontWeight: 600,
                          fontSize: "13px",
                          textTransform: "none",
                          height: "42px",
                          boxShadow: "none",
                          "&:hover": { backgroundColor: "#E2E8F0" },
                        }}
                      >
                        See Details
                      </Button>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}

            {/* Section 2: NAKARAANG ARAW */}
            {pastTrips.length > 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <Typography
                  sx={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#64748B",
                    letterSpacing: "0.5px",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  NAKARAANG ARAW
                </Typography>

                {pastTrips.map((trip) => (
                  <Paper
                    key={trip.id}
                    elevation={0}
                    sx={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #F1F5F9",
                      borderRadius: "20px",
                      padding: "16px",
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                  >
                    {/* Upper Details Row */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      {/* Left Timeline & Locations */}
                      <Box sx={{ display: "flex", gap: "12px", flexGrow: 1, overflow: "hidden" }}>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            paddingTop: "4px",
                          }}
                        >
                          <Box
                            sx={{
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              border: "2px solid #64748B",
                              backgroundColor: "#FFFFFF",
                            }}
                          />
                          <Box
                            sx={{
                              width: "1.5px",
                              height: "26px",
                              backgroundColor: "#CBD5E1",
                              margin: "2px 0",
                            }}
                          />
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
                          <Box sx={{ marginBottom: "10px" }}>
                            <Typography sx={{ fontSize: "11px", color: "#64748B", fontWeight: 500 }}>
                              Pickup
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "14px",
                                fontWeight: 800,
                                color: "#0F172A",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {trip.pickup}
                            </Typography>
                          </Box>

                          <Box>
                            <Typography sx={{ fontSize: "11px", color: "#64748B", fontWeight: 500 }}>
                              Drop-off
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "14px",
                                fontWeight: 800,
                                color: "#0F172A",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {trip.dropoff}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* Right Price & Badge */}
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: "4px",
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "18px",
                            fontWeight: 800,
                            color: "#FF6B00",
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          {trip.price}
                        </Typography>

                        <Box
                          sx={{
                            backgroundColor: "#FFF5EB",
                            color: "#FF6B00",
                            fontSize: "12px",
                            fontWeight: 600,
                            padding: "2px 14px",
                            borderRadius: "12px",
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          {trip.type}
                        </Box>

                        <Typography
                          sx={{
                            fontSize: "11px",
                            color: "#94A3B8",
                            fontWeight: 500,
                            marginTop: "2px",
                          }}
                        >
                          {trip.time}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Bottom Buttons Row */}
                    <Box sx={{ display: "flex", gap: "10px" }}>
                      <Button
                        variant="contained"
                        onClick={() => handleRebook(trip)}
                        endIcon={<ArrowForwardIcon />}
                        sx={{
                          flexGrow: 1,
                          backgroundColor: "#FF5B00",
                          color: "#FFFFFF",
                          borderRadius: "14px",
                          fontWeight: 700,
                          fontSize: "13px",
                          textTransform: "none",
                          height: "42px",
                          boxShadow: "none",
                          "&:hover": { backgroundColor: "#E05000" },
                        }}
                      >
                        Rebook
                      </Button>

                      <Button
                        variant="contained"
                        onClick={() => setSelectedDetails(trip)}
                        sx={{
                          flexGrow: 1,
                          backgroundColor: "#F1F5F9",
                          color: "#475569",
                          borderRadius: "14px",
                          fontWeight: 600,
                          fontSize: "13px",
                          textTransform: "none",
                          height: "42px",
                          boxShadow: "none",
                          "&:hover": { backgroundColor: "#E2E8F0" },
                        }}
                      >
                        See Details
                      </Button>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Trip Details Modal */}
      <Dialog
        open={Boolean(selectedDetails)}
        onClose={() => setSelectedDetails(null)}
        slotProps={{
          paper: {
            sx: { borderRadius: "20px", padding: "8px", width: "90%", maxWidth: "340px" },
          },
        }}
      >
        {selectedDetails && (
          <>
            <DialogTitle sx={{ fontWeight: 800, fontSize: "16px", color: "#0F172A" }}>
              Detalye ng Biyahe
            </DialogTitle>
            <DialogContent sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Typography sx={{ fontSize: "12px", color: "#64748B" }}>
                ID: <strong>{selectedDetails.id}</strong>
              </Typography>
              <Typography sx={{ fontSize: "12px", color: "#64748B" }}>
                Petsa: <strong>{selectedDetails.dateString} ({selectedDetails.time})</strong>
              </Typography>
              <Typography sx={{ fontSize: "12px", color: "#64748B" }}>
                Pickup: <strong>{selectedDetails.pickup}</strong>
              </Typography>
              <Typography sx={{ fontSize: "12px", color: "#64748B" }}>
                Drop-off: <strong>{selectedDetails.dropoff}</strong>
              </Typography>
              {selectedDetails.driverName && (
                <Typography sx={{ fontSize: "12px", color: "#64748B" }}>
                  Drayber: <strong>{selectedDetails.driverName} ({selectedDetails.bodyNumber})</strong>
                </Typography>
              )}
              <Typography sx={{ fontSize: "14px", fontWeight: 800, color: "#FF6B00", marginTop: "6px" }}>
                Bayad: {selectedDetails.price} ({selectedDetails.type})
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setSelectedDetails(null)}
                sx={{ color: "#FF6B00", fontWeight: 700 }}
              >
                Isara
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default PassengerHistory;
