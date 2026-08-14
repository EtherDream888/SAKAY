import React from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import AddIcon from "@mui/icons-material/Add";

import { useLanguage } from "../../../../utils/LanguageContext";

interface HomeBottomSheetProps {
  firstName: string;
  onStartNewTrip: () => void;
  onHomeTrip: () => void;
  onAddPlace: () => void;
}

const HomeBottomSheet: React.FC<HomeBottomSheetProps> = ({
  firstName,
  onStartNewTrip,
  onHomeTrip,
  onAddPlace,
}) => {
  const { language } = useLanguage();

  return (
    <Paper
      elevation={4}
      sx={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#F4FBF7", // Soft mint background matching reference UI
        borderTopLeftRadius: "28px",
        borderTopRightRadius: "28px",
        padding: "16px 20px calc(var(--safe-area-bottom) + 24px) 20px",
        zIndex: 10,
        boxShadow: "0 -10px 30px rgba(15, 23, 42, 0.08)",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      {/* Drag handle pill indicator */}
      <Box
        sx={{
          width: "40px",
          height: "4px",
          backgroundColor: "#CBD5E1",
          borderRadius: "2px",
          margin: "0 auto 4px auto",
        }}
      />

      {/* Personalized Greeting Text matching reference UI */}
      <Typography
        sx={{
          fontSize: "15px",
          color: "#0F172A",
          fontWeight: 400,
          lineHeight: 1.4,
          paddingLeft: "4px",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        Kamusta, {firstName}!{" "}
        <Box component="span" sx={{ fontWeight: 800 }}>
          {language === "tl" ? "Saan tayo pupunta?" : "Where are we going?"}
        </Box>
      </Typography>

      {/* Horizontal Action Cards Scrollable Row */}
      <Box
        className="hide-scrollbar"
        sx={{
          display: "flex",
          gap: "12px",
          overflowX: "auto",
          paddingBottom: "4px",
          width: "100%",
        }}
      >
        {/* Card 1: Bagong Trip (Primary New Trip Action) */}
        <Box
          onClick={onStartNewTrip}
          role="button"
          tabIndex={0}
          sx={{
            flexShrink: 0,
            width: "135px",
            height: "135px",
            backgroundColor: "#FFF7ED", // Warm cream peach tint matching reference UI
            border: "1px solid #FFEDD5",
            borderRadius: "24px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 8px 20px rgba(255, 107, 0, 0.14)",
            },
            "&:active": {
              transform: "scale(0.97)",
            },
          }}
        >
          {/* Orange squircle badge with Location icon */}
          <Box
            sx={{
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              backgroundColor: "#FF6B00",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 10px rgba(255, 107, 0, 0.25)",
            }}
          >
            <LocationOnIcon sx={{ color: "#FFFFFF", fontSize: "24px" }} />
          </Box>

          <Box>
            <Typography
              sx={{
                fontSize: "15px",
                fontWeight: 800,
                color: "#0F172A",
                lineHeight: 1.2,
                fontFamily: "Poppins, sans-serif",
              }}
            >
              {language === "tl" ? "Bagong Trip" : "New Trip"}
            </Typography>
            <Typography
              sx={{
                fontSize: "12px",
                fontWeight: 500,
                color: "#64748B",
                marginTop: "2px",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              {language === "tl" ? "Umpisahan" : "Get started"}
            </Typography>
          </Box>
        </Box>

        {/* Card 2: Home (Saved Home Location) */}
        <Box
          onClick={onHomeTrip}
          role="button"
          tabIndex={0}
          sx={{
            flexShrink: 0,
            width: "135px",
            height: "135px",
            backgroundColor: "#F4FBF7", // Soft mint background matching reference UI
            border: "1px solid #E2E8F0",
            borderRadius: "24px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
            },
            "&:active": {
              transform: "scale(0.97)",
            },
          }}
        >
          {/* Light transparent squircle badge with Home icon */}
          <Box
            sx={{
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              backgroundColor: "rgba(15, 23, 42, 0.04)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <HomeOutlinedIcon sx={{ color: "#0F172A", fontSize: "24px" }} />
          </Box>

          <Box>
            <Typography
              sx={{
                fontSize: "15px",
                fontWeight: 800,
                color: "#0F172A",
                lineHeight: 1.2,
                fontFamily: "Poppins, sans-serif",
              }}
            >
              Home
            </Typography>
            <Typography
              sx={{
                fontSize: "12px",
                fontWeight: 500,
                color: "#64748B",
                marginTop: "2px",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              24km, 39 min
            </Typography>
          </Box>
        </Box>

        {/* Card 3: Mag-dagdag (Add Custom Saved Place) */}
        <Box
          onClick={onAddPlace}
          role="button"
          tabIndex={0}
          sx={{
            flexShrink: 0,
            width: "135px",
            height: "135px",
            backgroundColor: "#F4FBF7",
            border: "1px solid #E2E8F0",
            borderRadius: "24px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
            },
            "&:active": {
              transform: "scale(0.97)",
            },
          }}
        >
          {/* Light squircle badge with Plus icon */}
          <Box
            sx={{
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              backgroundColor: "rgba(15, 23, 42, 0.04)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AddIcon sx={{ color: "#0F172A", fontSize: "26px" }} />
          </Box>

          <Box>
            <Typography
              sx={{
                fontSize: "15px",
                fontWeight: 800,
                color: "#0F172A",
                lineHeight: 1.2,
                fontFamily: "Poppins, sans-serif",
              }}
            >
              {language === "tl" ? "Mag-dagdag" : "Add Place"}
            </Typography>
            <Typography
              sx={{
                fontSize: "12px",
                fontWeight: 500,
                color: "#64748B",
                marginTop: "2px",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              {language === "tl" ? "Bagong lugar" : "New location"}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default HomeBottomSheet;
