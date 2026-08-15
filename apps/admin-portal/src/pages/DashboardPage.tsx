import React from 'react';
import { Box } from '@mui/material';
import { WelcomeHeader } from '../components/layout/WelcomeHeader';
import { SummaryCard } from '../components/dashboard/SummaryCard';
import { BookingTrendCard } from '../components/dashboard/BookingTrendCard';
import { LiveTripsMapCard } from '../components/dashboard/LiveTripsMapCard';
import { RecentTodaApplicationsCard } from '../components/dashboard/RecentTodaApplicationsCard';
import { DriverVerificationCard } from '../components/dashboard/DriverVerificationCard';
import { RecentIncidentReportsCard } from '../components/dashboard/RecentIncidentReportsCard';
import { SUMMARY_METRICS } from '../mockData/dashboardData';

export const DashboardPage: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 1600, margin: '0 auto' }}>
      <WelcomeHeader />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 2.5,
        }}
      >
        {SUMMARY_METRICS.map((metric) => (
          <SummaryCard key={metric.id} metric={metric} />
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: '1fr 1fr',
          },
          gap: 2.5,
          minHeight: 360,
        }}
      >
        <BookingTrendCard />
        <LiveTripsMapCard />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
          },
          gap: 2.5,
        }}
      >
        <RecentTodaApplicationsCard />
        <DriverVerificationCard />
        <RecentIncidentReportsCard />
      </Box>
    </Box>
  );
};
