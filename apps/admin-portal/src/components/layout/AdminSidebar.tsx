import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Avatar, IconButton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import BadgeIcon from '@mui/icons-material/Badge';
import PeopleIcon from '@mui/icons-material/People';
import NavigationIcon from '@mui/icons-material/Navigation';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';

import appIcon from '@sakay/shared/assets/icons/app-icon.png';
import logoTextOrange from '@sakay/shared/assets/images/logo-text-orange.png';
import { MacTooltip } from '../common/MacTooltip';

interface AdminSidebarProps {
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

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navGroups: NavGroup[] = [
    {
      groupTitle: 'MAIN',
      items: [
        { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon fontSize="small" /> },
      ],
    },
    {
      groupTitle: 'MANAGEMENT',
      items: [
        { id: 'toda-applications', label: 'TODA Applications', path: '/toda-applications', icon: <AssignmentIcon fontSize="small" />, badge: 12, badgeType: 'orange' },
        { id: 'accredited-todas', label: 'Accredited TODAs', path: '/accredited-todas', icon: <VerifiedUserIcon fontSize="small" /> },
        { id: 'drivers', label: 'Drivers', path: '/drivers', icon: <BadgeIcon fontSize="small" /> },
        { id: 'passengers', label: 'Passengers', path: '/passengers', icon: <PeopleIcon fontSize="small" /> },
      ],
    },
    {
      groupTitle: 'OPERATIONS',
      items: [
        { id: 'live-trips', label: 'Live Trips', path: '/live-trips', icon: <NavigationIcon fontSize="small" />, badge: '●', badgeType: 'green' },
        { id: 'incident-reports', label: 'Incident Reports', path: '/incident-reports', icon: <ReportProblemIcon fontSize="small" />, badge: 3, badgeType: 'orange' },
      ],
    },
    {
      groupTitle: 'ANALYTICS & REPORTS',
      items: [
        { id: 'reports', label: 'Reports', path: '/reports', icon: <AssessmentIcon fontSize="small" /> },
        { id: 'analytics', label: 'Analytics', path: '/analytics', icon: <BarChartIcon fontSize="small" /> },
      ],
    },
    {
      groupTitle: 'SYSTEM',
      items: [
        { id: 'settings', label: 'Settings', path: '/settings', icon: <SettingsIcon fontSize="small" /> },
        { id: 'audit-logs', label: 'Audit Logs', path: '/audit-logs', icon: <SecurityIcon fontSize="small" /> },
      ],
    },
  ];

  return (
    <Box
      component="aside"
      sx={{
        width: collapsed ? 74 : 255,
        height: '100vh',
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderRight: '1px solid var(--mac-border-color)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        flexShrink: 0,
        transition: 'var(--mac-sidebar-transition)',
        zIndex: 90,
        userSelect: 'none',
        boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.6)',
      }}
    >
      <IconButton
        onClick={onToggleCollapse}
        size="small"
        sx={{
          position: 'absolute',
          top: 'calc(var(--mac-header-height) / 2)',
          transform: 'translateY(-50%)',
          right: -13,
          width: 28,
          height: 28,
          backgroundColor: 'rgba(255,255,255,0.9)',
          border: '1px solid rgba(17, 24, 39, 0.08)',
          boxShadow: 'var(--mac-shadow-subtle)',
          color: 'var(--mac-text-secondary)',
          zIndex: 100,
          '&:hover': {
            backgroundColor: 'var(--mac-canvas-bg)',
            color: 'var(--mac-text-primary)',
            transform: 'translateY(-50%) scale(1.04)',
          },
        }}
      >
        {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
      </IconButton>

      <Box
        sx={{
          height: 'var(--mac-header-height)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 18px 0 20px',
          borderBottom: '1px solid var(--mac-border-color)',
        }}
      >
        {collapsed ? (
          <Box
            component="img"
            src={appIcon}
            alt="SAKAY Icon"
            sx={{ width: 30, height: 30, objectFit: 'contain' }}
          />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              component="img"
              src={logoTextOrange}
              alt="SAKAY Logo"
              sx={{ height: 26, objectFit: 'contain' }}
            />
          </Box>
        )}
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: collapsed ? 'center' : 'stretch',
          padding: collapsed ? '14px 0' : '16px 14px',
        }}
      >
        {navGroups.map((group, groupIdx) => (
          <Box
            key={group.groupTitle}
            sx={{
              mb: 2.5,
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              alignItems: collapsed ? 'center' : 'stretch',
            }}
          >
            {!collapsed ? (
              <Typography
                sx={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--mac-text-muted)',
                  letterSpacing: '0.12em',
                  padding: '6px 10px 8px',
                  textTransform: 'uppercase',
                }}
              >
                {group.groupTitle}
              </Typography>
            ) : (
              groupIdx > 0 && (
                <Box
                  sx={{
                    width: '28px',
                    height: '1px',
                    backgroundColor: 'var(--mac-divider)',
                    margin: '6px auto',
                  }}
                />
              )
            )}

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                alignItems: collapsed ? 'center' : 'stretch',
                gap: '5px',
              }}
            >
              {group.items.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path === '/dashboard' && location.pathname === '/');

                return (
                  <MacTooltip key={item.id} title={item.label} disabled={!collapsed}>
                    <Box
                      onClick={() => navigate(item.path)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'space-between',
                        width: collapsed ? 42 : '100%',
                        height: collapsed ? 42 : 44,
                        borderRadius: collapsed ? '12px' : '12px',
                        padding: collapsed ? '0' : '0 12px 0 10px',
                        cursor: 'pointer',
                        flexShrink: 0,
                        background: isActive
                          ? 'linear-gradient(135deg, var(--sakay-orange) 0%, #ff8a47 100%)'
                          : 'transparent',
                        color: isActive ? '#FFFFFF' : 'var(--mac-text-primary)',
                        boxShadow: isActive ? '0 10px 24px rgba(255, 107, 26, 0.22)' : 'none',
                        transition: 'var(--mac-transition-fast)',
                        '&:hover': {
                          background: isActive
                            ? 'linear-gradient(135deg, var(--sakay-orange-hover) 0%, #ff8b46 100%)'
                            : 'rgba(17, 24, 39, 0.04)',
                          transform: 'translateX(1px)',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
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
                              fontSize: '14.5px',
                              fontWeight: isActive ? 700 : 500,
                              letterSpacing: '-0.08px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.label}
                          </Typography>
                        )}
                      </Box>

                      {!collapsed && item.badge !== undefined && (
                        <Box
                          sx={{
                            backgroundColor:
                              item.badgeType === 'green'
                                ? 'transparent'
                                : isActive
                                ? 'rgba(255, 255, 255, 0.22)'
                                : 'var(--sakay-orange-soft)',
                            color:
                              item.badgeType === 'green'
                                ? '#30a46c'
                                : isActive
                                ? '#FFFFFF'
                                : 'var(--sakay-orange)',
                            fontSize: item.badgeType === 'green' ? '13px' : '11.5px',
                            fontWeight: 700,
                            padding: item.badgeType === 'green' ? '0' : '3px 8px',
                            borderRadius: '999px',
                            minWidth: item.badgeType === 'green' ? 'auto' : '26px',
                            textAlign: 'center',
                          }}
                        >
                          {item.badge}
                        </Box>
                      )}
                    </Box>
                  </MacTooltip>
                );
              })}
            </Box>
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          height: 64,
          flexShrink: 0,
          borderTop: '1px solid var(--mac-border-color)',
          padding: collapsed ? '0' : '0 14px 0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          background: 'rgba(250,250,252,0.74)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Avatar
            sx={{
              width: 32,
              height: 32,
              background: 'linear-gradient(135deg, var(--sakay-orange) 0%, #ff8a47 100%)',
              fontSize: '12.5px',
              fontWeight: 700,
              boxShadow: '0 10px 18px rgba(255, 107, 26, 0.18)',
            }}
          >
            LA
          </Avatar>
          {!collapsed && (
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '14px', color: 'var(--mac-text-primary)', lineHeight: 1.2 }}>
                LGU Admin
              </Typography>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', lineHeight: 1.2 }}>
                Calapan City LGU
              </Typography>
            </Box>
          )}
        </Box>
        {!collapsed && <UnfoldMoreIcon fontSize="small" sx={{ color: 'var(--mac-text-muted)' }} />}
      </Box>
    </Box>
  );
};
