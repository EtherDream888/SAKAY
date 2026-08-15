import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { StatusType } from '../../types/admin';

interface StatusBadgeProps extends Omit<ChipProps, 'color'> {
  status: StatusType;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, sx, ...props }) => {
  const getStatusStyles = (status: StatusType) => {
    switch (status) {
      case 'Approved':
      case 'Active':
      case 'Verified':
      case 'Resolved':
      case 'Valid':
        return {
          backgroundColor: 'rgba(52, 168, 83, 0.12)',
          color: '#1E8E3E',
          borderColor: 'rgba(52, 168, 83, 0.3)',
        };
      case 'Pending':
      case 'Under Review':
        return {
          backgroundColor: 'rgba(251, 188, 4, 0.15)',
          color: '#B06000',
          borderColor: 'rgba(251, 188, 4, 0.4)',
        };
      case 'Expiring Soon':
      case 'Resubmission Required':
        return {
          backgroundColor: 'rgba(255, 149, 0, 0.14)',
          color: '#C25E00',
          borderColor: 'rgba(255, 149, 0, 0.4)',
        };
      case 'Rejected':
      case 'Declined':
      case 'Suspended':
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

  const styles = getStatusStyles(status);

  return (
    <Chip
      label={status}
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
