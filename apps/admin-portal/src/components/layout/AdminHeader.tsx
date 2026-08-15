import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, IconButton, Badge } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

import { NotificationPopover } from '../popovers/NotificationPopover';
import { DateCalendarPopover } from '../popovers/DateCalendarPopover';
import { MOCK_NOTIFICATIONS } from '../../mockData/dashboardData';
import { NotificationItem } from '../../types/admin';

interface AdminHeaderProps {
  pageTitle?: string;
  pageSubtitle?: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  pageTitle = 'Dashboard',
  pageSubtitle = 'Overview of SAKAY operations in Calapan City',
}) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
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
            fontSize: '28px',
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
              fontSize: '14.5px',
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

      {/* Right: macOS Toolbar Controls with Increased Up/Down Padding and Regular (Non-Bold) Font Weight */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative' }}>
        {/* Notifications Icon Button */}
        <Box sx={{ position: 'relative' }}>
          <IconButton
            size="small"
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

        {/* Tulong Action Button */}
        <Button
          onClick={() => navigate('/tulong')}
          startIcon={<HelpOutlineOutlinedIcon fontSize="small" sx={{ fontSize: 18 }} />}
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
          Tulong
        </Button>

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
