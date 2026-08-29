import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PhoneIcon from '@mui/icons-material/Phone';
import SendIcon from '@mui/icons-material/Send';

interface DriverCommunicationModalProps {
  open: boolean;
  onClose: () => void;
  passengerName: string;
  passengerPhone: string;
}

export const DriverCommunicationModal: React.FC<DriverCommunicationModalProps> = ({
  open,
  onClose,
  passengerName,
  passengerPhone,
}) => {
  const [customMsg, setCustomMsg] = useState('');
  const [sentAlert, setSentAlert] = useState<string | null>(null);

  const templates = [
    "I'm on my way to your pickup point.",
    "I've arrived at your pickup location.",
    'Traffic is heavy, arriving in about 3 minutes.',
    'Please have your fare ready. Thank you!',
  ];

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    setSentAlert(`SMS sent to ${passengerName}: "${text}"`);
    setCustomMsg('');
    setTimeout(() => {
      setSentAlert(null);
      onClose();
    }, 2000);
  };

  const handleCall = () => {
    window.location.href = `tel:${passengerPhone}`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{
        paper: {
          sx: {
            borderRadius: '24px',
            padding: '8px',
            backgroundColor: '#FFFFFF',
          },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box>
          <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
            Contact Passenger
          </Typography>
          <Typography sx={{ fontSize: '13px', color: '#64748B' }}>
            {passengerName} ({passengerPhone})
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        {sentAlert && (
          <Box sx={{ p: 1.5, borderRadius: '10px', backgroundColor: '#E6F4EA', border: '1px solid #A7F3D0' }}>
            <Typography sx={{ fontSize: '12.5px', color: '#1E8E3E', fontWeight: 600 }}>
              {sentAlert}
            </Typography>
          </Box>
        )}

        {/* Call Action Button */}
        <Button
          variant="contained"
          fullWidth
          startIcon={<PhoneIcon />}
          onClick={handleCall}
          sx={{
            height: 48,
            borderRadius: '14px',
            backgroundColor: '#1E8E3E',
            fontWeight: 800,
            fontSize: '14.5px',
            textTransform: 'none',
            '&:hover': { backgroundColor: '#137333' },
          }}
        >
          Call Passenger
        </Button>

        <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', mt: 1 }}>
          Quick SMS Templates
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {templates.map((tpl, i) => (
            <Button
              key={i}
              variant="outlined"
              onClick={() => handleSend(tpl)}
              sx={{
                justifyContent: 'flex-start',
                textAlign: 'left',
                borderRadius: '12px',
                borderColor: '#E2E8F0',
                color: '#0F172A',
                fontSize: '12.5px',
                py: 1,
                px: 1.5,
                textTransform: 'none',
                '&:hover': { backgroundColor: '#FFF8F0', borderColor: '#FF6B00', color: '#FF6B00' },
              }}
            >
              {tpl}
            </Button>
          ))}
        </Box>

        {/* Custom Message Field */}
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Type a message..."
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
          />
          <Button
            variant="contained"
            onClick={() => handleSend(customMsg)}
            disabled={!customMsg.trim()}
            sx={{
              borderRadius: '12px',
              backgroundColor: '#FF6B00',
              minWidth: 48,
              px: 2,
              '&:hover': { backgroundColor: '#E66000' },
            }}
          >
            <SendIcon fontSize="small" />
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default DriverCommunicationModal;
