import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, IconButton, Badge, Popover } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import LogoutIcon from '@mui/icons-material/Logout';

import { NotificationPopover } from '../popovers/NotificationPopover';
import { NotificationItem } from '../../types/admin';
import { useAuth } from '../../contexts/AuthContext';
import { LogoutConfirmModal } from '../admin/LogoutConfirmModal';
import { supabase } from '../../services/supabaseClient';

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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  // Helper: Format relative timestamp
  const formatRelativeTime = (dateStr?: string | null): string => {
    if (!dateStr) return 'Recent';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDays = Math.floor(diffHour / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Helper: Read IDs cache from localStorage
  const getReadNotifIds = (): Set<string> => {
    try {
      const raw = localStorage.getItem('sakay_lgu_read_notifs');
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set();
  };

  const saveReadNotifIds = (ids: string[]) => {
    try {
      const current = getReadNotifIds();
      ids.forEach((id) => current.add(id));
      localStorage.setItem('sakay_lgu_read_notifs', JSON.stringify(Array.from(current)));
    } catch {}
  };

  // Load real dynamic notifications from live database and operational tables
  useEffect(() => {
    let isMounted = true;
    const fetchNotifications = async () => {
      try {
        const readSet = getReadNotifIds();

        const [resubVerifs, endorsedVerifs, pendingTodas, notifsRes, logsRes] = await Promise.all([
          supabase
            .from('driver_verification')
            .select('verification_id, driver_id, submitted_full_name, remarks, submitted_at, updated_at')
            .ilike('remarks', '%resubmitted%')
            .order('submitted_at', { ascending: false })
            .limit(10),
          supabase
            .from('driver_verification')
            .select('verification_id, driver_id, submitted_full_name, remarks, endorsed_at, submitted_at')
            .in('verification_status', ['Approved', 'TODA Approved', 'TODA Endorsed'])
            .is('lgu_approved_at', null)
            .order('submitted_at', { ascending: false })
            .limit(5),
          supabase
            .from('toda')
            .select('toda_id, toda_name, toda_acronym, toda_status, account_status, created_at')
            .in('toda_status', ['Pending', 'Pending Accreditation', 'Under Review'])
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('notification')
            .select('*')
            .order('sent_at', { ascending: false })
            .limit(10),
          supabase
            .from('audit_log')
            .select('*')
            .order('performed_at', { ascending: false })
            .limit(5),
        ]);

        const items: NotificationItem[] = [];
        const seenIds = new Set<string>();

        // 1. Direct database notifications
        (notifsRes.data || []).forEach((n: any) => {
          const id = `db-${n.notification_id || n.id}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            const isRead = n.is_read || readSet.has(id);
            items.push({
              id,
              title: n.title,
              description: n.message,
              time: formatRelativeTime(n.sent_at),
              rawTimestamp: n.sent_at,
              category: n.notification_type?.toLowerCase().includes('resubmission') ? 'resubmission' : 'general',
              link: '/drivers',
              read: isRead,
              unread: !isRead,
              type: n.notification_type || 'alert',
            });
          }
        });

        // 2. Resubmitted driver applications
        (resubVerifs.data || []).forEach((v: any) => {
          const id = `resub-${v.verification_id}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            const ts = v.submitted_at || v.updated_at;
            const isRead = readSet.has(id);
            items.push({
              id,
              title: 'Driver Resubmitted Documents',
              description: `${v.submitted_full_name || 'Driver applicant'} resubmitted updated documents for Stage 2 review.`,
              time: formatRelativeTime(ts),
              rawTimestamp: ts,
              category: 'resubmission',
              link: '/drivers',
              read: isRead,
              unread: !isRead,
              type: 'resubmission',
            });
          }
        });

        // 3. TODA Endorsements awaiting LGU review
        (endorsedVerifs.data || []).forEach((v: any) => {
          if (v.remarks && v.remarks.toLowerCase().includes('resubmitted')) return;
          const id = `endorse-${v.verification_id}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            const ts = v.endorsed_at || v.submitted_at;
            const isRead = readSet.has(id);
            items.push({
              id,
              title: 'Driver Application Endorsed',
              description: `${v.submitted_full_name || 'Driver applicant'} endorsed by TODA for Stage 2 LGU inspection.`,
              time: formatRelativeTime(ts),
              rawTimestamp: ts,
              category: 'endorsement',
              link: '/drivers',
              read: isRead,
              unread: !isRead,
              type: 'endorsement',
            });
          }
        });

        // 4. Pending TODA accreditation applications
        (pendingTodas.data || []).forEach((t: any) => {
          const id = `toda-${t.toda_id}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            const isRead = readSet.has(id);
            items.push({
              id,
              title: 'TODA Accreditation Pending',
              description: `${t.toda_name || t.toda_acronym} submitted an application for LGU accreditation.`,
              time: formatRelativeTime(t.created_at),
              rawTimestamp: t.created_at,
              category: 'toda',
              link: '/toda',
              read: isRead,
              unread: !isRead,
              type: 'toda',
            });
          }
        });

        // 5. Recent audit activity
        (logsRes.data || []).forEach((log: any) => {
          const id = `log-${log.log_id}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            const timeVal = log.performed_at || log.created_at;
            const isRead = readSet.has(id);
            items.push({
              id,
              title: log.action_type ? log.action_type.replace(/_/g, ' ') : 'Administrative Activity',
              description: log.details || '',
              time: formatRelativeTime(timeVal),
              rawTimestamp: timeVal,
              category: 'system',
              link: '/audit-logs',
              read: isRead,
              unread: !isRead,
              type: (log.category || 'System').toLowerCase(),
            });
          }
        });

        items.sort((a, b) => new Date(b.rawTimestamp || 0).getTime() - new Date(a.rawTimestamp || 0).getTime());

        if (isMounted) {
          setNotifications(items);
        }
      } catch (err) {
        console.warn('[AdminHeader] Could not load notifications:', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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
    const allIds = notifications.map((n) => n.id);
    saveReadNotifIds(allIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false, read: true })));
  };

  const handleNotificationClick = (item: NotificationItem) => {
    saveReadNotifIds([item.id]);
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, unread: false, read: true } : n))
    );
    if (item.link) {
      navigate(item.link);
    }
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
            <Badge badgeContent={unreadCount} color="error" max={99}>
              <NotificationsNoneIcon fontSize="small" sx={{ fontSize: 19 }} />
            </Badge>
          </IconButton>
          <NotificationPopover
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
            notifications={notifications}
            onMarkAllAsRead={handleMarkAllAsRead}
            onNotificationClick={handleNotificationClick}
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
