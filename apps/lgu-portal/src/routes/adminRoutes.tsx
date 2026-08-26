import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout';
import { ProtectedRoute, PublicOnlyRoute } from '../components/auth/ProtectedRoute';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { TodaApplicationsPage } from '../pages/TodaApplicationsPage';
import { AccreditedTodasPage } from '../pages/AccreditedTodasPage';
import { DriverManagementPage } from '../pages/DriverManagementPage';
import { PassengerManagementPage } from '../pages/PassengerManagementPage';
import { PassengerFeedbackPage } from '../pages/PassengerFeedbackPage';
import { LiveTripsPage } from '../pages/LiveTripsPage';
import { IncidentReportsPage } from '../pages/IncidentReportsPage';
import { AnnouncementManagementPage } from '../pages/AnnouncementManagementPage';
import { FareConfigurationPage } from '../pages/FareConfigurationPage';
import { ReportsPage } from '../pages/ReportsPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { AccountManagementPage } from '../pages/AccountManagementPage';
import { AuditLogPage } from '../pages/AuditLogPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';

export const AdminRoutes: React.FC = () => {
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

      {/* Default redirect to /dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Protected Dashboard Screen */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AdminLayout pageTitle="Dashboard" pageSubtitle="Here is your municipal transport operations overview for today.">
              <DashboardPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      {/* Management Routes */}
      <Route
        path="/toda-applications"
        element={
          <ProtectedRoute>
            <AdminLayout pageTitle="TODA Applications" pageSubtitle="Review and manage TODA accreditation requests.">
              <TodaApplicationsPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/accredited-todas"
        element={
          <ProtectedRoute>
            <AdminLayout pageTitle="Accredited TODAs" pageSubtitle="Manage accredited TODAs, service zones, and registration records.">
              <AccreditedTodasPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/drivers"
        element={
          <ProtectedRoute>
            <AdminLayout pageTitle="Driver Verification & Management" pageSubtitle="Review driver credentials, affiliations, and verification status.">
              <DriverManagementPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/passengers"
        element={
          <ProtectedRoute>
            <AdminLayout pageTitle="Passenger Management" pageSubtitle="Manage passenger accounts, sessions, and compliance.">
              <PassengerManagementPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/feedback"
        element={
          <ProtectedRoute>
            <AdminLayout pageTitle="Passenger Feedback & Ratings" pageSubtitle="Review commuter trip feedback, star evaluations, and triage complaints.">
              <PassengerFeedbackPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      {/* Operations Routes */}
      <Route
        path="/live-trips"
        element={
          <ProtectedRoute>
            <AdminLayout pageTitle="Transportation Operations Monitoring" pageSubtitle="Monitor active trips, completed rides, cancelled bookings, and live vehicle locations.">
              <LiveTripsPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/incident-reports"
        element={
          <ProtectedRoute>
            <AdminLayout pageTitle="Incident Reports" pageSubtitle="Review and manage passenger and driver incident reports.">
              <IncidentReportsPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/announcements"
        element={
          <ProtectedRoute>
            <AdminLayout pageTitle="Announcement Management" pageSubtitle="Broadcast official municipal notices, route advisories, and policy reminders.">
              <AnnouncementManagementPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      {/* Municipal / Rate Configuration Route */}
      <Route
        path="/fare-configuration"
        element={
          <ProtectedRoute>
            <AdminLayout pageTitle="Fare Configuration" pageSubtitle="Enact and manage municipal tricycle fare matrix rates and derived formulas.">
              <FareConfigurationPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      {/* Analytics & Reports Routes */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <AdminLayout pageTitle="Reports" pageSubtitle="Generate operational and compliance reports for Calapan City.">
              <ReportsPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AdminLayout pageTitle="Analytics" pageSubtitle="Descriptive transportation performance analytics and trends.">
              <AnalyticsPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      {/* System Routes */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AdminLayout pageTitle="Account Management" pageSubtitle="Manage LGU administrator profile, credentials, and system settings.">
              <AccountManagementPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/audit-logs"
        element={
          <ProtectedRoute>
            <AdminLayout pageTitle="Audit Logs" pageSubtitle="Official administrative activity log and compliance security trail.">
              <AuditLogPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/tulong"
        element={
          <ProtectedRoute>
            <AdminLayout pageTitle="Tulong / Help" pageSubtitle="LGU Admin user guides and support documentation">
              <PlaceholderPage
                title="Tulong & Admin Support Center"
                subtitle="Access official documentation, municipal operational guidelines, and administrator support contacts."
              />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
