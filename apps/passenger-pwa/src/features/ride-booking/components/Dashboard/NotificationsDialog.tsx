import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import CloseIcon from "@mui/icons-material/Close";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";

import { useLanguage } from "../../../../utils/LanguageContext";

interface NotificationsDialogProps {
  open: boolean;
  onClose: () => void;
}

const NotificationsDialog: React.FC<NotificationsDialogProps> = ({ open, onClose }) => {
  const { language } = useLanguage();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderRadius: "20px",
            padding: "8px",
            maxWidth: "360px",
            width: "90%",
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 800,
          fontSize: "18px",
          color: "#0F172A",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <NotificationsOutlinedIcon sx={{ color: "#FF6B00" }} />
          {language === "tl" ? "Mga Notification" : "Notifications"}
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <Paper
            elevation={0}
            sx={{
              padding: "14px",
              backgroundColor: "#FFF7ED",
              borderRadius: "14px",
              border: "1px solid #FFEDD5",
            }}
          >
            <Typography
              sx={{
                fontSize: "13px",
                fontWeight: 800,
                color: "#FF6B00",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              {language === "tl" ? "Maligayang Pagdating sa SAKAY!" : "Welcome to SAKAY!"}
            </Typography>
            <Typography
              sx={{
                fontSize: "12px",
                color: "#64748B",
                marginTop: "4px",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              {language === "tl"
                ? "Mabilis at tapat na pamasahe sa tricycle saan man sa Calapan City."
                : "Fast and fair tricycle fares anywhere in Calapan City."}
            </Typography>
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ padding: "8px 16px 16px 16px" }}>
        <Button
          fullWidth
          variant="contained"
          onClick={onClose}
          sx={{
            backgroundColor: "#FF6B00",
            color: "#FFFFFF",
            borderRadius: "14px",
            fontWeight: 700,
            textTransform: "none",
            height: "44px",
            fontFamily: "Poppins, sans-serif",
            "&:hover": { backgroundColor: "#E66000" },
          }}
        >
          {language === "tl" ? "Isara" : "Close"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotificationsDialog;
