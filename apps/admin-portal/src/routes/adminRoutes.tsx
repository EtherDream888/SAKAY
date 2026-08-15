import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { TodaApplicationsPage } from '../pages/TodaApplicationsPage';
import { AccreditedTodasPage } from '../pages/AccreditedTodasPage';
import { DriverManagementPage } from '../pages/DriverManagementPage';
import { PassengerManagementPage } from '../pages/PassengerManagementPage';
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
          <AdminLayout pageTitle="Live Trips Map" pageSubtitle="Real-time location and active dispatch tracking">
            <PlaceholderPage
              title="Live Trips & Dispatch Monitor"
              subtitle="Interactive real-time map displaying all active tricycle trips, route telemetry, and driver statuses."
            />
          </AdminLayout>
        }
      />

      <Route
        path="/incident-reports"
        element={
          <AdminLayout pageTitle="Incident Reports" pageSubtitle="Safety complaints, overcharging, and misconduct reports">
            <PlaceholderPage
              title="Incident Reports & Resolution"
              subtitle="Review safety incident reports submitted by passengers and drivers for LGU administrative action."
            />
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
          <AdminLayout pageTitle="Settings" pageSubtitle="LGU portal configurations and parameters">
            <PlaceholderPage
              title="System Settings"
              subtitle="Configure municipal fare caps, zone parameters, notification triggers, and admin permissions."
            />
          </AdminLayout>
        }
      />

      <Route
        path="/audit-logs"
        element={
          <AdminLayout pageTitle="Audit Logs" pageSubtitle="Administrative activity and security trail">
            <PlaceholderPage
              title="System Audit Logs"
              subtitle="Immutable log of administrative actions, credential verifications, and status modifications."
            />
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
