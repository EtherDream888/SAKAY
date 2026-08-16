import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CampaignIcon from '@mui/icons-material/Campaign';

import { MOCK_DRIVER_NOTIFICATIONS } from '../../../mockData/driverMockData';

interface NotificationItem {
  id: string;
  title: string;
  category: string;
  time: string;
  message: string;
  unread: boolean;
}

export const DriverNotifications: React.FC = () => {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState<NotificationItem | null>(null);

  return (
    <Box sx={{ width: '100%', height: '100%', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Header */}
      <Box sx={{ padding: 'calc(var(--safe-area-top) + 16px) 20px 16px', display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #F1F5F9', backgroundColor: '#FFFFFF' }}>
        <IconButton onClick={() => navigate('/driver/home')} sx={{ color: '#0F172A' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
          Mga Abiso at Anunsyo ng TODA
        </Typography>
      </Box>

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {MOCK_DRIVER_NOTIFICATIONS.map((item) => (
          <Paper
            key={item.id}
            elevation={0}
            onClick={() => setSelectedItem(item)}
            sx={{
              p: 2,
              borderRadius: '16px',
              border: item.unread ? '1px solid #FF6B00' : '1px solid #E2E8F0',
              backgroundColor: item.unread ? '#FFF8F0' : '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
              cursor: 'pointer',
              transition: 'transform 0.15s ease',
              '&:hover': {
                transform: 'scale(1.01)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Chip
                label={item.category}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: '10.5px',
                  backgroundColor: item.category === 'TODA Announcement' ? '#E6F4EA' : '#FEF3C7',
                  color: item.category === 'TODA Announcement' ? '#1E8E3E' : '#B45309',
                }}
              />
              <Typography sx={{ fontSize: '11px', color: '#94A3B8' }}>{item.time}</Typography>
            </Box>
            <Typography sx={{ fontSize: '14.5px', fontWeight: 800, color: '#0F172A', mt: 0.5 }}>
              {item.title}
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.4 }}>
              {item.message}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Announcement Detail Modal */}
      {selectedItem && (
        <Dialog
          open={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          slotProps={{
            paper: {
              sx: {
                borderRadius: '20px',
                padding: '8px',
                backgroundColor: '#FFFFFF',
                maxWidth: '360px',
              },
            },
          }}
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
            <CampaignIcon sx={{ color: '#FF6B00' }} />
            <Typography sx={{ fontWeight: 800, fontSize: '16px', color: '#0F172A' }}>
              {selectedItem.category}
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ py: 1 }}>
            <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 1 }}>
              {selectedItem.title}
            </Typography>
            <Typography sx={{ fontSize: '13px', color: '#64748B', mb: 2 }}>
              Oras: {selectedItem.time}
            </Typography>
            <Typography sx={{ fontSize: '13.5px', color: '#334155', lineHeight: 1.6 }}>
              {selectedItem.message}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              fullWidth
              variant="contained"
              onClick={() => setSelectedItem(null)}
              sx={{
                height: 44,
                borderRadius: '12px',
                backgroundColor: '#0F172A',
                fontWeight: 700,
                textTransform: 'none',
              }}
            >
              Isara (Close)
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};
