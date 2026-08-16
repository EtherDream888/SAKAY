import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PhoneIcon from '@mui/icons-material/Phone';
import SendIcon from '@mui/icons-material/Send';
import MessageIcon from '@mui/icons-material/Message';

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
    'Papunta na po ako sa inyong pickup point.',
    'Nandito na po ako sa labas / tapat.',
    'Medyo ma-trapik po, darating ako sa loob ng 3 minuto.',
    'Pakihanda na po ang inyong pamasahe. Salamat!',
  ];

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    setSentAlert(`Naipadala ang SMS kay ${passengerName}: "${text}"`);
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
            Makipag-ugnayan sa Pasahero
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
            '&:hover': { backgroundColor: '#137333' },
          }}
        >
          Tawagan ang Pasahero (Native Call)
        </Button>

        <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', mt: 1 }}>
          Mabilisang SMS Templates (Quick Templates)
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
            placeholder="I-type ang mensahe..."
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
          />
          <Button
            variant="contained"
            onClick={() => handleSend(customMsg)}
            disabled={!customMsg.trim()}
            sx={{ borderRadius: '12px', backgroundColor: '#FF6B00', minWidth: '48px', px: 2 }}
          >
            <SendIcon fontSize="small" />
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
