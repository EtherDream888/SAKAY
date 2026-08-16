import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  ButtonBase,
  Typography,
  Badge,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';

interface NavTabItem {
  key: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

export const DriverMobileAppShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  // Routes where the bottom tab navigation should be permanently visible
  const showBottomNav = [
    '/driver/home',
    '/driver/earnings',
    '/driver/notifications',
    '/driver/history',
    '/driver/profile',
  ].includes(currentPath);

  const tabs: NavTabItem[] = [
    {
      key: 'home',
      label: 'Home',
      path: '/driver/home',
      icon: <HomeIcon sx={{ fontSize: 22 }} />,
    },
    {
      key: 'earnings',
      label: 'Kita',
      path: '/driver/earnings',
      icon: <AccountBalanceWalletIcon sx={{ fontSize: 22 }} />,
    },
    {
      key: 'notifications',
      label: 'Abiso',
      path: '/driver/notifications',
      icon: (
        <Badge badgeContent={1} color="error" variant="dot">
          <NotificationsIcon sx={{ fontSize: 22 }} />
        </Badge>
      ),
    },
    {
      key: 'history',
      label: 'Biyahe',
      path: '/driver/history',
      icon: <HistoryIcon sx={{ fontSize: 22 }} />,
    },
    {
      key: 'profile',
      label: 'Profile',
      path: '/driver/profile',
      icon: <PersonIcon sx={{ fontSize: 22 }} />,
    },
  ];

  return (
    <Box className="app-container">
      <Box
        component="main"
        className="phone-simulator hide-scrollbar"
        id="driver-app-shell"
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: '#F8FAFC',
          }}
        >
          {/* Main Content Area */}
          <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Outlet />
          </Box>

          {/* Persistent Bottom Tab Navigation Bar */}
          {showBottomNav && (
            <Paper
              elevation={8}
              sx={{
                width: '100%',
                backgroundColor: '#FFFFFF',
                borderTop: '1px solid #E2E8F0',
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                paddingTop: '8px',
                paddingBottom: 'calc(var(--safe-area-bottom) + 8px)',
                paddingLeft: '6px',
                paddingRight: '6px',
                zIndex: 50,
                flexShrink: 0,
                boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.06)',
              }}
            >
              {tabs.map((tab) => {
                const isActive = currentPath === tab.path;
                return (
                  <ButtonBase
                    key={tab.key}
                    onClick={() => navigate(tab.path)}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px 0',
                      minHeight: '48px',
                      borderRadius: '12px',
                      color: isActive ? '#FF6B00' : '#64748B',
                      transition: 'all 0.18s ease-in-out',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 107, 0, 0.04)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: isActive ? 'scale(1.12)' : 'scale(1.0)',
                        transition: 'transform 0.18s ease',
                        color: isActive ? '#FF6B00' : '#64748B',
                      }}
                    >
                      {tab.icon}
                    </Box>
                    <Typography
                      sx={{
                        fontSize: '11px',
                        fontWeight: isActive ? 800 : 500,
                        color: isActive ? '#FF6B00' : '#64748B',
                        marginTop: '2px',
                        lineHeight: 1.2,
                      }}
                    >
                      {tab.label}
                    </Typography>
                  </ButtonBase>
                );
              })}
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default DriverMobileAppShell;
