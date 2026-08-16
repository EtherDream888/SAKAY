import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LanguageIcon from "@mui/icons-material/Language";
import { useLanguage } from "../../utils/LanguageContext";

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        bgcolor: "rgba(0, 0, 0, 0.12)",
        backdropFilter: "blur(12px)",
        borderRadius: "30px",
        padding: "4px",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        userSelect: "none",
      }}
    >
      {/* Tagalog Option */}
      <Box
        onClick={() => setLanguage("tl")}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 16px",
          borderRadius: "24px",
          cursor: "pointer",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          ...(language === "tl"
            ? {
                bgcolor: "#FFFFFF",
                color: "#0F172A",
                boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
              }
            : {
                bgcolor: "transparent",
                color: "rgba(255, 255, 255, 0.85)",
                "&:hover": {
                  color: "#FFFFFF",
                },
              }),
        }}
      >
        {language === "tl" && <LanguageIcon sx={{ fontSize: 16, color: "#FF6B00" }} />}
        <Typography sx={{ fontSize: "14px", fontWeight: 600 }}>
          Tagalog
        </Typography>
      </Box>

      {/* English Option */}
      <Box
        onClick={() => setLanguage("en")}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 16px",
          borderRadius: "24px",
          cursor: "pointer",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          ...(language === "en"
            ? {
                bgcolor: "#FFFFFF",
                color: "#0F172A",
                boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
              }
            : {
                bgcolor: "transparent",
                color: "rgba(255, 255, 255, 0.85)",
                "&:hover": {
                  color: "#FFFFFF",
                },
              }),
        }}
      >
        {language === "en" && <LanguageIcon sx={{ fontSize: 16, color: "#FF6B00" }} />}
        <Typography sx={{ fontSize: "14px", fontWeight: 600 }}>
          English
        </Typography>
      </Box>
    </Box>
  );
};

export default LanguageSelector;
