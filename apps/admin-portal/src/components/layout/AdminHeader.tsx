import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, IconButton, Badge, Menu, MenuItem } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

import { NotificationPopover } from '../popovers/NotificationPopover';
import { MOCK_NOTIFICATIONS } from '../../mockData/dashboardData';
import { CURRENT_ADMIN, MOCK_LGU_ADMINS } from '../../mockData/adminData';
import { NotificationItem, LguAdminRole } from '../../types/admin';

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

  // Dev-only Role Switcher State
  const [currentRole, setCurrentRole] = useState<LguAdminRole>(CURRENT_ADMIN.role);
  const [roleAnchorEl, setRoleAnchorEl] = useState<null | HTMLElement>(null);

  const handleRoleChange = (newRole: LguAdminRole) => {
    CURRENT_ADMIN.role = newRole;
    const matchingAdmin = MOCK_LGU_ADMINS.find((a) => a.role === newRole);
    if (matchingAdmin) {
      CURRENT_ADMIN.name = matchingAdmin.name;
      CURRENT_ADMIN.email = matchingAdmin.email;
      CURRENT_ADMIN.id = matchingAdmin.id;
    }
    setCurrentRole(newRole);
    setRoleAnchorEl(null);
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

      {/* Right: Global Sticky Header Controls */}
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

        {/* Dev Role Switcher */}
        <Box>
          <Button
            onClick={(e) => setRoleAnchorEl(e.currentTarget)}
            startIcon={<AdminPanelSettingsIcon fontSize="small" sx={{ fontSize: 18, color: 'var(--sakay-orange)' }} />}
            endIcon={<KeyboardArrowDownIcon fontSize="small" sx={{ fontSize: 18 }} />}
            sx={{
              height: 42,
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
            Role: <strong style={{ marginLeft: 4, color: 'var(--sakay-orange)' }}>{currentRole}</strong>
          </Button>

          <Menu
            anchorEl={roleAnchorEl}
            open={Boolean(roleAnchorEl)}
            onClose={() => setRoleAnchorEl(null)}
            slotProps={{
              paper: {
                sx: {
                  borderRadius: '12px',
                  border: '1px solid var(--mac-border-color)',
                  boxShadow: 'var(--mac-shadow-popover)',
                  mt: 1,
                  minWidth: 240,
                },
              },
            }}
          >
            <Box sx={{ px: 2, py: 1, borderBottom: '1px solid var(--mac-border-color)' }}>
              <Typography sx={{ fontSize: '11px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Simulate Admin Role (Dev)
              </Typography>
            </Box>
            {(
              [
                'Super Administrator',
                'Verifier',
                'Incident Officer',
                'Fare Administrator',
                'Analytics Viewer',
              ] as LguAdminRole[]
            ).map((role) => (
              <MenuItem
                key={role}
                selected={currentRole === role}
                onClick={() => handleRoleChange(role)}
                sx={{
                  fontSize: '13.5px',
                  fontWeight: currentRole === role ? 600 : 400,
                  color: currentRole === role ? 'var(--sakay-orange)' : 'var(--mac-text-primary)',
                  py: 1,
                  px: 2,
                }}
              >
                {role}
              </MenuItem>
            ))}
          </Menu>
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
      </Box>
    </Box>
  );
};
