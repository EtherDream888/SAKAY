import React from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Badge from "@mui/material/Badge";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";

import { useLanguage } from "../../../../utils/LanguageContext";

interface HomeHeaderProps {
  onOpenDrawer: () => void;
  onOpenNotifications: () => void;
  onOpenTulong: () => void;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({
  onOpenDrawer,
  onOpenNotifications,
  onOpenTulong,
}) => {
  const { language } = useLanguage();

  return (
    <Box
      sx={{
        position: "absolute",
        top: "calc(var(--safe-area-top) + 16px)",
        left: "16px",
        right: "16px",
        zIndex: 10,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      {/* Top Left: Hamburger Menu Button */}
      <IconButton
        onClick={onOpenDrawer}
        aria-label="Open navigation menu"
        sx={{
          backgroundColor: "#FFFFFF",
          width: "48px",
          height: "48px",
          borderRadius: "16px",
          boxShadow: "0 4px 16px rgba(15, 23, 42, 0.08)",
          color: "#0F172A",
          "&:hover": {
            backgroundColor: "#F8FAFC",
          },
        }}
      >
        <MenuIcon sx={{ fontSize: 24 }} />
      </IconButton>

      {/* Top Right Actions Stack: Notification + Tulong */}
      <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Notification Bell Button */}
        <IconButton
          onClick={onOpenNotifications}
          aria-label="Open notifications"
          sx={{
            backgroundColor: "#FFFFFF",
            width: "48px",
            height: "48px",
            borderRadius: "16px",
            boxShadow: "0 4px 16px rgba(15, 23, 42, 0.08)",
            color: "#0F172A",
            "&:hover": {
              backgroundColor: "#F8FAFC",
            },
          }}
        >
          <Badge color="error" variant="dot">
            <NotificationsOutlinedIcon sx={{ fontSize: 24 }} />
          </Badge>
        </IconButton>

        {/* Tulong Support Pill Button */}
        <Button
          onClick={onOpenTulong}
          startIcon={<HeadsetMicIcon sx={{ fontSize: "20px !important", color: "#0F172A" }} />}
          sx={{
            backgroundColor: "#FFFFFF",
            height: "48px",
            padding: "0 18px",
            borderRadius: "16px",
            boxShadow: "0 4px 16px rgba(15, 23, 42, 0.08)",
            color: "#0F172A",
            textTransform: "none",
            fontWeight: 600,
            fontSize: "14px",
            fontFamily: "Poppins, sans-serif",
            "&:hover": {
              backgroundColor: "#F8FAFC",
            },
          }}
        >
          {language === "tl" ? "Tulong" : "Help"}
        </Button>
      </Box>
    </Box>
  );
};

export default HomeHeader;
