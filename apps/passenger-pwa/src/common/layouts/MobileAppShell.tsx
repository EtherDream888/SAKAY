import React from "react";
import { Outlet } from "react-router-dom";
import Box from "@mui/material/Box";

interface MobileAppShellProps {
  children?: React.ReactNode;
}

/**
 * MobileAppShell - The central mobile application container for the Passenger PWA.
 * 
 * Responsibilities:
 * - Mobile viewport sizing (Portrait mobile phone frame 412x892 on desktop, 100vw x 100dvh on mobile)
 * - Safe area boundary containment
 * - Global overflow management
 * - Consistent background styling
 */
export const MobileAppShell: React.FC<MobileAppShellProps> = ({ children }) => {
  return (
    <Box className="app-container">
      <Box
        component="main"
        className="phone-simulator hide-scrollbar"
        id="mobile-app-shell"
      >
        <Box
          sx={{
            width: "100%",
            height: "100%",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            backgroundColor: "#FFFFFF",
          }}
        >
          {children || <Outlet />}
        </Box>
      </Box>
    </Box>
  );
};

export default MobileAppShell;
