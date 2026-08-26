import React, { useState, useEffect } from 'react';
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
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

import appIcon from '@sakay/shared/assets/icons/app-icon.png';
import logoTextOrange from '@sakay/shared/assets/images/logo-text-orange.png';
import { MacTooltip } from '../common/MacTooltip';
import { StatusBadge } from '../common/StatusBadge';
import { MacCenterModal } from '../admin/MacCenterModal';
import { TodaProfile } from '../../types/toda';
import { fetchTodaProfile, fetchDriverApplicants } from '../../services/todaApiService';

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
  disabled?: boolean;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

// sidebar layout with collapsible width and fixed app icon header
export const TodaSidebar: React.FC<TodaSidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profile, setProfile] = useState<TodaProfile | null>(null);
  const [applicantCount, setApplicantCount] = useState<number>(0);

  useEffect(() => {
    fetchTodaProfile().then((p) => {
      if (p) setProfile(p);
    });
    fetchDriverApplicants().then((apps) => {
      setApplicantCount(apps ? apps.length : 0);
    });
  }, []);

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
        { id: 'driver-verification', label: 'Driver Verification', path: '/driver-verification', icon: <AssignmentIcon fontSize="small" />, badge: applicantCount > 0 ? applicantCount : undefined, badgeType: 'orange', disabled: profile?.accreditationStatus === 'Pending Verification' },
        { id: 'drivers', label: 'Driver Membership', path: '/drivers', icon: <PeopleIcon fontSize="small" />, disabled: profile?.accreditationStatus === 'Pending Verification' },
        { id: 'fleet', label: 'Tricycle Fleet', path: '/fleet', icon: <DirectionsCarIcon fontSize="small" />, disabled: profile?.accreditationStatus === 'Pending Verification' },
      ],
    },
    {
      groupTitle: 'COMMUNICATIONS',
      items: [
        { id: 'announcements', label: 'Announcements', path: '/announcements', icon: <CampaignIcon fontSize="small" />, disabled: profile?.accreditationStatus === 'Pending Verification' },
      ],
    },
    {
      groupTitle: 'PERFORMANCE & AUDIT',
      items: [
        { id: 'reports', label: 'TODA Reports & Incidents', path: '/reports', icon: <AssessmentIcon fontSize="small" />, disabled: profile?.accreditationStatus === 'Pending Verification' },
        { id: 'audit-logs', label: 'Audit Logs', path: '/audit-logs', icon: <SecurityIcon fontSize="small" />, disabled: profile?.accreditationStatus === 'Pending Verification' },
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

      {/* Header Logo Lockup with Explicit TODA ADMIN Pill */}
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
          {/* Logo Text Orange + TODA Admin Lockup */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              opacity: collapsed ? 0 : 1,
              maxWidth: collapsed ? 0 : 190,
              marginLeft: collapsed ? 0 : '10px',
              overflow: 'hidden',
              transition: 'opacity 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), max-width 0.32s cubic-bezier(0.2, 0.8, 0.2, 1), margin-left 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            <Box
              component="img"
              src={logoTextOrange}
              alt="SAKAY Logo"
              sx={{
                height: 22,
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
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                mt: '2px',
                lineHeight: 1,
              }}
            >
              TODA Admin
            </Typography>
          </Box>
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
                  (item.path === '/operations' && location.pathname === '/');

                const navContent = (
                  <Box
                    onClick={() => { if (!item.disabled) navigate(item.path); }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: collapsed ? 'center' : 'space-between',
                      width: collapsed ? 44 : '100%',
                      height: collapsed ? 44 : 46,
                      borderRadius: '12px',
                      padding: collapsed ? 0 : '0 12px 0 12px',
                      cursor: item.disabled ? 'not-allowed' : 'pointer',
                      flexShrink: 0,
                      margin: collapsed ? '0 auto' : 0,
                      background: isActive
                        ? 'linear-gradient(135deg, var(--sakay-orange) 0%, #ff8a47 100%)'
                        : 'transparent',
                      color: isActive ? '#FFFFFF' : item.disabled ? 'var(--mac-text-muted)' : 'var(--mac-text-primary)',
                      boxShadow: isActive ? '0 10px 24px rgba(255, 107, 26, 0.22)' : 'none',
                      transition: 'all 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)',
                      overflow: 'hidden',
                      opacity: item.disabled ? 0.5 : 1,
                      '&:hover': {
                        background: isActive
                          ? 'linear-gradient(135deg, var(--sakay-orange-hover) 0%, #ff8b46 100%)'
                          : item.disabled ? 'transparent' : 'rgba(17, 24, 39, 0.04)',
                        transform: item.disabled ? 'none' : 'translateX(1px)',
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
                      
                      {/* Nav Label Text — AMple Width so active text NEVER truncates */}
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
            T
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
              {profile?.officers.president || 'TODA Officer'}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: 'var(--sakay-orange)', fontWeight: 600, lineHeight: 1.2, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              {profile?.acronym || 'TODA'} • President
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Profile Modal */}
      <MacCenterModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="TODA Administrator Account Profile"
        subtitle="Active session credentials & authorized officer information"
        badge={<StatusBadge status="Active" />}
        maxWidth={620}
        primaryActionLabel="View Organization Details"
        onPrimaryAction={() => {
          setProfileModalOpen(false);
          navigate('/account');
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
                width: 60,
                height: 60,
                background: 'linear-gradient(135deg, var(--sakay-orange) 0%, #ff8a47 100%)',
                fontSize: '24px',
                fontWeight: 700,
                boxShadow: '0 10px 24px rgba(255, 107, 26, 0.22)',
              }}
            >
              T
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: '20px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                {profile?.officers.president || 'TODA President'}
              </Typography>
              <Typography sx={{ fontSize: '15px', color: 'var(--sakay-orange)', fontWeight: 600, mt: '2px' }}>
                TODA President — {profile?.name || 'TODA Association'}
              </Typography>
              <Typography sx={{ fontSize: '14px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                Authorized TODA Officer for SAKAY Platform Dispatch & Roster Oversight
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
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mb: '4px' }}>
                TODA Organization
              </Typography>
              <Typography sx={{ fontSize: '15.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                {profile?.name || 'Calapan Central TODA'} ({profile?.acronym || 'CCTODA'})
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mb: '4px' }}>
                Official Email
              </Typography>
              <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                {profile?.email || 'toda.calapan@gmail.com'}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mb: '4px' }}>
                Accreditation Permit Number
              </Typography>
              <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#1E8E3E' }}>
                #{profile?.accreditationNo || 'CAL-TODA-2024-001'}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', mb: '4px' }}>
                Terminal Jurisdiction
              </Typography>
              <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                {profile?.terminalLocation || 'Calapan City Corridor'} ({profile?.barangay || 'San Vicente Central'})
              </Typography>
            </Box>
          </Box>
        </Box>
      </MacCenterModal>
    </Box>
  );
};
