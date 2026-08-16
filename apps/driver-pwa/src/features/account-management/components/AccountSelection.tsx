import React from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonIcon from "@mui/icons-material/Person";
import SportsMotorsportsIcon from "@mui/icons-material/SportsMotorsports";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useLanguage } from "../../../utils/LanguageContext";
import Logo from "../../../common/components/Logo";

export const AccountSelection: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSelectRole = (role: "passenger" | "driver") => {
    navigate("/register", { state: { role } });
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        padding: "24px",
        paddingTop: "calc(var(--safe-area-top) + 16px)",
        paddingBottom: "calc(var(--safe-area-bottom) + 24px)",
        backgroundColor: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <IconButton
          onClick={() => navigate("/")}
          sx={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
            color: "#1A1A1A",
            borderRadius: "14px",
            width: "44px",
            height: "44px",
            "&:hover": {
              backgroundColor: "#F8FAFC",
            },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>

        <Logo color="orange" />
      </Box>

      {/* Title Section */}
      <Box className="anim-fade-in-down" sx={{ marginTop: "40px", width: "100%", textAlign: "left" }}>
        <Typography
          component="h2"
          sx={{
            fontSize: "24px",
            fontWeight: 800,
            color: "#0F172A",
            lineHeight: 1.3,
          }}
        >
          {t.selectRole}
        </Typography>
        <Typography
          sx={{
            fontSize: "15px",
            color: "#64748B",
            marginTop: "12px",
            fontWeight: 400,
            lineHeight: 1.5,
          }}
        >
          {t.selectRoleDesc}
        </Typography>
      </Box>

      {/* Selection Cards */}
      <Box
        className="anim-fade-in"
        sx={{
          marginTop: "36px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          width: "100%",
        }}
      >
        {/* Passenger Card */}
        <Box
          onClick={() => handleSelectRole("passenger")}
          role="button"
          tabIndex={0}
          sx={{
            display: "flex",
            alignItems: "center",
            padding: "16px 20px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "16px",
            cursor: "pointer",
            position: "relative",
            outline: "none",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              borderColor: "#FF8533",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.04)",
            },
          }}
        >
          <Box
            sx={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              backgroundColor: "#FFEBE0",
              color: "#FF6B00",
            }}
          >
            <PersonIcon sx={{ fontSize: 24 }} />
          </Box>
          
          <Box sx={{ marginLeft: "16px", flexGrow: 1, paddingRight: "12px" }}>
            <Typography
              component="h3"
              sx={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#0F172A",
              }}
            >
              {t.passenger}
            </Typography>
            <Typography
              sx={{
                fontSize: "12px",
                color: "#64748B",
                marginTop: "2px",
                lineHeight: 1.4,
              }}
            >
              {t.passengerDesc}
            </Typography>
          </Box>

          <ChevronRightIcon sx={{ color: "#94A3B8" }} />
        </Box>

        {/* Driver Card */}
        <Box
          onClick={() => handleSelectRole("driver")}
          role="button"
          tabIndex={0}
          sx={{
            display: "flex",
            alignItems: "center",
            padding: "16px 20px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "16px",
            cursor: "pointer",
            position: "relative",
            outline: "none",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              borderColor: "#FF8533",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.04)",
            },
          }}
        >
          <Box
            sx={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              backgroundColor: "#FFEBE0",
              color: "#FF6B00",
            }}
          >
            <SportsMotorsportsIcon sx={{ fontSize: 24 }} />
          </Box>

          <Box sx={{ marginLeft: "16px", flexGrow: 1, paddingRight: "12px" }}>
            <Typography
              component="h3"
              sx={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#0F172A",
              }}
            >
              {t.driver}
            </Typography>
            <Typography
              sx={{
                fontSize: "12px",
                color: "#64748B",
                marginTop: "2px",
                lineHeight: 1.4,
              }}
            >
              {t.driverDesc}
            </Typography>
          </Box>

          <ChevronRightIcon sx={{ color: "#94A3B8" }} />
        </Box>
      </Box>
    </Box>
  );
};

export default AccountSelection;
