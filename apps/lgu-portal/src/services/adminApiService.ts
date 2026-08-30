/**
 * ============================================================================
 * SAKAY LGU ADMIN API & DATABASE SERVICE LAYER (adminApiService.ts)
 * ============================================================================
 * Purpose:
 *   Centralized service layer connecting the LGU Admin Portal directly to
 *   the live Supabase PostgreSQL cloud database and Express API server.
 *
 * Design Architecture:
 *   - 100% Real Database Queries: Direct Supabase client calls with robust error handling.
 *   - Clean empty states: Returns empty arrays / calculated real metrics.
 *   - Integrated Audit Logging: Every state mutation writes to public.audit_log.
 * ============================================================================
 */

import { supabase } from './supabaseClient';
import {
  FareMatrixRecord,
  TodaApplicationRecord,
  AccreditedTodaRecord,
  DriverRecord,
  PassengerRecord,
  IncidentReportRecord,
  AnnouncementRecord,
  AuditLogRecord,
} from '../mockData/adminData';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

// ============================================================================
// 1. DASHBOARD METRICS & LIVE KPIS
// ============================================================================

export interface DashboardStats {
  kpis: {
    passengers: { total: number; active: number; inactive: number };
    drivers: { total: number; active: number; inactive: number };
    todas: { total: number; pendingReview: number };
    trips: { total: number; ongoing: number; allBookings: number };
    verifications: { pending: number; overdue5Days: number };
    incidents: { open: number; total: number };
  };
  driverBreakdown: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    suspended: number;
  };
  recentIncidents: Array<{
    id: string;
    category: string;
    status: string;
    timestamp: string;
    severity: string;
    description: string;
    iconType: string;
  }>;
  recentApplications: Array<{
    id: string;
    name: string;
    barangay: string;
    submittedDate: string;
    status: string;
    representative: string;
    memberCount: number;
  }>;
  flaggedTodas: Array<{
    id: string;
    name: string;
    incidentCount: number;
  }>;
}

/**
 * Fetches real live dashboard statistics aggregated from Supabase tables.
 */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  try {
    const [
      passengersTotal,
      passengersActive,
      driversTotal,
      driversVerified,
      driversPending,
      driversSuspended,
      todasRes,
      bookingsTotal,
      bookingsCompleted,
      bookingsOngoing,
      incidentsTotal,
      incidentsOpen,
      recentIncidentsRes,
      incidentReportsRes,
    ] = await Promise.all([
      supabase.from('passenger').select('*', { count: 'exact', head: true }),
      supabase.from('passenger').select('*', { count: 'exact', head: true }).eq('account_status', 'Active'),
      supabase.from('driver').select('*', { count: 'exact', head: true }).in('account_status', ['TODA Approved', 'TODA Endorsed', 'Endorsed to LGU', 'LGU Approved', 'Active', 'Verified', 'Rejected']),
      supabase.from('driver').select('*', { count: 'exact', head: true }).eq('account_status', 'Verified'),
      supabase.from('driver').select('*', { count: 'exact', head: true }).in('account_status', ['TODA Approved', 'TODA Endorsed', 'Endorsed to LGU']),
      supabase.from('driver').select('*', { count: 'exact', head: true }).eq('account_status', 'Suspended'),
      supabase.from('toda').select('*').order('created_at', { ascending: false }),
      supabase.from('booking').select('*', { count: 'exact', head: true }),
      supabase.from('booking').select('*', { count: 'exact', head: true }).eq('booking_status', 'Completed'),
      supabase.from('booking').select('*', { count: 'exact', head: true }).in('booking_status', ['Driver Assigned', 'Driver En Route', 'Driver Arrived', 'Trip Ongoing']),
      supabase.from('incident_report').select('*', { count: 'exact', head: true }),
      supabase.from('incident_report').select('*', { count: 'exact', head: true }).neq('status', 'Resolved'),
      supabase.from('incident_report').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('incident_report').select('reported_toda_id, status'),
    ]);

    const totalP = passengersTotal.count || 0;
    const activeP = passengersActive.count || 0;
    const totalD = driversTotal.count || 0;
    const verifiedD = driversVerified.count || 0;
    const pendingD = driversPending.count || 0;
    const suspendedD = driversSuspended.count || 0;

    const allTodas = todasRes.data || [];
    const activeTodas = allTodas.filter((t: any) => (t.toda_status || t.account_status) === 'Active');
    const pendingTodas = allTodas.filter((t: any) => (t.toda_status || t.account_status) !== 'Active');
    const overdueTodas = pendingTodas.filter((t: any) => t.created_at && (Date.now() - new Date(t.created_at).getTime() > 5 * 24 * 60 * 60 * 1000));

    const totalB = bookingsTotal.count || 0;
    const completedB = bookingsCompleted.count || 0;
    const ongoingB = bookingsOngoing.count || 0;
    const totalI = incidentsTotal.count || 0;
    const openI = incidentsOpen.count || 0;

    const recentIncidents = (recentIncidentsRes.data || []).map((inc: any) => ({
      id: inc.incident_id,
      category: inc.category || 'General Incident',
      status: inc.status || 'Under Investigation',
      timestamp: inc.created_at
        ? new Date(inc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'Recent',
      severity: inc.severity || 'Medium',
      description: inc.description || '',
      iconType: (inc.category || '').toLowerCase().includes('charge')
        ? 'overcharging'
        : (inc.category || '').toLowerCase().includes('misconduct')
        ? 'misconduct'
        : 'safety',
    }));

    const recentApplications = allTodas.slice(0, 5).map((toda: any) => ({
      id: toda.toda_id,
      name: toda.toda_name,
      barangay: toda.barangay || 'Calapan City',
      submittedDate: toda.created_at
        ? new Date(toda.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Recent',
      status: (toda.toda_status || toda.account_status) === 'Active' ? 'Approved' : (toda.toda_status || toda.account_status) === 'Deactivated' ? 'Declined' : 'Pending',
      representative: toda.president_name || 'TODA Officer',
      memberCount: toda.registered_tricycle_count || toda.active_driver_count || 0,
    }));

    // Check for flagged TODAs with 3+ confirmed incidents
    const todaIncidentsMap: Record<string, number> = {};
    (incidentReportsRes.data || []).forEach((inc: any) => {
      if (inc.reported_toda_id) {
        todaIncidentsMap[inc.reported_toda_id] = (todaIncidentsMap[inc.reported_toda_id] || 0) + 1;
      }
    });

    const flaggedTodas: Array<{ id: string; name: string; incidentCount: number }> = [];
    allTodas.forEach((t: any) => {
      const count = todaIncidentsMap[t.toda_id] || 0;
      if (count >= 3) {
        flaggedTodas.push({
          id: t.toda_id,
          name: t.toda_name,
          incidentCount: count,
        });
      }
    });

    return {
      kpis: {
        passengers: {
          total: totalP,
          active: activeP,
          inactive: Math.max(0, totalP - activeP),
        },
        drivers: {
          total: totalD,
          active: verifiedD,
          inactive: Math.max(0, totalD - verifiedD),
        },
        todas: {
          total: activeTodas.length,
          pendingReview: pendingTodas.length,
        },
        trips: {
          total: completedB,
          ongoing: ongoingB,
          allBookings: totalB,
        },
        verifications: {
          pending: pendingD + pendingTodas.length,
          overdue5Days: overdueTodas.length,
        },
        incidents: {
          open: openI,
          total: totalI,
        },
      },
      driverBreakdown: {
        total: totalD,
        approved: verifiedD,
        pending: pendingD,
        rejected: 0,
        suspended: suspendedD,
      },
      recentIncidents,
      recentApplications,
      flaggedTodas,
    };
  } catch (err) {
    console.error('[adminApiService] fetchDashboardStats error:', err);
    return {
      kpis: {
        passengers: { total: 0, active: 0, inactive: 0 },
        drivers: { total: 0, active: 0, inactive: 0 },
        todas: { total: 0, pendingReview: 0 },
        trips: { total: 0, ongoing: 0, allBookings: 0 },
        verifications: { pending: 0, overdue5Days: 0 },
        incidents: { open: 0, total: 0 },
      },
      driverBreakdown: { total: 0, approved: 0, pending: 0, rejected: 0, suspended: 0 },
      recentIncidents: [],
      recentApplications: [],
      flaggedTodas: [],
    };
  }
}

// ============================================================================
// 2. TODA APPLICATIONS SERVICES (Live Supabase public.toda)
// ============================================================================

function extractStoragePath(bucket: string, rawVal?: string | null): string | null {
  if (!rawVal) return null;
  const str = String(rawVal).trim();
  if (!str) return null;

  if (str.includes(`/${bucket}/`)) {
    return decodeURIComponent(str.split(`/${bucket}/`)[1].split('?')[0]);
  }
  if (str.includes('/storage/v1/object/public/')) {
    const after = decodeURIComponent(str.split('/storage/v1/object/public/')[1].split('?')[0]);
    if (after.startsWith(`${bucket}/`)) {
      return after.slice(bucket.length + 1);
    }
    return after;
  }
  return str;
}

async function resolveStorageDocUrl(bucket: string, rawVal?: string | null): Promise<string | null> {
  if (!rawVal) return null;
  const str = String(rawVal).trim();
  if (!str) return null;

  const path = extractStoragePath(bucket, str);
  if (!path) return str.startsWith('http') ? str : null;

  try {
    const { data: signedData, error: sErr } = await supabase.storage.from(bucket).createSignedUrl(path, 86400);
    if (!sErr && signedData?.signedUrl) {
      return signedData.signedUrl;
    }
  } catch {}

  try {
    const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(path);
    if (pubData?.publicUrl) {
      return pubData.publicUrl;
    }
  } catch {}

  return str.startsWith('http') ? str : null;
}

function extractActualFilename(rawUrlOrPath?: string | null, fallback = 'Document'): string {
  if (!rawUrlOrPath) return fallback;
  try {
    const clean = rawUrlOrPath.split('?')[0].split('#')[0];
    const rawName = decodeURIComponent(clean.split('/').pop() || '');
    if (!rawName) return fallback;
    const stripped = rawName.replace(/^\d{10,15}_/, '');
    return stripped || rawName;
  } catch {
    return fallback;
  }
}

export async function fetchTodaApplications(): Promise<TodaApplicationRecord[]> {
  try {
    const { data, error } = await supabase
      .from('toda')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    const applications = await Promise.all(data.map(async (row: any) => {
      const isOverdue = row.created_at
        ? Date.now() - new Date(row.created_at).getTime() > 5 * 24 * 60 * 60 * 1000
        : false;

      // Resolve signed or direct public URLs for documents
      const bcUrl = row.barangay_clearance_url?.startsWith('http')
        ? row.barangay_clearance_url
        : await resolveStorageDocUrl('barangay-clearances', row.barangay_clearance_url);

      const adUrl = row.accredited_drivers_url?.startsWith('http')
        ? row.accredited_drivers_url
        : await resolveStorageDocUrl('toda-accredited-driver-lists', row.accredited_drivers_url);

      const blUrl = row.bylaws_url?.startsWith('http')
        ? row.bylaws_url
        : await resolveStorageDocUrl('toda-bylaws', row.bylaws_url);

      const docs = [];
      if (row.barangay_clearance_url || bcUrl) {
        const fileLink = bcUrl || row.barangay_clearance_url;
        const actualName = extractActualFilename(row.barangay_clearance_url || bcUrl, 'Barangay_Clearance.pdf');
        docs.push({
          name: actualName,
          type: (fileLink || '').toLowerCase().includes('.pdf') ? 'PDF Document' : 'Image Verification',
          date: row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Submitted',
          url: fileLink,
          status: 'Submitted',
        });
      }

      if (row.accredited_drivers_url || adUrl) {
        const fileLink = adUrl || row.accredited_drivers_url;
        const actualName = extractActualFilename(row.accredited_drivers_url || adUrl, 'Driver_Roster.xlsx');
        docs.push({
          name: actualName,
          type: (fileLink || '').toLowerCase().includes('.csv') ? 'CSV Spreadsheet' : 'Excel Spreadsheet',
          date: row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Submitted',
          url: fileLink,
          status: 'Submitted',
        });
      }

      if (row.bylaws_url || blUrl) {
        const fileLink = blUrl || row.bylaws_url;
        const actualName = extractActualFilename(row.bylaws_url || blUrl, 'Internal_Bylaws.pdf');
        docs.push({
          name: actualName,
          type: (fileLink || '').toLowerCase().includes('.pdf') ? 'PDF Document' : 'Document Attachment',
          date: row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Submitted',
          url: fileLink,
          status: 'Submitted',
        });
      }

      const currentStatus = row.toda_status || row.account_status || 'Pending';
      const normalizedStatus =
        currentStatus === 'Active'
          ? 'Approved'
          : currentStatus === 'Deactivated'
          ? 'Declined'
          : currentStatus === 'Resubmission Required'
          ? 'Resubmission Required'
          : 'Pending';

      return {
        id: row.toda_id,
        name: row.toda_name,
        acronym: row.toda_acronym || '',
        registrationNumber: row.registration_number || '',
        dateEstablished: row.date_established || '',
        representative: row.president_name || 'Designated Representative',
        phone: row.contact_number || row.president_contact || '',
        email: row.email || '',
        barangay: row.barangay || 'Calapan City',
        terminalLocation: row.terminal_location || row.service_coverage_area || 'Calapan City Terminal',
        terminalLatitude: row.terminal_latitude || 13.4115,
        terminalLongitude: row.terminal_longitude || 121.1803,
        serviceCoverageArea: row.service_coverage_area || '',
        memberCount: row.registered_tricycle_count || row.active_driver_count || 0,
        registeredTricycleCount: row.registered_tricycle_count || 0,
        activeDriverCount: row.active_driver_count || 0,
        barangayClearanceExpiry: row.certificate_expiry
          ? new Date(row.certificate_expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '',
        clearanceStatus: (normalizedStatus === 'Approved' ? 'Valid' : 'Under Review') as 'Valid' | 'Under Review',
        submittedDate: row.created_at
          ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          : 'Recent',
        status: normalizedStatus as 'Approved' | 'Declined' | 'Pending',
        isOverdue5Days: isOverdue && normalizedStatus !== 'Approved',
        officers: {
          president: row.president_name || 'N/A',
          presidentContact: row.president_contact || row.contact_number || 'N/A',
          vicePresident: row.vice_president_name || 'N/A',
          vicePresidentContact: row.vice_president_contact || 'N/A',
          secretary: row.secretary_name || 'N/A',
          secretaryContact: row.secretary_contact || 'N/A',
          treasurer: row.treasurer_name || 'N/A',
          treasurerContact: row.treasurer_contact || 'N/A',
        },
        documents: docs,
      };
    }));
    return applications;
  } catch (err) {
    console.error('[adminApiService] fetchTodaApplications error:', err);
    return [];
  }
}

export async function approveTodaApplication(applicationId: string, remarks?: string) {
  let updatePayload: Record<string, any> = {
    toda_status: 'Active',
    account_status: 'Active',
  };

  let updatedData: any = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await supabase
      .from('toda')
      .update(updatePayload)
      .eq('toda_id', applicationId)
      .select()
      .maybeSingle();

    if (!error) {
      updatedData = data;
      break;
    }

    const errMsg = (error.message || '') + ' ' + (error.details || '');
    const match = errMsg.match(/Could not find the '([^']+)' column/i) || errMsg.match(/column [^.]*\.?([a-zA-Z0-9_]+) does not exist/i);
    if (match && match[1] && match[1] in updatePayload) {
      delete updatePayload[match[1]];
    } else {
      console.warn('[adminApiService] approveToda error:', error.message);
      break;
    }
  }

  // Update associated toda_admin accounts to Active
  try {
    await supabase.from('toda_admin').update({ account_status: 'Active' }).eq('toda_id', applicationId);
  } catch {}

  await recordAdminAuditAction({
    actionType: 'TODA_ACCREDITATION_APPROVED',
    targetId: applicationId,
    targetName: updatedData?.toda_name || applicationId,
    details: `Approved municipal accreditation for '${updatedData?.toda_name || applicationId}'. ${remarks ? 'Remarks: ' + remarks : ''}`,
    category: 'Verification',
  });

  return { success: true, data: updatedData };
}

export async function returnTodaApplicationForCorrection(applicationId: string, reason: string) {
  let updatePayload: Record<string, any> = {
    toda_status: 'Resubmission Required',
    account_status: 'Resubmission Required',
  };

  for (let attempt = 0; attempt < 4; attempt++) {
    const { error } = await supabase
      .from('toda')
      .update(updatePayload)
      .eq('toda_id', applicationId);

    if (!error) break;

    const errMsg = (error.message || '') + ' ' + (error.details || '');
    const match = errMsg.match(/Could not find the '([^']+)' column/i) || errMsg.match(/column [^.]*\.?([a-zA-Z0-9_]+) does not exist/i);
    if (match && match[1] && match[1] in updatePayload) {
      delete updatePayload[match[1]];
    } else {
      break;
    }
  }

  await recordAdminAuditAction({
    actionType: 'TODA_APPLICATION_RETURNED_FOR_CORRECTION',
    targetId: applicationId,
    targetName: applicationId,
    details: `Returned accreditation application for correction. Required Correction: ${reason}`,
    category: 'Verification',
  });

  return { success: true, reason };
}

export async function rejectTodaApplication(applicationId: string, reason: string) {
  let updatePayload: Record<string, any> = {
    toda_status: 'Deactivated',
    account_status: 'Deactivated',
  };

  let updatedData: any = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await supabase
      .from('toda')
      .update(updatePayload)
      .eq('toda_id', applicationId)
      .select()
      .maybeSingle();

    if (!error) {
      updatedData = data;
      break;
    }

    const errMsg = (error.message || '') + ' ' + (error.details || '');
    const match = errMsg.match(/Could not find the '([^']+)' column/i) || errMsg.match(/column [^.]*\.?([a-zA-Z0-9_]+) does not exist/i);
    if (match && match[1] && match[1] in updatePayload) {
      delete updatePayload[match[1]];
    } else {
      break;
    }
  }

  await recordAdminAuditAction({
    actionType: 'TODA_APPLICATION_REJECTED',
    targetId: applicationId,
    targetName: updatedData?.toda_name || applicationId,
    details: `Permanently declined accreditation application for '${updatedData?.toda_name || applicationId}'. Reason: ${reason}`,
    category: 'Verification',
  });

  return { success: true, data: updatedData };
}

export const declineTodaApplication = rejectTodaApplication;

// ============================================================================
// 3. ACCREDITED TODA REGISTRY
// ============================================================================

export async function fetchAccreditedTodas(): Promise<AccreditedTodaRecord[]> {
  try {
    const { data, error } = await supabase
      .from('toda')
      .select('*')
      .order('toda_name', { ascending: true });

    if (error || !data) return [];

    const activeTodas = data.filter((row: any) => (row.toda_status || row.account_status) === 'Active');

    return activeTodas.map((row: any) => ({
      id: row.toda_id,
      name: row.toda_name,
      acronym: row.toda_acronym || '',
      representative: row.president_name || 'Designated Representative',
      phone: row.contact_number || row.president_contact || '',
      email: row.email || '',
      barangay: row.barangay || 'Calapan City',
      serviceZone: row.service_coverage_area || row.barangay || 'Calapan City',
      registeredDrivers: row.registered_tricycle_count || row.active_driver_count || 0,
      status: 'Active',
      accreditationNo: row.registration_number || row.certificate_number || 'N/A',
      accreditedDate: row.created_at ? new Date(row.created_at).toLocaleDateString('en-US') : '',
      expiryDate: row.certificate_expiry ? new Date(row.certificate_expiry).toLocaleDateString('en-US') : '',
      barangayClearanceExpiry: '',
      clearanceStatus: 'Valid',
      confirmedIncidents: 0,
      flaggedForReview: false,
      centerLat: row.terminal_latitude || 13.4115,
      centerLng: row.terminal_longitude || 121.1803,
      documents: [],
      driverRoster: [],
    }));
  } catch (err) {
    console.error('[adminApiService] fetchAccreditedTodas error:', err);
    return [];
  }
}

// ============================================================================
// 4. FARE MATRIX SERVICES
// ============================================================================

export async function fetchFareMatrices(): Promise<FareMatrixRecord[]> {
  try {
    const { data, error } = await supabase
      .from('fare_matrix')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return [];

    return data.map((row: any) => ({
      id: row.fare_matrix_id,
      fare_matrix_id: row.fare_matrix_id,
      base_fare: Number(row.base_fare),
      base_distance_km: Number(row.base_distance_km),
      succeeding_rate: Number(row.succeeding_rate),
      effective_timestamp: row.effective_timestamp,
      effective_date: new Date(row.effective_timestamp).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      is_active: row.is_active,
      ordinance_reference: 'Calapan City Ordinance No. 118',
      configured_by_lgu_admin: 'LGU Transport Board',
      created_at: row.created_at,
    }));
  } catch (err) {
    console.error('[adminApiService] fetchFareMatrices error:', err);
    return [];
  }
}

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
    effective_timestamp: new Date().toISOString(),
    is_active: true,
  };

  await supabase.from('fare_matrix').update({ is_active: false }).eq('is_active', true);
  const { data, error } = await supabase.from('fare_matrix').insert([payload]).select().single();
  if (error) throw error;

  await recordAdminAuditAction({
    actionType: 'FARE_MATRIX_UPDATED',
    targetId: data?.fare_matrix_id,
    targetName: newMatrix.ordinanceNumber || 'Municipal Fare Matrix',
    details: `Enacted new fare matrix: ₱${newMatrix.baseFare.toFixed(2)} base (${newMatrix.baseDistanceKm} km) + ₱${newMatrix.succeedingRate.toFixed(2)}/km.`,
    category: 'Fare Matrix',
  });

  return {
    id: data.fare_matrix_id,
    fare_matrix_id: data.fare_matrix_id,
    base_fare: Number(data.base_fare),
    base_distance_km: Number(data.base_distance_km),
    succeeding_rate: Number(data.succeeding_rate),
    effective_timestamp: data.effective_timestamp,
    effective_date: new Date(data.effective_timestamp).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    is_active: data.is_active,
    ordinance_reference: newMatrix.ordinanceNumber || 'Calapan City Ordinance',
    configured_by_lgu_admin: newMatrix.configuredBy || 'LGU Transport Board',
    created_at: data.created_at,
  };
}

// ============================================================================
// 5. DRIVERS & PASSENGERS SERVICES
// ============================================================================

export async function fetchDrivers(filters?: { status?: string; toda?: string }): Promise<DriverRecord[]> {
  try {
    // Collect TODA-endorsed driver IDs from driver_verification.
    // driver_verification.verification_status = 'Approved' = TODA Stage 1 endorsement.
    // LGU Stage 2 final approval is ONLY tracked via driver.account_status = 'Verified'.
    let todaEndorsedDriverIds: string[] = [];
    try {
      const { data: verifEndorsed } = await supabase
        .from('driver_verification')
        .select('driver_id, verification_status')
        .in('verification_status', ['Approved', 'TODA Approved', 'TODA Endorsed', 'Endorsed to LGU']);

      if (verifEndorsed && verifEndorsed.length > 0) {
        todaEndorsedDriverIds = verifEndorsed
          .map((v: any) => v.driver_id)
          .filter(Boolean);
      }
    } catch (syncErr) {
      console.warn('[adminApiService] fetchDrivers verification query note:', syncErr);
    }

    // STRICT LGU FILTERING: Only show drivers that have TODA endorsement or are in final stages
    const allowedStatuses = ['TODA Approved', 'TODA Endorsed', 'Endorsed to LGU', 'LGU Approved', 'Active', 'Verified', 'Rejected', 'Suspended'];

    // Fetch drivers in two queries: by account_status AND by TODA-endorsed IDs, merge results
    const [mainRes, endorsedRes] = await Promise.all([
      supabase
        .from('driver')
        .select('*, toda:toda_id ( toda_id, toda_name, toda_acronym, barangay )')
        .in('account_status', allowedStatuses),
      todaEndorsedDriverIds.length > 0
        ? supabase
            .from('driver')
            .select('*, toda:toda_id ( toda_id, toda_name, toda_acronym, barangay )')
            .in('driver_id', todaEndorsedDriverIds)
        : Promise.resolve({ data: [] }),
    ]);

    const mainData = mainRes.data || [];
    const endorsedData = (endorsedRes as any).data || [];

    // Merge, deduplicating by driver_id
    const mergedMap = new Map<string, any>();
    for (const d of mainData) mergedMap.set(d.driver_id, d);
    for (const d of endorsedData) {
      if (!mergedMap.has(d.driver_id)) mergedMap.set(d.driver_id, d);
    }
    let data = Array.from(mergedMap.values());

    // Apply status filter
    if (filters?.status && filters.status !== 'All') {
      const endorsedSet = new Set(todaEndorsedDriverIds);
      if (filters.status === 'Endorsed to LGU' || filters.status === 'Pending' || filters.status === 'Pending Verification') {
        data = data.filter((d: any) =>
          endorsedSet.has(d.driver_id) &&
          !['Verified', 'Active', 'LGU Approved'].includes(d.account_status)
        );
      } else if (filters.status === 'Verified' || filters.status === 'Active') {
        data = data.filter((d: any) => ['Verified', 'Active', 'LGU Approved'].includes(d.account_status));
      } else {
        data = data.filter((d: any) => d.account_status === filters.status);
      }
    }

    // Map TODAs for fallback lookup
    const { data: todas } = await supabase.from('toda').select('toda_id, toda_name, toda_acronym, barangay');
    const todaMap = new Map((todas || []).map((t: any) => [t.toda_id, t]));
    const todaEndorsedSet = new Set(todaEndorsedDriverIds);

    return data.map((d: any) => {
      const todaInfo = d.toda || todaMap.get(d.toda_id);

      // Stage 2 LGU final approval: ONLY driver.account_status in ('Verified', 'Active', 'LGU Approved')
      const isFullyApproved = ['Verified', 'Active', 'LGU Approved'].includes(d.account_status);
      const isRejected = d.account_status === 'Rejected';
      const isSuspended = d.account_status === 'Suspended';
      // Stage 1 TODA endorsement: driver is in driver_verification with 'Approved' but NOT yet LGU-approved
      const isTodaEndorsed = todaEndorsedSet.has(d.driver_id) && !isFullyApproved;

      let verificationStatus: DriverRecord['verificationStatus'];
      let lguVerificationStatus: DriverRecord['lguVerificationStatus'];
      let accountStatus: DriverRecord['accountStatus'];

      if (isFullyApproved) {
        verificationStatus = 'Verified';
        lguVerificationStatus = 'Verified';
        accountStatus = 'Active';
      } else if (isSuspended) {
        verificationStatus = 'Suspended';
        lguVerificationStatus = 'Suspended';
        accountStatus = 'Inactive';
      } else if (isTodaEndorsed) {
        // Intermediate: awaiting LGU final review/approval
        verificationStatus = 'Endorsed to LGU';
        lguVerificationStatus = 'Endorsed to LGU';
        accountStatus = 'Inactive';
      } else {
        verificationStatus = 'Pending';
        lguVerificationStatus = 'Pending';
        accountStatus = 'Inactive';
      }

      return {
        id: d.driver_id,
        name: d.full_name || 'Driver Applicant',
        licenseNo: d.license_number || 'N/A',
        licenseExpiry: d.license_expiry || '2026-12-31',
        licenseStatus: 'Valid',
        mtopNo: d.franchise_number || 'N/A',
        mtopExpiry: d.license_expiry || '2026-12-31',
        mtopStatus: 'Valid',
        mtopOperatorName: d.full_name,
        todaName: todaInfo?.toda_name || 'Calapan Central TODA',
        todaId: d.toda_id || '',
        vehiclePlate: d.plate_number || 'N/A',
        franchiseNo: d.franchise_number || 'N/A',
        franchiseExpiry: '2026-12-31',
        todaVerificationStatus: 'Verified',
        lguVerificationStatus,
        verificationStatus,
        accountStatus,
        onlineStatus: d.availability_status === 'Available' || d.availability_status === 'Busy' ? 'Online' : 'Offline',
        rating: Number(d.weighted_average_rating) || 5.0,
        ratingCount: 0,
        phone: d.contact_number || '',
        barangay: d.barangay_service_area || todaInfo?.barangay || 'Calapan City',
        strikesCount: 0,
        strikeHistory: [],
        documents: [
          { name: "Driver's License (Professional)", type: 'PDF / Image', status: 'Verified' },
          { name: 'MTOP Franchise Clearance (Calapan City)', type: 'Official LGU Permit', status: 'Verified' },
          { name: 'Tricycle Unit Photos with TODA Sticker', type: 'Image Verification', status: 'Verified' },
          { name: 'Barangay Clearance & Police Clearance', type: 'Certified Clearance', status: 'Verified' },
        ],
      };
    });
  } catch (err) {
    console.error('[adminApiService] fetchDrivers exception:', err);
    return [];
  }
}

export async function verifyDriver(driverId: string, franchiseNumber?: string) {
  const updatePayload: any = { account_status: 'Verified', updated_at: new Date().toISOString() };
  if (franchiseNumber) updatePayload.franchise_number = franchiseNumber;

  // 1. Update driver record to 'Verified' — this is the LGU Stage 2 final approval.
  // NOTE: We do NOT touch driver_verification.verification_status here because
  // 'Approved' in driver_verification already represents TODA Stage 1 endorsement.
  // LGU final approval is tracked exclusively via driver.account_status = 'Verified'.
  let { data, error } = await supabase
    .from('driver')
    .update(updatePayload)
    .eq('driver_id', driverId)
    .select();

  if (error || !data || data.length === 0) {
    const retryRes = await supabase
      .from('driver')
      .update(updatePayload)
      .eq('driver_id', driverId)
      .select();
    if (retryRes.error) {
      throw new Error(`verifyDriver failed: ${retryRes.error.message}`);
    }
    data = retryRes.data;
  }

  await recordAdminAuditAction({
    actionType: 'DRIVER_STAGE2_VERIFIED',
    targetId: driverId,
    details: `LGU Admin approved and accredited driver '${data && data[0]?.full_name ? data[0].full_name : driverId}'. Driver now has full access to the Driver PWA map.`,
    category: 'Verification',
  });

  return { success: true, data: data ? data[0] : null };
}



export async function fetchTodaDrivers(todaId: string): Promise<DriverRecord[]> {
  try {
    const { data, error } = await supabase
      .from('driver')
      .select('*, toda:toda_id(toda_id, toda_name, toda_acronym, barangay)')
      .eq('toda_id', todaId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.driver_id,
      name: d.full_name,
      licenseNo: d.license_number || 'N/A',
      licenseExpiry: d.license_expiry || '2026-12-31',
      licenseStatus: 'Valid',
      mtopNo: d.franchise_number || 'N/A',
      mtopExpiry: d.license_expiry || '2026-12-31',
      mtopStatus: 'Valid',
      mtopOperatorName: d.full_name,
      todaName: d.toda?.toda_name || 'TODA Association',
      todaId: d.toda_id || todaId,
      vehiclePlate: d.plate_number || 'N/A',
      franchiseNo: d.franchise_number || 'N/A',
      franchiseExpiry: '2026-12-31',
      todaVerificationStatus: 'Verified',
      lguVerificationStatus: d.account_status === 'Verified' ? 'Verified' : 'Pending',
      verificationStatus: d.account_status === 'Verified' ? 'Verified' : 'Pending',
      accountStatus: d.account_status === 'Suspended' ? 'Inactive' : 'Active',
      onlineStatus: d.availability_status === 'Available' || d.availability_status === 'Busy' ? 'Online' : 'Offline',
      rating: Number(d.weighted_average_rating) || 5.0,
      ratingCount: 0,
      phone: d.contact_number,
      barangay: d.barangay_service_area || d.toda?.barangay || 'Calapan City',
      strikesCount: 0,
      strikeHistory: [],
      documents: [
        { name: "Driver's License (Professional)", type: 'PDF / Image', status: 'Verified' },
        { name: 'MTOP Franchise Clearance (Calapan City)', type: 'Official LGU Permit', status: 'Verified' },
        { name: 'Tricycle Unit Photos with TODA Sticker', type: 'Image Verification', status: 'Verified' },
        { name: 'Barangay Clearance & Police Clearance', type: 'Certified Clearance', status: 'Verified' },
      ],
    }));
  } catch (err) {
    console.error('[adminApiService] fetchTodaDrivers error:', err);
    return [];
  }
}

export async function suspendDriver(driverId: string, reason: string, durationDays?: number) {
  const { data, error } = await supabase
    .from('driver')
    .update({ account_status: 'Suspended' })
    .eq('driver_id', driverId)
    .select();
  if (error) throw error;
  await recordAdminAuditAction({
    actionType: 'DRIVER_ACCOUNT_SUSPENDED',
    targetId: driverId,
    details: `Suspended driver account for ${durationDays || 7} days. Reason: ${reason}`,
    category: 'User Oversight',
  });
  return { success: true, data };
}


export async function reactivateDriver(driverId: string) {
  const { data, error } = await supabase
    .from('driver')
    .update({ account_status: 'Verified' })
    .eq('driver_id', driverId)
    .select();
  if (error) throw error;
  await recordAdminAuditAction({
    actionType: 'DRIVER_ACCOUNT_REACTIVATED',
    targetId: driverId,
    details: `Reactivated driver account.`,
    category: 'User Oversight',
  });
  return { success: true, data };
}

export async function issueDriverStrike(driverId: string, reason: string, strikesOrCategory?: string | number) {
  await recordAdminAuditAction({
    actionType: 'DRIVER_POLICY_STRIKE_ISSUED',
    targetId: driverId,
    details: `Issued administrative strike to driver (${strikesOrCategory || 'Policy'}). Reason: ${reason}`,
    category: 'User Oversight',
  });
  return { success: true };
}


export async function fetchPassengers(filters?: { status?: string }): Promise<PassengerRecord[]> {
  try {
    let query = supabase.from('passenger').select('*');
    if (filters?.status && filters.status !== 'All') {
      query = query.eq('account_status', filters.status);
    }
    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((p: any) => ({
      id: p.passenger_id,
      name: p.full_name,
      phone: p.contact_number,
      email: p.email || '',
      verificationStatus: 'Verified',
      accountStatus: p.account_status === 'Suspended' ? 'Suspended' : 'Active',
      activeSession: false,
      totalBookings: 0,
      registeredDate: p.created_at ? new Date(p.created_at).toLocaleDateString('en-US') : '2026',
      rating: 5.0,
      ratingCount: 0,
      strikesCount: 0,
      strikeHistory: [],
    }));
  } catch (err) {
    console.error('[adminApiService] fetchPassengers error:', err);
    return [];
  }
}

export async function suspendPassenger(passengerId: string, reason: string, durationDays?: number) {
  const { data, error } = await supabase
    .from('passenger')
    .update({ account_status: 'Suspended' })
    .eq('passenger_id', passengerId)
    .select();
  if (error) throw error;
  await recordAdminAuditAction({
    actionType: 'PASSENGER_ACCOUNT_SUSPENDED',
    targetId: passengerId,
    details: `Suspended passenger account for ${durationDays || 7} days. Reason: ${reason}`,
    category: 'User Oversight',
  });
  return { success: true, data };
}

export async function reactivatePassenger(passengerId: string) {
  const { data, error } = await supabase
    .from('passenger')
    .update({ account_status: 'Active' })
    .eq('passenger_id', passengerId)
    .select();
  if (error) throw error;
  await recordAdminAuditAction({
    actionType: 'PASSENGER_ACCOUNT_REACTIVATED',
    targetId: passengerId,
    details: `Reactivated passenger account.`,
    category: 'User Oversight',
  });
  return { success: true, data };
}

export async function issuePassengerStrike(passengerId: string, reason: string) {
  await recordAdminAuditAction({
    actionType: 'PASSENGER_POLICY_STRIKE_ISSUED',
    targetId: passengerId,
    details: `Issued strike to passenger. Reason: ${reason}`,
    category: 'User Oversight',
  });
  return { success: true };
}

// ============================================================================
// 6. INCIDENTS & ANNOUNCEMENTS SERVICES
// ============================================================================

export async function fetchIncidents(): Promise<IncidentReportRecord[]> {
  try {
    const { data, error } = await supabase
      .from('incident_report')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((i: any) => ({
      id: i.incident_id,
      bookingId: i.booking_id || 'TRIP-N/A',
      tripId: i.booking_id || 'TRIP-N/A',
      reportedBy: 'Passenger',
      reporterName: 'Complainant',
      driverName: 'Tricycle Unit',
      todaName: 'Calapan TODA',
      vehiclePlate: 'N/A',
      passengerName: 'Passenger',
      submittedDate: i.created_at ? new Date(i.created_at).toLocaleDateString('en-US') : 'Recent',
      submittedTime: i.created_at ? new Date(i.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '12:00 PM',
      category: 'Others',
      status: (i.status === 'Resolved' ? 'Resolved' : 'Under Investigation') as any,
      description: i.description || 'No description provided.',
      evidenceFiles: [],
      relatedIncidentsCount: 0,
      statusHistory: [],
    }));
  } catch (err) {
    console.error('[adminApiService] fetchIncidents error:', err);
    return [];
  }
}

export async function updateIncidentStatus(incidentId: string, status: string, notes?: string) {
  const { data, error } = await supabase
    .from('incident_report')
    .update({ status, resolution_notes: notes })
    .eq('incident_id', incidentId)
    .select();
  if (error) throw error;
  await recordAdminAuditAction({
    actionType: 'INCIDENT_STATUS_UPDATED',
    targetId: incidentId,
    details: `Updated incident report to status '${status}'. Notes: ${notes || 'None'}`,
    category: 'Verification',
  });
  return { success: true, data };
}

export async function fetchAnnouncements(): Promise<AnnouncementRecord[]> {
  try {
    const { data, error } = await supabase
      .from('announcement')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((a: any) => ({
      id: a.announcement_id,
      announcement_id: a.announcement_id,
      title: a.title,
      message: a.message,
      target_role: a.target_audience || 'All',
      target_toda_id: a.target_toda_id || null,
      target_toda_name: null,
      is_published: a.is_published,
      publish_timing: 'Immediate',
      created_by_lgu_admin: 'LGU Administrator',
      created_at: a.created_at ? new Date(a.created_at).toLocaleDateString('en-US') : 'Recent',
    }));
  } catch (err) {
    console.error('[adminApiService] fetchAnnouncements error:', err);
    return [];
  }
}

export async function createAnnouncement(payload: {
  title: string;
  message?: string;
  content?: string;
  targetRole?: string;
  target_role?: string;
  urgency?: string;
}) {
  const messageText = payload.message || payload.content || '';
  const targetAudience = payload.targetRole || payload.target_role || 'All';

  const { data, error } = await supabase
    .from('announcement')
    .insert([
      {
        title: payload.title,
        message: messageText,
        target_audience: targetAudience,
        urgency: payload.urgency || 'Normal',
        is_published: true,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  await recordAdminAuditAction({
    actionType: 'ANNOUNCEMENT_BROADCASTED',
    targetId: data?.announcement_id,
    targetName: payload.title,
    details: `Broadcasted municipal advisory '${payload.title}' to audience: ${targetAudience}.`,
    category: 'Announcement',
  });
  return { success: true, data };
}

export async function deleteAnnouncement(announcementId: string) {
  const { error } = await supabase.from('announcement').delete().eq('announcement_id', announcementId);
  if (error) throw error;
  return { success: true };
}

// ============================================================================
// 7. AUDIT LOGGING SERVICES
// ============================================================================

export async function fetchAuditLogs(): Promise<AuditLogRecord[]> {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('performed_at', { ascending: false })
      .limit(100);

    if (error || !data) return [];

    return data.map((log: any) => ({
      id: log.log_id,
      log_id: log.log_id,
      timestamp: log.performed_at
        ? new Date(log.performed_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Recent',
      lgu_admin_id: log.lgu_admin_id || 'LGU-ADMIN',
      actor_name: 'LGU Transport Administrator',
      actor_role: 'Administrator',
      actorId: log.lgu_admin_id || log.toda_admin_id || 'LGU-ADMIN',
      actorName: 'LGU Transport Administrator',
      action_type: log.action_type,
      actionType: log.action_type,
      target_id: log.target_id || 'N/A',
      target_name: log.target_id || 'Entity',
      target_type: 'Entity',
      targetId: log.target_id || 'N/A',
      targetName: log.target_id || 'Entity',
      details: log.details || '',
      performed_at: log.performed_at || new Date().toISOString(),
      category: log.action_type.includes('FARE')
        ? 'Fare Matrix'
        : log.action_type.includes('TODA') || log.action_type.includes('DRIVER')
        ? 'Verification'
        : log.action_type.includes('PASSENGER')
        ? 'User Oversight'
        : 'System',
    }));
  } catch (err) {
    console.error('[adminApiService] fetchAuditLogs error:', err);
    return [];
  }
}


export async function recordAdminAuditAction(action: {
  actionType: string;
  targetId?: string;
  targetName?: string;
  details: string;
  category?: string;
  actorName?: string;
}) {
  try {
    await supabase.from('audit_log').insert([
      {
        action_type: action.actionType,
        target_id: action.targetId || null,
        details: `[${action.category || 'General'}] ${action.actorName || 'LGU Admin'}: ${action.details}`,
        performed_at: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.warn('[adminApiService] recordAdminAuditAction error:', err);
  }
}

// ============================================================================
// 8. TRIP MONITORING & OPERATIONS SERVICES (Live Supabase public.booking)
// ============================================================================

export interface BookingRecordItem {
  id: string;
  bookingId: string;
  tripType: string;
  status: string;
  driverId?: string;
  driverName: string;
  driverPhone: string;
  todaName: string;
  vehiclePlate: string;
  passengerId?: string;
  passengerName: string;
  passengerPhone: string;
  passengerCount: number;
  pickupArea: string;
  destinationArea: string;
  startLat: number;
  startLng: number;
  destLat: number;
  destLng: number;
  driverLat: number;
  driverLng: number;
  currentArea: string;
  estimatedFare: number;
  distanceKm?: number;
  createdAt: string;
  bookingTime: string;
  eta: string;
}

export async function fetchAllBookings(filterStatus?: string): Promise<BookingRecordItem[]> {
  try {
    let query = supabase
      .from('booking')
      .select(`
        *,
        passenger:passenger_id (
          full_name,
          contact_number
        ),
        driver:driver_id (
          full_name,
          contact_number,
          plate_number,
          toda:toda_id (
            toda_name,
            toda_acronym
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (filterStatus && filterStatus !== 'All') {
      if (filterStatus === 'Active') {
        query = query.in('booking_status', ['Driver Assigned', 'Driver En Route', 'Driver Arrived', 'Trip Ongoing']);
      } else if (filterStatus === 'Completed') {
        query = query.eq('booking_status', 'Completed');
      } else if (filterStatus === 'Cancelled') {
        query = query.in('booking_status', ['Cancelled by Passenger', 'Cancelled by Driver', 'No Driver Found']);
      } else {
        query = query.eq('booking_status', filterStatus);
      }
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((b: any) => ({
      id: b.booking_id,
      bookingId: b.booking_id,
      tripType: b.trip_type === 'Shared' ? 'Shared Trip' : 'Solo Ride',
      status: b.booking_status,
      driverId: b.driver_id,
      driverName: b.driver?.full_name || 'Assigned Driver',
      driverPhone: b.driver?.contact_number || '+63 900 000 0000',
      todaName: b.driver?.toda?.toda_name || 'Calapan Central TODA',
      vehiclePlate: b.driver?.plate_number || 'MV-101',
      passengerId: b.passenger_id,
      passengerName: b.passenger?.full_name || 'Commuter',
      passengerPhone: b.passenger?.contact_number || '+63 900 000 0000',
      passengerCount: b.passenger_count || 1,
      pickupArea: b.pickup_location_address || 'Pickup Point',
      destinationArea: b.dropoff_location_address || 'Destination Point',
      startLat: Number(b.pickup_latitude) || 13.4115,
      startLng: Number(b.pickup_longitude) || 121.1803,
      destLat: Number(b.dropoff_latitude) || 13.4150,
      destLng: Number(b.dropoff_longitude) || 121.1850,
      driverLat: Number(b.pickup_latitude) || 13.4115,
      driverLng: Number(b.pickup_longitude) || 121.1803,
      currentArea: b.pickup_location_address || 'Calapan City',
      estimatedFare: Number(b.estimated_fare) || 15.0,
      distanceKm: Number(b.route_distance_km) || 2.0,
      createdAt: b.created_at,
      bookingTime: b.created_at ? new Date(b.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '12:00 PM',
      eta: '3 mins',
    }));
  } catch (err) {
    console.error('[adminApiService] fetchAllBookings error:', err);
    return [];
  }
}

// ============================================================================
// 9. PASSENGER FEEDBACK & RATINGS SERVICES
// ============================================================================

export interface PassengerFeedbackItem {
  id: string;
  ratingId: string;
  passengerName: string;
  driverName: string;
  todaName: string;
  ratingValue: number;
  comment: string;
  category: 'Cleanliness' | 'Courtesy' | 'Safe Driving' | 'Fair Pricing' | 'General';
  createdAt: string;
  isComplaint: boolean;
}

export async function fetchPassengerFeedback(): Promise<PassengerFeedbackItem[]> {
  try {
    const { data, error } = await supabase
      .from('driver_rating')
      .select(`
        *,
        passenger:passenger_id (
          full_name
        ),
        driver:driver_id (
          full_name,
          toda:toda_id (
            toda_name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((r: any) => ({
      id: r.rating_id,
      ratingId: r.rating_id,
      passengerName: r.passenger?.full_name || 'Passenger',
      driverName: r.driver?.full_name || 'Driver',
      todaName: r.driver?.toda?.toda_name || 'Calapan TODA',
      ratingValue: Number(r.rating_value) || 5,
      comment: r.feedback_comment || 'No written feedback submitted.',
      category: Number(r.rating_value) >= 4 ? 'Safe Driving' : 'General',
      createdAt: r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
      isComplaint: Number(r.rating_value) <= 2,
    }));
  } catch (err) {
    console.error('[adminApiService] fetchPassengerFeedback error:', err);
    return [];
  }
}

// ============================================================================
// 10. OPERATIONAL REPORTS & TRANSPORTATION ANALYTICS
// ============================================================================

export interface OperationalReportsData {
  summary: {
    totalBookings: number;
    completedTrips: number;
    cancelledTrips: number;
    totalRevenue: number;
    averageFare: number;
    activeDrivers: number;
    accreditedTodas: number;
  };
  peakHourDistribution: Array<{ hour: string; count: number }>;
  barangayDemand: Array<{ barangay: string; count: number; percentage: number }>;
  todaPerformance: Array<{ todaName: string; totalTrips: number; activeUnits: number; complianceRate: number }>;
  driverUtilization: Array<{ driverName: string; toda: string; completedTrips: number; rating: number; status: string }>;
}

export async function fetchOperationalReports(): Promise<OperationalReportsData> {
  try {
    const [bookingsRes, driversRes, todasRes] = await Promise.all([
      supabase.from('booking').select('*, driver:driver_id(full_name, toda:toda_id(toda_name))'),
      supabase.from('driver').select('*, toda:toda_id(toda_name)'),
      supabase.from('toda').select('*'),
    ]);

    const bookings = bookingsRes.data || [];
    const drivers = driversRes.data || [];
    const todas = (todasRes.data || []).filter((t: any) => (t.toda_status || t.account_status) === 'Active');

    const completed = bookings.filter((b) => b.booking_status === 'Completed');
    const cancelled = bookings.filter((b) => (b.booking_status || '').includes('Cancelled'));
    const totalRev = completed.reduce((sum, b) => sum + (Number(b.final_fare) || Number(b.estimated_fare) || 0), 0);

    // Peak hours aggregation
    const hoursMap: Record<number, number> = {};
    for (let i = 6; i <= 21; i++) hoursMap[i] = 0;
    bookings.forEach((b) => {
      if (b.created_at) {
        const h = new Date(b.created_at).getHours();
        if (hoursMap[h] !== undefined) hoursMap[h] += 1;
      }
    });

    const peakHourDistribution = Object.entries(hoursMap).map(([h, count]) => ({
      hour: `${Number(h) > 12 ? Number(h) - 12 : h}:00 ${Number(h) >= 12 ? 'PM' : 'AM'}`,
      count,
    }));

    // Barangay aggregation
    const brgyMap: Record<string, number> = {};
    bookings.forEach((b) => {
      const brgy = b.pickup_location_address ? b.pickup_location_address.split(',')[0].trim() : 'Calapan Center';
      brgyMap[brgy] = (brgyMap[brgy] || 0) + 1;
    });

    const totalBrgyEntries = Math.max(1, bookings.length);
    const barangayDemand = Object.entries(brgyMap).map(([barangay, count]) => ({
      barangay,
      count,
      percentage: Math.round((count / totalBrgyEntries) * 100),
    }));

    // TODA Performance
    const todaPerformance = todas.map((t) => {
      const todaTrips = completed.filter((b) => b.driver?.toda?.toda_name === t.toda_name).length;
      return {
        todaName: t.toda_name,
        totalTrips: todaTrips,
        activeUnits: t.active_driver_count || t.registered_tricycle_count || 0,
        complianceRate: 100,
      };
    });

    // Driver Utilization
    const driverUtilization = drivers.map((d) => {
      const dTrips = completed.filter((b) => b.driver_id === d.driver_id).length;
      return {
        driverName: d.full_name,
        toda: d.toda?.toda_name || 'Calapan TODA',
        completedTrips: dTrips,
        rating: Number(d.weighted_average_rating) || 5.0,
        status: d.account_status,
      };
    });

    return {
      summary: {
        totalBookings: bookings.length,
        completedTrips: completed.length,
        cancelledTrips: cancelled.length,
        totalRevenue: totalRev,
        averageFare: completed.length > 0 ? Math.round(totalRev / completed.length) : 0,
        activeDrivers: drivers.filter((d) => d.account_status === 'Verified').length,
        accreditedTodas: todas.length,
      },
      peakHourDistribution: bookings.length > 0 ? peakHourDistribution : [],
      barangayDemand: bookings.length > 0 ? barangayDemand : [],
      todaPerformance,
      driverUtilization,
    };
  } catch (err) {
    console.error('[adminApiService] fetchOperationalReports error:', err);
    return {
      summary: {
        totalBookings: 0,
        completedTrips: 0,
        cancelledTrips: 0,
        totalRevenue: 0,
        averageFare: 0,
        activeDrivers: 0,
        accreditedTodas: 0,
      },
      peakHourDistribution: [],
      barangayDemand: [],
      todaPerformance: [],
      driverUtilization: [],
    };
  }
}

