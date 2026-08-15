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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 4, 12));

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
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderBottom: '1px solid var(--mac-border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px 0 32px',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Typography
          variant="h1"
          sx={{
            fontSize: '30px',
            fontWeight: 700,
            color: 'var(--mac-text-primary)',
            letterSpacing: '-0.52px',
            lineHeight: 1.15,
          }}
        >
          {pageTitle}
        </Typography>
        {pageSubtitle && (
          <Typography
            sx={{
              fontSize: '14px',
              fontWeight: 400,
              color: 'var(--mac-text-muted)',
              lineHeight: 1.4,
              mt: '4px',
            }}
          >
            {pageSubtitle}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, position: 'relative' }}>
        <Box sx={{ position: 'relative' }}>
          <IconButton
            size="small"
            onClick={() => setNotifOpen(!notifOpen)}
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              border: '1px solid rgba(17, 24, 39, 0.08)',
              backgroundColor: 'rgba(255,255,255,0.8)',
              color: 'var(--mac-text-secondary)',
              boxShadow: 'var(--mac-shadow-subtle)',
              transition: 'var(--mac-transition-fast)',
              '&:hover': {
                backgroundColor: 'var(--sakay-orange-soft)',
                color: 'var(--sakay-orange)',
                borderColor: 'var(--sakay-orange-border)',
                transform: 'translateY(-1px)',
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

        <Button
          onClick={() => navigate('/tulong')}
          startIcon={<HelpOutlineOutlinedIcon fontSize="small" sx={{ fontSize: 18 }} />}
          sx={{
            height: 40,
            padding: '0 18px',
            borderRadius: '12px',
            border: '1px solid rgba(17, 24, 39, 0.08)',
            backgroundColor: 'rgba(255,255,255,0.8)',
            color: 'var(--mac-text-primary)',
            fontSize: '14px',
            fontWeight: 600,
            textTransform: 'none',
            boxShadow: 'var(--mac-shadow-subtle)',
            transition: 'var(--mac-transition-fast)',
            '&:hover': {
              backgroundColor: 'var(--sakay-orange-soft)',
              color: 'var(--sakay-orange)',
              borderColor: 'var(--sakay-orange-border)',
              transform: 'translateY(-1px)',
            },
          }}
        >
          Tulong
        </Button>

        <Box sx={{ position: 'relative' }}>
          <Button
            onClick={() => setDateOpen(!dateOpen)}
            startIcon={<CalendarTodayIcon fontSize="small" sx={{ fontSize: 16 }} />}
            endIcon={<KeyboardArrowDownIcon fontSize="small" sx={{ fontSize: 18 }} />}
            sx={{
              height: 40,
              padding: '0 18px',
              borderRadius: '12px',
              border: '1px solid rgba(17, 24, 39, 0.08)',
              backgroundColor: 'rgba(255,255,255,0.8)',
              color: 'var(--mac-text-primary)',
              fontSize: '14px',
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: 'var(--mac-shadow-subtle)',
              transition: 'var(--mac-transition-fast)',
              '&:hover': {
                backgroundColor: 'var(--sakay-orange-soft)',
                color: 'var(--sakay-orange)',
                borderColor: 'var(--sakay-orange-border)',
                transform: 'translateY(-1px)',
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
