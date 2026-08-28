import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { StatusType } from '../../types/admin';

interface StatusBadgeProps extends Omit<ChipProps, 'color'> {
  status: StatusType | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, sx, ...props }) => {
  const getStatusStyles = (status: StatusType | string) => {
    switch (status) {
      case 'Approved':
      case 'Active':
      case 'Verified':
      case 'Resolved':
      case 'Valid':
      case 'Published':
        return {
          backgroundColor: 'rgba(52, 168, 83, 0.12)',
          color: '#1E8E3E',
          borderColor: 'rgba(52, 168, 83, 0.3)',
        };
      case 'Pending':
      case 'Pending Review':
      case 'Under Review':
        return {
          backgroundColor: 'rgba(251, 188, 4, 0.15)',
          color: '#B06000',
          borderColor: 'rgba(251, 188, 4, 0.4)',
        };
      case 'Under Investigation':
        return {
          backgroundColor: 'rgba(21, 101, 192, 0.12)',
          color: '#1565C0',
          borderColor: 'rgba(21, 101, 192, 0.3)',
        };
      case 'Expiring Soon':
      case 'Resubmission Required':
      case 'Pending Password Reset':
        return {
          backgroundColor: 'rgba(255, 149, 0, 0.14)',
          color: '#C25E00',
          borderColor: 'rgba(255, 149, 0, 0.4)',
        };
      case 'Dismissed':
      case 'Unpublished':
      case 'Draft':
      case 'Cancelled':
      case 'Not Registered':
      case 'Unregistered':
      case 'Roster Only':
      case 'Superseded':
        return {
          backgroundColor: 'rgba(100, 116, 139, 0.12)',
          color: '#475569',
          borderColor: 'rgba(100, 116, 139, 0.3)',
        };
      case 'Rejected':
      case 'Declined':
      case 'Suspended':
      case 'Inactive':
      case 'Unverified':
      case 'Expired':
      case 'Deactivated':
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

  const styles = getStatusStyles(status);

  return (
    <Chip
      label={status}
      size="small"
      variant="outlined"
      sx={{
        height: '24px',
        fontSize: '9.6px',
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
