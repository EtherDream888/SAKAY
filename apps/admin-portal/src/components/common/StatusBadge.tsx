import React from 'react';
import { StatusType } from '../../types/admin';

interface StatusBadgeProps {
  status: StatusType;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    letterSpacing: '-0.1px',
  };

  switch (status) {
    case 'Approved':
    case 'Active':
    case 'Resolved':
      style = {
        ...style,
        backgroundColor: 'var(--mac-success-bg)',
        color: 'var(--mac-success-text)',
      };
      break;
    case 'Pending':
    case 'Under Review':
      style = {
        ...style,
        backgroundColor: 'var(--mac-warning-bg)',
        color: 'var(--mac-warning-text)',
      };
      break;
    case 'Rejected':
      style = {
        ...style,
        backgroundColor: 'var(--mac-danger-bg)',
        color: 'var(--mac-danger-text)',
      };
      break;
    case 'Suspended':
    default:
      style = {
        ...style,
        backgroundColor: 'var(--mac-neutral-bg)',
        color: 'var(--mac-neutral-text)',
      };
      break;
  }

  return <span style={style}>{status}</span>;
};
