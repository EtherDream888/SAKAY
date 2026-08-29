/**
 * Driver Onboarding Offline Cache Service
 * Provides resilient local storage caching for multi-step onboarding documents
 * so drivers never lose scanned data during network disconnections.
 */

export interface LicenseExtractedData {
  frontPhoto: string;
  backPhoto: string;
  fullName: string;
  dob: string;
  gender: string;
  address: string;
  licenseNumber: string;
  dlCodes: string;
  expirationDate: string;
  rawOcrText?: string;
  scannedAt: string;
}

export interface DriverOnboardingProgress {
  phone: string;
  driverName?: string;
  step1_license?: LicenseExtractedData;
  step2_mtop?: {
    permitNumber?: string;
    photoUrl?: string;
    submittedAt?: string;
  };
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

export const clearOnboardingCache = (): void => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (err) {
    console.warn('[DriverOnboardingCache] Error clearing cache:', err);
  }
};
