import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { StatusType } from '../../types/toda';

interface StatusBadgeProps extends Omit<ChipProps, 'color'> {
  status: StatusType | string;
  label?: string;
}

// status badge colors for driver, application, and announcement states
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, sx, ...props }) => {
  const getStatusStyles = (statusStr: string) => {
    switch (statusStr) {
      case 'Approved':
      case 'Active':
      case 'Verified':
      case 'Resolved':
      case 'Valid':
      case 'Published':
      case 'Completed':
      case 'Resolved (TODA Level)':
        return {
          backgroundColor: 'rgba(52, 168, 83, 0.12)',
          color: '#1E8E3E',
          borderColor: 'rgba(52, 168, 83, 0.3)',
        };
      case 'Pending':
      case 'Pending Review':
      case 'Under Review':
      case 'Submitted':
      case 'TODA Review':
      case 'Pending Verification':
      case 'In Progress':
        return {
          backgroundColor: 'rgba(251, 188, 4, 0.15)',
          color: '#B06000',
          borderColor: 'rgba(251, 188, 4, 0.4)',
        };
      case 'TODA Endorsed':
      case 'Under Investigation':
      case 'Pending LGU Re-approval':
      case 'Endorsed':
        return {
          backgroundColor: 'rgba(21, 101, 192, 0.12)',
          color: '#1565C0',
          borderColor: 'rgba(21, 101, 192, 0.3)',
        };
      case 'Expiring Soon':
      case 'Resubmission Required':
      case 'Escalated to LGU':
      case 'Suspension Review':
      case 'Reactivation Review':
        return {
          backgroundColor: 'rgba(255, 107, 26, 0.14)',
          color: 'var(--sakay-orange)',
          borderColor: 'rgba(255, 107, 26, 0.4)',
        };
      case 'Dismissed':
      case 'Unpublished':
      case 'Draft':
      case 'Cancelled':
      case 'Not Registered':
      case 'Unregistered':
      case 'Roster Only':
        return {
          backgroundColor: 'rgba(100, 116, 139, 0.12)',
          color: '#475569',
          borderColor: 'rgba(100, 116, 139, 0.3)',
        };
      case 'Rejected':
      case 'Declined':
      case 'Suspended':
      case 'TODA Suspended':
      case 'LGU Deactivated':
      case 'Deactivated':
      case 'Inactive':
      case 'Unverified':
      case 'Expired':
        return {
          backgroundColor: 'rgba(234, 67, 53, 0.12)',
          color: '#D93025',
          borderColor: 'rgba(234, 67, 53, 0.3)',
        };
      default:
        return {
          backgroundColor: 'rgba(142, 142, 147, 0.12)',
          color: '#636366',
          borderColor: 'rgba(142, 142, 147, 0.3)',
        };
    }
  };

  const styles = getStatusStyles(status as string);

  return (
    <Chip
      label={label || status}
      size="small"
      variant="outlined"
      sx={{
        height: '24px',
        fontSize: '12px',
        fontWeight: 600,
        borderRadius: '6px',
        borderWidth: '1px',
        ...styles,
        ...sx,
      }}
      {...props}
    />
  );
};
