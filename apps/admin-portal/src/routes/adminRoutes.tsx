import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout';
import { DashboardPage } from '../pages/DashboardPage';
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
          <AdminLayout pageTitle="TODA Applications" pageSubtitle="Review and manage pending TODA accreditation requests">
            <PlaceholderPage
              title="TODA Applications Management"
              subtitle="View, approve, or decline accreditation requests from local Tricycle Operators and Drivers Associations."
            />
          </AdminLayout>
        }
      />

      <Route
        path="/accredited-todas"
        element={
          <AdminLayout pageTitle="Accredited TODAs" pageSubtitle="Directory of officially accredited TODAs in Calapan City">
            <PlaceholderPage
              title="Accredited TODAs Directory"
              subtitle="Manage active TODA rosters, zone boundaries, and official registration documents."
            />
          </AdminLayout>
        }
      />

      <Route
        path="/drivers"
        element={
          <AdminLayout pageTitle="Drivers" pageSubtitle="Registered tricycle drivers and verification statuses">
            <PlaceholderPage
              title="Driver Verification & Management"
              subtitle="Inspect driver licenses, Toda affiliations, vehicle franchise details, and background verification."
            />
          </AdminLayout>
        }
      />

      <Route
        path="/passengers"
        element={
          <AdminLayout pageTitle="Passengers" pageSubtitle="Registered passenger accounts and platform usage">
            <PlaceholderPage
              title="Passenger Management Portal"
              subtitle="Oversee registered passenger accounts, active sessions, and passenger feedback."
            />
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
