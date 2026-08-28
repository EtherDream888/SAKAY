import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { TodaLayout } from '../components/layout/TodaLayout';
import { ProtectedRoute, PublicOnlyRoute } from '../components/auth/ProtectedRoute';

import { LoginPage } from '../pages/LoginPage';
import { TodaOperationsPage } from '../pages/TodaOperationsPage';
import { TodaDriverVerificationPage } from '../pages/TodaDriverVerificationPage';
import { TodaDriverMembershipPage } from '../pages/TodaDriverMembershipPage';
import { TodaFleetPage } from '../pages/TodaFleetPage';
import { TodaAnnouncementsPage } from '../pages/TodaAnnouncementsPage';
import { TodaReportingPage } from '../pages/TodaReportingPage';
import { TodaAuditLogsPage } from '../pages/TodaAuditLogsPage';
import { TodaAccountManagementPage } from '../pages/TodaAccountManagementPage';
import { TodaRegistrationPage } from '../pages/TodaRegistrationPage';

export const TodaRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />

      {/* TODA Registration & Accreditation Submission (Public) */}
      <Route path="/register" element={<TodaRegistrationPage />} />

      {/* Default redirect to /operations */}
      <Route path="/" element={<Navigate to="/operations" replace />} />

      {/* Operations Monitoring Screen */}
      <Route
        path="/operations"
        element={
          <ProtectedRoute>
            <TodaLayout pageTitle="Operations Monitoring" pageSubtitle="Real-time overview of TODA terminal operations, queue rotation, and active trips">
              <TodaOperationsPage />
            </TodaLayout>
          </ProtectedRoute>
        }
      />

      {/* Driver Verification */}
      <Route
        path="/driver-verification"
        element={
          <ProtectedRoute>
            <TodaLayout pageTitle="Driver Verification" pageSubtitle="Screen TODA member driver applications before LGU accreditation endorsement">
              <TodaDriverVerificationPage />
            </TodaLayout>
          </ProtectedRoute>
        }
      />

      {/* Driver Membership */}
      <Route
        path="/drivers"
        element={
          <ProtectedRoute>
            <TodaLayout pageTitle="Driver Membership" pageSubtitle="Manage TODA member driver roster, strikes, and governance suspensions">
              <TodaDriverMembershipPage />
            </TodaLayout>
          </ProtectedRoute>
        }
      />

      {/* Tricycle Fleet Management */}
      <Route
        path="/fleet"
        element={
          <ProtectedRoute>
            <TodaLayout pageTitle="Tricycle Fleet Management" pageSubtitle="Manage authorized motorized tricycle units, franchise permits, and unit status">
              <TodaFleetPage />
            </TodaLayout>
          </ProtectedRoute>
        }
      />

      {/* Announcements */}
      <Route
        path="/announcements"
        element={
          <ProtectedRoute>
            <TodaLayout pageTitle="Announcements" pageSubtitle="Broadcast notices and terminal policy updates to TODA member drivers">
              <TodaAnnouncementsPage />
            </TodaLayout>
          </ProtectedRoute>
        }
      />

      {/* Reports & Incidents */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <TodaLayout pageTitle="TODA Reports & Incidents" pageSubtitle="Review TODA trip activity, gross fare ledgers, driver complaints, and LGU escalation">
              <TodaReportingPage />
            </TodaLayout>
          </ProtectedRoute>
        }
      />

      {/* Audit Logs */}
      <Route
        path="/audit-logs"
        element={
          <ProtectedRoute>
            <TodaLayout pageTitle="Audit Logs" pageSubtitle="Immutable security trail of TODA administrative actions and endorsements">
              <TodaAuditLogsPage />
            </TodaLayout>
          </ProtectedRoute>
        }
      />

      {/* Account Management */}
      <Route
        path="/account"
        element={
          <ProtectedRoute>
            <TodaLayout pageTitle="Account & Accreditation" pageSubtitle="Manage TODA organizational information, officers roster, and annual LGU accreditation">
              <TodaAccountManagementPage />
            </TodaLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/operations" replace />} />
    </Routes>
  );
};
