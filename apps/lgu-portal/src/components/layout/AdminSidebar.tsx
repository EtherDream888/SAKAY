import React, { useState } from 'react';
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
import SecurityIcon from '@mui/icons-material/Security';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import CampaignIcon from '@mui/icons-material/Campaign';
import PaidIcon from '@mui/icons-material/Paid';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';

import appIcon from '@sakay/shared/assets/icons/app-icon.png';
import logoTextOrange from '@sakay/shared/assets/images/logo-text-orange.png';
import { MacTooltip } from '../common/MacTooltip';
import { StatusBadge } from '../common/StatusBadge';
import { MacCenterModal } from '../admin/MacCenterModal';
import { CURRENT_ADMIN } from '../../mockData/adminData';

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
  const [profileModalOpen, setProfileModalOpen] = useState(false);

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
        { id: 'announcements', label: 'Announcements', path: '/announcements', icon: <CampaignIcon fontSize="small" /> },
      ],
    },
    {
      groupTitle: 'MUNICIPAL POLICY',
      items: [
        { id: 'fare-configuration', label: 'Fare Configuration', path: '/fare-configuration', icon: <PaidIcon fontSize="small" /> },
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
        { id: 'settings', label: 'Admin Accounts', path: '/settings', icon: <ManageAccountsIcon fontSize="small" /> },
        { id: 'audit-logs', label: 'Audit Logs', path: '/audit-logs', icon: <SecurityIcon fontSize="small" /> },
      ],
    },
  ];

  return (
    <Box
      component="aside"
      sx={{
        width: collapsed ? 74 : 275,
        height: '100vh',
        background: 'rgba(255, 255, 255, 0.88)',
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
      {/* Sidebar Collapse Toggle Button */}
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
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--mac-border-color)',
          boxShadow: 'var(--mac-shadow-subtle)',
          color: 'var(--mac-text-secondary)',
          zIndex: 100,
          transition: 'all 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)',
          '&:hover': {
            backgroundColor: 'var(--sakay-orange-soft)',
            color: 'var(--sakay-orange)',
            borderColor: 'var(--sakay-orange-border)',
            transform: 'translateY(-50%) scale(1.08)',
          },
        }}
      >
        {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
      </IconButton>

      {/* Header Logo Lockup */}
      <Box
        sx={{
          height: 'var(--mac-header-height)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 18px 0 20px',
          borderBottom: '1px solid var(--mac-border-color)',
          overflow: 'hidden',
          transition: 'padding 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)',
          width: '100%',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            width: '100%',
          }}
        >
          {/* App Icon — FIXED EXACT SAME SIZE (28px x 28px) ALWAYS */}
          <Box
            component="img"
            src={appIcon}
            alt="SAKAY App Icon"
            sx={{
              width: 28,
              height: 28,
              minWidth: 28,
              minHeight: 28,
              objectFit: 'contain',
              flexShrink: 0,
            }}
          />
          {/* Logo Text Orange */}
          <Box
            component="img"
            src={logoTextOrange}
            alt="SAKAY Logo"
            sx={{
              height: 24,
              objectFit: 'contain',
              opacity: collapsed ? 0 : 1,
              maxWidth: collapsed ? 0 : 180,
              marginLeft: collapsed ? 0 : '10px',
              overflow: 'hidden',
              transition: 'opacity 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), max-width 0.32s cubic-bezier(0.2, 0.8, 0.2, 1), margin-left 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          />
        </Box>
      </Box>

      {/* Nav Groups Container */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: collapsed ? 'center' : 'stretch',
          padding: collapsed ? '14px 0' : '16px 14px',
          transition: 'padding 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)',
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
            {/* Section Header Title */}
            <Typography
              sx={{
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--mac-text-muted)',
                letterSpacing: '0.12em',
                padding: collapsed ? '0' : '6px 10px 8px',
                textTransform: 'uppercase',
                opacity: collapsed ? 0 : 1,
                maxHeight: collapsed ? 0 : 30,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                transition: 'opacity 0.18s ease, max-height 0.32s cubic-bezier(0.2, 0.8, 0.2, 1), padding 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            >
              {group.groupTitle}
            </Typography>

            {collapsed && groupIdx > 0 && (
              <Box
                sx={{
                  width: '28px',
                  height: '1px',
                  backgroundColor: 'var(--mac-divider)',
                  margin: '6px auto',
                  transition: 'opacity 0.2s ease',
                }}
              />
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

                const navContent = (
                  <Box
                    onClick={() => navigate(item.path)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: collapsed ? 'center' : 'space-between',
                      width: collapsed ? 44 : '100%',
                      height: collapsed ? 44 : 46,
                      borderRadius: '12px',
                      padding: collapsed ? 0 : '0 12px 0 12px',
                      cursor: 'pointer',
                      flexShrink: 0,
                      margin: collapsed ? '0 auto' : 0,
                      background: isActive
                        ? 'linear-gradient(135deg, var(--sakay-orange) 0%, #ff8a47 100%)'
                        : 'transparent',
                      color: isActive ? '#FFFFFF' : 'var(--mac-text-primary)',
                      boxShadow: isActive ? '0 10px 24px rgba(255, 107, 26, 0.22)' : 'none',
                      transition: 'all 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)',
                      overflow: 'hidden',
                      '&:hover': {
                        background: isActive
                          ? 'linear-gradient(135deg, var(--sakay-orange-hover) 0%, #ff8b46 100%)'
                          : 'rgba(17, 24, 39, 0.04)',
                        transform: 'translateX(1px)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        width: collapsed ? '100%' : 'auto',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isActive ? '#FFFFFF' : 'var(--mac-text-secondary)',
                          flexShrink: 0,
                          width: collapsed ? '100%' : 'auto',
                        }}
                      >
                        {item.icon}
                      </Box>
                      
                      {/* Nav Label Text */}
                      <Typography
                        sx={{
                          fontSize: '15px',
                          fontWeight: isActive ? 700 : 500,
                          letterSpacing: '-0.01em',
                          whiteSpace: 'nowrap',
                          opacity: collapsed ? 0 : 1,
                          maxWidth: collapsed ? 0 : 190,
                          marginLeft: collapsed ? 0 : '10px',
                          overflow: 'hidden',
                          transition: 'opacity 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), max-width 0.32s cubic-bezier(0.2, 0.8, 0.2, 1), margin-left 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        }}
                      >
                        {item.label}
                      </Typography>
                    </Box>

                    {/* Nav Item Badge */}
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
                          fontSize: item.badgeType === 'green' ? '14px' : '12px',
                          fontWeight: 700,
                          padding: item.badgeType === 'green' ? '0' : '3px 8px',
                          borderRadius: '999px',
                          minWidth: item.badgeType === 'green' ? 'auto' : '26px',
                          textAlign: 'center',
                          opacity: 1,
                          maxWidth: 40,
                          marginLeft: '6px',
                          overflow: 'hidden',
                          flexShrink: 0,
                          transition: 'opacity 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        }}
                      >
                        {item.badge}
                      </Box>
                    )}
                  </Box>
                );

                return collapsed ? (
                  <MacTooltip key={item.id} title={item.label}>
                    {navContent}
                  </MacTooltip>
                ) : (
                  <React.Fragment key={item.id}>{navContent}</React.Fragment>
                );
              })}
            </Box>
          </Box>
        ))}
      </Box>

      {/* Footer Profile Box */}
      <Box
        onClick={() => setProfileModalOpen(true)}
        sx={{
          height: 68,
          flexShrink: 0,
          borderTop: '1px solid var(--mac-border-color)',
          padding: collapsed ? 0 : '0 14px 0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          background: 'rgba(250,250,252,0.74)',
          overflow: 'hidden',
          transition: 'all 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)',
          width: '100%',
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'var(--sakay-orange-soft)',
            '& .MuiAvatar-root': {
              transform: 'scale(1.06)',
            },
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              background: 'linear-gradient(135deg, var(--sakay-orange) 0%, #ff8a47 100%)',
              fontSize: '14px',
              fontWeight: 700,
              boxShadow: '0 10px 18px rgba(255, 107, 26, 0.18)',
              flexShrink: 0,
              transition: 'transform 0.2s ease',
            }}
          >
            {CURRENT_ADMIN.name.charAt(0)}
          </Avatar>
          <Box
            sx={{
              maxWidth: collapsed ? 0 : 180,
              opacity: collapsed ? 0 : 1,
              marginLeft: collapsed ? 0 : '10px',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              transition: 'opacity 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), max-width 0.32s cubic-bezier(0.2, 0.8, 0.2, 1), margin-left 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: '14px', color: 'var(--mac-text-primary)', lineHeight: 1.2, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              {CURRENT_ADMIN.name}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: 'var(--sakay-orange)', fontWeight: 600, lineHeight: 1.2, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              {CURRENT_ADMIN.role}
            </Typography>
          </Box>
        </Box>
        {!collapsed && (
          <UnfoldMoreIcon
            fontSize="small"
            sx={{
              color: 'var(--mac-text-muted)',
              opacity: collapsed ? 0 : 1,
              transition: 'opacity 0.2s ease',
            }}
          />
        )}
      </Box>

      {/* Admin Profile Details macOS Centered Modal */}
      <MacCenterModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="LGU Administrator Profile"
        subtitle="Active session credentials & role permissions for Calapan City LGU"
        badge={<StatusBadge status="Active" />}
        maxWidth={580}
        primaryActionLabel="Manage Admin Accounts"
        onPrimaryAction={() => {
          setProfileModalOpen(false);
          navigate('/settings');
        }}
        secondaryActionLabel="Close"
        onSecondaryAction={() => setProfileModalOpen(false)}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2.5,
              backgroundColor: '#FAFAFC',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--mac-border-color)',
            }}
          >
            <Avatar
              sx={{
                width: 56,
                height: 56,
                background: 'linear-gradient(135deg, var(--sakay-orange) 0%, #ff8a47 100%)',
                fontSize: '22px',
                fontWeight: 700,
                boxShadow: '0 10px 24px rgba(255, 107, 26, 0.22)',
              }}
            >
              {CURRENT_ADMIN.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: '18px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                {CURRENT_ADMIN.name}
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: 'var(--sakay-orange)', fontWeight: 600, mt: '2px' }}>
                {CURRENT_ADMIN.role}
              </Typography>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                Calapan City Local Government Unit Transport Oversight
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 2,
              backgroundColor: '#F5F5F7',
              padding: '18px 20px',
              borderRadius: '12px',
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>
                Administrator ID
              </Typography>
              <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                {CURRENT_ADMIN.id}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>
                Official Municipal Email
              </Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                {CURRENT_ADMIN.email}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>
                Assigned Jurisdiction
              </Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                Calapan City (All Barangays)
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', mb: '4px' }}>
                Security Access Tier
              </Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#2E7D32' }}>
                Tier 1 (LGU Executive Officer)
              </Typography>
            </Box>
          </Box>
        </Box>
      </MacCenterModal>
    </Box>
  );
};
