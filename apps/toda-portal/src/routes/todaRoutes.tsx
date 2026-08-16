import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { TodaLayout } from '../components/layout/TodaLayout';

import { TodaOperationsPage } from '../pages/TodaOperationsPage';
import { TodaDriverVerificationPage } from '../pages/TodaDriverVerificationPage';
import { TodaDriverMembershipPage } from '../pages/TodaDriverMembershipPage';
import { TodaAnnouncementsPage } from '../pages/TodaAnnouncementsPage';
import { TodaReportingPage } from '../pages/TodaReportingPage';
import { TodaAuditLogsPage } from '../pages/TodaAuditLogsPage';
import { TodaAccountManagementPage } from '../pages/TodaAccountManagementPage';

export const TodaRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Default redirect to /operations */}
      <Route path="/" element={<Navigate to="/operations" replace />} />

      {/* Operations Monitoring Screen */}
      <Route
        path="/operations"
        element={
          <TodaLayout pageTitle="Operations Monitoring" pageSubtitle="Real-time overview of Calapan Central TODA terminal and driver fleet">
            <TodaOperationsPage />
          </TodaLayout>
        }
      />

      {/* Driver Verification */}
      <Route
        path="/driver-verification"
        element={
          <TodaLayout pageTitle="Driver Verification" pageSubtitle="Screen TODA member driver applications before LGU accreditation endorsement">
            <TodaDriverVerificationPage />
          </TodaLayout>
        }
      />

      {/* Driver Membership */}
      <Route
        path="/drivers"
        element={
          <TodaLayout pageTitle="Driver Membership" pageSubtitle="Manage TODA member driver roster, strikes, and governance suspensions">
            <TodaDriverMembershipPage />
          </TodaLayout>
        }
      />

      {/* Announcements */}
      <Route
        path="/announcements"
        element={
          <TodaLayout pageTitle="Announcements" pageSubtitle="Broadcast notices and terminal policy updates to TODA member drivers">
            <TodaAnnouncementsPage />
          </TodaLayout>
        }
      />

      {/* Reports & Incidents */}
      <Route
        path="/reports"
        element={
          <TodaLayout pageTitle="TODA Reports & Incidents" pageSubtitle="Review TODA trip activity, gross fare ledgers, and driver complaint incidents">
            <TodaReportingPage />
          </TodaLayout>
        }
      />

      {/* Audit Logs */}
      <Route
        path="/audit-logs"
        element={
          <TodaLayout pageTitle="Audit Logs" pageSubtitle="Immutable security trail of TODA administrative actions and endorsements">
            <TodaAuditLogsPage />
          </TodaLayout>
        }
      />

      {/* Account Management */}
      <Route
        path="/account"
        element={
          <TodaLayout pageTitle="Account & Accreditation" pageSubtitle="Manage TODA organizational information, officers roster, and annual LGU accreditation">
            <TodaAccountManagementPage />
          </TodaLayout>
        }
      />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/operations" replace />} />
    </Routes>
  );
};
