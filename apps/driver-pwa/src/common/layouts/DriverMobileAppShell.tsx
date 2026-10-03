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
import SettingsIcon from '@mui/icons-material/Settings';

import { useLanguage } from '../../utils/LanguageContext';
import { supabase } from '../../services/supabaseClient';
import { DriverSessionProvider } from '../../contexts/DriverSessionContext';
import { DriverIncomingRequestModal } from '../components/DriverIncomingRequestModal';
import SakayToast from '../components/SakayToast';

interface NavTabItem {
  key: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

export const DriverMobileAppShell: React.FC = () => {
  const { language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  // ── Global single-device session guard (Batch 2) ─────────────────────────
  const [sessionToastOpen, setSessionToastOpen] = React.useState(false);
  const [sessionToastMsg, setSessionToastMsg] = React.useState('');

  // AUTHENTICATED_PATHS: only guard routes where a driver should be logged in.
  const GUARDED_PATHS = [
    '/driver/home', '/driver/earnings', '/driver/notifications',
    '/driver/history', '/driver/profile', '/driver/settings',
    '/driver/navigation', '/driver/active-trip', '/driver/status',
    '/settings', '/profile', '/trip-history', '/trip-detail',
  ];

  React.useEffect(() => {
    const isGuarded = GUARDED_PATHS.some((p) => currentPath.startsWith(p));
    if (!isGuarded) return;

    const checkSessionMismatch = async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session?.user) return;

      const localToken = localStorage.getItem('sakay_driver_session_token');
      const { data: dbProfile } = await supabase
        .from('driver')
        .select('session_id')
        .eq('auth_user_id', sess.session.user.id)
        .maybeSingle();

      // If DB has a session_id and it doesn't match the local one → another device logged in
      if (dbProfile?.session_id && dbProfile.session_id !== localToken) {
        await supabase.auth.signOut();
        localStorage.removeItem('sakay_driver_session_token');
        localStorage.removeItem('sakay_driver_id');
        localStorage.removeItem('sakay_driver_profile');
        localStorage.removeItem('sakay_driver_phone');
        const msg = language === 'tl'
          ? 'Natapos ang inyong session dahil nag-login ang account sa ibang device. Mag-login muli.'
          : 'Your session was invalidated because the account logged in on another device. Please log in again.';
        setSessionToastMsg(msg);
        setSessionToastOpen(true);
        navigate('/driver/login', { replace: true });
      }
    };

    checkSessionMismatch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath]);
  // ─────────────────────────────────────────────────────────────────────────

  // Routes where the bottom tab navigation should be permanently visible
  const showBottomNav = [
    '/driver/home',
    '/driver/earnings',
    '/driver/notifications',
    '/driver/history',
    '/driver/settings',
    '/settings',
    '/driver/profile',
    '/profile',
  ].includes(currentPath);

  // Routes where we should enable the DriverSessionProvider (authenticated routes)
  const isDriverPortal = [
    '/driver/home',
    '/driver/earnings',
    '/driver/notifications',
    '/driver/history',
    '/driver/profile',
    '/driver/settings',
    '/driver/navigation',
    '/driver/active-trip'
  ].includes(currentPath);

  const [hasUnread, setHasUnread] = React.useState<boolean>(true);

  React.useEffect(() => {
    const checkUnread = () => {
      try {
        const stored = localStorage.getItem('sakay_driver_read_notifications');
        const localReadIds: string[] = stored ? JSON.parse(stored) : [];
        const defaultIds = ['dn1', 'dn2'];
        const unreadExists = defaultIds.some((id) => !localReadIds.includes(id));
        setHasUnread(unreadExists);
      } catch {
        setHasUnread(true);
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 1000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const tabs: NavTabItem[] = [
    {
      key: 'home',
      label: 'Home',
      path: '/driver/home',
      icon: <HomeIcon sx={{ fontSize: 22 }} />,
    },
    {
      key: 'earnings',
      label: language === 'tl' ? 'Kita' : 'Earnings',
      path: '/driver/earnings',
      icon: <AccountBalanceWalletIcon sx={{ fontSize: 22 }} />,
    },
    {
      key: 'notifications',
      label: language === 'tl' ? 'Abiso' : 'Alerts',
      path: '/driver/notifications',
      icon: (
        <Badge badgeContent={hasUnread ? 1 : 0} invisible={!hasUnread} color="error" variant="dot">
          <NotificationsIcon sx={{ fontSize: 22 }} />
        </Badge>
      ),
    },
    {
      key: 'history',
      label: language === 'tl' ? 'Biyahe' : 'Trips',
      path: '/driver/history',
      icon: <HistoryIcon sx={{ fontSize: 22 }} />,
    },
    {
      key: 'settings',
      label: language === 'tl' ? 'Mga Setting' : 'Settings',
      path: '/driver/settings',
      icon: <SettingsIcon sx={{ fontSize: 22 }} />,
    },
  ];

  const content = (
    <Box className="app-container">
      {/* Global Session-Invalidation Toast */}
      <SakayToast
        open={sessionToastOpen}
        message={sessionToastMsg}
        severity="error"
        onClose={() => setSessionToastOpen(false)}
      />
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

          {/* Global Incoming Request Modal */}
          {isDriverPortal && <DriverIncomingRequestModal />}
        </Box>
      </Box>
    </Box>
  );

  return isDriverPortal ? (
    <DriverSessionProvider>
      {content}
    </DriverSessionProvider>
  ) : (
    content
  );
};

export default DriverMobileAppShell;
