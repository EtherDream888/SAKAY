import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Avatar, IconButton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import CampaignIcon from '@mui/icons-material/Campaign';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SecurityIcon from '@mui/icons-material/Security';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';

import appIcon from '@sakay/shared/assets/icons/app-icon.png';
import logoTextOrange from '@sakay/shared/assets/images/logo-text-orange.png';
import { MacTooltip } from '../common/MacTooltip';
import { CURRENT_TODA_PROFILE, CURRENT_TODA_ADMIN } from '../../mockData/todaData';

interface TodaSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number | string;
  badgeType?: 'orange' | 'green';
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

export const TodaSidebar: React.FC<TodaSidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navGroups: NavGroup[] = [
    {
      groupTitle: 'MAIN',
      items: [
        { id: 'operations', label: 'Operations Monitoring', path: '/operations', icon: <DashboardIcon fontSize="small" /> },
      ],
    },
    {
      groupTitle: 'DRIVERS & FLEET',
      items: [
        { id: 'driver-verification', label: 'Driver Verification', path: '/driver-verification', icon: <AssignmentIcon fontSize="small" />, badge: 4, badgeType: 'orange' },
        { id: 'drivers', label: 'Driver Membership', path: '/drivers', icon: <PeopleIcon fontSize="small" /> },
      ],
    },
    {
      groupTitle: 'COMMUNICATIONS',
      items: [
        { id: 'announcements', label: 'Announcements', path: '/announcements', icon: <CampaignIcon fontSize="small" /> },
      ],
    },
    {
      groupTitle: 'PERFORMANCE & AUDIT',
      items: [
        { id: 'reports', label: 'TODA Reports & Incidents', path: '/reports', icon: <AssessmentIcon fontSize="small" /> },
        { id: 'audit-logs', label: 'Audit Logs', path: '/audit-logs', icon: <SecurityIcon fontSize="small" /> },
      ],
    },
    {
      groupTitle: 'ORGANIZATION',
      items: [
        { id: 'account', label: 'Account & Accreditation', path: '/account', icon: <ManageAccountsIcon fontSize="small" /> },
      ],
    },
  ];

  return (
    <Box
      component="aside"
      sx={{
        width: collapsed ? 74 : 260,
        height: '100vh',
        background: 'rgba(255,255,255,0.74)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderRight: '1px solid var(--mac-border-color)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        flexShrink: 0,
        transition: 'var(--mac-sidebar-transition)',
        zIndex: 90,
      }}
    >
      {/* Brand Header */}
      <Box
        sx={{
          height: 'var(--mac-header-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0' : '0 20px 0 16px',
          borderBottom: '1px solid var(--mac-border-color)',
          flexShrink: 0,
        }}
      >
        <Box
          onClick={() => navigate('/operations')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            cursor: 'pointer',
            overflow: 'hidden',
          }}
        >
          <Box
            component="img"
            src={appIcon}
            alt="SAKAY Icon"
            sx={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              objectFit: 'contain',
              flexShrink: 0,
            }}
          />
          {!collapsed && (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Box
                component="img"
                src={logoTextOrange}
                alt="SAKAY"
                sx={{
                  height: 18,
                  width: 'auto',
                  objectFit: 'contain',
                  alignSelf: 'flex-start',
                }}
              />
              <Typography
                sx={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--sakay-orange)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  mt: '2px',
                }}
              >
                TODA Admin Portal
              </Typography>
            </Box>
          )}
        </Box>

        {!collapsed && (
          <IconButton
            onClick={onToggleCollapse}
            size="small"
            sx={{
              color: 'var(--mac-text-muted)',
              backgroundColor: 'var(--mac-canvas-bg)',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.06)',
                color: 'var(--mac-text-primary)',
              },
            }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Re-expand button when collapsed */}
      {collapsed && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
          <IconButton
            onClick={onToggleCollapse}
            size="small"
            sx={{
              color: 'var(--mac-text-muted)',
              '&:hover': { color: 'var(--sakay-orange)' },
            }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* Navigation Links */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          padding: collapsed ? '12px 6px' : '16px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {navGroups.map((group) => (
          <Box key={group.groupTitle}>
            {!collapsed && (
              <Typography
                sx={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: 'var(--mac-text-tertiary)',
                  letterSpacing: '0.08em',
                  padding: '0 12px 6px',
                  textTransform: 'uppercase',
                }}
              >
                {group.groupTitle}
              </Typography>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {group.items.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path === '/operations' && location.pathname === '/');

                const content = (
                  <Box
                    onClick={() => navigate(item.path)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: collapsed ? 'center' : 'space-between',
                      padding: collapsed ? '10px 0' : '9px 12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'var(--mac-transition-fast)',
                      backgroundColor: isActive ? 'var(--sakay-orange)' : 'transparent',
                      color: isActive ? '#FFFFFF' : 'var(--mac-text-primary)',
                      '&:hover': {
                        backgroundColor: isActive
                          ? 'var(--sakay-orange)'
                          : 'rgba(255, 107, 26, 0.08)',
                        color: isActive ? '#FFFFFF' : 'var(--sakay-orange)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isActive ? '#FFFFFF' : 'var(--mac-text-secondary)',
                        }}
                      >
                        {item.icon}
                      </Box>
                      {!collapsed && (
                        <Typography
                          sx={{
                            fontSize: '13.5px',
                            fontWeight: isActive ? 600 : 500,
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {item.label}
                        </Typography>
                      )}
                    </Box>

                    {!collapsed && item.badge && (
                      <Box
                        sx={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          backgroundColor: isActive
                            ? 'rgba(255, 255, 255, 0.24)'
                            : item.badgeType === 'green'
                            ? '#E6F4EA'
                            : 'var(--sakay-orange-soft)',
                          color: isActive
                            ? '#FFFFFF'
                            : item.badgeType === 'green'
                            ? '#1E8E3E'
                            : 'var(--sakay-orange)',
                        }}
                      >
                        {item.badge}
                      </Box>
                    )}
                  </Box>
                );

                return collapsed ? (
                  <MacTooltip key={item.id} title={item.label} placement="right">
                    {content}
                  </MacTooltip>
                ) : (
                  <React.Fragment key={item.id}>{content}</React.Fragment>
                );
              })}
            </Box>
          </Box>
        ))}
      </Box>

      {/* Footer Profile Card */}
      <Box
        sx={{
          height: 68,
          flexShrink: 0,
          borderTop: '1px solid var(--mac-border-color)',
          padding: collapsed ? '0' : '0 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          background: 'rgba(250,250,252,0.74)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Avatar
            sx={{
              width: 34,
              height: 34,
              background: 'linear-gradient(135deg, var(--sakay-orange) 0%, #ff8a47 100%)',
              fontSize: '13px',
              fontWeight: 700,
              boxShadow: '0 8px 16px rgba(255, 107, 26, 0.2)',
            }}
          >
            {CURRENT_TODA_ADMIN.name.charAt(0)}
          </Avatar>
          {!collapsed && (
            <Box sx={{ maxWidth: 160, overflow: 'hidden' }}>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: '13px',
                  color: 'var(--mac-text-primary)',
                  lineHeight: 1.2,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {CURRENT_TODA_ADMIN.name}
              </Typography>
              <Typography
                sx={{
                  fontSize: '11px',
                  color: 'var(--sakay-orange)',
                  fontWeight: 600,
                  lineHeight: 1.2,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {CURRENT_TODA_PROFILE.acronym} • {CURRENT_TODA_ADMIN.role}
              </Typography>
            </Box>
          )}
        </Box>
        {!collapsed && <UnfoldMoreIcon fontSize="small" sx={{ color: 'var(--mac-text-muted)' }} />}
      </Box>
    </Box>
  );
};
