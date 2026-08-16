import React from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";

export interface PassengerNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profileName: string;
  profilePhoto?: string;
  contactNumber?: string;
  onNavigateNewTrip?: () => void;
  onNavigateProfile?: () => void;
  onOpenTulong?: () => void;
  onLogout: () => void;
}

const PassengerNavigationDrawer: React.FC<PassengerNavigationDrawerProps> = ({
  isOpen,
  onClose,
  profileName,
  profilePhoto,
  onNavigateProfile,
  onOpenTulong,
  onLogout,
}) => {
  const navigate = useNavigate();

  const handleProfileClick = () => {
    onClose();
    if (onNavigateProfile) {
      onNavigateProfile();
    } else {
      navigate("/profile");
    }
  };

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <>
      {/* Dark translucent overlay backdrop constrained to mobile viewport */}
      <Box
        onClick={onClose}
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(2px)",
          zIndex: 1000,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Slide-out Mobile Navigation Drawer constrained inside mobile viewport */}
      <Box
        className="hide-scrollbar"
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: "80%",
          maxWidth: "320px",
          backgroundColor: "#FFFFFF",
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
          boxShadow: "8px 0 32px rgba(15, 23, 42, 0.2)",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          overflowY: "auto",
        }}
      >
        {/* Top Header Card matching SIDEBAR MENU.png (Vibrant Orange Header respecting safe area) */}
        <Box
          onClick={handleProfileClick}
          sx={{
            background: "linear-gradient(135deg, #FF6B00 0%, #FF8533 100%)",
            padding: "calc(var(--safe-area-top) + 24px) 20px 24px 20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            cursor: "pointer",
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage:
                "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)",
              pointerEvents: "none",
            },
          }}
        >
          {/* Avatar Circle */}
          <Avatar
            src={profilePhoto || undefined}
            sx={{
              width: "56px",
              height: "56px",
              backgroundColor: "#FFFFFF",
              color: "#FF6B00",
              fontWeight: 800,
              fontSize: "20px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              border: "2px solid #FFFFFF",
            }}
          >
            {profileName ? profileName.charAt(0).toUpperCase() : "J"}
          </Avatar>

          {/* User Name & Arrow */}
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Typography
              sx={{
                fontSize: "18px",
                fontWeight: 800,
                color: "#FFFFFF",
                letterSpacing: "-0.2px",
              }}
            >
              {profileName || "John Doe"}
            </Typography>
            <ArrowForwardIcon sx={{ color: "#FFFFFF", fontSize: "20px" }} />
          </Box>
        </Box>

        {/* Menu Items List matching SIDEBAR MENU.png */}
        <List disablePadding sx={{ flexGrow: 1, paddingTop: "8px" }}>
          {/* Item 1: History */}
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleNavigate("/history")}
              sx={{
                padding: "16px 24px",
                "&:hover": { backgroundColor: "#FFF7ED" },
              }}
            >
              <ListItemIcon sx={{ color: "#0F172A", minWidth: "44px" }}>
                <AccessTimeIcon sx={{ fontSize: "22px" }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    sx={{ fontSize: "16px", fontWeight: 600, color: "#0F172A" }}
                  >
                    History
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>
          <Divider sx={{ borderColor: "#F1F5F9", marginX: "24px" }} />

          {/* Item 2: Nai-save na Lugar */}
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleNavigate("/set-place")}
              sx={{
                padding: "16px 24px",
                "&:hover": { backgroundColor: "#FFF7ED" },
              }}
            >
              <ListItemIcon sx={{ color: "#0F172A", minWidth: "44px" }}>
                <BookmarkBorderIcon sx={{ fontSize: "22px" }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    sx={{ fontSize: "16px", fontWeight: 600, color: "#0F172A" }}
                  >
                    Nai-save na Lugar
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>
          <Divider sx={{ borderColor: "#F1F5F9", marginX: "24px" }} />

          {/* Item 3: Support */}
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                onClose();
                if (onOpenTulong) onOpenTulong();
              }}
              sx={{
                padding: "16px 24px",
                "&:hover": { backgroundColor: "#FFF7ED" },
              }}
            >
              <ListItemIcon sx={{ color: "#0F172A", minWidth: "44px" }}>
                <HeadsetMicIcon sx={{ fontSize: "22px" }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    sx={{ fontSize: "16px", fontWeight: 600, color: "#0F172A" }}
                  >
                    Support
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>
          <Divider sx={{ borderColor: "#F1F5F9", marginX: "24px" }} />

          {/* Item 4: Feedback */}
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleNavigate("/feedback")}
              sx={{
                padding: "16px 24px",
                "&:hover": { backgroundColor: "#FFF7ED" },
              }}
            >
              <ListItemIcon sx={{ color: "#0F172A", minWidth: "44px" }}>
                <ChatOutlinedIcon sx={{ fontSize: "22px" }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    sx={{ fontSize: "16px", fontWeight: 600, color: "#0F172A" }}
                  >
                    Puna at Rating (Feedback)
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>
          <Divider sx={{ borderColor: "#F1F5F9", marginX: "24px" }} />

          {/* Item 5: I-ulat ang Insidente */}
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleNavigate("/incident-report")}
              sx={{
                padding: "16px 24px",
                "&:hover": { backgroundColor: "#FFF7ED" },
              }}
            >
              <ListItemIcon sx={{ color: "#DC2626", minWidth: "44px" }}>
                <ReportProblemOutlinedIcon sx={{ fontSize: "22px" }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    sx={{ fontSize: "16px", fontWeight: 600, color: "#DC2626" }}
                  >
                    I-ulat ang Insidente
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>
          <Divider sx={{ borderColor: "#F1F5F9", marginX: "24px" }} />

          {/* Item 6: Settings */}
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleNavigate("/profile")}
              sx={{
                padding: "16px 24px",
                "&:hover": { backgroundColor: "#FFF7ED" },
              }}
            >
              <ListItemIcon sx={{ color: "#0F172A", minWidth: "44px" }}>
                <SettingsOutlinedIcon sx={{ fontSize: "22px" }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    sx={{ fontSize: "16px", fontWeight: 600, color: "#0F172A" }}
                  >
                    Settings
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>
          <Divider sx={{ borderColor: "#F1F5F9", marginX: "24px" }} />
        </List>

        {/* Bottom Item: Logout respecting safe-area-inset-bottom */}
        <Box sx={{ paddingBottom: "calc(var(--safe-area-bottom) + 20px)" }}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={onLogout}
              sx={{
                padding: "16px 24px",
                "&:hover": { backgroundColor: "#FEF2F2" },
              }}
            >
              <ListItemIcon sx={{ color: "#0F172A", minWidth: "44px" }}>
                <ExitToAppIcon sx={{ fontSize: "22px" }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    sx={{ fontSize: "16px", fontWeight: 600, color: "#0F172A" }}
                  >
                    Logout
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>
        </Box>
      </Box>
    </>
  );
};

export default PassengerNavigationDrawer;
