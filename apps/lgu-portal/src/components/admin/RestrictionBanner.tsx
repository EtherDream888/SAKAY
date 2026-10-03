import React from 'react';
import { Box, Typography } from '@mui/material';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

import { formatManilaDateTime } from '@sakay/shared/utils/restrictionUtils';
import type { AccountRestrictionKind } from '../../mockData/adminData';

interface RestrictionBannerProps {
  kind?: AccountRestrictionKind;
  suspendedUntil?: string;
  reason?: string;
}

/**
 * Shows an account's suspension / deactivation state as decided by the database.
 * Renders nothing for an unrestricted account.
 */
export const RestrictionBanner: React.FC<RestrictionBannerProps> = ({ kind, suspendedUntil, reason }) => {
  if (!kind) return null;

  const until = formatManilaDateTime(suspendedUntil);
  const headline =
    kind === 'CLOSED'
      ? 'Account Permanently Closed'
      : kind === 'DEACTIVATED'
        ? 'Account Deactivated — awaiting manual LGU review'
        : kind === 'INVESTIGATION'
          ? 'Account Suspended — pending investigation (no end date)'
          : until
            ? `Account Suspended until ${until}`
            : 'Account Suspended';

  return (
    <Box sx={{ mb: 4, backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', padding: '16px 20px', borderRadius: '12px' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <ReportProblemIcon sx={{ color: '#DC2626', fontSize: '17.6px' }} />
        <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#991B1B' }}>{headline}</Typography>
      </Box>
      {reason && (
        <Typography sx={{ fontSize: '11.2px', color: '#B91C1C', mt: '4px' }}>{reason}</Typography>
      )}
      {kind === 'SUSPENDED' && (
        <Typography sx={{ fontSize: '11.2px', color: '#B91C1C', mt: '4px' }}>
          The suspension lifts automatically when this period ends.
        </Typography>
      )}
    </Box>
  );
};
