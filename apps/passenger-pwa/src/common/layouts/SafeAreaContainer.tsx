import React from "react";
import Box from "@mui/material/Box";
import type { BoxProps } from "@mui/material/Box";

export interface SafeAreaContainerProps extends BoxProps {
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
  scrollable?: boolean;
  children: React.ReactNode;
}

/**
 * SafeAreaContainer - Inset wrapper that provides hardware safe-area padding.
 * 
 * Supports:
 * - iPhone notch / Dynamic Island safe-area-inset-top
 * - Android status-bar and camera cutout
 * - Home indicator / navigation bar safe-area-inset-bottom
 * - Full-bleed background with inner safe-area content positioning
 */
export const SafeAreaContainer: React.FC<SafeAreaContainerProps> = ({
  top = true,
  bottom = true,
  left = false,
  right = false,
  scrollable = false,
  sx,
  children,
  ...props
}) => {
  return (
    <Box
      className={scrollable ? "hide-scrollbar" : undefined}
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        paddingTop: top ? "var(--safe-area-top)" : 0,
        paddingBottom: bottom ? "var(--safe-area-bottom)" : 0,
        paddingLeft: left ? "var(--safe-area-left)" : 0,
        paddingRight: right ? "var(--safe-area-right)" : 0,
        overflowY: scrollable ? "auto" : "hidden",
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

export default SafeAreaContainer;
