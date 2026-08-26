import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, IconButton, Badge, Popover } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import LogoutIcon from '@mui/icons-material/Logout';

import { NotificationPopover } from '../popovers/NotificationPopover';
import { MOCK_NOTIFICATIONS } from '../../mockData/dashboardData';
import { CURRENT_ADMIN } from '../../mockData/adminData';
import { NotificationItem } from '../../types/admin';
import { useAuth } from '../../contexts/AuthContext';
import { LogoutConfirmModal } from '../admin/LogoutConfirmModal';

interface AdminHeaderProps {
  pageTitle?: string;
  pageSubtitle?: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  pageTitle = 'Dashboard',
  pageSubtitle = 'Overview of SAKAY operations in Calapan City',
}) => {
  const navigate = useNavigate();
  const { adminProfile, user, signOut } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [notifOpen, setNotifOpen] = useState(false);

  // Account Popover State
  const [accountAnchorEl, setAccountAnchorEl] = useState<null | HTMLElement>(null);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const adminName = adminProfile?.full_name || 'City Administrator';
  const adminEmail = adminProfile?.email || user?.email || 'admin@gmail.com';

  const handleSignOutConfirm = async () => {
    setLogoutModalOpen(false);
    setAccountAnchorEl(null);
    await signOut();
    navigate('/login', { replace: true });
  };

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
      {/* Left: Primary Page Title & Subtitle */}
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Typography
          variant="h1"
          sx={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--mac-text-primary)',
            letterSpacing: '-0.3px',
            lineHeight: 1.2,
          }}
        >
          {pageTitle}
        </Typography>
        {pageSubtitle && (
          <Typography
            sx={{
              fontSize: '12px',
              fontWeight: 400,
              color: 'var(--mac-text-muted)',
              lineHeight: 1.3,
              mt: '2px',
            }}
          >
            {pageSubtitle}
          </Typography>
        )}
      </Box>

      {/* Right: Global Sticky Header Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative' }}>
        {/* Notifications Icon Button */}
        <Box sx={{ position: 'relative' }}>
          <IconButton
            size="small"
            onClick={() => setNotifOpen(!notifOpen)}
            sx={{
              width: 38,
              height: 38,
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
              <NotificationsNoneIcon fontSize="small" sx={{ fontSize: 19 }} />
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
          startIcon={<HelpOutlineOutlinedIcon fontSize="small" sx={{ fontSize: 17 }} />}
          sx={{
            height: 38,
            padding: '0 16px',
            borderRadius: '10px',
            border: '1px solid var(--mac-border-color)',
            backgroundColor: '#FFFFFF',
            color: 'var(--mac-text-primary)',
            fontSize: '13.5px',
            fontWeight: 500,
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

        {/* Header Account Profile Control */}
        <Box>
          <Box
            onClick={(e) => setAccountAnchorEl(e.currentTarget)}
            sx={{
              height: 38,
              padding: '0 12px 0 10px',
              borderRadius: '10px',
              border: '1px solid var(--mac-border-color)',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: 1.2,
              cursor: 'pointer',
              boxShadow: 'var(--mac-shadow-subtle)',
              transition: 'var(--mac-transition-fast)',
              userSelect: 'none',
              '&:hover': {
                backgroundColor: 'var(--mac-canvas-bg)',
                borderColor: 'var(--mac-border-color)',
              },
            }}
          >
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: 'var(--sakay-orange-soft)',
                color: 'var(--sakay-orange)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {adminName.charAt(0).toUpperCase()}
            </Box>
            <Typography
              sx={{
                fontSize: '13.5px',
                fontWeight: 600,
                color: 'var(--mac-text-primary)',
                lineHeight: 1,
              }}
            >
              {adminName}
            </Typography>
            <KeyboardArrowDownIcon fontSize="small" sx={{ fontSize: 18, color: 'var(--mac-text-muted)', ml: -0.3 }} />
          </Box>

          {/* Account Popover Card */}
          <Popover
            open={Boolean(accountAnchorEl)}
            anchorEl={accountAnchorEl}
            onClose={() => setAccountAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
              paper: {
                sx: {
                  borderRadius: '14px',
                  border: '1px solid var(--mac-border-color)',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                  mt: 1,
                  width: 260,
                  padding: '16px',
                  backgroundColor: '#FFFFFF',
                },
              },
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Typography sx={{ fontSize: '15px', fontWeight: 700, color: 'var(--mac-text-primary)', lineHeight: 1.2 }}>
                  {adminName}
                </Typography>
                <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--sakay-orange)', mt: '2px' }}>
                  LGU Admin
                </Typography>
                <Typography sx={{ fontSize: '12.5px', color: 'var(--mac-text-muted)', mt: '2px', wordBreak: 'break-all' }}>
                  {adminEmail}
                </Typography>
              </Box>

              <Box sx={{ borderTop: '1px solid var(--mac-border-color)', pt: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => {
                    setAccountAnchorEl(null);
                    navigate('/settings');
                  }}
                  startIcon={<ManageAccountsIcon fontSize="small" />}
                  sx={{
                    borderRadius: '8px',
                    borderColor: 'var(--mac-border-color)',
                    color: 'var(--mac-text-primary)',
                    textTransform: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    justifyContent: 'flex-start',
                    py: 0.8,
                    '&:hover': {
                      backgroundColor: 'var(--sakay-orange-soft)',
                      borderColor: 'var(--sakay-orange-border)',
                      color: 'var(--sakay-orange)',
                    },
                  }}
                >
                  Manage Account
                </Button>

                <Button
                  fullWidth
                  variant="text"
                  color="error"
                  onClick={() => {
                    setAccountAnchorEl(null);
                    setLogoutModalOpen(true);
                  }}
                  startIcon={<LogoutIcon fontSize="small" />}
                  sx={{
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    justifyContent: 'flex-start',
                    py: 0.8,
                    color: '#DC2626',
                    '&:hover': {
                      backgroundColor: '#FEF2F2',
                    },
                  }}
                >
                  Log Out
                </Button>
              </Box>
            </Box>
          </Popover>
        </Box>
      </Box>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        open={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleSignOutConfirm}
      />
    </Box>
  );
};
