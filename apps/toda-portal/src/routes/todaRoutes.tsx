import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { TodaLayout } from '../components/layout/TodaLayout';
import { TodaOperationsPage } from '../pages/TodaOperationsPage';
import { TodaDriverVerificationPage } from '../pages/TodaDriverVerificationPage';
import { TodaDriverMembershipPage } from '../pages/TodaDriverMembershipPage';
import { TodaAnnouncementsPage } from '../pages/TodaAnnouncementsPage';
import { TodaReportingPage } from '../pages/TodaReportingPage';
import { TodaAccountManagementPage } from '../pages/TodaAccountManagementPage';
import { TodaAuditLogsPage } from '../pages/TodaAuditLogsPage';

export const TodaRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/operations" replace />} />

      {/* Main Operations Monitoring */}
      <Route
        path="/operations"
        element={
          <TodaLayout
            pageTitle="Operations Monitoring"
            pageSubtitle="Live monitoring of Calapan Central TODA active drivers, bookings, and terminal queue"
          >
            <TodaOperationsPage />
          </TodaLayout>
        }
      />

      {/* Driver Verification Queue */}
      <Route
        path="/driver-verification"
        element={
          <TodaLayout
            pageTitle="Driver Verification (TODA Stage)"
            pageSubtitle="Initial credential screening, master roster match verification, and LGU endorsement"
          >
            <TodaDriverVerificationPage />
          </TodaLayout>
        }
      />

      {/* Driver Membership & Exemption Appeals */}
      <Route
        path="/drivers"
        element={
          <TodaLayout
            pageTitle="Driver Membership & Roster"
            pageSubtitle="Manage affiliated member drivers, shift allocations, TODA suspensions, and strike appeals"
          >
            <TodaDriverMembershipPage />
          </TodaLayout>
        }
      />

      {/* Announcements */}
      <Route
        path="/announcements"
        element={
          <TodaLayout
            pageTitle="TODA Driver Announcements"
            pageSubtitle="Broadcast terminal rules, schedule updates, and compliance notices to affiliated drivers"
          >
            <TodaAnnouncementsPage />
          </TodaLayout>
        }
      />

      {/* TODA Reporting & Incident Triage */}
      <Route
        path="/reports"
        element={
          <TodaLayout
            pageTitle="TODA Reports & Incident Review"
            pageSubtitle="Export trip ledgers and perform TODA-level complaint mediation with LGU escalation"
          >
            <TodaReportingPage />
          </TodaLayout>
        }
      />

      {/* Account & Accreditation */}
      <Route
        path="/account"
        element={
          <TodaLayout
            pageTitle="Account & Accreditation"
            pageSubtitle="Manage TODA organizational profile, executive officers, clearance documents, and terminal location"
          >
            <TodaAccountManagementPage />
          </TodaLayout>
        }
      />

      {/* Audit Logs */}
      <Route
        path="/audit-logs"
        element={
          <TodaLayout
            pageTitle="TODA Audit Trail"
            pageSubtitle="Cryptographic administrative activity ledger for TODA officer actions and decisions"
          >
            <TodaAuditLogsPage />
          </TodaLayout>
        }
      />

      <Route path="*" element={<Navigate to="/operations" replace />} />
    </Routes>
  );
};
