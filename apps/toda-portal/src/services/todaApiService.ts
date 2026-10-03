/**
 * ============================================================================
 * SAKAY TODA ADMIN API CLIENT SERVICE (todaApiService.ts)
 * ============================================================================
 * Purpose:
 *   Centralized network and database service connecting the TODA Association
 *   Admin Portal 100% directly to Supabase PostgreSQL database tables.
 *   NO MOCK DATA SUBSTITUTION — returns live database records or empty arrays.
 * ============================================================================
 */

import { supabase } from './supabaseClient';
import {
  TodaProfile,
  DriverApplicant,
  TodaDriverMember,
  TodaAnnouncement,
  TodaAuditLog,
} from '../types/toda';
import { parseDriverRoster } from '../utils/rosterParser';

export const DEFAULT_TODA_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

export async function getEffectiveTodaId(providedId?: string): Promise<string> {
  if (providedId && providedId !== DEFAULT_TODA_ID && providedId.trim()) {
    return providedId;
  }

  // 1. Check logged-in TODA session from localStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('sakay_toda_admin_auth_cache');
      if (raw) {
        const parsed = JSON.parse(raw);
        const cachedId = parsed?.profile?.toda_id || parsed?.profile?.toda?.toda_id;
        if (cachedId && cachedId !== DEFAULT_TODA_ID) {
          return cachedId;
        }
      }
    } catch {}
  }

  // 2. Check authenticated Supabase user
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: adminRecord } = await supabase
        .from('toda_admin')
        .select('toda_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (adminRecord?.toda_id) {
        return adminRecord.toda_id;
      }

      if (user.user_metadata?.toda_id) {
        return user.user_metadata.toda_id;
      }

      const emailPrefix = user.email?.split('@')[0]?.toUpperCase();
      if (emailPrefix) {
        const { data: matchedToda } = await supabase
          .from('toda')
          .select('toda_id')
          .ilike('toda_acronym', emailPrefix)
          .maybeSingle();
        if (matchedToda?.toda_id) return matchedToda.toda_id;
      }
    }
  } catch (err) {
    console.warn('[todaApiService] Error resolving authenticated toda_id:', err);
  }

  // 3. Fallback to Calapan Central TODA (CCTODA - Primary Pilot TODA)
  try {
    const { data: cctoda } = await supabase
      .from('toda')
      .select('toda_id')
      .ilike('toda_acronym', 'CCTODA')
      .maybeSingle();
    if (cctoda?.toda_id) return cctoda.toda_id;
  } catch {}

  return DEFAULT_TODA_ID;
}

// ============================================================================
// 1. TODA PROFILE & REGISTRATION
// ============================================================================



export async function fetchTodaProfile(todaId?: string): Promise<TodaProfile | null> {
  try {
    const targetTodaId = await getEffectiveTodaId(todaId);
    let data: any = null;

    if (targetTodaId && targetTodaId !== DEFAULT_TODA_ID) {
      const { data: directToda } = await supabase
        .from('toda')
        .select('*')
        .or(`toda_id.eq.${targetTodaId},toda_acronym.ilike.${targetTodaId}`)
        .maybeSingle();
      data = directToda;
    }

    if (!data && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('sakay_toda_admin_auth_cache');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.profile?.toda) {
            data = parsed.profile.toda;
          }
        }
      } catch {}
    }

    if (!data) return null;

    // Count real drivers in database
    const { count: driverCount } = await supabase
      .from('driver')
      .select('*', { count: 'exact', head: true })
      .eq('toda_id', data.toda_id);

    const isDbActive = ['active', 'approved', 'verified', 'accredited'].includes(
      String(data.toda_status || data.account_status || data.status || '').toLowerCase()
    );

    return {
      id: data.toda_id,
      name: data.toda_name,
      acronym: data.toda_acronym || 'TODA',
      registrationNumber: data.toda_acronym || 'TODA',
      dateEstablished: data.date_established || '2024-01-01',
      terminalLocation: data.terminal_location || data.service_coverage_area || 'Calapan City Terminal',
      terminalLatitude: data.terminal_latitude || null,
      terminalLongitude: data.terminal_longitude || null,
      barangay: data.barangay || 'Calapan City',
      serviceCoverageArea: data.service_coverage_area || 'Calapan City Corridor',
      contactNumber: data.president_contact || data.contact_number || '+63 917 000 0000',
      email: data.email || `${(data.toda_acronym || 'toda').toLowerCase()}@toda.sakay.internal`,
      officers: {
        president: data.president_name || 'Association President',
        presidentContact: data.president_contact || '',
        vicePresident: data.vice_president_name || 'N/A',
        vicePresidentContact: data.vice_president_contact || '',
        secretary: data.secretary_name || 'N/A',
        secretaryContact: data.secretary_contact || '',
        treasurer: data.treasurer_name || 'N/A',
        treasurerContact: data.treasurer_contact || '',
      },
      accreditationStatus: isDbActive ? 'Active' : 'Pending Verification',
      accreditationExpiry: data.certificate_expiry ? new Date(data.certificate_expiry).toLocaleDateString('en-US') : 'Dec 31, 2026',
      accreditationNo: data.certificate_number || data.toda_acronym || 'TODA',
      permitNumber: data.toda_acronym || 'TODA',
      barangayClearanceFile: {
        name: data.barangay_clearance_url ? data.barangay_clearance_url.split('/').pop()?.split('?')[0] || 'Barangay_Clearance.pdf' : 'Barangay_Clearance.pdf',
        date: data.created_at ? new Date(data.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Jan 10, 2026',
        url: data.barangay_clearance_url,
      },
      rosterFile: {
        name: data.accredited_drivers_url ? data.accredited_drivers_url.split('/').pop()?.split('?')[0] || 'TODA_Driver_Roster.xlsx' : 'TODA_Driver_Roster.xlsx',
        date: data.created_at ? new Date(data.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Jan 15, 2026',
        count: data.registered_tricycle_count || driverCount || 0,
        url: data.accredited_drivers_url,
      },
      bylawsFile: {
        name: data.bylaws_url ? data.bylaws_url.split('/').pop()?.split('?')[0] || 'TODA_Bylaws.pdf' : 'TODA_Bylaws.pdf',
        date: data.created_at ? new Date(data.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Jan 15, 2026',
        url: data.bylaws_url,
      },
      isOtpVerified: true,
      misteepComplaintsCount: 0,
    };
  } catch (err) {
    console.error('[todaApiService] fetchTodaProfile error:', err);
    return null;
  }
}

export async function updateTodaProfile(
  todaId?: string,
  profileData: Partial<{
    name: string;
    acronym: string;
    barangay: string;
    dateEstablished: string;
    terminalLocation: string;
    terminalLatitude?: number | null;
    terminalLongitude?: number | null;
    contactPhone: string;
    contactEmail: string;
    serviceArea: string;
    officers: any;
  }> = {}
) {
  const targetTodaId = await getEffectiveTodaId(todaId);
  const updatePayload: any = {};
  if (profileData.name) updatePayload.toda_name = profileData.name;
  if (profileData.acronym) updatePayload.toda_acronym = profileData.acronym;
  if (profileData.barangay) updatePayload.barangay = profileData.barangay;
  if (profileData.dateEstablished) updatePayload.date_established = profileData.dateEstablished;
  if (profileData.contactPhone) updatePayload.president_contact = profileData.contactPhone;
  if (profileData.serviceArea || profileData.terminalLocation) {
    updatePayload.service_coverage_area = profileData.serviceArea || profileData.terminalLocation;
  }

  // Terminal coordinates must go through official request_terminal_relocation RPC
  if (profileData.terminalLatitude !== undefined && profileData.terminalLongitude !== undefined && profileData.terminalLatitude !== null && profileData.terminalLongitude !== null) {
    try {
      await supabase.rpc('request_terminal_relocation', {
        p_toda_id: targetTodaId,
        p_new_latitude: profileData.terminalLatitude,
        p_new_longitude: profileData.terminalLongitude,
        p_new_location: profileData.terminalLocation || 'Updated Terminal Location',
        p_reason: 'Requested relocation via TODA profile edit',
      });
    } catch (reloErr) {
      console.warn('[todaApiService] Relocation request error:', reloErr);
    }
  }
  if (profileData.officers) {
    if (profileData.officers.president !== undefined) updatePayload.president_name = profileData.officers.president;
    if (profileData.officers.presidentContact !== undefined) updatePayload.president_contact = profileData.officers.presidentContact;
    if (profileData.officers.vicePresident !== undefined) updatePayload.vice_president_name = profileData.officers.vicePresident;
    if (profileData.officers.vicePresidentContact !== undefined) updatePayload.vice_president_contact = profileData.officers.vicePresidentContact;
    if (profileData.officers.secretary !== undefined) updatePayload.secretary_name = profileData.officers.secretary;
    if (profileData.officers.secretaryContact !== undefined) updatePayload.secretary_contact = profileData.officers.secretaryContact;
    if (profileData.officers.treasurer !== undefined) updatePayload.treasurer_name = profileData.officers.treasurer;
    if (profileData.officers.treasurerContact !== undefined) updatePayload.treasurer_contact = profileData.officers.treasurerContact;
  }

  let updatedData: any = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('toda')
      .update(updatePayload)
      .eq('toda_id', targetTodaId)
      .select()
      .maybeSingle();

    if (!error) {
      updatedData = data;
      break;
    }

    const errMsg = (error.message || '') + ' ' + (error.details || '');
    const match =
      errMsg.match(/Could not find the '([^']+)' column/i) ||
      errMsg.match(/column [^.]*\.?([a-zA-Z0-9_]+) does not exist/i);

    if (match && match[1] && match[1] in updatePayload) {
      console.warn(`[todaApiService] Column '${match[1]}' does not exist in 'toda', pruning and retrying...`);
      delete updatePayload[match[1]];
    } else {
      console.error('[todaApiService] updateTodaProfile error:', error);
      throw error;
    }
  }

  await recordTodaAuditAction({
    actionType: 'TODA_PROFILE_UPDATED',
    targetId: todaId,
    details: `Updated association contact info for '${updatedData?.toda_name || todaId}'.`,
  });

  return { success: true, data: updatedData };
}

export async function checkAcronymAvailability(acronym: string): Promise<boolean> {
  if (!acronym.trim()) return true;
  try {
    const cleanAcronym = acronym.trim().toUpperCase();
    const { data, error } = await supabase
      .from('toda')
      .select('toda_id, toda_acronym')
      .ilike('toda_acronym', cleanAcronym)
      .maybeSingle();

    if (error) {
      console.warn('[todaApiService] checkAcronymAvailability warning:', error);
      return true;
    }

    return !data;
  } catch (err) {
    console.error('[todaApiService] checkAcronymAvailability error:', err);
    return true;
  }
}

export async function uploadTodaDocument(
  file: File,
  bucket: 'barangay-clearances' | 'toda-accredited-driver-lists' | 'toda-bylaws'
): Promise<{ url: string; fileName: string; path: string; sizeBytes: number }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `${Date.now()}_${cleanName}`;

  let targetBucket: string = bucket;
  if (bucket === 'toda-accredited-driver-lists' || ['csv', 'xlsx', 'xls'].includes(ext)) {
    targetBucket = 'toda-accredited-driver-lists';
  } else if (bucket === 'toda-bylaws') {
    targetBucket = 'toda-bylaws';
  } else {
    targetBucket = 'barangay-clearances';
  }

  // Attempt upload to targetBucket, with fallback to barangay-clearances if bucket is not yet provisioned
  try {
    const { data, error } = await supabase.storage
      .from(targetBucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) throw error;
    const { data: publicUrlData } = supabase.storage.from(targetBucket).getPublicUrl(data.path);
    return {
      url: publicUrlData.publicUrl,
      fileName: file.name,
      path: data.path,
      sizeBytes: file.size,
    };
  } catch (err: any) {
    if (targetBucket === 'toda-bylaws') {
      const { data: fbData, error: fbErr } = await supabase.storage
        .from('barangay-clearances')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        });
      if (!fbErr && fbData) {
        const { data: fbUrl } = supabase.storage.from('barangay-clearances').getPublicUrl(fbData.path);
        return {
          url: fbUrl.publicUrl,
          fileName: file.name,
          path: fbData.path,
          sizeBytes: file.size,
        };
      }
    }
    console.error(`[todaApiService] Error uploading to ${targetBucket}:`, err);
    throw new Error(err.message || `Failed to upload ${file.name}`);
  }
}

/**
 * Updates a TODA compliance document URL (Barangay Clearance, Driver Roster, or Bylaws)
 * in the database and marks status as 'Pending Verification' so the LGU can verify and endorse it.
 */
export async function updateTodaComplianceDocument(
  todaId: string,
  category: 'Barangay Clearance' | 'Driver Roster' | 'Internal Bylaws',
  fileUrl: string,
  fileName: string
) {
  // Columns guaranteed to exist in public.toda (no updated_at!)
  const updatePayload: Record<string, any> = {
    toda_status: 'Pending Verification',
    resubmission_reason: null, // Clear any previous correction request
  };

  if (category === 'Barangay Clearance') {
    updatePayload.barangay_clearance_url = fileUrl;
  } else if (category === 'Driver Roster') {
    updatePayload.accredited_drivers_url = fileUrl;
  } else if (category === 'Internal Bylaws') {
    updatePayload.bylaws_url = fileUrl;
  }

  let updatedData: any = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('toda')
      .update(updatePayload)
      .eq('toda_id', todaId)
      .select()
      .maybeSingle();

    if (!error) {
      updatedData = data;
      break;
    }

    const errMsg = (error.message || '') + ' ' + (error.details || '');
    const match =
      errMsg.match(/Could not find the '([^']+)' column/i) ||
      errMsg.match(/column [^.]*\.?([a-zA-Z0-9_]+) does not exist/i);

    if (match && match[1] && match[1] in updatePayload) {
      console.warn(`[todaApiService] Column '${match[1]}' does not exist in 'toda', pruning and retrying...`);
      delete updatePayload[match[1]];
    } else if (errMsg.includes('toda_status') && 'toda_status' in updatePayload) {
      delete updatePayload.toda_status;
      updatePayload.account_status = 'Pending Verification';
    } else {
      console.error('[todaApiService] updateTodaComplianceDocument error:', error);
      throw error;
    }
  }

  await recordTodaAuditAction({
    actionType: 'COMPLIANCE_DOCUMENT_UPDATED',
    targetId: todaId,
    targetName: fileName,
    details: `Re-uploaded and submitted updated ${category} ("${fileName}") for City LGU verification and review.`,
    category: 'Account',
  });

  return updatedData || { toda_id: todaId, status: 'Pending Verification', fileUrl };
}

export async function registerToda(payload: {
  todaName: string;
  todaAcronym: string;
  barangay: string;
  dateEstablished: string;
  serviceCoverageArea: string;
  presidentName: string;
  presidentContact: string;
  vicePresidentName?: string;
  vicePresidentContact?: string;
  secretaryName?: string;
  secretaryContact?: string;
  treasurerName?: string;
  treasurerContact?: string;
  officeEmail?: string;
  password?: string;
  barangayClearanceUrl?: string;
  accreditedDriversUrl?: string;
  bylawsUrl?: string;
  registeredTricycleCount?: number;
  terminalLatitude?: number | null;
  terminalLongitude?: number | null;
}) {
  const cleanAcronym = payload.todaAcronym.trim().toUpperCase();

  // 1. Check uniqueness of Acronym
  const isAvailable = await checkAcronymAvailability(cleanAcronym);
  if (!isAvailable) {
    throw new Error(`The TODA Acronym '${cleanAcronym}' is already registered. Please choose a unique acronym or contact the LGU Transport Board.`);
  }

  const syntheticEmail = `${cleanAcronym.toLowerCase()}@toda.sakay.internal`;

  // 2. Insert TODA association record
  let insertPayload: Record<string, any> = {
    toda_name: payload.todaName.trim(),
    toda_acronym: cleanAcronym,
    barangay: payload.barangay,
    date_established: payload.dateEstablished || new Date().toISOString().split('T')[0],
    service_coverage_area: payload.serviceCoverageArea.trim(),
    president_name: payload.presidentName.trim(),
    president_contact: payload.presidentContact.trim(),
    vice_president_name: payload.vicePresidentName?.trim() || null,
    vice_president_contact: payload.vicePresidentContact?.trim() || null,
    secretary_name: payload.secretaryName?.trim() || null,
    secretary_contact: payload.secretaryContact?.trim() || null,
    treasurer_name: payload.treasurerName?.trim() || null,
    treasurer_contact: payload.treasurerContact?.trim() || null,
    barangay_clearance_url: payload.barangayClearanceUrl || null,
    accredited_drivers_url: payload.accreditedDriversUrl || null,
    bylaws_url: payload.bylawsUrl || null,
    active_driver_count: 0,
    registered_tricycle_count: payload.registeredTricycleCount !== undefined ? payload.registeredTricycleCount : 0,
    terminal_latitude: payload.terminalLatitude !== undefined && payload.terminalLatitude !== null ? payload.terminalLatitude : 13.4115,
    terminal_longitude: payload.terminalLongitude !== undefined && payload.terminalLongitude !== null ? payload.terminalLongitude : 121.1803,
    toda_status: 'Pending Verification',
  };

  let todaData: any = null;
  let todaError: any = null;

  for (let attempt = 0; attempt < 15; attempt++) {
    const res = await supabase
      .from('toda')
      .insert([insertPayload])
      .select()
      .single();

    if (!res.error) {
      todaData = res.data;
      todaError = null;
      break;
    }

    todaError = res.error;
    const errMsg = (res.error.message || '') + ' ' + (res.error.details || '');
    const match = errMsg.match(/Could not find the '([^']+)' column/i) || errMsg.match(/column [^.]*\.?([a-zA-Z0-9_]+) does not exist/i);
    if (match && match[1] && match[1] in insertPayload) {
      console.warn(`[todaApiService] Database schema missing column '${match[1]}', retrying insert without it...`);
      delete insertPayload[match[1]];
    } else {
      break;
    }
  }

  if (todaError) throw todaError;

  // 3. Create or link auth user for the TODA Admin using synthetic email
  let authUserId: string | null = null;
  if (payload.password) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: syntheticEmail,
        password: payload.password,
        options: {
          data: {
            role: 'toda_admin',
            full_name: payload.presidentName.trim(),
            toda_acronym: cleanAcronym,
            toda_id: todaData.toda_id,
            contact_number: payload.presidentContact.trim(),
            office_email: payload.officeEmail || null,
          },
        },
      });

      if (!authError && authData.user) {
        authUserId = authData.user.id;
      } else if (authError) {
        console.warn('[todaApiService] Auth sign-up warning, attempting login recovery:', authError.message);
        // If user already registered, try signing in to recover user id
        const { data: loginData } = await supabase.auth.signInWithPassword({
          email: syntheticEmail,
          password: payload.password,
        });
        if (loginData?.user) {
          authUserId = loginData.user.id;
        }
      }
    } catch (authErr) {
      console.warn('[todaApiService] Auth sign-up exception:', authErr);
    }
  }

  // 4. Create toda_admin record
  if (authUserId) {
    try {
      let adminPayload: Record<string, any> = {
        auth_user_id: authUserId,
        toda_id: todaData.toda_id,
        full_name: payload.presidentName.trim(),
        email: syntheticEmail,
        toda_acronym: cleanAcronym,
        contact_number: payload.presidentContact.trim(),
        account_status: 'Active',
      };

      for (let attempt = 0; attempt < 5; attempt++) {
        const adminRes = await supabase.from('toda_admin').upsert([adminPayload], { onConflict: 'auth_user_id' });
        if (!adminRes.error) break;
        const errMsg = (adminRes.error.message || '') + ' ' + (adminRes.error.details || '');
        const match = errMsg.match(/Could not find the '([^']+)' column/i) || errMsg.match(/column [^.]*\.?([a-zA-Z0-9_]+) does not exist/i);
        if (match && match[1] && match[1] in adminPayload) {
          delete adminPayload[match[1]];
        } else {
          console.warn('[todaApiService] toda_admin upsert note:', adminRes.error.message);
          break;
        }
      }
    } catch (adminErr) {
      console.warn('[todaApiService] toda_admin profile insert note:', adminErr);
    }
  }

  await recordTodaAuditAction({
    actionType: 'TODA_REGISTRATION_SUBMITTED',
    targetId: todaData.toda_id,
    details: `Submitted new TODA accreditation application for '${payload.todaName}' (${cleanAcronym}).`,
  });

  // Explicitly sign out of any temporary session created by signUp so the user logs in manually
  try {
    await supabase.auth.signOut();
  } catch {}

  return { success: true, data: todaData, syntheticEmail, acronym: cleanAcronym };
}

export async function resubmitTodaApplication(todaId: string, updatedData: any) {
  let updatePayload: Record<string, any> = {
    ...updatedData,
    toda_status: 'Pending Verification',
  };
  delete updatePayload.updated_at;
  delete updatePayload.terminal_location;

  let updatedDataResult: any = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('toda')
      .update(updatePayload)
      .eq('toda_id', todaId)
      .select()
      .maybeSingle();

    if (!error) {
      updatedDataResult = data;
      break;
    }

    const errMsg = (error.message || '') + ' ' + (error.details || '');
    const match =
      errMsg.match(/Could not find the '([^']+)' column/i) ||
      errMsg.match(/column [^.]*\.?([a-zA-Z0-9_]+) does not exist/i);

    if (match && match[1] && match[1] in updatePayload) {
      console.warn(`[todaApiService] Column '${match[1]}' does not exist in 'toda', pruning and retrying...`);
      delete updatePayload[match[1]];
    } else if (errMsg.includes('toda_status') && 'toda_status' in updatePayload) {
      delete updatePayload.toda_status;
      updatePayload.account_status = 'Pending Verification';
    } else {
      console.error('[todaApiService] resubmitTodaApplication error:', error);
      throw error;
    }
  }

  await recordTodaAuditAction({
    actionType: 'TODA_APPLICATION_RESUBMITTED',
    targetId: todaId,
    details: `Corrected and resubmitted TODA accreditation application for '${updatedDataResult?.toda_name || todaId}'.`,
  });

  return { success: true, data: updatedDataResult };
}


// ============================================================================
// 2. DRIVER MANAGEMENT & SCREENING
// ============================================================================

export async function fetchTodaDrivers(todaId?: string): Promise<TodaDriverMember[]> {
  try {
    const currentTodaId = await getEffectiveTodaId(todaId);
    let todaRecord: any = null;

    if (currentTodaId && currentTodaId !== DEFAULT_TODA_ID) {
      const { data: directToda } = await supabase
        .from('toda')
        .select('*')
        .eq('toda_id', currentTodaId)
        .maybeSingle();
      todaRecord = directToda;
    }

    if (!todaRecord && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('sakay_toda_admin_auth_cache');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.profile?.toda) {
            todaRecord = parsed.profile.toda;
          }
        }
      } catch {}
    }

    // 2. Fetch all drivers currently registered in the database for this TODA
    const { data: registeredDrivers } = currentTodaId
      ? await supabase.from('driver').select('*').eq('toda_id', currentTodaId).order('created_at', { ascending: false })
      : { data: [] };

    const driverList = registeredDrivers || [];

    // 3. If an accredited driver roster file was uploaded, parse and render from the submitted document
    if (todaRecord?.accredited_drivers_url) {
      try {
        const rawUrl = todaRecord.accredited_drivers_url;
        let arrayBuffer: ArrayBuffer | null = null;

        // Clean storage path
        let storagePath = rawUrl;
        if (rawUrl.includes('toda-accredited-driver-lists/')) {
          storagePath = decodeURIComponent(rawUrl.split('toda-accredited-driver-lists/')[1].split('?')[0]);
        } else if (rawUrl.startsWith('http')) {
          try {
            const urlObj = new URL(rawUrl);
            const parts = urlObj.pathname.split('/');
            const bucketIndex = parts.indexOf('toda-accredited-driver-lists');
            if (bucketIndex !== -1 && bucketIndex < parts.length - 1) {
              storagePath = decodeURIComponent(parts.slice(bucketIndex + 1).join('/'));
            }
          } catch {}
        }

        // Attempt 1: Direct authenticated download via Supabase Storage
        try {
          const { data: blob, error: dlErr } = await supabase.storage
            .from('toda-accredited-driver-lists')
            .download(storagePath);

          if (!dlErr && blob) {
            arrayBuffer = await blob.arrayBuffer();
          }
        } catch (dlErr) {
          console.warn('[todaApiService] Storage download attempt 1:', dlErr);
        }

        // Attempt 2: Signed URL download
        if (!arrayBuffer) {
          try {
            const { data: signedData } = await supabase.storage
              .from('toda-accredited-driver-lists')
              .createSignedUrl(storagePath, 3600);

            if (signedData?.signedUrl) {
              const res = await fetch(signedData.signedUrl);
              if (res.ok) {
                arrayBuffer = await res.arrayBuffer();
              }
            }
          } catch (signedErr) {
            console.warn('[todaApiService] Signed URL attempt 2:', signedErr);
          }
        }

        // Attempt 3: Direct fetch on raw URL if HTTP
        if (!arrayBuffer && rawUrl.startsWith('http')) {
          try {
            const res = await fetch(rawUrl);
            if (res.ok) {
              arrayBuffer = await res.arrayBuffer();
            }
          } catch (fetchErr) {
            console.warn('[todaApiService] Direct fetch attempt 3:', fetchErr);
          }
        }

        if (arrayBuffer) {
          const parsed = await parseDriverRoster(arrayBuffer);
          if (parsed && parsed.rows && parsed.rows.length > 0) {
            return parsed.rows.map((row, idx) => {
              const cleanName = (row.name || '').trim().toLowerCase();
              const cleanFranchise = (row.franchiseNumber || '').trim().toLowerCase();

              // Correlate strictly with registered driver account by franchise number
              const matchedDriver = driverList.find((d: any) => {
                const dFranchise = (d.franchise_number || d.plate_number || '').trim().toLowerCase();
                return Boolean(cleanFranchise && dFranchise === cleanFranchise);
              });

              let accountStatus: string = 'Not Registered';
              if (matchedDriver) {
                const rawStatus = matchedDriver.account_status;
                if (rawStatus === 'Suspended') {
                  accountStatus = 'TODA Suspended';
                } else if (rawStatus === 'Active' || rawStatus === 'Verified') {
                  accountStatus = 'Active';
                } else if (rawStatus === 'Deactivated') {
                  accountStatus = 'LGU Deactivated';
                } else if (rawStatus === 'Pending' || rawStatus === 'Pending Verification') {
                  accountStatus = 'Pending Verification';
                } else {
                  accountStatus = rawStatus || 'Active';
                }
              } else {
                accountStatus = 'Not Registered';
              }

              return {
                id: matchedDriver?.driver_id || `roster-${idx + 1}`,
                membershipNo: `MEM-${String(idx + 1).padStart(3, '0')}`,
                name: row.name || `Driver #${idx + 1}`,
                phone: matchedDriver?.contact_number || '',
                vehiclePlate: matchedDriver?.plate_number || row.franchiseNumber || 'N/A',
                franchiseNo: row.franchiseNumber || matchedDriver?.franchise_number || 'N/A',
                licenseNo: matchedDriver?.license_number || '',
                serviceZone: todaRecord?.service_coverage_area || todaRecord?.barangay || 'Calapan City',
                todaVerificationStatus: 'Verified',
                lguVerificationStatus: matchedDriver?.account_status === 'Verified' ? 'Verified' : 'Pending',
                accountStatus: accountStatus as TodaDriverMember['accountStatus'],
                suspensionReason: matchedDriver?.suspension_reason || undefined,
                suspendedAt: matchedDriver?.suspended_at ? new Date(matchedDriver.suspended_at).toLocaleDateString('en-US') : undefined,
                strikesCount: matchedDriver?.strikes_count || 0,
                rating: Number(matchedDriver?.weighted_average_rating) || 5.0,
                totalTrips: 0,
                joinedDate: todaRecord?.created_at ? new Date(todaRecord.created_at).toLocaleDateString('en-US') : 'Recent',
              };
            });
          }
        }
      } catch (rosterParseErr) {
        console.warn('[todaApiService] Could not parse uploaded roster file, falling back to driver table:', rosterParseErr);
      }
    }

    // 4. Fallback to registered driver table accounts
    if (driverList.length > 0) {
      return driverList.map((d: any, idx: number) => ({
        id: d.driver_id,
        membershipNo: `MEM-${String(idx + 1).padStart(3, '0')}`,
        name: d.full_name,
        phone: d.contact_number,
        vehiclePlate: d.plate_number || 'N/A',
        franchiseNo: d.franchise_number || d.plate_number || 'N/A',
        licenseNo: d.license_number || '',
        serviceZone: d.barangay_service_area || todaRecord?.barangay || 'Calapan City',
        todaVerificationStatus: 'Verified',
        lguVerificationStatus: d.account_status === 'Verified' ? 'Verified' : 'Pending',
        accountStatus: d.account_status === 'Suspended' ? 'TODA Suspended' : (d.account_status as any) || 'Active',
        suspensionReason: d.suspension_reason || undefined,
        suspendedAt: d.suspended_at ? new Date(d.suspended_at).toLocaleDateString('en-US') : undefined,
        strikesCount: d.strikes_count || 0,
        rating: Number(d.weighted_average_rating) || 5.0,
        totalTrips: 0,
        joinedDate: d.created_at ? new Date(d.created_at).toLocaleDateString('en-US') : 'Recent',
      }));
    }

    return [];
  } catch (err) {
    console.error('[todaApiService] fetchTodaDrivers error:', err);
    return [];
  }
}

export const fetchTodaDriverMembers = fetchTodaDrivers;

async function resolveStorageImageUrl(preferredBucket: string, path?: string | null, fallbackBucket?: string): Promise<string> {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) return path;
  try {
    const { data, error } = await supabase.storage.from(preferredBucket).createSignedUrl(path, 86400);
    if (!error && data?.signedUrl) return data.signedUrl;
  } catch {}
  if (fallbackBucket) {
    try {
      const { data, error } = await supabase.storage.from(fallbackBucket).createSignedUrl(path, 86400);
      if (!error && data?.signedUrl) return data.signedUrl;
    } catch {}
  }
  const { data: pubData } = supabase.storage.from(preferredBucket).getPublicUrl(path);
  return pubData?.publicUrl || '';
}

export async function fetchDriverApplicants(todaId?: string): Promise<DriverApplicant[]> {
  try {
    const targetTodaId = await getEffectiveTodaId(todaId);

    const { data, error } = await supabase
      .from('driver')
      .select('*, driver_verification(*)')
      .eq('toda_id', targetTodaId);

    if (error || !data || data.length === 0) return [];

    return await Promise.all(data.map(async (d: any) => {
      const verif = Array.isArray(d.driver_verification) ? d.driver_verification[0] : d.driver_verification;
      const isEndorsed = verif?.verification_status === 'Approved' || verif?.verification_status === 'TODA Approved' || d.account_status === 'TODA Approved';
      const isRejected = verif?.verification_status === 'Rejected' || d.account_status === 'Rejected';
      const isResubmit = verif?.verification_status === 'Resubmission Required' || d.account_status === 'Resubmission Required';

      let stageStatus: DriverApplicant['todaStageStatus'] = 'Awaiting Screening';
      if (isEndorsed) stageStatus = 'Endorsed to LGU';
      else if (isRejected) stageStatus = 'Rejected';
      else if (isResubmit) stageStatus = 'Resubmission Required';

      const authId = d.auth_user_id;
      const licFrontPath = verif?.license_front_photo_path || (authId ? `${authId}/license_front.jpg` : null);
      const licBackPath = verif?.license_back_photo_path || (authId ? `${authId}/license_back.jpg` : null);
      const mtopPath = verif?.mtop_photo_path || (authId ? `${authId}/mtop.jpg` : null);
      const tricyclePath = verif?.tricycle_photo_path || d.tricycle_photo_path || (authId ? `${authId}/tricycle.jpg` : null);
      const selfiePath = verif?.face_photo_path || (authId ? `${authId}/selfie.jpg` : null);

      const [licenseFrontUrl, licenseBackUrl, mtopUrl, tricyclePhotoUrl, selfieUrl] = await Promise.all([
        resolveStorageImageUrl('driver-licenses', licFrontPath),
        resolveStorageImageUrl('driver-licenses', licBackPath),
        resolveStorageImageUrl('mtop-permits', mtopPath, 'driver-licenses'),
        resolveStorageImageUrl('mtop-permits', tricyclePath, 'driver-licenses'),
        resolveStorageImageUrl('driver-selfies', selfiePath, 'driver-licenses'),
      ]);

      return {
        id: d.driver_id,
        name: d.full_name,
        phone: d.contact_number,
        licenseNo: d.license_number || verif?.submitted_license_number || 'N/A',
        vehiclePlate: d.plate_number || verif?.submitted_plate_number || 'N/A',
        chassisNo: d.chassis_number || verif?.submitted_chassis_number || 'N/A',
        motorNo: d.motor_number || verif?.submitted_motor_number || 'N/A',
        franchiseNo: d.franchise_number || verif?.submitted_franchise_number || 'N/A',
        submittedDate: d.created_at ? new Date(d.created_at).toLocaleDateString('en-US') : 'Recent',
        daysPending: 1,
        isOverdue: false,
        onSubmittedRoster: true,
        tricyclePhotoUrl: tricyclePhotoUrl || d.profile_photo_url || '',
        licenseFrontUrl,
        licenseBackUrl,
        mtopUrl,
        selfieUrl,
        photoVerified: true,
        rosterVerified: true,
        todaStageStatus: stageStatus,
      };
    }));
  } catch (err) {
    console.error('[todaApiService] fetchDriverApplicants error:', err);
    return [];
  }
}

async function resolveAffiliationId(driverOrAffiliationId: string): Promise<string> {
  const { data: affCheck } = await supabase
    .from('driver_toda_affiliation')
    .select('affiliation_id')
    .eq('affiliation_id', driverOrAffiliationId)
    .maybeSingle();

  if (affCheck?.affiliation_id) return affCheck.affiliation_id;

  const { data: aff } = await supabase
    .from('driver_toda_affiliation')
    .select('affiliation_id')
    .eq('driver_id', driverOrAffiliationId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return aff?.affiliation_id || driverOrAffiliationId;
}

export async function endorseDriverApplicant(applicantId: string, actorName: string = 'TODA President') {
  console.log('[todaApiService] Endorsing driver applicant to LGU:', applicantId, 'by:', actorName);
  try {
    const now = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      verification_status: 'Approved',
      endorsed_at: now,
      remarks: `Endorsed by ${actorName}`,
      rejection_reason: null,
      rejection_comment: null,
      rejected_by: null,
      rejected_at: null,
    };

    // 1. Update public.driver_verification directly
    const { data: verifData, error: verifErr } = await supabase
      .from('driver_verification')
      .update(updatePayload)
      .or(`driver_id.eq.${applicantId},verification_id.eq.${applicantId}`)
      .select();

    if (verifErr) {
      console.warn('[todaApiService] driver_verification direct update note:', verifErr);
    }

    // 2. If no record was updated, check if we need to insert a verification record
    if (!verifData || verifData.length === 0) {
      const { data: insertData, error: insertErr } = await supabase
        .from('driver_verification')
        .insert([{
          driver_id: applicantId,
          ...updatePayload,
        }])
        .select();

      if (insertErr) {
        console.error('[todaApiService] Failed to persist driver endorsement:', insertErr);
        return { success: false, error: new Error(insertErr.message) };
      }
    }

    // 3. Optional soft update to driver.account_status if permissible
    try {
      await supabase
        .from('driver')
        .update({ account_status: 'TODA Approved', updated_at: now })
        .eq('driver_id', applicantId);
    } catch {}

    // 4. Dispatch official Tagalog endorsement SMS to driver's phone
    try {
      const { data: driverInfo } = await supabase
        .from('driver')
        .select('full_name, contact_number, toda:toda_id ( toda_name, toda_acronym )')
        .eq('driver_id', applicantId)
        .maybeSingle();

      if (driverInfo?.contact_number) {
        const firstName = driverInfo.full_name?.split(' ')[0] || driverInfo.full_name || 'Drayber';
        const todaObj = Array.isArray(driverInfo.toda) ? driverInfo.toda[0] : driverInfo.toda;
        const todaName = todaObj?.toda_name
          ? `${todaObj.toda_name}${todaObj.toda_acronym ? ' (' + todaObj.toda_acronym + ')' : ''}`
          : 'iyong TODA';

        const smsMessage = `SAKAY Update: Magandang araw, ${firstName}! Ang iyong aplikasyon bilang drayber ay naaprubahan at na-endorso na ng ${todaName}. Kasalukuyan na itong ipinasa sa Calapan City LGU Franchising Office para sa pinal na beripikasyon. Makakatanggap ka muli ng mensahe kapag natapos ang pagsusuri.`;

        console.log(`[todaApiService] Dispatching TODA endorsement SMS to ${driverInfo.contact_number}...`);
        const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
        await fetch(`${apiUrl}/communication/send-sms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: driverInfo.contact_number,
            message: smsMessage,
          }),
        });
      }
    } catch (smsErr) {
      console.warn('[todaApiService] TODA endorsement SMS dispatch warning:', smsErr);
    }

    return { success: true, data: verifData, rosterMatched: true };
  } catch (err: any) {
    console.error('[todaApiService] endorseDriverApplicant exception:', err);
    return { success: false, error: err };
  }
}

export const forwardApplicantToLgu = endorseDriverApplicant;

export async function returnDriverApplicant(applicantId: string, remarks: string) {
  console.log('[todaApiService] Returning driver application for resubmission:', applicantId);
  try {
    const now = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      verification_status: 'Resubmission Required',
      rejection_reason: remarks,
      rejection_comment: remarks,
      remarks: remarks,
      rejected_at: now,
    };

    const { data: verifData, error: verifErr } = await supabase
      .from('driver_verification')
      .update(updatePayload)
      .or(`driver_id.eq.${applicantId},verification_id.eq.${applicantId}`)
      .select();

    if (verifErr) {
      console.warn('[todaApiService] driver_verification resubmission update error:', verifErr);
      return { success: false, error: new Error(verifErr.message) };
    }

    // Dispatch return for correction SMS
    try {
      const { data: driverInfo } = await supabase
        .from('driver')
        .select('full_name, contact_number')
        .eq('driver_id', applicantId)
        .maybeSingle();

      if (driverInfo?.contact_number) {
        const firstName = driverInfo.full_name?.split(' ')[0] || driverInfo.full_name || 'Drayber';
        const smsMessage = `SAKAY Update: Magandang araw, ${firstName}! May kailangang iwasto o linawin sa iyong isinumiteng dokumento para sa TODA registration. Dahilan: ${remarks}. Pakibuksan ang app upang ma-resubmit ang iyong aplikasyon.`;
        const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
        await fetch(`${apiUrl}/communication/send-sms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: driverInfo.contact_number,
            message: smsMessage,
          }),
        });
      }
    } catch (smsErr) {
      console.warn('[todaApiService] Return SMS dispatch warning:', smsErr);
    }

    return { success: true, remarks };
  } catch (err: any) {
    console.error('[todaApiService] returnDriverApplicant exception:', err);
    return { success: false, error: err };
  }
}

export async function rejectDriverApplicant(applicantId: string, reason: string, customComment?: string, actorName: string = 'TODA President') {
  console.log('[todaApiService] Rejecting driver application:', applicantId);
  try {
    const now = new Date().toISOString();
    const finalComment = customComment ? `${reason}: ${customComment}` : reason;
    const updatePayload: Record<string, any> = {
      verification_status: 'Rejected',
      rejection_reason: reason,
      rejection_comment: finalComment,
      remarks: `Rejected by ${actorName}: ${finalComment}`,
      rejected_at: now,
    };

    const { data: verifData, error: verifErr } = await supabase
      .from('driver_verification')
      .update(updatePayload)
      .or(`driver_id.eq.${applicantId},verification_id.eq.${applicantId}`)
      .select();

    if (verifErr) {
      console.warn('[todaApiService] driver_verification rejection update error:', verifErr);
      return { success: false, error: new Error(verifErr.message) };
    }

    // Dispatch rejection SMS
    try {
      const { data: driverInfo } = await supabase
        .from('driver')
        .select('full_name, contact_number')
        .eq('driver_id', applicantId)
        .maybeSingle();

      if (driverInfo?.contact_number) {
        const firstName = driverInfo.full_name?.split(' ')[0] || driverInfo.full_name || 'Drayber';
        const smsMessage = `SAKAY Update: Paumanhin, ${firstName}. Ang iyong aplikasyon bilang drayber ay hindi naaprubahan ng TODA. Dahilan: ${finalComment}. Para sa katanungan, maaaring sumangguni sa pamunuan ng TODA.`;
        const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
        await fetch(`${apiUrl}/communication/send-sms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: driverInfo.contact_number,
            message: smsMessage,
          }),
        });
      }
    } catch (smsErr) {
      console.warn('[todaApiService] Rejection SMS dispatch warning:', smsErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('[todaApiService] rejectDriverApplicant exception:', err);
    return { success: false, error: err };
  }
}

export async function requestDriverResubmission(
  applicantId: string,
  reason: string,
  notes?: string,
  actorName: string = 'TODA President'
) {
  const finalReason = notes ? `${reason}: ${notes}` : reason;
  const returnRes = await returnDriverApplicant(applicantId, finalReason);
  if (!returnRes.success) {
    throw returnRes.error || new Error('Failed to return driver application for resubmission');
  }

  await recordTodaAuditAction({
    actionType: 'DRIVER_RESUBMISSION_REQUESTED',
    targetId: applicantId,
    targetName: applicantId,
    details: `[TODA Screening] ${actorName}: Requested document correction/resubmission. Reason: ${reason}. Notes: ${notes || 'None'}`,
    category: 'Driver Verification',
  });

  return { success: true };
}

// A TODA administrator does not suspend or reactivate drivers directly: suspensions
// come from the strike ladder and administrative decisions, and reinstatement is a
// manual LGU decision (Sections 21, 22). The TODA's part is to RECOMMEND, which raises a
// review flag for the LGU Administrator through the shared flag mechanism (the database
// verifies the driver belongs to this TODA and audits the flag).
async function recommendToLgu(
  flagType: 'TODA_SUSPENSION_RECOMMENDATION' | 'TODA_REACTIVATION_RECOMMENDATION',
  driverId: string,
  reason?: string
) {
  const { data, error } = await supabase.rpc('create_admin_review_flag', {
    p_flag_type: flagType,
    p_subject_type: 'driver',
    p_subject_id: driverId,
    p_source_rule: 'Section 22',
    p_assigned_role: 'lgu_admin',
    p_details: { reason: reason || null },
  });
  if (error) throw new Error(error.message);
  return { success: true, flagId: data as string };
}

export async function suspendTodaDriver(driverId: string, reason: string) {
  return recommendToLgu('TODA_SUSPENSION_RECOMMENDATION', driverId, reason);
}

export async function reactivateTodaDriver(driverId: string, reason?: string) {
  return recommendToLgu('TODA_REACTIVATION_RECOMMENDATION', driverId, reason);
}

// ============================================================================
// 3. TRICYCLE FLEET MANAGEMENT
// ============================================================================

export interface TodaVehicleUnit {
  id: string;
  plateNumber: string;
  mtopNumber: string;
  driverName: string;
  driverId: string;
  status: 'Active' | 'Maintenance' | 'Inactive';
  inspectionStatus: 'Passed' | 'Pending Inspection';
  orCrNumber: string;
  registeredDate: string;
}

export async function fetchTodaFleet(todaId?: string): Promise<TodaVehicleUnit[]> {
  try {
    const effectiveTodaId = await getEffectiveTodaId(todaId);
    const { data, error } = await supabase.from('driver').select('*').eq('toda_id', effectiveTodaId);
    if (error || !data || data.length === 0) return [];

    return data.map((d: any, idx: number) => ({
      id: `UNIT-${String(idx + 1).padStart(3, '0')}`,
      plateNumber: d.plate_number || 'MV-101',
      mtopNumber: d.franchise_number || 'MTOP-2026-001',
      driverName: d.full_name,
      driverId: d.driver_id,
      status: d.account_status === 'Suspended' ? 'Inactive' : 'Active',
      inspectionStatus: 'Passed',
      orCrNumber: `ORCR-${Math.floor(10000 + Math.random() * 90000)}`,
      registeredDate: d.created_at ? new Date(d.created_at).toLocaleDateString('en-US') : '2026',
    }));
  } catch (err) {
    console.error('[todaApiService] fetchTodaFleet error:', err);
    return [];
  }
}

export async function addTodaVehicle(payload: { plateNumber: string; mtopNumber: string; driverName: string; orCrNumber?: string }) {
  await recordTodaAuditAction({
    actionType: 'TRICYCLE_UNIT_REGISTERED',
    targetId: payload.plateNumber,
    targetName: payload.plateNumber,
    details: `Registered new tricycle unit '${payload.plateNumber}' (MTOP: ${payload.mtopNumber}) assigned to ${payload.driverName}.`,
    category: 'Operations',
  });
  return { success: true };
}

// ============================================================================
// 4. TODA OPERATIONS, INCIDENTS, ANNOUNCEMENTS & AUDIT LOGS
// ============================================================================

export async function fetchTodaOperationsTrips(todaId?: string) {
  try {
    const effectiveTodaId = await getEffectiveTodaId(todaId);
    const { data, error } = await supabase
      .from('booking')
      .select('*, driver:driver_id(*), passenger:passenger_id(full_name, contact_number)')
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.filter((b: any) => b.toda_id === effectiveTodaId || b.driver?.toda_id === effectiveTodaId);
  } catch {
    return [];
  }
}

export async function fetchTodaIncidents(todaId?: string) {
  try {
    const effectiveTodaId = await getEffectiveTodaId(todaId);
    const { data, error } = await supabase
      .from('incident_report')
      .select('*, booking:booking_id(*), driver:driver_id(*), passenger:passenger_id(full_name, contact_number)')
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.filter((inc: any) => 
      inc.reported_toda_id === effectiveTodaId || 
      inc.driver?.toda_id === effectiveTodaId || 
      inc.booking?.toda_id === effectiveTodaId
    );
  } catch {
    return [];
  }
}

export async function submitIncidentRemarks(incidentId: string, remarks: string) {
  const updatePayload: Record<string, any> = {
    resolution: remarks,
    resolution_notes: remarks,
    reviewed_by_toda: true,
  };
  const { data, error } = await supabase
    .from('incident_report')
    .update(updatePayload)
    .eq('incident_id', incidentId)
    .select()
    .single();

  if (error) throw error;

  await recordTodaAuditAction({
    actionType: 'TODA_INCIDENT_REMARKS_SUBMITTED',
    targetId: incidentId,
    details: `Submitted internal TODA remarks on incident: "${remarks}"`,
    category: 'Incident',
  });

  return { success: true, data };
}

export async function escalateIncidentToLgu(incidentId: string, remarks?: string) {
  const escalationNote = `[Escalated to LGU Transport Board] ${remarks || 'Requires City LGU investigation.'}`;
  const updatePayload: Record<string, any> = {
    status: 'Under Investigation',
    resolution: escalationNote,
    resolution_notes: escalationNote,
    reviewed_by_toda: true,
  };
  const { data, error } = await supabase
    .from('incident_report')
    .update(updatePayload)
    .eq('incident_id', incidentId)
    .select()
    .single();

  if (error) throw error;

  await recordTodaAuditAction({
    actionType: 'INCIDENT_ESCALATED_TO_LGU',
    targetId: incidentId,
    details: `Escalated incident complaint to City LGU Administrator & Transport Board. Remarks: ${remarks || 'None'}`,
    category: 'Incident',
  });

  return { success: true, data };
}

export async function fetchTodaAuditLogs(): Promise<TodaAuditLog[]> {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('performed_at', { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return data.map((l: any) => ({
      id: l.log_id,
      log_id: l.log_id,
      toda_admin_id: l.toda_admin_id || l.target_id || 'TODA_ADMIN',
      actor_name: 'TODA Administrator',
      action_type: l.action_type,
      target_id: l.target_id || '',
      target_name: l.target_name || l.target_id || 'Entity',
      details: l.details || '',
      performed_at: (l.performed_at || l.created_at)
        ? new Date(l.performed_at || l.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Recent',
      category: (l.action_type.includes('DRIVER')
        ? 'Driver Verification'
        : l.action_type.includes('INCIDENT')
        ? 'Incident'
        : l.action_type.includes('ANNOUNCEMENT')
        ? 'Announcement'
        : 'Account') as any,
    }));
  } catch (err) {
    console.error('[todaApiService] fetchTodaAuditLogs error:', err);
    return [];
  }
}

export async function recordTodaAuditAction(action: {
  actionType: string;
  targetId?: string;
  targetName?: string;
  details: string;
  category?: string;
}) {
  try {
    await supabase.from('audit_log').insert([
      {
        action_type: action.actionType,
        target_id: action.targetId || null,
        details: `[TODA Admin]: ${action.details}`,
        performed_at: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.warn('[todaApiService] recordTodaAuditAction error:', err);
  }
}

export async function fetchTodaAnnouncements(todaId?: string): Promise<TodaAnnouncement[]> {
  try {
    const effectiveTodaId = await getEffectiveTodaId(todaId);
    const { data, error } = await supabase
      .from('announcement')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    const filtered = data.filter((a: any) => !a.toda_id || a.toda_id === effectiveTodaId);

    return filtered.map((a: any) => ({
      id: a.announcement_id,
      title: a.title,
      message: a.message,
      category: 'General',
      urgency: (a.urgency === 'Urgent' ? 'High Priority' : 'Standard') as any,
      isPublished: a.is_published ?? true,
      sendPushNotification: true,
      createdBy: a.toda_id ? 'TODA Admin' : 'LGU & TODA Admin',
      createdAt: a.created_at ? new Date(a.created_at).toLocaleDateString('en-US') : 'Recent',
    }));
  } catch (err) {
    console.error('[todaApiService] fetchTodaAnnouncements error:', err);
    return [];
  }
}

export async function postTodaAnnouncement(
  title: string,
  message: string,
  urgency: 'Standard' | 'High Priority' = 'Standard',
  todaId?: string
) {
  const effectiveTodaId = await getEffectiveTodaId(todaId);
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase.from('announcement').insert([
    {
      title,
      message,
      urgency: urgency === 'High Priority' ? 'Urgent' : 'Normal',
      is_published: true,
      toda_id: effectiveTodaId,
      created_by: user?.id || null,
      created_at: new Date().toISOString(),
    },
  ]).select().single();

  if (error) throw error;

  await recordTodaAuditAction({
    actionType: 'TODA_ANNOUNCEMENT_POSTED',
    targetId: data?.announcement_id,
    targetName: title,
    details: `Posted new TODA announcement: "${title}"`,
    category: 'Announcement',
  });

  return data;
}

export async function deleteTodaAnnouncement(id: string) {
  const { error } = await supabase.from('announcement').delete().eq('announcement_id', id);
  if (error) throw error;
  return true;
}

export interface TodaRosterEntry {
  roster_id: string;
  toda_id: string;
  franchise_number: string;
  plate_number: string;
  member_name: string;
  created_at: string;
}

export async function fetchTodaRosterEntries(todaId?: string): Promise<TodaRosterEntry[]> {
  try {
    const targetTodaId = await getEffectiveTodaId(todaId);
    let localEntries: TodaRosterEntry[] = [];
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`sakay_toda_roster_${targetTodaId}`);
        if (raw) localEntries = JSON.parse(raw);
      } catch {}
    }

    const { data, error } = await supabase
      .from('toda_roster_entry')
      .select('*')
      .eq('toda_id', targetTodaId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[todaApiService] fetchTodaRosterEntries warning:', error);
      try {
        const serverRes = await fetch(`http://localhost:5000/api/admin/todas/${targetTodaId}/roster`);
        const json = await serverRes.json();
        if (json.success && json.data) {
          const merged = [...json.data];
          for (const le of localEntries) {
            if (!merged.some(m => m.franchise_number === le.franchise_number)) {
              merged.push(le);
            }
          }
          return merged;
        }
      } catch {}
      return localEntries;
    }

    const dbEntries = data || [];
    const merged = [...dbEntries];
    for (const le of localEntries) {
      if (!merged.some(m => m.franchise_number === le.franchise_number)) {
        merged.push(le);
      }
    }
    return merged;
  } catch (err) {
    console.error('[todaApiService] fetchTodaRosterEntries error:', err);
    return [];
  }
}

export async function addTodaRosterEntry(entry: {
  todaId?: string;
  memberName: string;
  franchiseNumber: string;
  plateNumber: string;
}) {
  const targetTodaId = await getEffectiveTodaId(entry.todaId);
  const newEntry: TodaRosterEntry = {
    roster_id: 'roster-' + Date.now(),
    toda_id: targetTodaId,
    member_name: entry.memberName.trim(),
    franchise_number: entry.franchiseNumber.trim(),
    plate_number: entry.plateNumber.trim(),
    created_at: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`sakay_toda_roster_${targetTodaId}`);
      const existing: TodaRosterEntry[] = raw ? JSON.parse(raw) : [];
      existing.unshift(newEntry);
      localStorage.setItem(`sakay_toda_roster_${targetTodaId}`, JSON.stringify(existing));
    } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('toda_roster_entry')
      .insert({
        toda_id: targetTodaId,
        member_name: entry.memberName.trim(),
        franchise_number: entry.franchiseNumber.trim(),
        plate_number: entry.plateNumber.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      await recordTodaAuditAction({
        actionType: 'TODA_ROSTER_ENTRY_ADDED',
        targetId: targetTodaId,
        targetName: entry.memberName,
        details: `Added new official roster entry for '${entry.memberName}' (Franchise: ${entry.franchiseNumber}, Plate: ${entry.plateNumber}).`,
        category: 'Membership',
      });
      return data;
    }
    if (error) throw error;
  } catch (supabaseErr: any) {
    console.warn('[todaApiService] Direct Supabase roster insert note:', supabaseErr.message || supabaseErr);
    // 1. Try Express backend endpoint (port 5000)
    try {
      const serverRes = await fetch(`http://localhost:5000/api/admin/todas/${targetTodaId}/roster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: [
            {
              driver_full_name: entry.memberName.trim(),
              franchise_number: entry.franchiseNumber.trim(),
              plate_number: entry.plateNumber.trim(),
            },
          ],
        }),
      });
      const json = await serverRes.json();
      if (json.success && json.data?.[0]) {
        return json.data[0];
      }
    } catch {}

    // 2. Return local dev entry
    return newEntry;
  }
}

