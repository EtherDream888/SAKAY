/**
 * Driver Onboarding Offline Cache Service
 * Provides resilient local storage caching for multi-step onboarding documents
 * so drivers never lose scanned data during network disconnections.
 */

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

export const saveLicenseScanData = (data: LicenseExtractedData, phone = ''): void => {
  try {
    const existing = getOnboardingCache() || {
      phone,
      lastUpdated: new Date().toISOString(),
    };

    existing.phone = phone || existing.phone;
    existing.step1_license = data;
    existing.driverName = data.fullName || existing.driverName;
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

export const clearOnboardingCache = (): void => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (err) {
    console.warn('[DriverOnboardingCache] Error clearing cache:', err);
  }
};
