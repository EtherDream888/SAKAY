import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Badge, Button } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import VerifiedIcon from '@mui/icons-material/Verified';

import { NotificationPopover } from '../popovers/NotificationPopover';
import { MOCK_TODA_NOTIFICATIONS, CURRENT_TODA_PROFILE } from '../../mockData/todaData';
import { NotificationItem } from '../../types/toda';

interface TodaHeaderProps {
  pageTitle?: string;
  pageSubtitle?: string;
}

export const TodaHeader: React.FC<TodaHeaderProps> = ({
  pageTitle = 'Operations Monitoring',
  pageSubtitle = 'Real-time overview of Calapan Central TODA terminal and driver fleet',
}) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_TODA_NOTIFICATIONS);
  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, unread: false })));
  };

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 80,
        height: 'var(--mac-header-height)',
        flexShrink: 0,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--mac-border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 36px',
      }}
    >
      {/* Left: Primary Page Title & Subtitle inside Sticky Header */}
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Typography
          variant="h1"
          sx={{
            fontSize: '30px',
            fontWeight: 600,
            color: 'var(--mac-text-primary)',
            letterSpacing: '-0.4px',
            lineHeight: 1.2,
          }}
        >
          {pageTitle}
        </Typography>
        {pageSubtitle && (
          <Typography
            sx={{
              fontSize: '15px',
              fontWeight: 400,
              color: 'var(--mac-text-muted)',
              lineHeight: 1.3,
              mt: '3px',
            }}
          >
            {pageSubtitle}
          </Typography>
        )}
      </Box>

      {/* Right Controls: Notifications & TODA Organization Navigation Chip */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative' }}>
        {/* Notifications Icon Button */}
        <Box sx={{ position: 'relative' }}>
          <IconButton
            size="small"
            onClick={(e) => setNotifAnchor(e.currentTarget)}
            sx={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              border: '1px solid var(--mac-border-color)',
              backgroundColor: '#FFFFFF',
              color: 'var(--mac-text-secondary)',
              transition: 'var(--mac-transition-fast)',
              '&:hover': {
                backgroundColor: 'var(--sakay-orange-soft)',
                color: 'var(--sakay-orange)',
                borderColor: 'var(--sakay-orange-border)',
              },
            }}
          >
            <Badge badgeContent={unreadCount} color="error" variant="dot">
              <NotificationsNoneIcon fontSize="small" sx={{ fontSize: 22 }} />
            </Badge>
          </IconButton>
          <NotificationPopover
            open={Boolean(notifAnchor)}
            anchorEl={notifAnchor}
            onClose={() => setNotifAnchor(null)}
            notifications={notifications}
            onMarkAllAsRead={handleMarkAllAsRead}
          />
        </Box>

        {/* TODA Organization Navigation Chip (Direct Redirect to /account) */}
        <Button
          onClick={() => navigate('/account')}
          startIcon={<VerifiedIcon fontSize="small" sx={{ fontSize: 18, color: '#1E8E3E' }} />}
          sx={{
            height: 44,
            padding: '0 18px',
            borderRadius: '10px',
            border: '1px solid var(--mac-border-color)',
            backgroundColor: '#FFFFFF',
            color: 'var(--mac-text-primary)',
            fontSize: '14.5px',
            fontWeight: 600,
            textTransform: 'none',
            boxShadow: 'var(--mac-shadow-subtle)',
            transition: 'var(--mac-transition-fast)',
            maxWidth: 260,
            '&:hover': {
              backgroundColor: 'var(--sakay-orange-soft)',
              color: 'var(--sakay-orange)',
              borderColor: 'var(--sakay-orange-border)',
            },
          }}
        >
          <Typography
            sx={{
              fontSize: '14.5px',
              fontWeight: 600,
              color: 'inherit',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            {CURRENT_TODA_PROFILE.name}
          </Typography>
        </Button>
      </Box>
    </Box>
  );
};
