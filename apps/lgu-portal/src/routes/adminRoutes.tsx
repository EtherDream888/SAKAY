import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { TodaApplicationsPage } from '../pages/TodaApplicationsPage';
import { AccreditedTodasPage } from '../pages/AccreditedTodasPage';
import { DriverManagementPage } from '../pages/DriverManagementPage';
import { PassengerManagementPage } from '../pages/PassengerManagementPage';
import { LiveTripsPage } from '../pages/LiveTripsPage';
import { IncidentReportsPage } from '../pages/IncidentReportsPage';
import { AnnouncementManagementPage } from '../pages/AnnouncementManagementPage';
import { FareConfigurationPage } from '../pages/FareConfigurationPage';
import { AccountManagementPage } from '../pages/AccountManagementPage';
import { AuditLogPage } from '../pages/AuditLogPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';

export const AdminRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Default redirect to /dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Dashboard Screen */}
      <Route
        path="/dashboard"
        element={
          <AdminLayout pageTitle="Dashboard" pageSubtitle="Overview of SAKAY operations in Calapan City">
            <DashboardPage />
          </AdminLayout>
        }
      />

      {/* Management Routes */}
      <Route
        path="/toda-applications"
        element={
          <AdminLayout pageTitle="TODA Applications" pageSubtitle="Review and manage TODA accreditation requests.">
            <TodaApplicationsPage />
          </AdminLayout>
        }
      />

      <Route
        path="/accredited-todas"
        element={
          <AdminLayout pageTitle="Accredited TODAs" pageSubtitle="Manage accredited TODAs, service zones, and registration records.">
            <AccreditedTodasPage />
          </AdminLayout>
        }
      />

      <Route
        path="/drivers"
        element={
          <AdminLayout pageTitle="Driver Verification & Management" pageSubtitle="Review driver credentials, affiliations, and verification status.">
            <DriverManagementPage />
          </AdminLayout>
        }
      />

      <Route
        path="/passengers"
        element={
          <AdminLayout pageTitle="Passenger Management" pageSubtitle="Manage passenger accounts, sessions, and feedback.">
            <PassengerManagementPage />
          </AdminLayout>
        }
      />

      {/* Operations Routes */}
      <Route
        path="/live-trips"
        element={
          <AdminLayout pageTitle="Live Trips" pageSubtitle="Monitor active trips and online drivers across Calapan City.">
            <LiveTripsPage />
          </AdminLayout>
        }
      />

      <Route
        path="/incident-reports"
        element={
          <AdminLayout pageTitle="Incident Reports" pageSubtitle="Review and manage passenger and driver incident reports.">
            <IncidentReportsPage />
          </AdminLayout>
        }
      />

      <Route
        path="/announcements"
        element={
          <AdminLayout pageTitle="Announcement Management" pageSubtitle="Broadcast official municipal notices, route advisories, and policy reminders.">
            <AnnouncementManagementPage />
          </AdminLayout>
        }
      />

      {/* Municipal / Rate Configuration Route */}
      <Route
        path="/fare-configuration"
        element={
          <AdminLayout pageTitle="Fare Configuration" pageSubtitle="Enact and manage municipal tricycle fare matrix rates and derived formulas.">
            <FareConfigurationPage />
          </AdminLayout>
        }
      />

      {/* Analytics & Reports Routes */}
      <Route
        path="/reports"
        element={
          <AdminLayout pageTitle="Reports" pageSubtitle="Generate operational and compliance reports">
            <PlaceholderPage
              title="Transportation Reports Generator"
              subtitle="Export municipal transportation data, TODA compliance statistics, and passenger throughput records."
            />
          </AdminLayout>
        }
      />

      <Route
        path="/analytics"
        element={
          <AdminLayout pageTitle="Analytics" pageSubtitle="Descriptive transportation performance analytics">
            <PlaceholderPage
              title="Descriptive Analytics Dashboard"
              subtitle="Detailed visual charts analyzing peak ride demand, fare distribution, and TODA coverage efficiency."
            />
          </AdminLayout>
        }
      />

      {/* System Routes */}
      <Route
        path="/settings"
        element={
          <AdminLayout pageTitle="Account Management" pageSubtitle="Manage LGU staff administrator profiles, permissions, and credential resets.">
            <AccountManagementPage />
          </AdminLayout>
        }
      />

      <Route
        path="/audit-logs"
        element={
          <AdminLayout pageTitle="Audit Logs" pageSubtitle="Cryptographic administrative activity ledger and compliance security trail.">
            <AuditLogPage />
          </AdminLayout>
        }
      />

      <Route
        path="/tulong"
        element={
          <AdminLayout pageTitle="Tulong / Help" pageSubtitle="LGU Admin user guides and support documentation">
            <PlaceholderPage
              title="Tulong & Admin Support Center"
              subtitle="Access official documentation, municipal operational guidelines, and administrator support contacts."
            />
          </AdminLayout>
        }
      />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
