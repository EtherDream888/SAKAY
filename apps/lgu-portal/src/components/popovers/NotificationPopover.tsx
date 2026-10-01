import React, { useRef, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import PublishedWithChangesIcon from '@mui/icons-material/PublishedWithChanges';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import DomainIcon from '@mui/icons-material/Domain';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { NotificationItem } from '../../types/admin';

interface NotificationPopoverProps {
  open: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onNotificationClick?: (item: NotificationItem) => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  open,
  onClose,
  notifications,
  onMarkAllAsRead,
  onNotificationClick,
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

  const unreadCount = notifications.filter((n) => n.unread).length;

  const getCategoryConfig = (category?: string) => {
    switch (category) {
      case 'resubmission':
        return {
          icon: <PublishedWithChangesIcon sx={{ fontSize: 16, color: '#B45309' }} />,
          bg: '#FEF3C7',
          border: '#FCD34D',
        };
      case 'endorsement':
        return {
          icon: <HowToRegIcon sx={{ fontSize: 16, color: '#1D4ED8' }} />,
          bg: '#DBEAFE',
          border: '#93C5FD',
        };
      case 'toda':
        return {
          icon: <DomainIcon sx={{ fontSize: 16, color: '#6D28D9' }} />,
          bg: '#EDE9FE',
          border: '#C4B5FD',
        };
      case 'incident':
        return {
          icon: <WarningAmberIcon sx={{ fontSize: 16, color: '#DC2626' }} />,
          bg: '#FEE2E2',
          border: '#FCA5A5',
        };
      default:
        return {
          icon: <NotificationsActiveIcon sx={{ fontSize: 16, color: 'var(--sakay-orange)' }} />,
          bg: 'var(--sakay-orange-soft)',
          border: 'var(--sakay-orange-border)',
        };
    }
  };

  return (
    <Box
      ref={popoverRef}
      className="mac-glass-popover"
      sx={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        width: 360,
        maxHeight: 460,
        borderRadius: 'var(--mac-radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 200,
        overflow: 'hidden',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.16), 0 2px 6px rgba(0, 0, 0, 0.08)',
        border: '1px solid var(--mac-border-color)',
        backgroundColor: '#FFFFFF',
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
          backgroundColor: '#FAFAFC',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '14px', color: 'var(--mac-text-primary)' }}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Box
              sx={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#FFFFFF',
                backgroundColor: 'var(--sakay-orange)',
                borderRadius: '10px',
                px: '7px',
                py: '1px',
              }}
            >
              {unreadCount}
            </Box>
          )}
        </Box>
        {unreadCount > 0 && (
          <Button
            size="small"
            onClick={onMarkAllAsRead}
            sx={{
              fontSize: '12px',
              textTransform: 'none',
              color: 'var(--sakay-orange)',
              fontWeight: 600,
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
      <Box sx={{ flex: 1, overflowY: 'auto', padding: '0', maxHeight: 400 }}>
        {notifications.length === 0 ? (
          <Box sx={{ padding: '36px 16px', textAlign: 'center' }}>
            <NotificationsActiveIcon sx={{ fontSize: 32, color: 'var(--mac-text-muted)', mb: 1, opacity: 0.4 }} />
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--mac-text-muted)' }}>
              No new notifications
            </Typography>
            <Typography sx={{ fontSize: '11.5px', color: 'var(--mac-text-muted)', mt: 0.5 }}>
              All driver and TODA activities are up to date
            </Typography>
          </Box>
        ) : (
          notifications.map((item) => {
            const { icon, bg, border } = getCategoryConfig(item.category);
            return (
              <Box
                key={item.id}
                onClick={() => {
                  if (onNotificationClick) onNotificationClick(item);
                  onClose();
                }}
                sx={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--mac-divider)',
                  backgroundColor: item.unread ? 'rgba(255, 149, 0, 0.06)' : 'transparent',
                  transition: 'var(--mac-transition-fast)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: item.unread ? 'rgba(255, 149, 0, 0.12)' : 'rgba(0, 0, 0, 0.03)',
                  },
                }}
              >
                {/* Category Icon Badge */}
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '8px',
                    backgroundColor: bg,
                    border: `1px solid ${border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    mt: 0.2,
                  }}
                >
                  {icon}
                </Box>

                {/* Content */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.3 }}>
                    <Typography
                      sx={{
                        fontWeight: item.unread ? 700 : 600,
                        fontSize: '13px',
                        color: 'var(--mac-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.title}
                    </Typography>
                    {item.unread && (
                      <Box
                        sx={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          backgroundColor: 'var(--sakay-orange)',
                          flexShrink: 0,
                          ml: 1,
                        }}
                      />
                    )}
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '12px',
                      color: 'var(--mac-text-secondary)',
                      lineHeight: 1.4,
                      mb: 0.6,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {item.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '11px', color: 'var(--mac-text-muted)', fontWeight: 500 }}>
                      {item.time}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', color: 'var(--sakay-orange)', fontSize: '11px', fontWeight: 600 }}>
                      <span>View</span>
                      <ChevronRightIcon sx={{ fontSize: 14 }} />
                    </Box>
                  </Box>
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
};
