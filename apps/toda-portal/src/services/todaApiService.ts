/**
 * ============================================================================
 * SAKAY TODA ADMIN API CLIENT SERVICE
 * ============================================================================
 * Purpose:
 *   Centralized network service providing typed HTTP requests connecting the
 *   TODA Association Admin Portal (apps/toda-portal) to the SAKAY Express
 *   backend server (server/).
 *
 * Scoping Rule:
 *   Strictly scoped to Calapan Central TODA (CCTODA - toda-1).
 *
 * Offline Support:
 *   Gracefully falls back to mockData/todaData if backend server is unreachable.
 * ============================================================================
 */

import {
  TodaProfile,
  DriverApplicant,
  TodaDriverMember,
  TodaAnnouncement,
  TodaAuditLog,
} from '../types/toda';
import {
  CURRENT_TODA_PROFILE,
  MOCK_DRIVER_APPLICANTS,
  MOCK_TODA_DRIVERS,
  MOCK_TODA_ANNOUNCEMENTS,
} from '../mockData/todaData';
import { logTodaAction, getAuditLogs } from '../lib/auditLog';

// Base API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Generic HTTP Request Executor with Graceful Offline Fallback
 */
async function requestWithFallback<T>(
  endpoint: string,
  options: RequestInit = {},
  fallbackData: T
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      console.warn(`[TODA API] HTTP ${response.status} on ${endpoint}. Using fallback.`);
      return fallbackData;
    }

    const json = await response.json();
    return (json.data as T) || (json as T);
  } catch (error) {
    console.warn(`[TODA API] Network error on ${endpoint}. Serving fallback data:`, error);
    return fallbackData;
  }
}

// ============================================================================
// 1. TODA PROFILE & OPERATIONS
// ============================================================================

/**
 * Fetches the current association profile and registration status.
 */
export async function fetchTodaProfile(): Promise<TodaProfile> {
  return requestWithFallback<TodaProfile>(
    '/toda/profile',
    { method: 'GET' },
    CURRENT_TODA_PROFILE
  );
}

/**
 * Fetches live rotational terminal queue metrics and compliance thresholds.
 */
export async function fetchTodaOperations() {
  return requestWithFallback(
    '/toda/operations',
    { method: 'GET' },
    {
      profile: CURRENT_TODA_PROFILE,
      totalRegisteredUnits: CURRENT_TODA_PROFILE.rosterFile.count,
      activeUnitsInQueue: 18,
      supervisoryComplaints: CURRENT_TODA_PROFILE.misteepComplaintsCount,
      supervisoryThresholdFlag: CURRENT_TODA_PROFILE.misteepComplaintsCount >= 3,
      terminalStatus: 'Operational',
      lastQueueRotation: new Date().toISOString(),
    }
  );
}

/**
 * Submits a terminal relocation request for LGU Transport Board review.
 */
export async function requestTerminalRelocation(proposedLocation: string, justification?: string) {
  return requestWithFallback(
    '/toda/terminal-relocation',
    {
      method: 'POST',
      body: JSON.stringify({ proposedLocation, justification }),
    },
    { success: true, message: 'Relocation request submitted for LGU approval.' }
  );
}

// ============================================================================
// 2. DRIVER SCREENING & VERIFICATION GATEWAY
// ============================================================================

/**
 * Fetches the queue of driver applicants awaiting TODA-level screening.
 */
export async function fetchDriverApplicants(): Promise<DriverApplicant[]> {
  return requestWithFallback<DriverApplicant[]>(
    '/toda/applicants',
    { method: 'GET' },
    MOCK_DRIVER_APPLICANTS
  );
}

/**
 * Updates checkbox verification steps (Photo match or Roster match) for an applicant.
 */
export async function updateApplicantVerification(
  applicantId: string,
  checks: { photoVerified?: boolean; rosterVerified?: boolean }
) {
  return requestWithFallback(
    `/toda/applicants/${applicantId}/verify-step`,
    {
      method: 'POST',
      body: JSON.stringify(checks),
    },
    { success: true, message: `Applicant ${applicantId} updated.` }
  );
}

/**
 * Endorses and forwards a fully screened driver applicant to the City LGU.
 */
export async function forwardApplicantToLgu(applicantId: string) {
  return requestWithFallback(
    `/toda/applicants/${applicantId}/forward`,
    {
      method: 'POST',
    },
    { success: true, message: `Applicant ${applicantId} endorsed to LGU.` }
  );
}

// ============================================================================
// 3. MEMBER ROSTER & TODA-LEVEL SANCTIONS
// ============================================================================

/**
 * Retrieves the roster of accredited member drivers.
 */
export async function fetchTodaDriverMembers(): Promise<TodaDriverMember[]> {
  return requestWithFallback<TodaDriverMember[]>(
    '/toda/drivers',
    { method: 'GET' },
    MOCK_TODA_DRIVERS
  );
}

/**
 * Applies a TODA-level temporary suspension to a member driver.
 */
export async function suspendTodaDriver(driverId: string, reason: string, durationDays = 7) {
  return requestWithFallback(
    `/toda/drivers/${driverId}/suspend`,
    {
      method: 'POST',
      body: JSON.stringify({ reason, durationDays }),
    },
    { success: true, message: `Driver ${driverId} suspended at TODA level.` }
  );
}

/**
 * Reactivates a suspended member driver into active terminal rotation.
 */
export async function reactivateTodaDriver(driverId: string) {
  return requestWithFallback(
    `/toda/drivers/${driverId}/reactivate`,
    {
      method: 'POST',
    },
    { success: true, message: `Driver ${driverId} reactivated.` }
  );
}

// ============================================================================
// 4. ANNOUNCEMENTS & AUDIT LOGS
// ============================================================================

/**
 * Retrieves announcements scoped to CCTODA drivers.
 */
export async function fetchTodaAnnouncements(): Promise<TodaAnnouncement[]> {
  return requestWithFallback<TodaAnnouncement[]>(
    '/toda/announcements',
    { method: 'GET' },
    MOCK_TODA_ANNOUNCEMENTS
  );
}

/**
 * Broadcasts an announcement to CCTODA members.
 */
export async function createTodaAnnouncement(payload: {
  title: string;
  message: string;
  category?: TodaAnnouncement['category'];
  urgency?: TodaAnnouncement['urgency'];
}): Promise<TodaAnnouncement> {
  const fallback: TodaAnnouncement = {
    id: `TODA-ANN-${Date.now()}`,
    title: payload.title,
    message: payload.message,
    category: payload.category || 'General',
    urgency: payload.urgency || 'Standard',
    isPublished: true,
    sendPushNotification: true,
    createdBy: 'Danilo "Ka Danny" Morales (TODA President)',
    createdAt: new Date().toISOString(),
  };

  return requestWithFallback<TodaAnnouncement>(
    '/toda/announcements',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    fallback
  );
}

/**
 * Records an immutable administrative action to the TODA audit trail.
 */
export function recordTodaAuditAction(payload: {
  actionType: string;
  targetId: string;
  targetName: string;
  details: string;
  category?: TodaAuditLog['category'];
}) {
  // 1. Commit locally to in-memory reactive sink
  logTodaAction({
    actionType: payload.actionType,
    targetId: payload.targetId,
    targetName: payload.targetName,
    details: payload.details,
    category: payload.category || 'Operations',
  });

  // 2. Asynchronously sync to backend audit log
  fetch(`${API_BASE_URL}/admin/audit-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      actor_name: 'Danilo "Ka Danny" Morales (TODA President)',
      actor_role: 'TODA Administrator',
      action_type: payload.actionType,
      target_id: payload.targetId,
      target_name: payload.targetName,
      details: payload.details,
      category: payload.category || 'Operations',
    }),
  }).catch((err) => {
    console.warn('[TodaAudit] Offline: Could not sync audit log to server:', err);
  });
}
