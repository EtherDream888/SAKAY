import React from "react";
import { useNavigate } from "react-router-dom";
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
import PhoneIcon from "@mui/icons-material/Phone";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";

import { useLanguage } from "../../../../utils/LanguageContext";

interface TulongDialogProps {
  open: boolean;
  onClose: () => void;
}

const TulongDialog: React.FC<TulongDialogProps> = ({ open, onClose }) => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const handleOpenIncidentReport = () => {
    onClose();
    navigate('/incident-report', { state: { from: '/dashboard' } });
  };

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
          <SupportAgentIcon sx={{ color: "#FF6B00" }} />
          {language === "tl" ? "Tulong at Suporta" : "Help & Support"}
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Typography
          sx={{
            fontSize: "13px",
            color: "#64748B",
            marginBottom: "16px",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {language === "tl"
            ? "May katanungan o kailangan ng tulong sa iyong biyahe sa Calapan City? Makipag-ugnayan sa amin:"
            : "Have questions or need assistance with your ride in Calapan City? Contact us:"}
        </Typography>

        <Paper
          elevation={0}
          sx={{
            padding: "12px 14px",
            backgroundColor: "#F8FAFC",
            borderRadius: "14px",
            border: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <Box
            sx={{
              width: "38px",
              height: "38px",
              borderRadius: "12px",
              backgroundColor: "#FFF7ED",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PhoneIcon sx={{ color: "#FF6B00", fontSize: "20px" }} />
          </Box>
          <Box>
            <Typography
              sx={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#94A3B8",
                letterSpacing: "0.5px",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              CALAPAN TODA HOTLINE
            </Typography>
            <Typography
              sx={{
                fontSize: "14px",
                fontWeight: 800,
                color: "#0F172A",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              (043) 288-7000 / 0917-812-3456
            </Typography>
          </Box>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ padding: "8px 16px 16px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<ReportProblemIcon />}
          onClick={handleOpenIncidentReport}
          sx={{
            borderColor: "#EF4444",
            color: "#EF4444",
            borderRadius: "14px",
            fontWeight: 700,
            textTransform: "none",
            height: "44px",
            fontFamily: "Poppins, sans-serif",
            "&:hover": { borderColor: "#DC2626", backgroundColor: "#FEF2F2" },
          }}
        >
          {language === "tl" ? "Mag-ulat ng Reklamo o Insidente" : "Report a Complaint or Incident"}
        </Button>
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

export default TulongDialog;
