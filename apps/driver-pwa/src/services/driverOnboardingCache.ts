import { supabase } from './supabaseClient';


export interface LicenseExtractedData {
  frontPhoto: string;
  backPhoto: string;
  rawFrontPhoto?: string;
  rawBackPhoto?: string;
  fullName: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  dob: string;
  gender: string;
  address: string;
  licenseNumber: string;
  dlCodes: string;
  expirationDate: string;
  plateNumber?: string;
  vehicleDetails?: string;
  rawOcrText?: string;
  scannedAt: string;
}

export interface MtopExtractedData {
  photoUrl: string;
  rawPhotoUrl?: string;
  operatorName: string;
  franchiseNumber: string;
  plateNumber: string;
  chassisNumber: string;
  vehicleMake: string;
  motorNumber: string;
  yearModel?: string;
  orNumber: string;
  expirationDate: string;
  authorizedRoute: string;
  rawOcrText?: string;
  scannedAt: string;
}

export interface FaceVerificationData {
  rawSelfie: string;
  selfiePhotoUrl: string;
  faceMatchPassed: boolean;
  faceMatchScore: number;
  verifiedAt: string;
}

export interface TricycleUnitData {
  photoUrl: string;
  rawPhotoUrl?: string;
  scannedAt: string;
}

export interface DriverOnboardingProgress {
  phone: string;
  driverName?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  todaId?: string;
  step1_license?: LicenseExtractedData;
  step2_mtop?: MtopExtractedData;
  step3_tricycle?: TricycleUnitData;
  step5_face?: FaceVerificationData;
  step3_cr?: {
    crNumber?: string;
    photoUrl?: string;
    submittedAt?: string;
  };
  step4_or?: {
    orNumber?: string;
    photoUrl?: string;
    submittedAt?: string;
  };
  lastUpdated: string;
}

const CACHE_KEY = 'sakay_driver_onboarding_cache';

export const getOnboardingCache = (): DriverOnboardingProgress | null => {
  try {
    const item = localStorage.getItem(CACHE_KEY);
    if (!item) return null;
    return JSON.parse(item);
  } catch (err) {
    console.warn('[DriverOnboardingCache] Error reading cache:', err);
    return null;
  }
};

export const saveRegisteredNameParts = (
  parts: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    suffix?: string;
    fullName?: string;
  },
  phone = ''
): void => {
  try {
    const existing = getOnboardingCache() || {
      phone,
      lastUpdated: new Date().toISOString(),
    };

    if (parts.firstName !== undefined) existing.firstName = parts.firstName;
    if (parts.middleName !== undefined) existing.middleName = parts.middleName;
    if (parts.lastName !== undefined) existing.lastName = parts.lastName;
    if (parts.suffix !== undefined) existing.suffix = parts.suffix;
    if (parts.fullName !== undefined) existing.driverName = parts.fullName;
    existing.lastUpdated = new Date().toISOString();

    localStorage.setItem(CACHE_KEY, JSON.stringify(existing));

    if (parts.firstName !== undefined) localStorage.setItem('sakay_driver_first_name', parts.firstName);
    if (parts.middleName !== undefined) localStorage.setItem('sakay_driver_middle_name', parts.middleName);
    if (parts.lastName !== undefined) localStorage.setItem('sakay_driver_last_name', parts.lastName);
    if (parts.suffix !== undefined) localStorage.setItem('sakay_driver_suffix', parts.suffix);
    if (parts.fullName !== undefined) localStorage.setItem('sakay_driver_name', parts.fullName);
  } catch (err) {
    console.warn('[DriverOnboardingCache] Error saving registered name parts:', err);
  }
};

export const getRegisteredNameParts = (): {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  fullName: string;
} => {
  const cache = getOnboardingCache();
  const firstName = cache?.firstName ?? (typeof window !== 'undefined' ? localStorage.getItem('sakay_driver_first_name') : null) ?? '';
  const middleName = cache?.middleName ?? (typeof window !== 'undefined' ? localStorage.getItem('sakay_driver_middle_name') : null) ?? '';
  const lastName = cache?.lastName ?? (typeof window !== 'undefined' ? localStorage.getItem('sakay_driver_last_name') : null) ?? '';
  const suffix = cache?.suffix ?? (typeof window !== 'undefined' ? localStorage.getItem('sakay_driver_suffix') : null) ?? '';
  const fullName =
    cache?.driverName ??
    (typeof window !== 'undefined' ? localStorage.getItem('sakay_driver_name') : null) ??
    [firstName, middleName, lastName, suffix].filter(Boolean).join(' ');

  return { firstName, middleName, lastName, suffix, fullName };
};

export const saveLicenseScanData = (data: LicenseExtractedData, phone = ''): void => {
  try {
    const existing = getOnboardingCache() || {
      phone,
      lastUpdated: new Date().toISOString(),
    };

    existing.phone = phone || existing.phone;
    existing.step1_license = data;
    existing.driverName = data.fullName || existing.driverName;
    if (data.firstName) existing.firstName = data.firstName;
    if (data.middleName !== undefined) existing.middleName = data.middleName;
    if (data.lastName) existing.lastName = data.lastName;
    if (data.suffix !== undefined) existing.suffix = data.suffix;
    existing.lastUpdated = new Date().toISOString();

    localStorage.setItem(CACHE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.warn('[DriverOnboardingCache] Error saving license scan cache:', err);
  }
};

export const getCachedLicenseData = (): LicenseExtractedData | null => {
  const cache = getOnboardingCache();
  return cache?.step1_license || null;
};

export const saveMtopScanData = (data: MtopExtractedData, phone = ''): void => {
  try {
    const existing = getOnboardingCache() || {
      phone,
      lastUpdated: new Date().toISOString(),
    };

    existing.phone = phone || existing.phone;
    existing.step2_mtop = data;
    existing.lastUpdated = new Date().toISOString();

    localStorage.setItem(CACHE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.warn('[DriverOnboardingCache] Error saving MTOP scan cache:', err);
  }
};

export const getCachedMtopData = (): MtopExtractedData | null => {
  const cache = getOnboardingCache();
  return cache?.step2_mtop || null;
};

export const saveSelfieScanData = (data: FaceVerificationData, phone = ''): void => {
  try {
    const existing = getOnboardingCache() || {
      phone,
      lastUpdated: new Date().toISOString(),
    };

    existing.phone = phone || existing.phone;
    existing.step5_face = data;
    existing.lastUpdated = new Date().toISOString();

    localStorage.setItem(CACHE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.warn('[DriverOnboardingCache] Error saving selfie scan cache:', err);
  }
};

export const getCachedSelfieData = (): FaceVerificationData | null => {
  const cache = getOnboardingCache();
  return cache?.step5_face || null;
};

export const saveTricycleScanData = (data: TricycleUnitData, phone = ''): void => {
  try {
    const existing = getOnboardingCache() || {
      phone,
      lastUpdated: new Date().toISOString(),
    };

    existing.phone = phone || existing.phone;
    existing.step3_tricycle = data;
    existing.lastUpdated = new Date().toISOString();

    localStorage.setItem(CACHE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.warn('[DriverOnboardingCache] Error saving tricycle scan cache:', err);
  }
};

export const getCachedTricycleData = (): TricycleUnitData | null => {
  const cache = getOnboardingCache();
  return cache?.step3_tricycle || null;
};

const RESUBMISSION_CACHE_KEY = 'sakay_driver_resubmission_session';

export interface ResubmissionSession {
  isResubmission: boolean;
  faultyDocuments: FaultyDocType[];
  issues?: ReturnIssueDetail[];
  displayReason?: string;
  displayNotes?: string;
}

export const saveResubmissionSession = (session: ResubmissionSession): void => {
  try {
    localStorage.setItem(RESUBMISSION_CACHE_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn('[DriverOnboardingCache] Error saving resubmission session:', err);
  }
};

export const getResubmissionSession = (): ResubmissionSession | null => {
  try {
    const item = localStorage.getItem(RESUBMISSION_CACHE_KEY);
    if (!item) return null;
    return JSON.parse(item);
  } catch {
    return null;
  }
};

export const clearResubmissionSession = (): void => {
  try {
    localStorage.removeItem(RESUBMISSION_CACHE_KEY);
  } catch {}
};

export const clearOnboardingCache = (): void => {
  try {
    localStorage.removeItem(CACHE_KEY);
    clearResubmissionSession();
    localStorage.removeItem('sakay_driver_first_name');
    localStorage.removeItem('sakay_driver_middle_name');
    localStorage.removeItem('sakay_driver_last_name');
    localStorage.removeItem('sakay_driver_suffix');
    localStorage.removeItem('sakay_driver_name');
  } catch (err) {
    console.warn('[DriverOnboardingCache] Error clearing cache:', err);
  }
};

export type FaultyDocType = 'license' | 'mtop' | 'tricycle' | 'selfie';

export interface ReturnIssueDetail {
  documentType: FaultyDocType;
  grounds: string;
  notes: string;
}

export interface ParsedReturnInfo {
  faultyDocuments: FaultyDocType[];
  issues: ReturnIssueDetail[];
  displayReason: string;
  displayNotes: string;
}

export function parseRejectionComment(comment?: string, reason?: string): ParsedReturnInfo {
  const ORDERED: FaultyDocType[] = ['license', 'mtop', 'tricycle', 'selfie'];

  if (comment) {
    try {
      const parsed = JSON.parse(comment);
      if (parsed && Array.isArray(parsed.faultyDocuments) && parsed.faultyDocuments.length > 0) {
        const validDocs = ORDERED.filter((d) => parsed.faultyDocuments.includes(d));
        return {
          faultyDocuments: validDocs.length > 0 ? validDocs : ['license'],
          issues: Array.isArray(parsed.issues) ? parsed.issues : [],
          displayReason: parsed.displayReason || reason || 'Documentary Issue',
          displayNotes: parsed.displayNotes || (parsed.issues ? parsed.issues.map((i: any) => i.notes).join('; ') : comment),
        };
      }
    } catch {
      // Plain text fallback
    }

    const lower = (comment + ' ' + (reason || '')).toLowerCase();
    const detected: FaultyDocType[] = [];
    if (lower.includes('license') || lower.includes('lisensya')) detected.push('license');
    if (lower.includes('mtop') || lower.includes('franchise') || lower.includes('prangkisa')) detected.push('mtop');
    if (lower.includes('tricycle') || lower.includes('trike') || lower.includes('sidecar')) detected.push('tricycle');
    if (lower.includes('selfie') || lower.includes('face') || lower.includes('mukha')) detected.push('selfie');

    if (detected.length > 0) {
      const orderedDetected = ORDERED.filter((d) => detected.includes(d));
      return {
        faultyDocuments: orderedDetected,
        issues: orderedDetected.map((d) => ({ documentType: d, grounds: reason || 'Documentary Issue', notes: comment })),
        displayReason: reason || 'Documentary Issue',
        displayNotes: comment,
      };
    }
  }

  return {
    faultyDocuments: ['license'],
    issues: [{ documentType: 'license', grounds: reason || 'Documentary Issue', notes: comment || reason || 'Kailangang iwasto' }],
    displayReason: reason || 'Documentary Issue',
    displayNotes: comment || reason || 'Kailangang iwasto ang dokumento',
  };
}

export function getNextCorrectionRoute(
  currentDoc: FaultyDocType,
  faultyDocuments: FaultyDocType[] = []
): { nextRoute: string; nextDocType?: FaultyDocType } {
  const ORDERED: FaultyDocType[] = ['license', 'mtop', 'tricycle', 'selfie'];
  const currentIndex = ORDERED.indexOf(currentDoc);

  const routeMap: Record<FaultyDocType, string> = {
    license: '/driver/scan-license-front',
    mtop: '/driver/scan-mtop',
    tricycle: '/driver/scan-tricycle',
    selfie: '/driver/scan-face',
  };

  for (let i = currentIndex + 1; i < ORDERED.length; i++) {
    const candidate = ORDERED[i];
    if (faultyDocuments.includes(candidate)) {
      return { nextRoute: routeMap[candidate], nextDocType: candidate };
    }
  }

  return { nextRoute: '/driver/confirm-all-info' };
}

export const hydrateOnboardingCacheFromExisting = async (driverId: string, phone?: string): Promise<void> => {
  try {
    const { data: verif } = await supabase
      .from('driver_verification')
      .select('*')
      .eq('driver_id', driverId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: driverData } = await supabase
      .from('driver')
      .select('*')
      .eq('driver_id', driverId)
      .maybeSingle();

    if (!verif && !driverData) return;

    const existing: DriverOnboardingProgress = getOnboardingCache() || {
      phone: phone || driverData?.contact_number || '',
      lastUpdated: new Date().toISOString(),
    };

    if (!existing.step1_license && (verif?.submitted_license_number || driverData?.license_number)) {
      existing.step1_license = {
        fullName: verif?.submitted_full_name || driverData?.full_name || '',
        licenseNumber: verif?.submitted_license_number || driverData?.license_number || '',
        dob: verif?.submitted_dob || driverData?.date_of_birth || '',
        gender: 'Lalaki',
        address: verif?.submitted_address || driverData?.residential_address || '',
        dlCodes: verif?.submitted_dl_codes || driverData?.dl_codes || 'A1',
        expirationDate: verif?.license_expiry || driverData?.license_expiry || '',
        frontPhoto: verif?.license_front_photo_path || '',
        backPhoto: verif?.license_back_photo_path || '',
        scannedAt: verif?.submitted_at || new Date().toISOString(),
      };
    }

    if (!existing.step2_mtop && (verif?.submitted_franchise_number || driverData?.franchise_number)) {
      existing.step2_mtop = {
        photoUrl: verif?.mtop_photo_path || '',
        operatorName: verif?.submitted_operator_name || driverData?.full_name || '',
        franchiseNumber: verif?.submitted_franchise_number || driverData?.franchise_number || '',
        plateNumber: verif?.submitted_plate_number || driverData?.plate_number || '',
        chassisNumber: verif?.submitted_chassis_number || driverData?.chassis_number || '',
        vehicleMake: verif?.submitted_vehicle_make || driverData?.vehicle_make || 'Kawasaki',
        motorNumber: verif?.submitted_motor_number || driverData?.motor_number || '',
        orNumber: verif?.submitted_or_number || driverData?.or_number || '',
        expirationDate: verif?.mtop_expiry || driverData?.mtop_expiry || '',
        authorizedRoute: verif?.submitted_authorized_route || driverData?.authorized_route || 'Calapan Poblacion',
        scannedAt: verif?.submitted_at || new Date().toISOString(),
      };
    }

    if (!existing.step3_tricycle && (verif?.tricycle_photo_path || driverData?.tricycle_photo_path)) {
      existing.step3_tricycle = {
        photoUrl: verif?.tricycle_photo_path || driverData?.tricycle_photo_path || '',
        scannedAt: verif?.submitted_at || new Date().toISOString(),
      };
    }

    if (!existing.step5_face && verif?.face_photo_path) {
      existing.step5_face = {
        rawSelfie: verif.face_photo_path,
        selfiePhotoUrl: verif.face_photo_path,
        faceMatchPassed: true,
        faceMatchScore: 0.98,
        verifiedAt: verif.submitted_at || new Date().toISOString(),
      };
    }

    existing.todaId = driverData?.toda_id || existing.todaId;
    existing.phone = phone || driverData?.contact_number || existing.phone;
    existing.driverName = driverData?.full_name || existing.driverName;

    localStorage.setItem(CACHE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.warn('[DriverOnboardingCache] Error hydrating cache from DB:', err);
  }
};

