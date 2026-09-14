import React, { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import CloseIcon from "@mui/icons-material/Close";
import { useLanguage } from "../../utils/LanguageContext";

export interface PassengerCancelModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmCancel: (reasonText: string) => void | Promise<void>;
  language?: "tl" | "en";
  loading?: boolean;
}

interface CancelOption {
  id: string;
  tl: string;
  en: string;
}

const CANCEL_OPTIONS: CancelOption[] = [
  {
    id: "driver_delayed",
    tl: "Matagal dumating ang driver",
    en: "Driver is taking too long",
  },
  {
    id: "no_longer_needed",
    tl: "Hindi ko na kailangan ang biyahe",
    en: "I no longer need the ride",
  },
  {
    id: "wrong_location",
    tl: "Nagkamali ako ng pickup o destination",
    en: "Wrong pickup or destination",
  },
  {
    id: "found_another_ride",
    tl: "May ibang nasakyan na ako",
    en: "Found another ride",
  },
  {
    id: "other",
    tl: "Iba pa",
    en: "Other reason",
  },
];

/**
 * PassengerCancelModal - Directly replicates PASSENGER CANCEL.png
 * Matches colors, layout, close button, radio options, and warning notice.
 */
export const PassengerCancelModal: React.FC<PassengerCancelModalProps> = ({
  open,
  onClose,
  onConfirmCancel,
  language: propLanguage,
  loading = false,
}) => {
  const { language: contextLanguage } = useLanguage();
  const effectiveLanguage = propLanguage || contextLanguage || "tl";

  // Default to 'Hindi ko na kailangan ang biyahe' as shown in PASSENGER CANCEL.png
  const [selectedOptionId, setSelectedOptionId] = useState<string>("no_longer_needed");

  if (!open) return null;

  const handleConfirm = async () => {
    const selected = CANCEL_OPTIONS.find((opt) => opt.id === selectedOptionId);
    const reasonText = selected
      ? effectiveLanguage === "tl"
        ? selected.tl
        : selected.en
      : "Cancelled by Passenger";

    await onConfirmCancel(reasonText);
  };

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#FFEBD8",
        zIndex: 2500,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        p: "20px 20px 28px 20px",
        boxSizing: "border-box",
        overflowY: "auto",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      {/* 1. Top-Left Close Button matching PASSENGER CANCEL.png */}
      <Box sx={{ display: "flex", justifyContent: "flex-start", width: "100%", pt: 1 }}>
        <IconButton
          onClick={onClose}
          disabled={loading}
          aria-label="close"
          sx={{
            width: 48,
            height: 48,
            borderRadius: "16px",
            backgroundColor: "#FFFFFF",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
            color: "#0F172A",
            transition: "all 0.15s ease",
            "&:hover": {
              backgroundColor: "#F8FAFC",
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 24 }} />
        </IconButton>
      </Box>

      {/* 2. White Reasons Card matching PASSENGER CANCEL.png */}
      <Box
        sx={{
          backgroundColor: "#FFFFFF",
          borderRadius: "28px",
          p: "28px 22px 22px 22px",
          width: "100%",
          maxWidth: "400px",
          mx: "auto",
          my: "auto",
          boxShadow: "0 14px 40px rgba(0, 0, 0, 0.07)",
          boxSizing: "border-box",
        }}
      >
        {/* Title */}
        <Typography
          sx={{
            fontSize: "18px",
            fontWeight: 700,
            color: "#0F172A",
            textAlign: "center",
            fontFamily: "Poppins, sans-serif",
            mb: "20px",
          }}
        >
          {effectiveLanguage === "tl" ? "Bakit mo ika-cancel?" : "Why do you want to cancel?"}
        </Typography>

        {/* Top Divider */}
        <Box sx={{ height: "1px", backgroundColor: "#F1F5F9", mb: "14px" }} />

        {/* Radio Options List */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {CANCEL_OPTIONS.map((option) => {
            const isSelected = selectedOptionId === option.id;
            const label = effectiveLanguage === "tl" ? option.tl : option.en;

            return (
              <Box
                key={option.id}
                onClick={() => !loading && setSelectedOptionId(option.id)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  py: "12px",
                  px: "4px",
                  cursor: loading ? "default" : "pointer",
                  userSelect: "none",
                  borderRadius: "8px",
                  "&:hover": {
                    backgroundColor: "#FDF8F6",
                  },
                }}
              >
                {/* Option Text */}
                <Typography
                  sx={{
                    fontSize: "14.5px",
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? "#0F172A" : "#334155",
                    fontFamily: "Poppins, sans-serif",
                    pr: 1,
                  }}
                >
                  {label}
                </Typography>

                {/* Custom Radio Button matching PASSENGER CANCEL.png */}
                {isSelected ? (
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: "2.5px solid #FF5500",
                      backgroundColor: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: "#FF5500",
                      }}
                    />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: "2.5px solid #0F172A",
                      backgroundColor: "transparent",
                      flexShrink: 0,
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>

        {/* Bottom Divider */}
        <Box sx={{ height: "1px", backgroundColor: "#F1F5F9", mt: "14px", mb: "16px" }} />

        {/* Reminder / PAALALA Warning */}
        <Typography
          sx={{
            fontSize: "12px",
            color: "#64748B",
            textAlign: "center",
            lineHeight: 1.45,
            mb: "22px",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          <Box
            component="span"
            sx={{
              fontWeight: 700,
              color: "#64748B",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            {effectiveLanguage === "tl" ? "PAALALA:" : "REMINDER:"}
          </Box>{" "}
          {effectiveLanguage === "tl" ? (
            <>
              Nakakataas ng cancellation rate
              <br />
              ang pag-cancel ng iyong booking.
            </>
          ) : (
            <>
              Cancelling your booking increases
              <br />
              your cancellation rate.
            </>
          )}
        </Typography>

        {/* Large Orange Action Button */}
        <Button
          fullWidth
          onClick={handleConfirm}
          disabled={loading}
          sx={{
            height: "54px",
            borderRadius: "16px",
            backgroundColor: "#FF5500",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: "16px",
            textTransform: "none",
            fontFamily: "Poppins, sans-serif",
            boxShadow: "none",
            "&:hover": {
              backgroundColor: "#E04800",
              boxShadow: "none",
            },
            "&:active": {
              backgroundColor: "#CC4000",
            },
            "&.Mui-disabled": {
              backgroundColor: "#FFA366",
              color: "#FFFFFF",
            },
          }}
        >
          {loading ? (
            <CircularProgress size={24} sx={{ color: "#FFFFFF" }} />
          ) : effectiveLanguage === "tl" ? (
            "Ikansela ang booking"
          ) : (
            "Cancel booking"
          )}
        </Button>
      </Box>

      {/* Spacer matching reference layout proportions */}
      <Box sx={{ height: 20 }} />
    </Box>
  );
};

export default PassengerCancelModal;
