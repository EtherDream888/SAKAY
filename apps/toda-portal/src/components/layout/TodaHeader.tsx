import React, { useState } from 'react';
import { Box, Typography, Button, IconButton, Badge } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import VerifiedIcon from '@mui/icons-material/Verified';

import { NotificationPopover } from '../popovers/NotificationPopover';
import { DateCalendarPopover } from '../popovers/DateCalendarPopover';
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
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_TODA_NOTIFICATIONS);
  const [notifOpen, setNotifOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 4, 12)); // May 12, 2026

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, unread: false })));
  };

  const formatDateLabel = (date: Date) => {
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  return (
    <Box
      component="header"
      sx={{
        height: 'var(--mac-header-height)',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--mac-header-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--mac-border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 80,
      }}
    >
      {/* Left: Page Title & Subtitle */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--mac-text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            {pageTitle}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              backgroundColor: 'rgba(52, 168, 83, 0.12)',
              color: '#1E8E3E',
              px: 1.2,
              py: 0.4,
              borderRadius: '6px',
              border: '1px solid rgba(52, 168, 83, 0.3)',
            }}
          >
            <VerifiedIcon sx={{ fontSize: 14 }} />
            <Typography sx={{ fontSize: '11.5px', fontWeight: 700 }}>
              {CURRENT_TODA_PROFILE.acronym}
            </Typography>
          </Box>
        </Box>
        {pageSubtitle && (
          <Typography
            sx={{
              fontSize: '13px',
              color: 'var(--mac-text-muted)',
              fontWeight: 400,
              mt: '2px',
            }}
          >
            {pageSubtitle}
          </Typography>
        )}
      </Box>

      {/* Right Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* Notification Bell */}
        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={() => setNotifOpen(!notifOpen)}
            sx={{
              width: 42,
              height: 42,
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
              <NotificationsNoneIcon fontSize="small" sx={{ fontSize: 20 }} />
            </Badge>
          </IconButton>
          <NotificationPopover
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
            notifications={notifications}
            onMarkAllAsRead={handleMarkAllAsRead}
          />
        </Box>

        {/* Date Selector Button */}
        <Box sx={{ position: 'relative' }}>
          <Button
            onClick={() => setDateOpen(!dateOpen)}
            startIcon={<CalendarTodayIcon fontSize="small" sx={{ fontSize: 16 }} />}
            endIcon={<KeyboardArrowDownIcon fontSize="small" sx={{ fontSize: 18 }} />}
            sx={{
              height: 42,
              padding: '0 20px',
              borderRadius: '10px',
              border: '1px solid var(--mac-border-color)',
              backgroundColor: '#FFFFFF',
              color: 'var(--mac-text-primary)',
              fontSize: '14px',
              fontWeight: 400,
              textTransform: 'none',
              boxShadow: 'var(--mac-shadow-subtle)',
              transition: 'var(--mac-transition-fast)',
              '&:hover': {
                backgroundColor: 'var(--sakay-orange-soft)',
                color: 'var(--sakay-orange)',
                borderColor: 'var(--sakay-orange-border)',
              },
            }}
          >
            {formatDateLabel(selectedDate)}
          </Button>

          <DateCalendarPopover
            open={dateOpen}
            onClose={() => setDateOpen(false)}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </Box>
      </Box>
    </Box>
  );
};
