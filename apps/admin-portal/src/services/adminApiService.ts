/**
 * ============================================================================
 * SAKAY LGU ADMIN API CLIENT SERVICE (adminApiService.ts)
 * ============================================================================
 * Purpose:
 *   Centralized service layer for all HTTP communications between the LGU
 *   Admin Portal frontend and the SAKAY Express Backend Server (or Supabase).
 *
 * Design Architecture:
 *   - DRY Principle: No duplicate fetch() logic across different page files.
 *   - Graceful Fallback: If the backend server is offline during development,
 *     it smoothly falls back to mock data so UI development is never blocked.
 *   - Fully Typed: Uses shared TypeScript interfaces matching the admin schema.
 * ============================================================================
 */

import {
  FareMatrixRecord,
  TodaApplicationRecord,
  AccreditedTodaRecord,
  DriverRecord,
  PassengerRecord,
  IncidentReportRecord,
  AnnouncementRecord,
  AuditLogRecord,
  MOCK_FARE_MATRIX_HISTORY,
  MOCK_TODA_APPLICATIONS,
  MOCK_ACCREDITED_TODAS,
  MOCK_DRIVERS,
  MOCK_PASSENGERS,
  MOCK_INCIDENT_REPORTS_DETAILED,
  MOCK_ANNOUNCEMENTS,
} from '../mockData/adminData';

import {
  getAuditLogs as getLocalAuditLogs,
  logAdminAction as logLocalAdminAction,
} from '../lib/auditLog';

// Base URL for the Express Backend Server (defaults to port 5000)
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Generic request helper with automatic JSON parsing and fallback handling.
 *
 * @template T - The expected return type of the API response data.
 * @param endpoint - The API route path (e.g. '/admin/fare-matrix').
 * @param options - Standard fetch options (method, headers, body).
 * @param fallbackData - In-memory mock data to return if the server is unreachable.
 * @returns The parsed data from either the live API or fallback.
 */
async function requestWithFallback<T>(
  endpoint: string,
  options: RequestInit = {},
  fallbackData: T
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    if (!response.ok) {
      console.warn(`[Admin API] Server returned status ${response.status} for ${endpoint}. Using fallback.`);
      return fallbackData;
    }

    const result = await response.json();
    return result.data ?? (result as T);
  } catch {
    // Expected during offline development when backend server is not running
    return fallbackData;
  }
}

// ============================================================================
// 1. FARE MATRIX SERVICES
// ============================================================================

/**
 * Fetches the active municipal fare matrix and historical enacted ordinances.
 * @returns Promise resolving to an array of FareMatrixRecord items.
 */
export async function fetchFareMatrices(): Promise<FareMatrixRecord[]> {
  return requestWithFallback<FareMatrixRecord[]>(
    '/admin/fare-matrix',
    { method: 'GET' },
    MOCK_FARE_MATRIX_HISTORY
  );
}

/**
 * Enacts and appends a new municipal tricycle fare rate matrix.
 * @param newMatrix - The new fare parameters (base fare, succeeding rate, etc.).
 * @returns Promise resolving to the newly created fare record.
 */
export async function createFareMatrix(newMatrix: {
  baseFare: number;
  baseDistanceKm: number;
  succeedingRate: number;
  ordinanceNumber?: string;
  configuredBy?: string;
}): Promise<FareMatrixRecord> {
  const payload = {
    base_fare: newMatrix.baseFare,
    base_distance_km: newMatrix.baseDistanceKm,
    succeeding_rate: newMatrix.succeedingRate,
    ordinance_number: newMatrix.ordinanceNumber,
    configured_by: newMatrix.configuredBy || 'LGU Transport Board',
  };

  const fallback: FareMatrixRecord = {
    id: `fm-${Date.now()}`,
    fare_matrix_id: `FM-${Date.now()}`,
    base_fare: newMatrix.baseFare,
    base_distance_km: newMatrix.baseDistanceKm,
    succeeding_rate: newMatrix.succeedingRate,
    effective_timestamp: new Date().toISOString(),
    effective_date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    is_active: true,
    ordinance_reference: newMatrix.ordinanceNumber || 'Ordinance No. 2026-01',
    configured_by_lgu_admin: newMatrix.configuredBy || 'LGU Transport Board',
    created_at: new Date().toISOString(),
  };

  return requestWithFallback<FareMatrixRecord>(
    '/admin/fare-matrix',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    fallback
  );
}

// ============================================================================
// 2. TODA ACCREDITATION SERVICES
// ============================================================================

/**
 * Retrieves all pending TODA accreditation requests awaiting LGU review.
 * @returns Promise resolving to an array of TodaApplicationRecord items.
 */
export async function fetchTodaApplications(): Promise<TodaApplicationRecord[]> {
  return requestWithFallback<TodaApplicationRecord[]>(
    '/admin/todas/applications',
    { method: 'GET' },
    MOCK_TODA_APPLICATIONS
  );
}

/**
 * Retrieves all verified and accredited TODAs operating in Calapan City.
 */
export async function fetchAccreditedTodas(): Promise<AccreditedTodaRecord[]> {
  return requestWithFallback<AccreditedTodaRecord[]>(
    '/admin/todas/accredited',
    { method: 'GET' },
    MOCK_ACCREDITED_TODAS
  );
}

/**
 * Approves a TODA accreditation application and issues an official franchise certificate.
 * @param applicationId - The unique ID of the TODA application.
 * @param remarks - Optional official remarks from the reviewing LGU officer.
 */
export async function approveTodaApplication(applicationId: string, remarks?: string) {
  return requestWithFallback(
    `/admin/todas/${applicationId}/approve`,
    {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    },
    { success: true, message: `Application ${applicationId} approved.` }
  );
}

/**
 * Declines or requests resubmission for a TODA accreditation application.
 * @param applicationId - The unique ID of the TODA application.
 * @param reason - Mandatory justification for declining the application.
 */
export async function declineTodaApplication(applicationId: string, reason: string) {
  return requestWithFallback(
    `/admin/todas/${applicationId}/decline`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
    { success: true, message: `Application ${applicationId} declined.` }
  );
}

// ============================================================================
// 3. DRIVER & PASSENGER OVERSIGHT SERVICES
// ============================================================================

/**
 * Retrieves the roster of registered tricycle drivers.
 */
export async function fetchDrivers(): Promise<DriverRecord[]> {
  return requestWithFallback<DriverRecord[]>(
    '/admin/drivers',
    { method: 'GET' },
    MOCK_DRIVERS
  );
}

/**
 * Issues official LGU verification and MTOP franchise accreditation to a driver.
 * @param driverId - The unique ID of the driver.
 * @param franchiseNumber - The newly assigned MTOP franchise permit number.
 */
export async function verifyDriver(driverId: string, franchiseNumber?: string) {
  return requestWithFallback(
    `/admin/drivers/${driverId}/verify`,
    {
      method: 'POST',
      body: JSON.stringify({ franchise_number: franchiseNumber }),
    },
    { success: true, message: `Driver ${driverId} verified.` }
  );
}

/**
 * Suspends a driver's account due to policy or tariff violations.
 * @param driverId - The unique ID of the driver.
 * @param reason - Mandatory reason for suspension.
 * @param durationDays - Number of days the suspension is active.
 */
export async function suspendDriver(driverId: string, reason: string, durationDays = 7) {
  return requestWithFallback(
    `/admin/drivers/${driverId}/suspend`,
    {
      method: 'POST',
      body: JSON.stringify({ reason, duration_days: durationDays }),
    },
    { success: true, message: `Driver ${driverId} suspended.` }
  );
}

/**
 * Issues a manual policy strike to a driver.
 * @param driverId - The unique ID of the driver.
 * @param reason - Violation explanation.
 * @param violationType - Type/category of violation.
 */
export async function issueDriverStrike(driverId: string, reason: string, violationType: string) {
  return requestWithFallback(
    `/admin/drivers/${driverId}/strike`,
    {
      method: 'POST',
      body: JSON.stringify({ reason, violation_type: violationType }),
    },
    { success: true, message: `Strike issued to driver ${driverId}.` }
  );
}

/**
 * Retrieves registered passenger accounts.
 */
export async function fetchPassengers(): Promise<PassengerRecord[]> {
  return requestWithFallback<PassengerRecord[]>(
    '/admin/passengers',
    { method: 'GET' },
    MOCK_PASSENGERS
  );
}

/**
 * Suspends a passenger account due to safety or conduct violations.
 */
export async function suspendPassenger(passengerId: string, reason: string, durationDays = 7) {
  return requestWithFallback(
    `/admin/passengers/${passengerId}/suspend`,
    {
      method: 'POST',
      body: JSON.stringify({ reason, duration_days: durationDays }),
    },
    { success: true, message: `Passenger ${passengerId} suspended.` }
  );
}

/**
 * Reactivates a previously suspended passenger account.
 */
export async function reactivatePassenger(passengerId: string) {
  return requestWithFallback(
    `/admin/passengers/${passengerId}/reactivate`,
    {
      method: 'POST',
    },
    { success: true, message: `Passenger ${passengerId} reactivated.` }
  );
}

/**
 * Issues a policy strike to a passenger account.
 */
export async function issuePassengerStrike(passengerId: string, reason: string) {
  return requestWithFallback(
    `/admin/passengers/${passengerId}/strike`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
    { success: true, message: `Strike issued to passenger ${passengerId}.` }
  );
}

// ============================================================================
// 4. INCIDENT & ANNOUNCEMENT SERVICES
// ============================================================================

/**
 * Retrieves incident reports and commuter safety complaints.
 */
export async function fetchIncidents(): Promise<IncidentReportRecord[]> {
  return requestWithFallback<IncidentReportRecord[]>(
    '/admin/incidents',
    { method: 'GET' },
    MOCK_INCIDENT_REPORTS_DETAILED
  );
}

/**
 * Updates an incident report's triage and investigation status.
 */
export async function updateIncidentStatus(
  incidentId: string,
  status: 'Under Investigation' | 'Resolved' | 'Dismissed',
  resolutionNotes?: string
) {
  return requestWithFallback(
    `/admin/incidents/${incidentId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status, resolution_notes: resolutionNotes }),
    },
    { success: true, message: `Incident ${incidentId} status updated to ${status}.` }
  );
}

/**
 * Retrieves published and scheduled municipal announcements.
 */
export async function fetchAnnouncements(): Promise<AnnouncementRecord[]> {
  return requestWithFallback<AnnouncementRecord[]>(
    '/admin/announcements',
    { method: 'GET' },
    MOCK_ANNOUNCEMENTS
  );
}

/**
 * Creates and broadcasts a municipal announcement.
 */
export async function createAnnouncement(payload: {
  title: string;
  message: string;
  targetRole?: 'All' | 'Drivers Only' | 'Passengers Only' | string;
  priority?: 'High' | 'Normal' | 'Urgent';
}): Promise<AnnouncementRecord> {
  const fallback: AnnouncementRecord = {
    id: `ANN-${Date.now()}`,
    announcement_id: `ANN-${Date.now()}`,
    title: payload.title,
    message: payload.message,
    target_role: (payload.targetRole as AnnouncementRecord['target_role']) || 'All',
    is_published: true,
    publish_timing: 'Immediate',
    created_by_lgu_admin: 'LGU Transport Admin',
    created_at: new Date().toISOString(),
  };

  return requestWithFallback<AnnouncementRecord>(
    '/admin/announcements',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    fallback
  );
}

/**
 * Deletes a municipal announcement by ID.
 */
export async function deleteAnnouncement(announcementId: string) {
  return requestWithFallback(
    `/admin/announcements/${announcementId}`,
    {
      method: 'DELETE',
    },
    { success: true, message: `Announcement ${announcementId} deleted.` }
  );
}

// ============================================================================
// 5. AUDIT TRAIL SERVICES
// ============================================================================

/**
 * Retrieves the immutable administrative audit log ledger.
 */
export async function fetchAuditLogs(): Promise<AuditLogRecord[]> {
  return requestWithFallback<AuditLogRecord[]>(
    '/admin/audit-logs',
    { method: 'GET' },
    getLocalAuditLogs()
  );
}

/**
 * Records an administrative action to the immutable audit trail.
 * Logs locally in-memory and attempts to synchronize with the backend server.
 */
export async function recordAdminAuditAction(log: {
  actionType: string;
  category?: AuditLogRecord['category'];
  actorName?: string;
  actorRole?: string;
  targetId: string;
  targetName: string;
  details: string;
}): Promise<AuditLogRecord> {
  // Commit locally first so UI updates immediately
  const localItem = logLocalAdminAction(log);

  // Attempt backend persistence
  try {
    await fetch(`${API_BASE_URL}/admin/audit-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action_type: log.actionType,
        category: log.category,
        actor_name: log.actorName,
        target_id: log.targetId,
        target_name: log.targetName,
        details: log.details,
      }),
    });
  } catch {
    // Gracefully handled by local sink
  }

  return localItem;
}
