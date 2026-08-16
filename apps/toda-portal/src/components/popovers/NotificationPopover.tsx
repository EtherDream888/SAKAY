import React from 'react';
import { Box, Typography, Popover, Button, List, ListItem, ListItemText, Divider } from '@mui/material';
import { NotificationItem } from '../../types/toda';

interface NotificationPopoverProps {
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  open,
  onClose,
  anchorEl,
  notifications,
  onMarkAllAsRead,
}) => {
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          className: 'mac-glass-popover',
          sx: {
            mt: 1.5,
            width: 380,
            maxHeight: 460,
            borderRadius: 'var(--mac-radius-lg)',
            boxShadow: 'var(--mac-shadow-popover)',
            overflow: 'hidden',
          },
        },
      }}
    >
      <Box sx={{ p: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--mac-border-color)' }}>
        <Typography sx={{ fontSize: '16px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
          TODA Notifications
        </Typography>
        <Button
          size="small"
          onClick={onMarkAllAsRead}
          sx={{
            fontSize: '13px',
            textTransform: 'none',
            color: 'var(--sakay-orange)',
            fontWeight: 600,
            p: 0,
            minWidth: 0,
          }}
        >
          Mark all as read
        </Button>
      </Box>

      <List sx={{ p: 0, maxHeight: 380, overflowY: 'auto' }}>
        {notifications.length > 0 ? (
          notifications.map((n, idx) => (
            <React.Fragment key={n.id}>
              <ListItem
                sx={{
                  px: 2.5,
                  py: 1.8,
                  backgroundColor: n.unread ? 'rgba(255, 107, 26, 0.04)' : 'transparent',
                  '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: '14.5px', fontWeight: n.unread ? 700 : 500, color: 'var(--mac-text-primary)' }}>
                        {n.title}
                      </Typography>
                      {n.unread && (
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--sakay-orange)' }} />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-secondary)', lineHeight: 1.4 }}>
                        {n.description}
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mt: 0.5 }}>
                        {n.time}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              {idx < notifications.length - 1 && <Divider sx={{ borderColor: 'var(--mac-border-color)' }} />}
            </React.Fragment>
          ))
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-muted)' }}>
              No notifications at this time.
            </Typography>
          </Box>
        )}
      </List>
    </Popover>
  );
};
