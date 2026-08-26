import React, { useRef, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { NotificationItem } from '../../types/admin';

interface NotificationPopoverProps {
  open: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  open,
  onClose,
  notifications,
  onMarkAllAsRead,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Box
      ref={popoverRef}
      className="mac-glass-popover"
      sx={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        width: 340,
        maxHeight: 420,
        borderRadius: 'var(--mac-radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 200,
        overflow: 'hidden',
        animation: 'fadeInScale 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        '@keyframes fadeInScale': {
          '0%': { opacity: 0, transform: 'scale(0.96) translateY(-4px)' },
          '100%': { opacity: 1, transform: 'scale(1) translateY(0)' },
        },
      }}
    >
      {/* Popover Header */}
      <Box
        sx={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--mac-border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(250, 250, 252, 0.6)',
        }}
      >
        <Typography sx={{ fontWeight: 600, fontSize: '10.8px', color: 'var(--mac-text-primary)' }}>
          Notifications
        </Typography>
        {notifications.length > 0 && (
          <Button
            size="small"
            onClick={onMarkAllAsRead}
            sx={{
              fontSize: '9.3px',
              textTransform: 'none',
              color: 'var(--sakay-orange)',
              fontWeight: 500,
              padding: 0,
              minWidth: 'auto',
              '&:hover': { background: 'transparent', textDecoration: 'underline' },
            }}
          >
            Mark all read
          </Button>
        )}
      </Box>

      {/* Notifications List */}
      <Box sx={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {notifications.length === 0 ? (
          <Box sx={{ padding: '32px 16px', textAlign: 'center' }}>
            <Typography sx={{ fontSize: '10.4px', color: 'var(--mac-text-muted)' }}>
              No new notifications
            </Typography>
          </Box>
        ) : (
          notifications.map((item) => (
            <Box
              key={item.id}
              sx={{
                padding: '10px 16px',
                borderBottom: '1px solid var(--mac-divider)',
                backgroundColor: item.unread ? 'var(--sakay-orange-soft)' : 'transparent',
                transition: 'var(--mac-transition-fast)',
                '&:hover': {
                  backgroundColor: item.unread ? '#FFEAE0' : 'rgba(0, 0, 0, 0.03)',
                },
                cursor: 'pointer',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontWeight: item.unread ? 600 : 500, fontSize: '10.4px', color: 'var(--mac-text-primary)' }}>
                  {item.title}
                </Typography>
                {item.unread && (
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      backgroundColor: 'var(--sakay-orange)',
                      mt: 0.6,
                    }}
                  />
                )}
              </Box>
              <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-secondary)', lineHeight: 1.35, mb: 0.5 }}>
                {item.description}
              </Typography>
              <Typography sx={{ fontSize: '8.8px', color: 'var(--mac-text-muted)' }}>
                {item.time}
              </Typography>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};
